
/* styling */
const tailwindStyling = {
  "pm-dashboard": [
    "[min-height:calc(100vh_-_50px)]",
    "[box-sizing:border-box]",
    "[padding:17px_12px_30px]",
    "[background:#fbfcfe]",
    "[color:#292b31]",
    "max-[650px]:[padding:14px_10px_24px]"
  ],
  "dashboard-greeting": [
    "[display:flex]",
    "[justify-content:space-between]",
    "[align-items:center]",
    "[gap:16px]",
    "[margin:0_4px_15px]",
    "[&_h1]:[margin:0]",
    "[&_h1]:[font-size:20px]",
    "[&_h1]:[line-height:1.25]",
    "[&_h1]:[font-weight:700]",
    "[&_p]:[margin:2px_0_0]",
    "[&_p]:[color:#85858a]",
    "[&_p]:[font-size:14px]",
    "max-[650px]:[align-items:flex-start]",
    "max-[650px]:[flex-direction:column]"
  ],
  "dashboard-actions": [
    "[display:flex]",
    "[gap:12px]",
    "[&_button]:[height:43px]",
    "[&_button]:[padding:0_18px]",
    "[&_button]:[border-radius:12px]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:14px]",
    "[&_button]:[font-weight:600]",
    "[&_button]:[cursor:pointer]",
    "[&_button:first-letter]:[font-size:19px]",
    "max-[650px]:[width:100%]"
  ],
  "assign-button": [
    "[border:1px_solid_#d1d3d8]",
    "[background:#fff]",
    "[color:#24252a]",
    "[box-shadow:0_2px_4px_#00000012]"
  ],
  "create-button": [
    "[border:1px_solid_#1459d2]",
    "[background:#155bd7]",
    "[color:#fff]",
    "[box-shadow:0_2px_5px_#1459d233]"
  ],
  "charts-grid": [
    "[display:grid]",
    "[grid-template-columns:1fr_1fr]",
    "[gap:0]",
    "[margin-bottom:23px]",
    "max-[1000px]:[grid-template-columns:1fr]",
    "max-[1000px]:[gap:12px]"
  ],
  "dash-card": [
    "[min-width:0]",
    "[border:1px_solid_#d2d4da]",
    "[border-radius:4px]",
    "[background:#fff]"
  ],
  "chart-card": [
    "[height:360px]",
    "[box-sizing:border-box]",
    "[padding:16px_18px_12px]",
    "[&_+_.chart-card]:[border-left:0]",
    "max-[1000px]:[&_+_.chart-card]:[border-left:1px_solid_#d2d4da]",
    "max-[650px]:[padding-inline:12px]",
    "max-[650px]:[height:390px]"
  ],
  "dash-card-title": [
    "[display:flex]",
    "[justify-content:space-between]",
    "[align-items:center]",
    "[gap:8px]",
    "[min-height:25px]",
    "[&_h2]:[margin:0]",
    "[&_h2]:[color:#414249]",
    "[&_h2]:[font-size:20px]",
    "[&_h2]:[line-height:1.25]",
    "[&_h2]:[font-weight:650]",
    "max-[650px]:[align-items:flex-start]",
    "max-[650px]:[flex-direction:column]"
  ],
  "section-title": [
    "[&_h2]:[margin:0]",
    "[&_h2]:[color:#414249]",
    "[&_h2]:[font-size:20px]",
    "[&_h2]:[line-height:1.25]",
    "[&_h2]:[font-weight:650]",
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[margin-bottom:11px]",
    "[&_a]:[color:#111]",
    "[&_a]:[font-size:14px]",
    "[&_a]:[text-decoration:underline]"
  ],
  "chart-legend": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:12px]",
    "[color:#6f7076]",
    "[font-size:11px]",
    "[white-space:nowrap]",
    "[&_span]:[display:inline-flex]",
    "[&_span]:[align-items:center]",
    "[&_span]:[gap:5px]"
  ],
  "line-legend": [
    "[&_i]:[width:13px]",
    "[&_i]:[height:1px]",
    "[&_i]:[background:var(--legend-color)]",
    "[&_i]:[position:relative]",
    "[&_i::after]:[content:'']",
    "[&_i::after]:[position:absolute]",
    "[&_i::after]:[left:4px]",
    "[&_i::after]:[top:-3px]",
    "[&_i::after]:[width:5px]",
    "[&_i::after]:[height:5px]",
    "[&_i::after]:[border:1px_solid_var(--legend-color)]",
    "[&_i::after]:[border-radius:50%]",
    "[&_i::after]:[background:white]"
  ],
  "bar-legend": [
    "[&_i]:[display:inline-block]",
    "[&_i]:[width:10px]",
    "[&_i]:[height:10px]"
  ],
  "line-chart": [
    "[position:relative]",
    "[height:292px]",
    "[margin-top:8px]",
    "[padding-left:32px]",
    "[padding-bottom:26px]",
    "[box-sizing:border-box]",
    "[&_svg]:[display:block]",
    "[&_svg]:[width:100%]",
    "[&_svg]:[height:100%]",
    "[&_svg]:[overflow:visible]"
  ],
  "chart-gridline": [
    "[stroke:#dedee1]",
    "[stroke-width:1]",
    "[stroke-dasharray:2_3]",
    "[&.vertical]:[stroke:#e4e4e6]"
  ],
  "y-labels": [
    "[position:absolute]",
    "[left:0]",
    "[top:5px]",
    "[bottom:36px]",
    "[display:flex]",
    "[flex-direction:column]",
    "[justify-content:space-between]",
    "[color:#696a70]",
    "[font-size:11px]"
  ],
  "x-labels": [
    "[position:absolute]",
    "[left:32px]",
    "[right:-2px]",
    "[bottom:0]",
    "[display:flex]",
    "[justify-content:space-between]",
    "[color:#64656b]",
    "[font-size:11px]"
  ],
  "bar-chart": [
    "[position:relative]",
    "[height:288px]",
    "[margin-top:11px]",
    "[padding-left:30px]",
    "[padding-bottom:27px]",
    "[box-sizing:border-box]"
  ],
  "bar-y-labels": [
    "[position:absolute]",
    "[left:0]",
    "[top:2px]",
    "[bottom:31px]",
    "[display:flex]",
    "[flex-direction:column]",
    "[justify-content:space-between]",
    "[color:#696a70]",
    "[font-size:11px]"
  ],
  "bar-plot": [
    "[height:100%]",
    "[position:relative]",
    "[display:flex]",
    "[align-items:stretch]",
    "[justify-content:space-around]",
    "[border-bottom:1px_solid_#c9c9cc]"
  ],
  "bar-gridline": [
    "[position:absolute]",
    "[z-index:0]",
    "[left:0]",
    "[right:0]",
    "[border-top:1px_dashed_#dedee1]"
  ],
  "bar-group": [
    "[z-index:1]",
    "[position:relative]",
    "[height:100%]",
    "[width:12%]",
    "[display:flex]",
    "[align-items:center]",
    "[flex-direction:column]",
    "[justify-content:flex-end]",
    "[&_label]:[position:absolute]",
    "[&_label]:[top:calc(100%_+_8px)]",
    "[&_label]:[font-size:11px]",
    "[&_label]:[color:#64656b]"
  ],
  "stacked-bar": [
    "[width:100%]",
    "[height:calc(100%_-_2px)]",
    "[display:flex]",
    "[justify-content:flex-end]",
    "[flex-direction:column]",
    "[&_span]:[display:block]",
    "[&_span]:[flex:none]",
    "[&_span]:[min-height:0]"
  ],
  "data-card": [
    "[padding:16px_18px_17px]",
    "[margin-bottom:23px]",
    "max-[650px]:[padding:13px_10px]"
  ],
  "table-scroll": [
    "[overflow-x:auto]",
    "[border:1px_solid_#e1e2e7]",
    "[border-radius:16px]",
    "[&_table]:[width:100%]",
    "[&_table]:[border-collapse:collapse]",
    "[&_table]:[text-align:left]",
    "[&_table]:[font-size:13px]",
    "[&_thead]:[background:#eaf0ff]",
    "[&_thead]:[color:#555967]",
    "[&_th]:[height:45px]",
    "[&_th]:[padding:0_20px]",
    "[&_th]:[font-weight:500]",
    "[&_th]:[font-size:16px]",
    "[&_th]:[white-space:nowrap]",
    "[&_td]:[height:72px]",
    "[&_td]:[box-sizing:border-box]",
    "[&_td]:[padding:11px_20px]",
    "[&_td]:[border-top:1px_solid_#e4e5e9]",
    "[&_td]:[color:#3e4047]",
    "[&_td]:[white-space:nowrap]",
    "[&_td_strong]:[color:#252a34]",
    "[&_td_strong]:[font-weight:600]",
    "[&_td_small]:[display:block]",
    "[&_td_small]:[margin-top:2px]",
    "[&_td_small]:[color:#7d8490]",
    "[&_td_small]:[font-size:12px]",
    "max-[650px]:[&_th]:[padding-inline:12px]",
    "max-[650px]:[&_td]:[padding-inline:12px]"
  ],
  "status-pill": [
    "[display:inline-flex]",
    "[min-width:79px]",
    "[height:28px]",
    "[box-sizing:border-box]",
    "[align-items:center]",
    "[justify-content:center]",
    "[padding:0_10px]",
    "[border-radius:9px]",
    "[color:#242424]",
    "[font-size:11px]",
    "[&.rework]:[background:#e0c85b]",
    "[&.rework]:[color:#564714]",
    "[&.awaiting]:[background:#c4c4c4]"
  ],
  "review-button": [
    "[min-width:104px]",
    "[height:42px]",
    "[border:1px_solid_#999]",
    "[border-radius:8px]",
    "[background:#fff]",
    "[color:#333]",
    "[font:inherit]",
    "[font-size:14px]"
  ],
  "dependency-card": [
    "[&_.table-scroll_th]:[height:48px]",
    "[&_.table-scroll_td]:[height:94px]",
    "[&_.table-scroll_td.impact]:[color:#ff514a]",
    "[&_.urgency-high]:[color:#ff514a]",
    "[&_.urgency-medium]:[color:#f3912d]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



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
  return <section className={styling("dash-card chart-card")}>
    <div className={styling("dash-card-title")}><h2>Project Status</h2><div className={styling("chart-legend line-legend")}>{series.map(item => <span key={item.name}><i style={{ '--legend-color': item.color }} />{item.name}</span>)}</div></div>
    <div className={styling("line-chart")}>
      <div className={styling("y-labels")}>{[100, 80, 60, 40, 20, 0].map(value => <span key={value}>{value}%</span>)}</div>
      <svg viewBox="0 0 540 280" role="img" aria-label="Project status across six sprints">
        {[24, 68, 112, 156, 200, 244].map((line, i) => <line key={`h${i}`} x1="38" y1={line} x2="533" y2={line} className={styling("chart-gridline")} />)}
        {sprints.map((_, i) => <line key={`v${i}`} x1={x(i)} y1="24" x2={x(i)} y2="244" className={styling("chart-gridline vertical")} />)}
        {series.map(item => <g key={item.name}>
          <polyline points={item.values.map((value, i) => `${x(i)},${y(value)}`).join(' ')} fill="none" stroke={item.color} strokeWidth="2" />
          {item.values.map((value, i) => <circle key={i} cx={x(i)} cy={y(value)} r="3.5" fill="white" stroke={item.color} strokeWidth="1.5" />)}
        </g>)}
      </svg>
      <div className={styling("x-labels")}>{sprints.map(sprint => <span key={sprint}>{sprint}</span>)}</div>
    </div>
  </section>
}

function WorkloadChart() {
  const colors = ['#7167e9', '#57c3ad', '#ff9290']
  return <section className={styling("dash-card chart-card")}>
    <div className={styling("dash-card-title")}><h2>Team Workload</h2><div className={styling("chart-legend bar-legend")}>{['Lightning', 'Helix', 'Lightning App'].map((name, i) => <span key={name}><i style={{ background: colors[i] }} />{name}</span>)}</div></div>
    <div className={styling("bar-chart")}>
      <div className={styling("bar-y-labels")}>{[50, 40, 30, 20, 10, 0].map(value => <span key={value}>{value}</span>)}</div>
      <div className={styling("bar-plot")}>{[0, 10, 20, 30, 40, 50].map(value => <div className={styling("bar-gridline")} key={value} style={{ bottom: `${value * 2}%` }} />)}
        {workload.map(person => <div className={styling("bar-group")} key={person.name}><div className={styling("stacked-bar")}>{person.values.map((value, i) => <span key={i} style={{ height: `${value * 2}%`, background: colors[i] }} />)}</div><label>{person.name}</label></div>)}
      </div>
    </div>
  </section>
}

function Reviews() {
  return <section className={styling("dash-card data-card")}><div className={styling("section-title")}><h2>Pending Reviews</h2><a href="#reviews">View all</a></div>
    <div className={styling("table-scroll")}><table><thead><tr>{['Work Item', 'Project', 'Submitted by', 'Sent', 'Status', 'Actions'].map(value => <th key={value}>{value}</th>)}</tr></thead>
      <tbody>{reviewRows.map(([task, project, person, date, status, kind]) => <tr key={task}><td><strong>{task}</strong></td><td>{project}</td><td>{person}</td><td>{date}</td><td><span className={styling(`status-pill ${kind}`)}>{status}</span></td><td><button className={styling("review-button")}>Review</button></td></tr>)}</tbody>
    </table></div>
  </section>
}

function Dependencies() {
  return <section className={styling("dash-card data-card dependency-card")}><div className={styling("section-title")}><h2>Dependencies</h2><a href="#dependencies">View all</a></div>
    <div className={styling("table-scroll")}><table><thead><tr>{['Request', 'Requested by', 'Impact', 'Urgency', 'Sent'].map(value => <th key={value}>{value}</th>)}</tr></thead>
      <tbody>{dependencyRows.map(([request, project, person, role, impact, urgency, date]) => <tr key={request}><td><strong>{request}</strong><small>{project}</small></td><td>{person}<small>{role}</small></td><td className={styling(impact === '---' ? '' : 'impact')}>{impact}</td><td className={styling(urgency === 'High' ? 'urgency-high' : urgency === 'medium' ? 'urgency-medium' : '')}>{urgency}</td><td>{date}</td></tr>)}</tbody>
    </table></div>
  </section>
}

export default function ProjectManagerDashboard({ user }) {
  const firstName = user?.first_name || 'Yogita'
  return <main className={styling("pm-dashboard")}>
    <header className={styling("dashboard-greeting")}><div><h1>Hey, {firstName}</h1><p>Here’s what’s happening with your project today.</p></div><div className={styling("dashboard-actions")}><button className={styling("assign-button")}>＋ <span>Assign Task</span></button><button className={styling("create-button")}>＋ <span>Create Project</span></button></div></header>
    <div className={styling("charts-grid")}><ProjectStatusChart /><WorkloadChart /></div>
    <Reviews />
    <Dependencies />
  </main>
}
