import { useCallback, useEffect, useRef, useState } from 'react'
import { getLogs } from '../api/adminApi.js'
export default function useLogHistory(path, initialFilters) {
 const defaults = useRef(initialFilters)
 const [filters, setFilters] = useState(initialFilters)
 const [logs, setLogs] = useState([])
 const [metrics, setMetrics] = useState({ total_requests: 0, avg_response_time: 0, success_rate: 0, client_errors: 0, server_errors: 0 })
 const [pagination, setPagination] = useState({page: 1, total_pages: 1, total_count: 0})
 const [loading, setLoading] = useState(false)
 const [error, setError] = useState('')
 const [selectedLog, setSelectedLog] = useState(null)
 const [autoRefresh, setAutoRefresh] = useState(false)
 const sequence = useRef(0)
 const fetchLogs = useCallback(async (page = 1) => {
   const id = ++sequence.current
   setLoading(true)
   setError('')
   try {
     const params = new URLSearchParams({ ...filters, page, page_size: 50 })
     const data = await getLogs(path, params)
     if (id !== sequence.current) return
     setLogs(data.results)
     setPagination(data.pagination)
     setMetrics(data.metrics || {})
   } catch { if (id === sequence.current) setError('Unable to load logs. Try Refresh.') }
   finally { if (id === sequence.current) setLoading(false) }
 }, [filters, path])
 useEffect(() => {
   const start = setTimeout(() => fetchLogs(1), 0)
   // The counter invalidates pending requests; it does not reference a DOM node.
   // eslint-disable-next-line react-hooks/exhaustive-deps
   return () => { clearTimeout(start); sequence.current++ }
 }, [fetchLogs])
 useEffect(() => {
   if (!autoRefresh) return
   const interval = setInterval(() => fetchLogs(pagination.page), 10000)
   return () => clearInterval(interval)
 }, [autoRefresh, fetchLogs, pagination.page])
 return { filters, setFilters, logs, metrics, pagination, loading, error, selectedLog, setSelectedLog,
   autoRefresh, setAutoRefresh, fetchLogs,
   handleFilterChange: event => setFilters(previous => ({ ...previous, [event.target.name]: event.target.value })),
   handleSearch: event => { event.preventDefault(); fetchLogs(1) },
   clearFilters: () => setFilters(defaults.current) }
}
