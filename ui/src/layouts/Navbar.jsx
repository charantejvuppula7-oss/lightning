export default function Navbar() {
  return <header className="topbar">
    <button className="project-select">testing <span>⌄</span></button>
    <div className="topbar-actions"><label className="search-box"><span aria-hidden="true">⌕</span><input aria-label="Search" placeholder="Search tasks, docs, people...." /></label><button className="notification" aria-label="Notifications">♧</button><span className="avatar">CP</span></div>
  </header>
}
