export function durationSeconds(value) {
  if (typeof value === 'number') return Math.max(0,value)
  const match = String(value || '').match(/^(?:(\d+) )?(\d+):(\d+):(\d+(?:\.\d+)?)$/)
  return match ? Number(match[1] || 0)*86400 + Number(match[2])*3600 + Number(match[3])*60 + Number(match[4]) : 0
}

export function elapsedSeconds(task, now = Date.now()) {
  const running = task.status === 'in_progress' && task.start_Time && !task.pause_Time
  return Math.floor(durationSeconds(task.Time_Taken) + (running ? Math.max(0,(now-new Date(task.start_Time).getTime())/1000) : 0))
}
