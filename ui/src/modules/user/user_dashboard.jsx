import { useState } from 'react'
import totalTasksIcon from '../../assets/total_tasks.png'
import dependencyIcon from '../../assets/in_progress.png'
import dueTodayIcon from '../../assets/due_today.png'

/* styling */
const tailwindStyling = {
  "milestone-list": [
    "[display:flex]",
    "[flex-direction:column]",
    "[gap:16px]",
    "[gap:22px]"
  ],
  "user-dashboard": [
    "[min-height:calc(100vh_-_50px)]",
    "[padding:14px_12px_32px]",
    "[box-sizing:border-box]",
    "[background:#f9fbff]",
    "[color:#252a35]",
    "[&_h2]:[margin:0_0_8px]",
    "[&_h2]:[font-size:22px]",
    "[&_h2]:[line-height:1.3]",
    "[&_h2]:[font-weight:600]",
    "max-[650px]:[padding:10px_8px_24px]"
  ],
  "workspace-heading": [
    "[padding:19px_20px]",
    "[margin:0_10px_6px]",
    "[background:#fff]",
    "[border:1px_solid_#f0f1f5]",
    "[border-radius:12px]",
    "[&_h1]:[margin:0_0_4px]",
    "[&_h1]:[font-size:28px]",
    "[&_h1]:[line-height:1.2]",
    "[&_p]:[margin:0]",
    "[&_p]:[color:#737782]",
    "[&_p]:[font-size:14px]",
    "max-[650px]:[margin-inline:0]"
  ],
  "user-journey": [
    "[position:relative]",
    "[padding:16px_12px_0]",
    "[background:#fff]",
    "[&_h2]:[margin-bottom:6px]"
  ],
  "journey-card": [
    "[position:relative]",
    "[min-height:194px]",
    "[padding:15px_12px_17px]",
    "[border:1px_solid_#ececf0]",
    "[border-radius:16px]",
    "[box-shadow:0_2px_6px_#10182808]",
    "max-[650px]:[min-height:182px]",
    "max-[650px]:[padding-inline:8px]"
  ],
  "journey-project": [
    "[display:flex]",
    "[justify-content:space-between]",
    "[align-items:flex-start]",
    "[&_div:first-child]:[display:flex]",
    "[&_div:first-child]:[flex-direction:column]",
    "[&_div:first-child]:[gap:7px]",
    "[&_strong]:[font-size:20px]",
    "[&_strong]:[font-weight:600]",
    "[&_span]:[color:#85858a]",
    "[&_span]:[font-size:16px]",
    "max-[650px]:[&_strong]:[font-size:16px]",
    "max-[650px]:[&_span]:[font-size:12px]"
  ],
  "journey-progress": [
    "[display:flex]",
    "[flex-direction:column]",
    "[align-items:flex-end]",
    "[gap:10px]",
    "[&_b]:[font-size:25px]"
  ],
  "journey-track": [
    "[height:9px]",
    "[position:relative]",
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[margin:30px_0_26px]",
    "[border-radius:10px]",
    "[background:#d9d9d9]",
    "max-[650px]:[margin-top:35px]"
  ],
  "journey-done": [
    "[position:absolute]",
    "[left:0]",
    "[width:29%]",
    "[height:7px]",
    "[border-radius:8px]",
    "[background:#1760d0]"
  ],
  "journey-point": [
    "[z-index:1]",
    "[width:31px]",
    "[height:31px]",
    "[border:5px_solid_#d9d9d9]",
    "[box-sizing:border-box]",
    "[border-radius:50%]",
    "[background:#d3d3d3]",
    "[&.start]:[border-color:#b8d3ff]",
    "[&.start]:[background:#1760d0]",
    "[&.current]:[width:33px]",
    "[&.current]:[height:33px]",
    "[&.current]:[border-color:#45c689]",
    "[&.current]:[background:#078b42]",
    "max-[650px]:[width:24px]",
    "max-[650px]:[height:24px]",
    "max-[650px]:[&.current]:[width:27px]",
    "max-[650px]:[&.current]:[height:27px]"
  ],
  "pause-point": [
    "[z-index:2]",
    "[position:absolute]",
    "[left:43.5%]",
    "[top:-2px]",
    "[width:17px]",
    "[height:17px]",
    "[border-radius:50%]",
    "[background:#f3bf13]",
    "[color:#fff]",
    "[text-align:center]",
    "[font-size:10px]",
    "[line-height:17px]"
  ],
  "journey-labels": [
    "[display:grid]",
    "[grid-template-columns:repeat(5,_1fr)]",
    "[gap:12px]",
    "[color:#777981]",
    "[text-align:center]",
    "[font-size:14px]",
    "[line-height:1.3]",
    "max-[650px]:[font-size:10px]",
    "max-[650px]:[gap:4px]"
  ],
  "pause-card": [
    "[position:absolute]",
    "[z-index:3]",
    "[top:-50px]",
    "[left:34%]",
    "[display:flex]",
    "[width:300px]",
    "[min-height:122px]",
    "[box-sizing:border-box]",
    "[flex-direction:column]",
    "[gap:5px]",
    "[padding:16px]",
    "[border:1px_solid_#e1e9f6]",
    "[border-radius:14px]",
    "[background:#fff]",
    "[box-shadow:0_4px_10px_#26354c18]",
    "[font-size:13px]",
    "[&_strong]:[color:#313540]",
    "[&_small]:[color:#6f737d]",
    "[&_b]:[margin-top:8px]",
    "[&_span]:[color:#555963]",
    "max-[1050px]:[left:27%]",
    "max-[650px]:[top:-48px]",
    "max-[650px]:[left:24%]",
    "max-[650px]:[width:220px]",
    "max-[650px]:[min-height:108px]",
    "max-[650px]:[padding:10px]",
    "max-[650px]:[font-size:11px]"
  ],
  "user-summary": [
    "[display:grid]",
    "[grid-template-columns:repeat(4,_minmax(0,_1fr))]",
    "[gap:17px]",
    "[padding:34px_12px_31px]",
    "[background:#fff]",
    "max-[1050px]:[grid-template-columns:repeat(2,_minmax(0,_1fr))]",
    "max-[650px]:[gap:8px]",
    "max-[650px]:[padding:20px_0]"
  ],
  "summary-tile": [
    "[display:flex]",
    "[height:114px]",
    "[box-sizing:border-box]",
    "[align-items:center]",
    "[gap:16px]",
    "[padding:18px_24px]",
    "[border:1px_solid_#ededf1]",
    "[border-radius:10px]",
    "[background:#fff]",
    "[&_div]:[display:flex]",
    "[&_div]:[flex-direction:column]",
    "[&_div]:[gap:4px]",
    "[&_strong]:[font-size:15px]",
    "[&_strong]:[font-weight:600]",
    "[&_b]:[color:#4382ec]",
    "[&_b]:[font-size:20px]",
    "[&_b]:[line-height:1]",
    "[&_b.due-count]:[color:#ff575a]",
    "max-[650px]:[height:84px]",
    "max-[650px]:[gap:8px]",
    "max-[650px]:[padding:10px]",
    "max-[650px]:[&_strong]:[font-size:12px]"
  ],
  "summary-icon": [
    "[display:block]",
    "[width:44px]",
    "[height:44px]",
    "[flex:0_0_44px]",
    "[border-radius:5px]",
    "[object-fit:contain]",
    "max-[650px]:[width:34px]",
    "max-[650px]:[height:34px]",
    "max-[650px]:[flex-basis:34px]",
    "max-[650px]:[font-size:19px]"
  ],
  "user-tasks": [
    "[padding:0_8px_17px]",
    "[background:#fff]",
    "[&_h2]:[margin:0_0_25px]"
  ],
  "task-toolbar": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:12px]",
    "[margin-bottom:22px]",
    "[&_button]:[height:42px]",
    "[&_button]:[padding:0_14px]",
    "[&_button]:[border:1px_solid_#aaaeb6]",
    "[&_button]:[border-radius:9px]",
    "[&_button]:[background:#fff]",
    "[&_button]:[color:#20232a]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:14px]",
    "[&_button]:[white-space:nowrap]",
    "[&_button]:[cursor:pointer]",
    "[&_button.selected]:[border-color:#f4f3ff]",
    "[&_button.selected]:[background:#f5f3ff]",
    "[&_button.selected]:[font-weight:600]",
    "max-[1050px]:[flex-wrap:wrap]"
  ],
  "task-search": [
    "[display:flex]",
    "[width:32%]",
    "[min-width:180px]",
    "[height:42px]",
    "[box-sizing:border-box]",
    "[align-items:center]",
    "[gap:12px]",
    "[padding:0_12px]",
    "[border:1px_solid_#a9abb1]",
    "[border-radius:9px]",
    "[color:#858a94]",
    "[&_span]:[font-size:24px]",
    "[&_span]:[line-height:1]",
    "[&_input]:[width:100%]",
    "[&_input]:[min-width:0]",
    "[&_input]:[border:0]",
    "[&_input]:[outline:0]",
    "[&_input]:[background:transparent]",
    "[&_input]:[color:#343944]",
    "[&_input]:[font:inherit]",
    "[&_input]:[font-size:15px]",
    "max-[1050px]:[flex:1_1_100%]",
    "max-[1050px]:[width:auto]"
  ],
  "task-count": [
    "[margin-left:auto]",
    "[color:#90939a]",
    "[font-size:14px]",
    "[white-space:nowrap]",
    "max-[1050px]:[margin-left:auto]"
  ],
  "milestone-card": [
    "[overflow:hidden]",
    "[border:1px_solid_#aeb1b7]",
    "[border-radius:11px]",
    "[background:#fff]"
  ],
  "milestone-heading": [
    "[display:flex]",
    "[width:100%]",
    "[min-height:75px]",
    "[box-sizing:border-box]",
    "[align-items:center]",
    "[gap:14px]",
    "[padding:10px_22px]",
    "[border:0]",
    "[background:#eaf0ff]",
    "[color:#243044]",
    "[text-align:left]",
    "[cursor:pointer]",
    "[&_.milestone-meter]:[margin-left:auto]",
    "max-[650px]:[gap:7px]",
    "max-[650px]:[padding-inline:9px]"
  ],
  "milestone-chevron": [
    "[width:16px]",
    "[flex:0_0_16px]",
    "[color:#454951]",
    "[font-size:26px]",
    "[line-height:1]",
    "[text-align:center]"
  ],
  "milestone-name": [
    "[display:flex]",
    "[min-width:0]",
    "[flex-direction:column]",
    "[gap:4px]",
    "[&_strong]:[font-size:16px]",
    "[&_strong]:[font-weight:600]",
    "[&_small]:[color:#727783]",
    "[&_small]:[font-size:13px]",
    "max-[650px]:[&_strong]:[font-size:13px]",
    "max-[650px]:[&_small]:[font-size:10px]"
  ],
  "feature-row": [
    "[&_strong]:[font-size:16px]",
    "[&_strong]:[font-weight:600]",
    "[&_small]:[color:#727783]",
    "[&_small]:[font-size:13px]",
    "[display:flex]",
    "[min-height:70px]",
    "[box-sizing:border-box]",
    "[align-items:center]",
    "[gap:14px]",
    "[padding:10px_22px]",
    "[&_>_span:nth-child(2)]:[display:flex]",
    "[&_>_span:nth-child(2)]:[min-width:0]",
    "[&_>_span:nth-child(2)]:[flex:1]",
    "[&_>_span:nth-child(2)]:[flex-direction:column]",
    "[&_>_span:nth-child(2)]:[gap:4px]",
    "[&_.milestone-meter]:[margin-left:auto]",
    "max-[650px]:[gap:7px]",
    "max-[650px]:[padding-inline:9px]",
    "max-[650px]:[&_strong]:[font-size:13px]",
    "max-[650px]:[&_small]:[font-size:10px]"
  ],
  "milestone-status": [
    "[min-width:94px]",
    "[height:29px]",
    "[box-sizing:border-box]",
    "[padding:5px_9px]",
    "[border-radius:8px]",
    "[background:#165bd0]",
    "[color:white]",
    "[font-size:12px]",
    "[font-weight:600]",
    "[text-align:center]",
    "[&.done]:[background:#7dbc75]",
    "[&.done]:[color:#fff]",
    "max-[650px]:[min-width:62px]",
    "max-[650px]:[font-size:10px]"
  ],
  "milestone-meter": [
    "[display:block]",
    "[width:130px]",
    "[height:6px]",
    "[flex:0_0_130px]",
    "[overflow:hidden]",
    "[border-radius:8px]",
    "[background:#dce8ff]",
    "[&_i]:[display:block]",
    "[&_i]:[height:100%]",
    "[&_i]:[border-radius:inherit]",
    "[&_i]:[background:#1760d0]",
    "[&_i.green]:[background:#7dbc75]",
    "max-[650px]:[width:55px]",
    "max-[650px]:[flex-basis:55px]"
  ],
  "milestone-percentage": [
    "[min-width:76px]",
    "[font-size:14px]",
    "[text-align:right]",
    "[white-space:nowrap]",
    "max-[650px]:[min-width:54px]",
    "max-[650px]:[font-size:11px]"
  ],
  "milestone-details": [
    "[border-top:1px_solid_#d4d5d9]"
  ],
  "user-task-row": [
    "[display:flex]",
    "[min-height:57px]",
    "[align-items:center]",
    "[gap:12px]",
    "[padding:8px_22px_8px_30px]",
    "[border-top:1px_solid_#f0f0f2]",
    "[font-size:14px]",
    "[&_>_strong]:[flex:1]",
    "[&_>_strong]:[font-weight:500]",
    "[&_time]:[color:#777b83]",
    "[&_time]:[font-size:12px]",
    "max-[650px]:[gap:7px]",
    "max-[650px]:[padding-inline:10px]",
    "max-[650px]:[font-size:11px]"
  ],
  "task-initials": [
    "[padding:3px_4px]",
    "[border:1px_solid_#c8cbd1]",
    "[border-radius:4px]",
    "[color:#dd4c4c]",
    "[font-size:11px]",
    "max-[650px]:[&:nth-last-of-type(2)]:[display:none]"
  ],
  "task-done": [
    "[min-width:80px]",
    "[padding:6px_10px]",
    "[border-radius:9px]",
    "[background:#82be77]",
    "[color:#fff]",
    "[text-align:center]",
    "[font-size:12px]",
    "max-[650px]:[min-width:48px]",
    "max-[650px]:[padding:5px]"
  ],
  "recent-activities": [
    "[margin-top:15px]",
    "[padding:17px_16px]",
    "[border-radius:12px]",
    "[background:#fff]",
    "[&_h2]:[margin-bottom:12px]"
  ],
  "activity-list": [
    "[padding:0_20px]",
    "[border:1px_solid_#d7d8dc]",
    "[border-radius:16px]",
    "[&_article]:[display:flex]",
    "[&_article]:[min-height:82px]",
    "[&_article]:[align-items:center]",
    "[&_article]:[gap:14px]",
    "[&_article_+_article]:[border-top:1px_solid_#f0f0f2]",
    "[&_article_>_div]:[display:flex]",
    "[&_article_>_div]:[flex:1]",
    "[&_article_>_div]:[flex-direction:column]",
    "[&_article_>_div]:[gap:8px]",
    "[&_article_>_div]:[font-size:13px]",
    "[&_time]:[align-self:flex-start]",
    "[&_time]:[margin-top:18px]",
    "[&_time]:[color:#737780]",
    "[&_time]:[font-size:12px]"
  ],
  "activity-icon": [
    "[display:grid]",
    "[width:40px]",
    "[height:40px]",
    "[place-items:center]",
    "[border:1px_solid_#dce7f8]",
    "[border-radius:50%]",
    "[color:#566880]",
    "[font-size:20px]"
  ],
  "file-chip": [
    "[width:fit-content]",
    "[padding:6px_8px]",
    "[border:1px_solid_#e4e5e8]",
    "[border-radius:8px]",
    "[color:#4b5059]",
    "[font-size:12px]",
    "[&_b]:[margin-right:5px]",
    "[&_b]:[color:#ec4141]",
    "[&_b]:[font-size:10px]"
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



const milestones = [
  { id: 'M1', name: 'Requirements', status: 'Complete', progress: 100, features: '3 of 3 features complete', tasks: ['Task 1 - Add authentication module', 'Task 1 - Add authentication module'] },
  { id: 'M2', name: 'Requirements', status: 'Active', progress: 60, features: '3 of 3 features complete', tasks: ['Task 2 - Build project workspace', 'Task 3 - Connect data API'] },
  { id: 'M3', name: 'Requirements', status: 'Active', progress: 60, features: '3 of 3 features complete', tasks: ['Task 4 - Validate release workflow'] },
]

function ProjectJourney() {
  return <section className={styling("user-journey")}>
    <h2>Project Journey</h2>
    <div className={styling("journey-card")}>
      <div className={styling("journey-project")}><div><strong>Project Alpha</strong><span>M1: Core Platform Upgrade</span></div><div className={styling("journey-progress")}><b>65%</b><span>Aug 1 - Aug 31</span></div></div>
      <div className={styling("journey-track")}><div className={styling("journey-done")} /><span className={styling("journey-point start")} /><span className={styling("journey-point current")} /><span className={styling("pause-point")}>Ⅱ</span><span className={styling("journey-point")} /><span className={styling("journey-point")} /><span className={styling("journey-point")} /></div>
      <div className={styling("journey-labels")}>{['M1: Core Platform Upgrade', 'M2: Core Platform Upgrade', 'M3: Core Platform Upgrade', 'M4: Core Platform Upgrade', 'M5: Core Platform Upgrade'].map(label => <span key={label}>{label}</span>)}</div>
      <aside className={styling("pause-card")}><strong>🟡 Paused</strong><small>Mar 06 – Mar 10</small><b>Reason</b><span>Waiting for data API from backend team</span></aside>
    </div>
  </section>
}

function SummaryCards() {
  return <div className={styling("user-summary")}>{[
    [totalTasksIcon, 'Total Tasks', '2'], [dependencyIcon, 'Dependency', '2'], [dueTodayIcon, 'Blockers', '2'], [dueTodayIcon, 'Due today', '2'],
  ].map(([icon, title, count]) => <article className={styling("summary-tile")} key={title}><img className={styling("summary-icon")} src={icon} alt="" /><div><strong>{title}</strong><b className={styling(title === 'Due today' ? 'due-count' : '')}>{count}</b></div></article>)}</div>
}

function Milestone({ milestone, expanded, onToggle }) {
  const complete = milestone.progress === 100
  return <article className={styling("milestone-card")}>
    <button className={styling(`milestone-heading${complete ? ' complete' : ''}`)} onClick={onToggle} aria-expanded={expanded}>
      <span className={styling("milestone-chevron")}>{expanded ? '⌄' : '›'}</span>
      <span className={styling("milestone-name")}><strong>{milestone.id} · {milestone.name}</strong><small>15 Jun – 18 Aug · {milestone.features}</small></span>
      <span className={styling(`milestone-status ${complete ? 'done' : ''}`)}>{milestone.status}</span>
      <span className={styling("milestone-meter")}><i style={{ width: `${milestone.progress}%` }} className={styling(complete ? 'green' : '')} /></span>
      <span className={styling("milestone-percentage")}>{milestone.progress}% · 5/5</span>
    </button>
    {expanded && <div className={styling("milestone-details")}><div className={styling("feature-row")}><span className={styling("milestone-chevron")}>⌄</span><span><strong>F1 · Requirement capture</strong><small>15 Jun – 18 Aug · 3 of 3 features complete</small></span><span className={styling("milestone-meter")}><i style={{ width: `${milestone.progress}%` }} className={styling(complete ? 'green' : '')} /></span><span className={styling("milestone-percentage")}>{milestone.progress === 100 ? '100%' : `${milestone.progress}%`} · 2/2</span></div>
      {complete && milestone.tasks.map((task, index) => <div className={styling("user-task-row")} key={`${task}-${index}`}><span>•</span><strong>{task}</strong><span className={styling("task-initials")}>DK</span><span className={styling("task-initials")}>DK</span><time>8 Jun</time><span className={styling("task-done")}>Done</span></div>)}
    </div>}
  </article>
}

function Tasks() {
  const [expanded, setExpanded] = useState(['M1', 'M2'])
  const [mineOnly, setMineOnly] = useState(false)
  const [query, setQuery] = useState('')
  const visible = milestones.filter(item => `${item.id} ${item.name} ${item.tasks.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  const toggle = id => setExpanded(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const setAll = open => setExpanded(open ? milestones.map(item => item.id) : [])
  return <section className={styling("user-tasks")}><h2>Tasks</h2><div className={styling("task-toolbar")}><label className={styling("task-search")}><span>⌕</span><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tasks, docs, people...." /></label><button className={styling(!mineOnly ? 'selected' : '')} onClick={() => setMineOnly(false)}>All work</button><button className={styling(mineOnly ? 'selected' : '')} onClick={() => setMineOnly(true)}>My Work</button><button onClick={() => setAll(false)}>Collapse All</button><button onClick={() => setAll(true)}>Expand All</button><span className={styling("task-count")}>38 tasks across 5 milestones</span></div>
    <div className={styling("milestone-list")}>{visible.map(milestone => <Milestone key={milestone.id} milestone={milestone} expanded={expanded.includes(milestone.id)} onToggle={() => toggle(milestone.id)} />)}</div>
  </section>
}

function RecentActivities() {
  return <section className={styling("recent-activities")}><h2>Recent Activities</h2><div className={styling("activity-list")}>
    <article><span className={styling("activity-icon")}>✓</span><div><strong>Alex Mercer completed task</strong></div><time>4h ago</time></article>
    <article><span className={styling("activity-icon")}>⇧</span><div><strong>David Kim uploaded a file</strong><span className={styling("file-chip")}><b>PDF</b> architecture-diagram.pdf</span></div><time>Oct 24</time></article>
  </div></section>
}

export default function UserDashboard() {
  return <main className={styling("user-dashboard")}><header className={styling("workspace-heading")}><h1>Workspace</h1><p>Access project journey and your today’s task</p></header><ProjectJourney /><SummaryCards /><Tasks /><RecentActivities /></main>
}
