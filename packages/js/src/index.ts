import path from 'node:path'
import { pingNative, requestNative } from './native.js'
import { isWsl, pingWsl, requestWsl, toWindowsPath } from './wsl.js'

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

async function call<T>(payload: Record<string, string | undefined>): Promise<T> {
  const request = `${JSON.stringify(payload)}\n`
  const data = isWsl ? await requestWsl(request) : await requestNative(request)
  const response: T = JSON.parse(data)
  return response
}

export async function ping() {
  return isWsl ? pingWsl() : pingNative()
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
  const audioPath = path.resolve(options.audioPath)
  const response = await call<TextResponse>({
    method: 'text',
    audio_path: isWsl ? await toWindowsPath(audioPath) : audioPath,
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
