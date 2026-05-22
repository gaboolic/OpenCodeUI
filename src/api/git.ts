import { getSDKClient, unwrap } from './sdk'
import { formatPathForApi } from '../utils/directoryUtils'

export interface ActionResult {
  success: boolean
  output?: string
}

export interface LogEntry {
  hash: string
  message: string
}

export async function stageFiles(files: string[], directory?: string): Promise<ActionResult> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.stage({ files, directory: formatPathForApi(directory) }))
}

export async function unstageFiles(files: string[], directory?: string): Promise<ActionResult> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.unstage({ files, directory: formatPathForApi(directory) }))
}

export async function commitChanges(message: string, directory?: string): Promise<ActionResult> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.commit({ message, directory: formatPathForApi(directory) }))
}

export async function pushChanges(remote?: string, branch?: string, directory?: string): Promise<ActionResult> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.push({ remote, branch, directory: formatPathForApi(directory) }))
}

export async function pullChanges(remote?: string, branch?: string, directory?: string): Promise<ActionResult> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.pull({ remote, branch, directory: formatPathForApi(directory) }))
}

export async function getLog(count?: number, directory?: string): Promise<LogEntry[]> {
  const sdk = getSDKClient()
  return unwrap(await sdk.vcs.log({ count, directory: formatPathForApi(directory) }))
}
