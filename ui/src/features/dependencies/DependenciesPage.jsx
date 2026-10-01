export default function DependenciesPage() {
  return <section className="page-content">
    <header className="page-heading"><h1>Dependencies</h1><p>Every link between your work and someone else's, in both directions.</p><div className="tabs"><button className="selected">You're waiting on</button><button>Waiting on you</button></div></header>
    <div className="empty-page" aria-label="No dependencies" />
  </section>
}
