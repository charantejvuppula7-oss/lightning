import './dashboard.css'

const sprints = ['Sprint 1', 'Sprint 2', 'Sprint 3', 'Sprint 4', 'Sprint 5', 'Sprint 6']
const series = [
  { name: 'lightning', color: '#7167ff', values: [0, 50, 91, 23, 41, 80] },
  { name: 'Helix', color: '#36c7ac', values: [0, 80, 72, 12, 12, 95] },
  { name: 'Lightning App', color: '#ff7c79', values: [0, 71, 48, 55, 76, 88] },
]
const workload = [
  { name: 'Yogita', values: [12, 7, 18] }, { name: 'ravi', values: [16, 20, 0] },
  { name: 'Simran', values: [16, 7, 15] }, { name: 'Aarti', values: [3, 20, 18] },
  { name: 'Rahul', values: [4, 0, 3] }, { name: 'Dheeraj', values: [16, 1, 19] },
]
const reviewRows = [
  ['Design Dashboard of PM', 'Lightning', 'Dheeraj sharma', 'May 28, 2025', 'Rework', 'rework'],
  ['Add Assign Task CTA', 'Helix', 'Yogita Mehra', 'May 28, 2025', 'Awaiting Review', 'awaiting'],
]
const dependencyRows = [
  ['Data export depends on the database migration', 'Smart IoT Gateway', 'Deepak Bisht', 'PCB Designer', 'Blocks 2 tasks', 'High', 'May 28, 6:00 PM'],
  ['API integration depends on User Auth Module', 'Project Alpha', 'Yogita Mehra', 'UI/UX Designer', 'Blocks 1 task', 'medium', 'May 28, 6:00 PM'],
  ['Calibration sign-off depends on the sensor rig', 'Project XYZ', 'Yogita Mehra', 'UI/UX Designer', '---', '---', 'May 28, 6:00 PM'],
]

function ProjectStatusChart() {
  const x = index => 38 + index * 99
  const y = value => 244 - value * 2.2
  return <section className="dash-card chart-card">
    <div className="dash-card-title"><h2>Project Status</h2><div className="chart-legend line-legend">{series.map(item => <span key={item.name}><i style={{ '--legend-color': item.color }} />{item.name}</span>)}</div></div>
    <div className="line-chart">
      <div className="y-labels">{[100, 80, 60, 40, 20, 0].map(value => <span key={value}>{value}%</span>)}</div>
      <svg viewBox="0 0 540 280" role="img" aria-label="Project status across six sprints">
        {[24, 68, 112, 156, 200, 244].map((line, i) => <line key={`h${i}`} x1="38" y1={line} x2="533" y2={line} className="chart-gridline" />)}
        {sprints.map((_, i) => <line key={`v${i}`} x1={x(i)} y1="24" x2={x(i)} y2="244" className="chart-gridline vertical" />)}
        {series.map(item => <g key={item.name}>
          <polyline points={item.values.map((value, i) => `${x(i)},${y(value)}`).join(' ')} fill="none" stroke={item.color} strokeWidth="2" />
          {item.values.map((value, i) => <circle key={i} cx={x(i)} cy={y(value)} r="3.5" fill="white" stroke={item.color} strokeWidth="1.5" />)}
        </g>)}
      </svg>
      <div className="x-labels">{sprints.map(sprint => <span key={sprint}>{sprint}</span>)}</div>
    </div>
  </section>
}

function WorkloadChart() {
  const colors = ['#7167e9', '#57c3ad', '#ff9290']
  return <section className="dash-card chart-card">
    <div className="dash-card-title"><h2>Team Workload</h2><div className="chart-legend bar-legend">{['Lightning', 'Helix', 'Lightning App'].map((name, i) => <span key={name}><i style={{ background: colors[i] }} />{name}</span>)}</div></div>
    <div className="bar-chart">
      <div className="bar-y-labels">{[50, 40, 30, 20, 10, 0].map(value => <span key={value}>{value}</span>)}</div>
      <div className="bar-plot">{[0, 10, 20, 30, 40, 50].map(value => <div className="bar-gridline" key={value} style={{ bottom: `${value * 2}%` }} />)}
        {workload.map(person => <div className="bar-group" key={person.name}><div className="stacked-bar">{person.values.map((value, i) => <span key={i} style={{ height: `${value * 2}%`, background: colors[i] }} />)}</div><label>{person.name}</label></div>)}
      </div>
    </div>
  </section>
}

function Reviews() {
  return <section className="dash-card data-card"><div className="section-title"><h2>Pending Reviews</h2><a href="#reviews">View all</a></div>
    <div className="table-scroll"><table><thead><tr>{['Work Item', 'Project', 'Submitted by', 'Sent', 'Status', 'Actions'].map(value => <th key={value}>{value}</th>)}</tr></thead>
      <tbody>{reviewRows.map(([task, project, person, date, status, kind]) => <tr key={task}><td><strong>{task}</strong></td><td>{project}</td><td>{person}</td><td>{date}</td><td><span className={`status-pill ${kind}`}>{status}</span></td><td><button className="review-button">Review</button></td></tr>)}</tbody>
    </table></div>
  </section>
}

function Dependencies() {
  return <section className="dash-card data-card dependency-card"><div className="section-title"><h2>Dependencies</h2><a href="#dependencies">View all</a></div>
    <div className="table-scroll"><table><thead><tr>{['Request', 'Requested by', 'Impact', 'Urgency', 'Sent'].map(value => <th key={value}>{value}</th>)}</tr></thead>
      <tbody>{dependencyRows.map(([request, project, person, role, impact, urgency, date]) => <tr key={request}><td><strong>{request}</strong><small>{project}</small></td><td>{person}<small>{role}</small></td><td className={impact === '---' ? '' : 'impact'}>{impact}</td><td className={urgency === 'High' ? 'urgency-high' : urgency === 'medium' ? 'urgency-medium' : ''}>{urgency}</td><td>{date}</td></tr>)}</tbody>
    </table></div>
  </section>
}

export default function ProjectManagerDashboard({ user }) {
  const firstName = user?.first_name || 'Yogita'
  return <main className="pm-dashboard">
    <header className="dashboard-greeting"><div><h1>Hey, {firstName}</h1><p>Here’s what’s happening with your project today.</p></div><div className="dashboard-actions"><button className="assign-button">＋ <span>Assign Task</span></button><button className="create-button">＋ <span>Create Project</span></button></div></header>
    <div className="charts-grid"><ProjectStatusChart /><WorkloadChart /></div>
    <Reviews />
    <Dependencies />
  </main>
}
