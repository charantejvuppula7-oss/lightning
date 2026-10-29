import { useCallback, useMemo, useRef, useState } from 'react'
import { apiList } from '../../shared/api/apiClient.js'
import { ProjectSelectionContext } from './projectSelectionContext.js'

export function ProjectSelectionProvider({ children }) {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const pending = useRef(null)

  const loadProjects = useCallback(() => {
    if (pending.current) return pending.current
    setLoading(true)
    setError(false)
    const request = apiList('/projects/assigned/?page_size=100')
      .then((items) => {
        setProjects(items)
        setSelectedProjectId((current) => current === 'all' || items.some((item) => item.id === current) ? current : 'all')
      })
      .catch(() => {
        setProjects([])
        setSelectedProjectId('all')
        setError(true)
      })
      .finally(() => {
        pending.current = null
        setLoading(false)
      })
    pending.current = request
    return request
  }, [])

  const value = useMemo(() => ({
    projects, selectedProjectId, setSelectedProjectId, loading, error, loadProjects,
  }), [projects, selectedProjectId, loading, error, loadProjects])

  return <ProjectSelectionContext.Provider value={value}>{children}</ProjectSelectionContext.Provider>
}
