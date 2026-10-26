import { useCallback, useEffect, useState } from 'react'
import { apiRequest, errorMessage } from '../../services/api/apiClient.js'

export default function useApiData(path, initialData, request = apiRequest) {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!path) return
    const controller = new AbortController()
    // Loading state accompanies synchronization with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setError('')
    request(path, { signal: controller.signal }).then(value => {
      if (!controller.signal.aborted) setData(value)
    }).catch(error => {
      if (!controller.signal.aborted) setError(errorMessage(error))
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false)
    })
    return () => controller.abort()
  }, [path, revision, request])
  const reload = useCallback(() => setRevision(value => value + 1), [])
  return { data, setData, loading, error, reload }
}
