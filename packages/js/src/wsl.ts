import { execFile, spawn } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { promisify } from 'node:util'
import { OiPerError } from './index.js'

const execFileAsync = promisify(execFile)

export const isWsl = process.platform === 'linux' && os.release().toLowerCase().includes('microsoft')

const relayScript = String.raw`$ErrorActionPreference = 'Stop'
$reader = New-Object System.IO.StreamReader([Console]::OpenStandardInput())
$output = New-Object System.IO.StreamWriter([Console]::OpenStandardOutput())
$output.AutoFlush = $true
while ($null -ne ($line = $reader.ReadLine())) {
  if (-not [System.IO.File]::Exists('\\.\pipe\com.oiper.desktop')) {
    $output.WriteLine('unavailable')
    continue
  }
  $pipe = New-Object System.IO.Pipes.NamedPipeClientStream('.', 'com.oiper.desktop', 'InOut')
  try {
    $pipe.Connect(2000)
  } catch {
    $pipe.Dispose()
    $output.WriteLine('unavailable')
    continue
  }
  if ($line -eq 'ping') {
    $pipe.Dispose()
    $output.WriteLine('available')
    continue
  }
  $request = [Convert]::FromBase64String($line)
  $pipe.Write($request, 0, $request.Length)
  $response = New-Object System.IO.MemoryStream
  $pipe.CopyTo($response)
  $pipe.Dispose()
  $output.WriteLine('response ' + [Convert]::ToBase64String($response.ToArray()))
}`

let powerShellPath: Promise<string> | undefined

async function findPowerShell() {
  const mounts = await readFile('/proc/mounts', 'utf8')
  for (const line of mounts.split('\n')) {
    const fields = line.split(' ')
    if (fields[2] !== '9p' || !fields[3]?.includes('aname=drvfs')) {
      continue
    }
    const mountPoint = fields[1].replace(/\\([0-7]{3})/g, (match, code) => String.fromCharCode(parseInt(code, 8)))
    const candidate = path.join(mountPoint, 'Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    try {
      await access(candidate)
      return candidate
    } catch {}
  }
  throw new OiPerError('Could not find Windows PowerShell from WSL', null)
}

const idleRelays: ReturnType<typeof startRelay>[] = []

function startRelay(powerShell: string) {
  const child = spawn(
    powerShell,
    ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(relayScript, 'utf16le').toString('base64')],
    { stdio: ['pipe', 'pipe', 'ignore'] },
  )
  if (!(child.stdin instanceof net.Socket) || !(child.stdout instanceof net.Socket)) {
    throw new OiPerError('Could not start the OiPer relay', null)
  }
  const relay = {
    process: child,
    input: child.stdin,
    output: child.stdout,
    lines: readline.createInterface({ input: child.stdout, crlfDelay: Infinity })[Symbol.asyncIterator](),
  }
  child.on('error', () => {})
  relay.input.on('error', () => {})
  child.on('close', () => {
    const index = idleRelays.indexOf(relay)
    if (index !== -1) {
      idleRelays.splice(index, 1)
    }
  })
  return relay
}

async function sendToRelay(line: string) {
  powerShellPath ??= findPowerShell()
  const relay = idleRelays.pop() ?? startRelay(await powerShellPath)
  relay.process.ref()
  relay.input.ref()
  relay.output.ref()
  relay.input.write(`${line}\n`)
  const result = await relay.lines.next()
  if (result.done) {
    throw new OiPerError('The OiPer relay on Windows stopped unexpectedly', null)
  }
  relay.process.unref()
  relay.input.unref()
  relay.output.unref()
  idleRelays.push(relay)
  return result.value
}

export async function requestWsl(request: string) {
  const line = await sendToRelay(Buffer.from(request).toString('base64'))
  if (line === 'unavailable') {
    throw new OiPerError('Could not connect to OiPer. Is the OiPer app running?', null)
  }
  if (!line.startsWith('response ')) {
    throw new OiPerError(`Unexpected output from the OiPer relay: ${line}`, null)
  }
  return Buffer.from(line.slice('response '.length), 'base64').toString('utf8')
}

export async function pingWsl() {
  const line = await sendToRelay('ping')
  if (line === 'available') {
    return true
  }
  if (line === 'unavailable') {
    return false
  }
  throw new OiPerError(`Unexpected output from the OiPer relay: ${line}`, null)
}

export async function toWindowsPath(linuxPath: string) {
  const result = await execFileAsync('wslpath', ['-w', linuxPath])
  return result.stdout.trim()
}
