import { useEffect, useState } from 'react'
import {
  IMPORT_RUNTIME_STORAGE_KEY,
  IMPORT_SESSION_BUSY_KEY,
  isImportInProgress,
} from '../lib/importRuntime'
import { subscribeLocalStoreUpdates } from '../lib/localStore'

export function useImportInProgress(): boolean {
  const [inProgress, setInProgress] = useState(isImportInProgress)

  useEffect(() => {
    const sync = () => setInProgress(isImportInProgress())

    const onStorage = (event: StorageEvent) => {
      if (
        event.key &&
        event.key !== IMPORT_RUNTIME_STORAGE_KEY &&
        event.key !== IMPORT_SESSION_BUSY_KEY
      ) {
        return
      }
      sync()
    }

    const unsubscribe = subscribeLocalStoreUpdates((key) => {
      if (key === IMPORT_RUNTIME_STORAGE_KEY || key === IMPORT_SESSION_BUSY_KEY) {
        sync()
      }
    })

    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('storage', onStorage)
      unsubscribe()
    }
  }, [])

  return inProgress
}
