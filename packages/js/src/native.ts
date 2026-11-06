import { once } from 'node:events'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { OiPerError } from './index.js'

function pipePath() {
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'com.oiper.desktop', 'oiper.sock')
  }
  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\com.oiper.desktop'
  }
  if (process.platform === 'linux') {
    const configDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config')
    return path.join(configDir, 'com.oiper.desktop', 'oiper.sock')
  }
  throw new OiPerError(`Unsupported platform: ${process.platform}`, null)
}

export async function requestNative(request: string) {
  const socket = net.connect(pipePath())
  try {
    await once(socket, 'connect')
  } catch (error) {
    throw new OiPerError('Could not connect to OiPer. Is the OiPer app running?', null, { cause: error })
  }

  socket.setEncoding('utf8')
  socket.write(request)

  let data = ''
  for await (const chunk of socket) {
    data += chunk
  }
  return data
}

export async function pingNative() {
  const socket = net.connect(pipePath())
  try {
    await once(socket, 'connect')
    return true
  } catch {
    return false
  } finally {
    socket.destroy()
  }
}
