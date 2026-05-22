import { memo, useState, useEffect, useCallback, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  GitBranchIcon,
  RetryIcon,
  SpinnerIcon,
  CheckIcon,
  CloseIcon,
  AlertCircleIcon,
} from './Icons'
import { useVcsInfo, useDirectory } from '../hooks'
import { getVcsDiff, getVcsInfo } from '../api/vcs'
import {
  stageFiles,
  unstageFiles,
  commitChanges,
  pushChanges,
  pullChanges,
  getLog,
  type ActionResult,
  type LogEntry,
} from '../api/git'
import type { FileDiff } from '../api/types'

interface GitPanelProps {
  isResizing?: boolean
}

export const GitPanel = memo(function GitPanel({ isResizing: _isResizing }: GitPanelProps) {
  const { t } = useTranslation(['components', 'common'])
  const { currentDirectory } = useDirectory()
  const { vcsInfo, refresh: refreshVcs } = useVcsInfo(currentDirectory)

  const [status, setStatus] = useState<FileDiff[]>([])
  const [log, setLog] = useState<LogEntry[]>([])
  const [commitMsg, setCommitMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    if (!currentDirectory) return
    setLoading(true)
    try {
      const [diff, logEntries] = await Promise.all([
        getVcsDiff('git', currentDirectory),
        getLog(10, currentDirectory),
      ])
      setStatus(diff)
      setLog(logEntries)
    } catch {
      setStatus([])
      setLog([])
    } finally {
      setLoading(false)
    }
  }, [currentDirectory])

  useEffect(() => {
    void load()
  }, [load])

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 3000)
  }, [])

  const handleStage = useCallback(
    async (files: string[]) => {
      if (!currentDirectory) return
      setActionLoading('stage')
      try {
        const result = await stageFiles(files, currentDirectory)
        if (result.success) {
          showMessage('success', t('gitPanel.staged'))
          await load()
        } else {
          showMessage('error', result.output ?? t('gitPanel.failedToStage'))
        }
      } catch {
        showMessage('error', t('gitPanel.failedToStage'))
      } finally {
        setActionLoading(null)
      }
    },
    [currentDirectory, load, showMessage, t],
  )

  const handleUnstage = useCallback(
    async (files: string[]) => {
      if (!currentDirectory) return
      setActionLoading('unstage')
      try {
        const result = await unstageFiles(files, currentDirectory)
        if (result.success) {
          showMessage('success', t('gitPanel.unstaged'))
          await load()
        } else {
          showMessage('error', result.output ?? t('gitPanel.failedToUnstage'))
        }
      } catch {
        showMessage('error', t('gitPanel.failedToUnstage'))
      } finally {
        setActionLoading(null)
      }
    },
    [currentDirectory, load, showMessage, t],
  )

  const handleCommit = useCallback(async () => {
    if (!commitMsg.trim() || !currentDirectory) return
    setActionLoading('commit')
    try {
      const result = await commitChanges(commitMsg.trim(), currentDirectory)
      if (result.success) {
        showMessage('success', t('gitPanel.committed'))
        setCommitMsg('')
        await load()
      } else {
        showMessage('error', result.output ?? t('gitPanel.failedToCommit'))
      }
    } catch {
      showMessage('error', t('gitPanel.failedToCommit'))
    } finally {
      setActionLoading(null)
    }
  }, [commitMsg, currentDirectory, load, showMessage, t])

  const handlePush = useCallback(async () => {
    if (!currentDirectory) return
    setActionLoading('push')
    try {
      const result = await pushChanges(undefined, undefined, currentDirectory)
      if (result.success) {
        showMessage('success', t('gitPanel.pushed'))
      } else {
        showMessage('error', result.output ?? t('gitPanel.failedToPush'))
      }
    } catch {
      showMessage('error', t('gitPanel.failedToPush'))
    } finally {
      setActionLoading(null)
    }
  }, [currentDirectory, load, showMessage, t])

  const handlePull = useCallback(async () => {
    if (!currentDirectory) return
    setActionLoading('pull')
    try {
      const result = await pullChanges(undefined, undefined, currentDirectory)
      if (result.success) {
        showMessage('success', t('gitPanel.pulled'))
      } else {
        showMessage('error', result.output ?? t('gitPanel.failedToPull'))
      }
    } catch {
      showMessage('error', t('gitPanel.failedToPull'))
    } finally {
      setActionLoading(null)
    }
  }, [currentDirectory, showMessage, t])

  const toggleFile = useCallback((file: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev)
      if (next.has(file)) next.delete(file)
      else next.add(file)
      return next
    })
  }, [])

  if (!currentDirectory) {
    return (
      <div className="flex items-center justify-center h-full text-text-400 text-[length:var(--fs-sm)]">
        {t('worktreePanel.selectProject')}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border-200/50">
        <GitBranchIcon size={14} className="text-text-400" />
        <span className="text-[length:var(--fs-sm)] font-medium text-text-200">
          {vcsInfo?.branch ?? t('gitPanel.noBranch')}
        </span>
        <div className="flex-1" />
        <button
          onClick={() => void load()}
          disabled={loading}
          className="p-1.5 rounded-md text-text-400 hover:text-text-100 hover:bg-bg-200/50 transition-colors disabled:opacity-50"
          title={t('common:refresh')}
        >
          {loading ? <SpinnerIcon size={14} /> : <RetryIcon size={14} />}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[length:var(--fs-xs)] ${
            message.type === 'success' ? 'bg-success-100/10 text-success-100' : 'bg-danger-100/10 text-danger-100'
          }`}
        >
          {message.type === 'success' ? <CheckIcon size={12} /> : <AlertCircleIcon size={12} />}
          <span className="flex-1">{message.text}</span>
          <button onClick={() => setMessage(null)} className="p-0.5 hover:opacity-70">
            <CloseIcon size={12} />
          </button>
        </div>
      )}

      {/* Commit area */}
      <div className="px-3 py-2 border-b border-border-200/50 space-y-2">
        <textarea
          value={commitMsg}
          onChange={e => setCommitMsg(e.target.value)}
          placeholder={t('gitPanel.commitPlaceholder')}
          rows={2}
          className="w-full resize-none bg-bg-200/50 border border-border-200 rounded-md px-2 py-1.5 text-[length:var(--fs-sm)] text-text-100 placeholder:text-text-500 outline-none focus:border-accent-main-100/50 transition-colors"
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              void handleCommit()
            }
          }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleCommit}
            disabled={!commitMsg.trim() || actionLoading === 'commit'}
            className="flex-1 px-3 py-1.5 text-[length:var(--fs-sm)] font-medium bg-accent-main-100 text-white rounded-md hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            {actionLoading === 'commit' ? (
              <span className="flex items-center justify-center gap-1.5">
                <SpinnerIcon size={13} /> {t('gitPanel.committing')}
              </span>
            ) : (
              t('gitPanel.commit')
            )}
          </button>
          <button
            onClick={handlePush}
            disabled={actionLoading === 'push'}
            className="px-3 py-1.5 text-[length:var(--fs-sm)] bg-bg-200/50 text-text-200 rounded-md hover:bg-bg-200 transition-colors disabled:opacity-40"
            title={t('gitPanel.pushTooltip')}
          >
            {actionLoading === 'push' ? <SpinnerIcon size={13} /> : t('gitPanel.push')}
          </button>
          <button
            onClick={handlePull}
            disabled={actionLoading === 'pull'}
            className="px-3 py-1.5 text-[length:var(--fs-sm)] bg-bg-200/50 text-text-200 rounded-md hover:bg-bg-200 transition-colors disabled:opacity-40"
            title={t('gitPanel.pullTooltip')}
          >
            {actionLoading === 'pull' ? <SpinnerIcon size={13} /> : t('gitPanel.pull')}
          </button>
        </div>
      </div>

      {/* Changes list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-text-400 text-[length:var(--fs-sm)]">
            {t('gitPanel.loadingChanges')}
          </div>
        ) : status.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-400 text-[length:var(--fs-sm)]">
            {t('gitPanel.noChanges')}
          </div>
        ) : (
          <div className="py-1">
            {status.map(item => (
              <div
                key={item.file}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-bg-200/30 cursor-pointer transition-colors group"
                onClick={() => toggleFile(item.file)}
              >
                <input
                  type="checkbox"
                  checked={selectedFiles.has(item.file)}
                  onChange={() => toggleFile(item.file)}
                  className="rounded border-border-200 text-accent-main-100 focus:ring-accent-main-100/30"
                  onClick={e => e.stopPropagation()}
                />
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.status === 'added' ? 'bg-success-100' :
                    item.status === 'deleted' ? 'bg-danger-100' :
                    'bg-warning-100'
                  }`}
                />
                <span className="flex-1 text-[length:var(--fs-sm)] text-text-200 truncate">{item.file}</span>
                <span className="text-[length:var(--fs-xs)] text-text-500">
                  {item.additions > 0 && <span className="text-success-100">+{item.additions}</span>}
                  {item.deletions > 0 && <span className="text-danger-100 ml-1">-{item.deletions}</span>}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      void handleStage([item.file])
                    }}
                    disabled={actionLoading === 'stage'}
                    className="p-1 rounded text-text-400 hover:text-text-100 hover:bg-bg-200/50 transition-colors"
                    title={t('gitPanel.stageFile')}
                  >
                    <CheckIcon size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stage all / Unstage all */}
      {status.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border-200/50">
          <button
            onClick={() => void handleStage(Array.from(selectedFiles.size > 0 ? selectedFiles : status.map(s => s.file)))}
            disabled={actionLoading === 'stage'}
            className="px-2.5 py-1 text-[length:var(--fs-xs)] bg-bg-200/50 text-text-300 rounded-md hover:bg-bg-200 transition-colors disabled:opacity-40"
          >
            {actionLoading === 'stage' ? t('gitPanel.staging') : t('gitPanel.stageSelected')}
          </button>
          <button
            onClick={() => void handleUnstage(Array.from(selectedFiles.size > 0 ? selectedFiles : status.map(s => s.file)))}
            disabled={actionLoading === 'unstage'}
            className="px-2.5 py-1 text-[length:var(--fs-xs)] bg-bg-200/50 text-text-300 rounded-md hover:bg-bg-200 transition-colors disabled:opacity-40"
          >
            {actionLoading === 'unstage' ? t('gitPanel.unstaging') : t('gitPanel.unstageSelected')}
          </button>
        </div>
      )}

      {/* Recent commits */}
      {log.length > 0 && (
        <div className="border-t border-border-200/50">
          <div className="px-3 py-1.5 text-[length:var(--fs-xs)] font-medium text-text-500 uppercase tracking-wider">
            {t('gitPanel.recentCommits')}
          </div>
          <div className="pb-2">
            {log.map(entry => (
              <div key={entry.hash} className="flex items-center gap-2 px-3 py-1 text-[length:var(--fs-xs)] text-text-400">
                <span className="font-mono text-text-500 shrink-0">{entry.hash.slice(0, 7)}</span>
                <span className="truncate">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})
