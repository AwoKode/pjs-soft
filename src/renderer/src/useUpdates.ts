import { useEffect, useState } from 'react'
import type { UpdateStatus } from '@shared/types'

/**
 * Subscribes to auto-updater progress pushed from the main process. The initial
 * value is fetched once as well, because the first check fires a few seconds
 * after start-up and may already have finished before a component mounts.
 */
export function useUpdateStatus(): UpdateStatus {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })

  useEffect(() => {
    void window.api.updates.status().then(setStatus)
    return window.api.updates.onStatus(setStatus)
  }, [])

  return status
}

/** The status line shown next to the update controls, or null when there is nothing to say. */
export function updateMessage(
  status: UpdateStatus,
  strings: {
    checking: string
    upToDate: string
    available: (version: string) => string
    downloading: (percent: number) => string
    ready: (version: string) => string
    error: string
  }
): string | null {
  switch (status.state) {
    case 'checking':
      return strings.checking
    case 'none':
      return strings.upToDate
    case 'available':
      return strings.available(status.version)
    case 'downloading':
      return strings.downloading(status.percent)
    case 'ready':
      return strings.ready(status.version)
    case 'error':
      return strings.error
    default:
      return null
  }
}
