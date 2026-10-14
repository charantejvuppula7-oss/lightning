import { Fragment, useMemo, useState } from 'react'

/* styling */
const tailwindStyling = {
  "project-card": [
    "[background:#fff]",
    "[border:1px_solid_#e2e8f0]",
    "[border-radius:16px]",
    "[box-shadow:0_2px_8px_#00000005]",
    "[padding:28px]",
    "[min-width:0]",
    "[&_>_.project-grid]:[margin-bottom:20px]",
    "[&_>_.project-field]:[margin-bottom:20px]",
    "max-[700px]:[padding:18px]"
  ],
  "pm-projects-page": [
    "[min-height:calc(100vh_-_50px)]",
    "[padding:10px_12px_28px]",
    "[box-sizing:border-box]",
    "[background:#fff]",
    "[color:#20232a]",
    "max-[650px]:[padding:10px_8px_24px]"
  ],
  "pm-projects-heading": [
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[margin:0_8px_17px]",
    "[&_h1]:[margin:0]",
    "[&_h1]:[font-size:19px]",
    "[&_h1]:[font-weight:600]",
    "[&_button]:[height:42px]",
    "[&_button]:[padding:0_17px]",
    "[&_button]:[border:0]",
    "[&_button]:[border-radius:11px]",
    "[&_button]:[background:#155bd7]",
    "[&_button]:[color:#fff]",
    "[&_button]:[box-shadow:0_2px_4px_#1459d233]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:14px]",
    "[&_button]:[font-weight:600]"
  ],
  "pm-project-cards": [
    "[display:grid]",
    "[grid-template-columns:repeat(4,_minmax(0,_1fr))]",
    "[gap:16px]",
    "[margin:0_8px_25px]",
    "max-[1050px]:[grid-template-columns:repeat(2,minmax(0,1fr))]",
    "max-[650px]:[gap:8px]",
    "max-[650px]:[margin-inline:0]"
  ],
  "pm-project-card": [
    "[min-width:0]",
    "[height:146px]",
    "[padding:10px_12px]",
    "[border:1px_solid_#d9d9dd]",
    "[border-radius:9px]",
    "[background:#fff]",
    "[color:#23252a]",
    "[text-align:left]",
    "[cursor:pointer]",
    "[&.selected]:[border:2px_solid_#2869e6]",
    "[&.selected]:[padding:9px_11px]",
    "[&_p]:[margin:4px_0_0]",
    "[&_p]:[color:#73757a]",
    "[&_p]:[font-size:13px]",
    "[&_.project-percent]:[margin:7px_0_3px]",
    "[&_.project-percent]:[color:#34363a]",
    "[&_.project-percent]:[font-size:12px]",
    "[&_.project-percent]:[text-align:right]",
    "max-[650px]:[height:140px]",
    "max-[650px]:[padding:8px]",
    "max-[650px]:[&.selected]:[padding:7px]"
  ],
  "pm-project-card-top": [
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[gap:6px]",
    "[&_strong]:[overflow:hidden]",
    "[&_strong]:[font-size:14px]",
    "[&_strong]:[text-overflow:ellipsis]",
    "[&_strong]:[white-space:nowrap]",
    "max-[650px]:[align-items:flex-start]",
    "max-[650px]:[flex-direction:column]",
    "max-[650px]:[gap:4px]"
  ],
  "project-state": [
    "[display:inline-flex]",
    "[min-width:78px]",
    "[min-height:28px]",
    "[box-sizing:border-box]",
    "[align-items:center]",
    "[justify-content:center]",
    "[padding:3px_8px]",
    "[border-radius:16px]",
    "[color:#252525]",
    "[font-size:12px]",
    "[white-space:nowrap]",
    "[&.on-going]:[background:#c6d77f]",
    "[&.paused]:[background:#dedede]",
    "[&.upcoming]:[background:#f6d082]",
    "max-[650px]:[min-height:22px]",
    "max-[650px]:[min-width:65px]",
    "max-[650px]:[font-size:10px]"
  ],
  "project-progress": [
    "[height:7px]",
    "[overflow:hidden]",
    "[border-radius:8px]",
    "[background:#f0f1f3]",
    "[&_i]:[display:block]",
    "[&_i]:[width:70%]",
    "[&_i]:[height:100%]",
    "[&_i]:[border-radius:inherit]",
    "[&_i]:[background:#5847e8]"
  ],
  "project-due": [
    "[margin-top:8px]!"
  ],
  "project-counts": [
    "[display:flex]",
    "[gap:12px]",
    "[margin-top:6px]",
    "[color:#35373b]",
    "[font-size:12px]",
    "[white-space:nowrap]",
    "max-[650px]:[gap:5px]",
    "max-[650px]:[font-size:9px]"
  ],
  "pm-overview-card": [
    "[margin:0_8px_10px]",
    "[padding:15px_18px]",
    "[border:1px_solid_#d6d6d9]",
    "[border-radius:8px]",
    "[background:#fff]",
    "max-[650px]:[margin-inline:0]",
    "max-[650px]:[padding-inline:10px]"
  ],
  "pm-details-card": [
    "[margin:0_8px_10px]",
    "[padding:15px_18px]",
    "[border:1px_solid_#d6d6d9]",
    "[border-radius:8px]",
    "[background:#fff]",
    "[padding:13px_18px_12px]",
    "[&_h2]:[margin:0_0_10px]",
    "[&_h2]:[font-size:16px]",
    "[&_>_div]:[display:grid]",
    "[&_>_div]:[grid-template-columns:1fr_1.8fr_1.5fr_1fr_1fr_1.1fr]",
    "[&_>_div]:[overflow:hidden]",
    "[&_>_div]:[border:1px_solid_#e1e7ee]",
    "[&_>_div]:[border-radius:12px]",
    "[&_article]:[min-width:0]",
    "[&_article]:[display:flex]",
    "[&_article]:[min-height:67px]",
    "[&_article]:[flex-direction:column]",
    "[&_article]:[justify-content:center]",
    "[&_article]:[gap:5px]",
    "[&_article]:[padding:8px_14px]",
    "[&_article]:[border-right:1px_solid_#e7ebf0]",
    "[&_article:last-child]:[border-right:0]",
    "[&_article_span]:[color:#adb8c6]",
    "[&_article_span]:[font-size:12px]",
    "[&_article_strong]:[overflow:hidden]",
    "[&_article_strong]:[color:#444852]",
    "[&_article_strong]:[font-size:12px]",
    "[&_article_strong]:[font-weight:500]",
    "[&_article_strong]:[text-overflow:ellipsis]",
    "[&_article_strong]:[white-space:nowrap]",
    "max-[1050px]:[&_>_div]:[grid-template-columns:repeat(3,minmax(0,1fr))]",
    "max-[1050px]:[&_article:nth-child(3)]:[border-right:0]",
    "max-[1050px]:[&_article:nth-child(n+4)]:[border-top:1px_solid_#e7ebf0]",
    "max-[650px]:[margin-inline:0]",
    "max-[650px]:[padding-inline:10px]",
    "max-[650px]:[&_>_div]:[grid-template-columns:repeat(2,minmax(0,1fr))]",
    "max-[650px]:[&_article]:[padding-inline:8px]",
    "max-[650px]:[&_article:nth-child(3)]:[border-right:1px_solid_#e7ebf0]",
    "max-[650px]:[&_article:nth-child(2n)]:[border-right:0]",
    "max-[650px]:[&_article:nth-child(n+3)]:[border-top:1px_solid_#e7ebf0]"
  ],
  "pm-overview-head": [
    "[display:flex]",
    "[justify-content:space-between]",
    "[gap:12px]",
    "[padding-bottom:15px]",
    "[border-bottom:1px_solid_#d8d8db]",
    "[&_h2]:[margin:0_0_5px]",
    "[&_h2]:[font-size:19px]",
    "[&_h3]:[margin:0_0_8px]",
    "[&_h3]:[font-size:18px]"
  ],
  "project-meta": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:12px]",
    "[color:#9299a3]",
    "[font-size:12px]",
    "[&_span:first-child]:[padding:4px_7px]",
    "[&_span:first-child]:[border-radius:4px]",
    "[&_span:first-child]:[background:#eef2f8]",
    "[&_span:first-child]:[color:#637083]",
    "[&_b]:[padding:4px_7px]",
    "[&_b]:[border-radius:10px]",
    "[&_b]:[background:#fff0f0]",
    "[&_b]:[color:#db5454]",
    "[&_b]:[font-weight:500]"
  ],
  "pm-overview-actions": [
    "[display:flex]",
    "[align-items:flex-start]",
    "[gap:8px]",
    "[&_button]:[height:30px]",
    "[&_button]:[padding:0_12px]",
    "[&_button]:[border:1px_solid_#dddde1]",
    "[&_button]:[border-radius:7px]",
    "[&_button]:[background:#fff]",
    "[&_button]:[color:#4c4e53]",
    "[&_button]:[font:inherit]",
    "[&_button]:[font-size:12px]",
    "[&_button]:[white-space:nowrap]",
    "[&_button:last-child]:[width:32px]",
    "[&_button:last-child]:[padding:0]",
    "[&_button:last-child]:[font-size:18px]",
    "max-[650px]:[gap:4px]",
    "max-[650px]:[&_button]:[padding-inline:6px]",
    "max-[650px]:[&_button]:[font-size:10px]"
  ],
  "pm-project-journey": [
    "[padding:15px_0_2px]",
    "[&_h2]:[margin:0_0_25px]",
    "[&_h2]:[font-size:16px]",
    "max-[650px]:[&_h2]:[margin-bottom:18px]"
  ],
  "pm-journey-track": [
    "[position:relative]",
    "[display:flex]",
    "[align-items:center]",
    "[justify-content:space-between]",
    "[height:6px]",
    "[margin:0_9px_18px]",
    "[border-radius:8px]",
    "[background:#e4e5e8]"
  ],
  "pm-track-complete": [
    "[position:absolute]",
    "[left:0]",
    "[width:24%]",
    "[height:6px]",
    "[border-radius:8px]",
    "[background:linear-gradient(to_right,#1760d0_62%,#f24737_62%,#f24737_78%,#efa315_78%,#efa315_92%,#8758e9_92%)]"
  ],
  "journey-marker": [
    "[z-index:1]",
    "[width:23px]",
    "[height:23px]",
    "[border-radius:50%]",
    "[background:#d3d5d9]",
    "[&.first]:[background:#1760d0]",
    "[&.first]:[box-shadow:0_0_0_4px_#e3edff]",
    "[&.second]:[background:#07944e]",
    "[&.second]:[box-shadow:0_0_0_4px_#d8f5e6]",
    "max-[650px]:[width:16px]",
    "max-[650px]:[height:16px]"
  ],
  "pm-journey-labels": [
    "[display:grid]",
    "[grid-template-columns:repeat(5,minmax(0,1fr))]",
    "[gap:12px]",
    "[color:#71747a]",
    "[text-align:center]",
    "[font-size:12px]",
    "[line-height:1.35]",
    "max-[650px]:[gap:4px]",
    "max-[650px]:[font-size:9px]"
  ],
  "pm-team": [
    "[&_h2]:[margin:0_0_10px]",
    "[&_h2]:[font-size:16px]",
    "[margin:23px_8px_20px]",
    "[&_>_div]:[display:grid]",
    "[&_>_div]:[grid-template-columns:repeat(6,minmax(0,1fr))]",
    "[&_>_div]:[gap:16px]",
    "[&_article]:[position:relative]",
    "[&_article]:[display:grid]",
    "[&_article]:[min-width:0]",
    "[&_article]:[min-height:75px]",
    "[&_article]:[grid-template-columns:24px_1fr]",
    "[&_article]:[grid-template-rows:auto_auto_auto]",
    "[&_article]:[align-content:center]",
    "[&_article]:[column-gap:8px]",
    "[&_article]:[padding:8px]",
    "[&_article]:[border:1px_solid_#d7d7db]",
    "[&_article]:[border-radius:6px]",
    "[&_article_>_i]:[width:24px]",
    "[&_article_>_i]:[height:24px]",
    "[&_article_>_i]:[grid-row:1_/_4]",
    "[&_article_>_i]:[border-radius:50%]",
    "[&_article_>_i]:[background:#d6d7d9]",
    "[&_article_strong]:[overflow:hidden]",
    "[&_article_strong]:[font-size:13px]",
    "[&_article_strong]:[text-overflow:ellipsis]",
    "[&_article_strong]:[white-space:nowrap]",
    "[&_article_small]:[color:#999da4]",
    "[&_article_small]:[font-size:11px]",
    "max-[1050px]:[&_>_div]:[grid-template-columns:repeat(3,minmax(0,1fr))]",
    "max-[650px]:[margin-inline:0]",
    "max-[650px]:[&_>_div]:[grid-template-columns:repeat(2,minmax(0,1fr))]",
    "max-[650px]:[&_>_div]:[gap:8px]"
  ],
  "pm-tasks-section": [
    "[&_h2]:[margin:0_0_10px]",
    "[&_h2]:[font-size:16px]",
    "[margin:0_8px]",
    "[&_h2]:[margin-bottom:10px]"
  ],
  "presence": [
    "[position:absolute]",
    "[top:8px]",
    "[right:9px]",
    "[width:8px]",
    "[height:8px]",
    "[border-radius:50%]",
    "[background:#7cdda4]"
  ],
  "pm-task-table-wrap": [
    "[overflow-x:auto]",
    "[padding:14px_16px]",
    "[border:1px_solid_#d7d7db]",
    "[border-radius:9px]",
    "[&_table]:[width:100%]",
    "[&_table]:[min-width:650px]",
    "[&_table]:[border-collapse:collapse]",
    "[&_table]:[text-align:left]",
    "[&_table]:[font-size:13px]",
    "[&_th]:[height:48px]",
    "[&_th]:[padding:0_20px]",
    "[&_th]:[background:#eaf0ff]",
    "[&_th]:[font-weight:600]",
    "[&_td]:[height:55px]",
    "[&_td]:[padding:0_20px]",
    "[&_td]:[border-bottom:1px_solid_#e4e4e6]",
    "[&_.feature-group_td]:[height:49px]",
    "[&_.feature-group_td]:[background:#eaf0ff]",
    "[&_.feature-group_td]:[color:#697180]",
    "[&_.project-task_td]:[font-weight:500]",
    "max-[650px]:[padding:10px]"
  ],
  "pm-task-filters": [
    "[display:flex]",
    "[align-items:center]",
    "[gap:12px]",
    "[margin-bottom:10px]",
    "[&_input]:[height:34px]",
    "[&_input]:[box-sizing:border-box]",
    "[&_input]:[border:1px_solid_#e0e5ec]",
    "[&_input]:[border-radius:8px]",
    "[&_input]:[background:#fff]",
    "[&_input]:[color:#60656f]",
    "[&_input]:[font:inherit]",
    "[&_input]:[font-size:12px]",
    "[&_select]:[height:34px]",
    "[&_select]:[box-sizing:border-box]",
    "[&_select]:[border:1px_solid_#e0e5ec]",
    "[&_select]:[border-radius:8px]",
    "[&_select]:[background:#fff]",
    "[&_select]:[color:#60656f]",
    "[&_select]:[font:inherit]",
    "[&_select]:[font-size:12px]",
    "[&_input]:[width:min(42%,_490px)]",
    "[&_input]:[margin-right:auto]",
    "[&_input]:[padding:0_12px]",
    "[&_select]:[min-width:110px]",
    "[&_select]:[padding:0_10px]",
    "[&_.pm-clear-filters]:[border:0]",
    "[&_.pm-clear-filters]:[background:transparent]",
    "[&_.pm-clear-filters]:[color:#2867d7]",
    "[&_.pm-clear-filters]:[font:inherit]",
    "[&_.pm-clear-filters]:[font-size:12px]",
    "[&_.pm-clear-filters]:[cursor:pointer]",
    "max-[650px]:[flex-wrap:wrap]",
    "max-[650px]:[&_input]:[width:100%]",
    "max-[650px]:[&_select]:[min-width:0]",
    "max-[650px]:[&_select]:[flex:1]"
  ],
  "priority": [
    "[display:inline-flex]",
    "[min-width:73px]",
    "[height:36px]",
    "[align-items:center]",
    "[justify-content:center]",
    "[border-radius:9px]",
    "[font-size:11px]",
    "[&.low]:[background:#c9d77f]",
    "[&.high]:[background:#ef777b]",
    "[&.medium]:[background:#bdc8f7]"
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
  ]
}
const styling = value => {
  const classes = typeof value === 'string' ? value : ''
  const utilities = classes.split(/\s+/).flatMap(name => tailwindStyling[name] || [])
  return [...new Set([...classes.split(/\s+/), ...utilities])].filter(Boolean).join(' ')
}



const projects = [
  { name: 'Lightning', milestone: 'M2- Design Login Page', status: 'On going', due: '24-09-26', dependencies: 5, blockers: 1 },
  { name: 'Helix', milestone: 'M2- Design Login Page', status: 'Paused', due: '24-09-26', dependencies: 5, blockers: 1 },
  { name: 'Lightning', milestone: 'M2- Design Login Page', status: 'Upcoming', due: '24-09-26', dependencies: 5, blockers: 1 },
  { name: 'Lightning', milestone: 'M2- Design Login Page', status: 'On going', due: '24-09-26', dependencies: 5, blockers: 1 },
]

const tasks = [
  { feature: 'Feature 1', task: 'Task 1', milestone: 'PCB revision', assignee: 'sysadmin', due: '21 Sep 2026', priority: 'Low' },
  { feature: 'Feature 1', task: 'Task 2', milestone: 'Driver update', assignee: 'yogitamehra', due: '5 Sep 2026', priority: 'High' },
  { feature: 'Feature 1', task: 'Task 3', milestone: 'API integration', assignee: 'yogitamehra', due: '8 Sep 2026', priority: 'Medium' },
  { feature: 'Feature 2', task: 'Task 1', milestone: 'PCB revision', assignee: 'sysadmin', due: '21 Sep 2026', priority: 'Low' },
  { feature: 'Feature 2', task: 'Task 2', milestone: 'Driver update', assignee: 'yogitamehra', due: '5 Sep 2026', priority: 'High' },
]

function ProjectJourney() {
  return <section className={styling("pm-project-journey")}>
    <h2>Project journey</h2>
    <div className={styling("pm-journey-track")}><span className={styling("pm-track-complete")} /><i className={styling("journey-marker first")} /><i className={styling("journey-marker second")} /><i className={styling("journey-marker")} /><i className={styling("journey-marker")} /><i className={styling("journey-marker")} /></div>
    <div className={styling("pm-journey-labels")}>{['M1: Core Platform Upgrade', 'M2: Core Platform Upgrade', 'M3: Core Platform Upgrade', 'M4: Core Platform Upgrade', 'M5: Core Platform Upgrade'].map(item => <span key={item}>{item}</span>)}</div>
  </section>
}

function ProjectsOverview() {
  const [selected, setSelected] = useState(1)
  const project = projects[selected]
  return <>
    <div className={styling("pm-projects-heading")}><h1>Projects</h1><button type="button">＋ Create Project</button></div>
    <div className={styling("pm-project-cards")}>{projects.map((item, index) => <button key={`${item.name}-${index}`} type="button" className={styling(`pm-project-card${selected === index ? ' selected' : ''}`)} onClick={() => setSelected(index)}>
      <div className={styling("pm-project-card-top")}><strong>{item.name}</strong><span className={styling(`project-state ${item.status.toLowerCase().replace(' ', '-')}`)}>{item.status}</span></div>
      <p>{item.milestone}</p><div className={styling("project-percent")}>70%</div><div className={styling("project-progress")}><i /></div>
      <p className={styling("project-due")}>Due: {item.due}</p><div className={styling("project-counts")}><span>♧ {item.dependencies} dependency</span><span>⊘ {item.blockers} blocker</span></div>
    </button>)}</div>
    <section className={styling("pm-overview-card")}><div className={styling("pm-overview-head")}><div><h2>Project Overview</h2><h3>{project.name}</h3><div className={styling("project-meta")}><span>AP422</span><b>● Delayed</b><span>Acme</span></div></div><div className={styling("pm-overview-actions")}><button>Assign Task</button><button>Edit project</button><button aria-label="More project options">⋮</button></div></div><ProjectJourney /></section>
  </>
}

function ProjectDetails() {
  const details = [['Project manager', 'Yogita mehra'], ['Planned window', '21 Aug – 27 Aug 2026'], ['Current Milestone', 'Design PM dashboard'], ['Client', 'Acme'], ['Blockers', '2'], ['Dependencies', '6']]
  return <section className={styling("pm-details-card")}><h2>Project Details</h2><div>{details.map(([label, value]) => <article key={label}><span>{label}</span><strong>{value}</strong></article>)}</div></section>
}

function TeamMembers() {
  return <section className={styling("pm-team")}><h2>Team Member</h2><div>{Array.from({ length: 6 }, (_, index) => <article key={index}><i /><span className={styling(`presence presence-${index}`)} /><strong>Yogita Mehra</strong><small>UI/UX Designer</small><small>5 tasks</small></article>)}</div></section>
}

function ProjectTasks() {
  const [query, setQuery] = useState('')
  const [milestone, setMilestone] = useState('')
  const [assignee, setAssignee] = useState('')
  const [priority, setPriority] = useState('')
  const filtered = useMemo(() => tasks.filter(row =>
    (!query || `${row.feature} ${row.task} ${row.milestone} ${row.assignee}`.toLowerCase().includes(query.toLowerCase())) &&
    (!milestone || row.milestone === milestone) && (!assignee || row.assignee === assignee) && (!priority || row.priority === priority)), [query, milestone, assignee, priority])
  const clearFilters = () => { setQuery(''); setMilestone(''); setAssignee(''); setPriority('') }
  return <section className={styling("pm-tasks-section")}><h2>Tasks</h2><div className={styling("pm-task-table-wrap")}><div className={styling("pm-task-filters")}><input aria-label="Search tasks" placeholder="⌕  Search tasks" value={query} onChange={event => setQuery(event.target.value)} />
    <select aria-label="Filter by milestone" value={milestone} onChange={event => setMilestone(event.target.value)}><option value="">Milestone</option>{[...new Set(tasks.map(row => row.milestone))].map(value => <option key={value}>{value}</option>)}</select>
    <select aria-label="Filter by assignee" value={assignee} onChange={event => setAssignee(event.target.value)}><option value="">Anyone</option>{[...new Set(tasks.map(row => row.assignee))].map(value => <option key={value}>{value}</option>)}</select>
    <select aria-label="Filter by priority" value={priority} onChange={event => setPriority(event.target.value)}><option value="">Any priority</option>{['Low', 'Medium', 'High'].map(value => <option key={value}>{value}</option>)}</select>
    <button className={styling("pm-clear-filters")} onClick={clearFilters}>Clear</button></div>
    <table><thead><tr>{['Feature', 'Milestone', 'Assigned to', 'Due Date', 'Priority'].map(item => <th key={item}>{item}</th>)}</tr></thead><tbody>
      {filtered.map((row, index) => <Fragment key={`${row.feature}-${row.task}`}>
        {(index === 0 || filtered[index - 1].feature !== row.feature) && <tr className={styling("feature-group")} key={`${row.feature}-header-${index}`}><td colSpan="5">{row.feature}</td></tr>}
        <tr className={styling("project-task")}><td>{row.task}</td><td>{row.milestone}</td><td>{row.assignee}</td><td>{row.due}</td><td><span className={styling(`priority ${row.priority.toLowerCase()}`)}>{row.priority}</span></td></tr>
      </Fragment>)}</tbody></table>
  </div></section>
}

export default function PmProjects() {
  return <main className={styling("pm-projects-page")}><ProjectsOverview /><ProjectDetails /><TeamMembers /><ProjectTasks /></main>
}
