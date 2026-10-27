export function navigateToSearchResult(item, navigate) {
 if (!item) return
 if (item.path) return navigate(item.path, { state: item.state })
 const role = window.location.pathname.startsWith('/admin/') ? 'admin' : window.location.pathname.startsWith('/pm/') ? 'pm' : 'user'
 const type = item.itemType || item.type
 const query = new URLSearchParams({ search: item.title || item.name || '', selected: item.id || '' })
 if (type === 'person' && role === 'admin') return navigate(`/admin/database?table=users&${query}`)
 const paths = { task: `/${role}/tasks`, project: role === 'admin' ? '/admin/all-projects' : `/${role}/projects`, person: `/${role}/users`, document: `/${role}/documents`, dependency: `/${role}/dependencies` }
 navigate(`${paths[type] || '/projects'}?${query}`)
}
