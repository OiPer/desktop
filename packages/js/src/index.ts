import { once } from 'node:events'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'

export type Workflow = {
  id: string
  name: string
  mode: 'local' | 'cloud' | 'oiper'
}

export type ContentType =
  | 'audio/wav'
  | 'audio/mpeg'
  | 'audio/mp4'
  | 'audio/aac'
  | 'audio/flac'
  | 'audio/ogg'

export type TextResult = {
  text: string
  historyId: string | null
}

type FailureResponse = {
  ok: false
  error: string
  history_id?: string | null
}

type WorkflowsResponse = { ok: true; workflows: Workflow[] } | FailureResponse

type TextResponse = { ok: true; text: string; history_id: string | null } | FailureResponse

export class OiPerError extends Error {
  historyId: string | null

  constructor(message: string, historyId: string | null, options?: ErrorOptions) {
    super(message, options)
    this.name = 'OiPerError'
    this.historyId = historyId
  }
}

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

async function call<T>(payload: Record<string, string | undefined>): Promise<T> {
  const socket = net.connect(pipePath())
  try {
    await once(socket, 'connect')
  } catch (error) {
    throw new OiPerError('Could not connect to OiPer. Is the OiPer app running?', null, { cause: error })
  }

  socket.setEncoding('utf8')
  socket.write(`${JSON.stringify(payload)}\n`)

  let data = ''
  for await (const chunk of socket) {
    data += chunk
  }

  const response: T = JSON.parse(data)
  return response
}

export async function ping() {
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

export async function workflows() {
  const response = await call<WorkflowsResponse>({ method: 'workflows' })
  if (!response.ok) {
    throw new OiPerError(response.error, response.history_id ?? null)
  }
  return response.workflows
}

export async function text(options: {
  audioPath: string
  contentType: ContentType
  workflowId?: string
}): Promise<TextResult> {
  const response = await call<TextResponse>({
    method: 'text',
    audio_path: path.resolve(options.audioPath),
    content_type: options.contentType,
    workflow_id: options.workflowId,
  })
  if (!response.ok) {
    throw new OiPerError(response.error, response.history_id ?? null)
  }
  return { text: response.text, historyId: response.history_id }
}

export async function retry(options: { historyId: string; workflowId?: string }): Promise<TextResult> {
  const response = await call<TextResponse>({
    method: 'retry',
    history_id: options.historyId,
    workflow_id: options.workflowId,
  })
  if (!response.ok) {
    throw new OiPerError(response.error, response.history_id ?? null)
  }
  return { text: response.text, historyId: response.history_id }
}
