import { apiRequest, apiUpload } from '../../../shared/api/apiClient.js'

export const projectOptions = id => apiRequest(`/projects/setup-options/${id ? `?project=${id}` : ''}`)
export const projectSetup = (id) => apiRequest(`/projects/${id}/setup/`)
export const projectFiles = (id) => apiRequest(`/projects/${id}/files/`)

export async function uploadFiles(projectId, files, pdr = false, version = '', changelog = '') {
  if (!files.length) return
  const form = new FormData()
  files.forEach(file => form.append('files', file))
  form.append('is_pdr', String(pdr))
  if (pdr) {
    form.append('pdr_version', version)
    form.append('pdr_changelog', changelog)
  }
  return apiUpload(`/projects/${projectId}/files/`, form)
}

export async function saveProjectFiles(id, form, originalFiles) {
  const retainedIds = new Set(form.files.filter(file => file.id).map(file => file.id))
  for (const file of originalFiles.filter(file => !retainedIds.has(file.id))) {
    await apiRequest(`/projects/${id}/files/`, { method: 'DELETE', body: { id: file.id } })
  }
  for (const file of form.files.filter(item => item.id && item.is_pdr)) {
    const original = originalFiles.find(item => item.id === file.id)
    if (original && (original.pdr_version !== form.pdrVersion || original.pdr_changelog !== form.pdrChangelog)) {
      await apiRequest(`/projects/${id}/files/`, { method: 'PATCH', body: {
        id: file.id, pdr_version: form.pdrVersion, pdr_changelog: form.pdrChangelog,
      } })
    }
  }
  await uploadFiles(id, form.files.filter(file => file.file && !file.is_pdr).map(file => file.file))
  await uploadFiles(id, form.files.filter(file => file.file && file.is_pdr).map(file => file.file),
    true, form.pdrVersion, form.pdrChangelog)
}

export function projectFields(form) {
  return {
    project_code: form.projectCode.trim(),
    project_name: form.projectName.trim(),
    description: form.description.trim(),
    customer_name: form.customer.trim(),
    priority_name: form.priority,
    project_type_name: form.projectType,
    project_managers: form.projectManager ? [form.projectManager] : [],
    departments: form.departments,
    team_members: form.members,
    start_date: form.startDate || null,
    end_date: form.endDate || null,
    points_per_working_day: Number(form.pointsPerDay),
    resource_links: form.links.filter(Boolean).map(link => link.trim()),
  }
}

const taskRemarks = (task, milestoneId) => {
  let metadata
  try { metadata = JSON.parse(task.remarksRaw || '{}') } catch { metadata = { notes: task.remarksRaw } }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) metadata = { notes: task.remarksRaw }
  if (task.remarksRaw && task.priority === task.originalPriority && (milestoneId === undefined || (metadata.milestone_id || null) === milestoneId)) return task.remarksRaw
  metadata.priority = task.priority
  if (milestoneId) metadata.milestone_id = milestoneId
  else if (milestoneId === null) delete metadata.milestone_id
  return JSON.stringify(metadata)
}

const taskFields = (task, sprintRef, featureId, milestoneId) => ({
  Task_Name: task.name.trim(), description: task.description.trim(),
  assigned_to: task.assignee, review_by: task.reviewer || null,
  Due_Date: task.dueDate || null, planned_start_date: task.startDate || null,
  Remarks: taskRemarks(task, milestoneId),
  ...(sprintRef ? { sprint_ref: sprintRef } : {}),
  ...(featureId ? { feature: featureId } : {}),
})

export function creationPayload(form) {
  const tasks = form.tasks.map(task => ({ ...taskFields(task, task.sprintKey, null), temp_id: task.key,
    ...(task.milestoneKey && !task.featureKey ? { milestone_ref: task.milestoneKey } : {}) }))
  return {
    ...projectFields(form),
    milestones: form.milestones.map(milestone => ({
      client_id: milestone.key, name: milestone.name.trim(), description: milestone.description.trim(),
      start_date: milestone.startDate || null, due_date: milestone.dueDate,
      features: milestone.features.map(feature => ({
        feature_name: feature.name.trim(), description: feature.description.trim(),
        feature_status: feature.status, feature_priority: feature.priority,
        feature_start_date: feature.startDate || null,
        feature_due_date: feature.dueDate ? `${feature.dueDate}T00:00:00Z` : null,
        tasks: tasks.filter((_, index) => form.tasks[index].featureKey === feature.key),
      })),
    })),
    sprints: form.sprints.map(sprint => ({
      client_id: sprint.key, Sprint_No: sprint.number.trim(), Sprint_Name: sprint.name.trim(),
      Sprint_start_date: sprint.startDate, Sprint_end_date: sprint.endDate,
      exclude_weekends: sprint.excludeWeekends, team_members: sprint.members,
      off_days: sprint.offDays,
    })),
    tasks: tasks.filter((_, index) => !form.tasks[index].featureKey),
    dependencies: form.dependencies.map(dependency => ({
      task_ref: dependency.taskKey, depends_on_ref: dependency.dependsOnKey || undefined,
      description: dependency.description.trim(), dependency_type: dependency.dependencyType || 'optional',
      assigned_to: dependency.assignee || null,
      due_date: dependency.dueDate || null,
    })),
  }
}

const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b)

export async function updateProject(id, form, initial, originalFiles) {
  // Extend the date range first so existing children can move before the final range is saved.
  const widerStart = [initial.startDate, form.startDate].filter(Boolean).sort()[0] || null
  const widerEnd = [initial.endDate, form.endDate].filter(Boolean).sort().at(-1) || null
  if (widerStart !== initial.startDate || widerEnd !== initial.endDate) {
    await apiRequest(`/projects/${id}/`, { method: 'PATCH', body: { start_date: widerStart, end_date: widerEnd } })
  }
  const project = await apiRequest(`/projects/${id}/`, { method: 'PATCH', body: {
    ...projectFields(form), start_date: widerStart, end_date: widerEnd,
  } })

  const currentDependencies = new Set(form.dependencies.map(item => item.id).filter(Boolean))
  const currentTasks = new Set(form.tasks.map(item => item.id).filter(Boolean))
  const currentFeatures = new Set(form.milestones.flatMap(item => item.features.map(feature => feature.id)).filter(Boolean))
  const currentMilestones = new Set(form.milestones.map(item => item.id).filter(Boolean))
  const currentSprints = new Set(form.sprints.map(item => item.id).filter(Boolean))

  for (const item of initial.dependencies.filter(item => item.id && !currentDependencies.has(item.id))) {
    await apiRequest(`/dependencies/${item.id}/`, { method: 'DELETE' })
  }
  for (const item of initial.tasks.filter(item => item.id && !currentTasks.has(item.id))) {
    await apiRequest(`/tasks/${item.id}/`, { method: 'DELETE' })
  }
  for (const item of initial.milestones.flatMap(m => m.features).filter(item => item.id && !currentFeatures.has(item.id))) {
    await apiRequest(`/features/${item.id}/`, { method: 'DELETE' })
  }
  for (const item of initial.milestones.filter(item => item.id && !currentMilestones.has(item.id))) {
    await apiRequest(`/milestones/${item.id}/`, { method: 'DELETE' })
  }
  for (const item of initial.sprints.filter(item => item.id && !currentSprints.has(item.id))) {
    await apiRequest(`/sprints/${item.id}/`, { method: 'DELETE' })
  }

  const featureIds = {}
  const milestoneIds = {}
  for (const milestone of form.milestones) {
    const payload = { project: id, name: milestone.name.trim(), description: milestone.description.trim(),
      start_date: milestone.startDate || null, due_date: milestone.dueDate }
    const before = initial.milestones.find(item => item.id === milestone.id)
    const saved = milestone.id && before && !changed(payload, {
      project: id, name: before.name.trim(), description: before.description.trim(),
      start_date: before.startDate || null, due_date: before.dueDate,
    }) ? { id: milestone.id } : await apiRequest(milestone.id ? `/milestones/${milestone.id}/` : '/milestones/', {
      method: milestone.id ? 'PATCH' : 'POST', body: payload,
    })
    milestoneIds[milestone.key] = saved.id
    for (const feature of milestone.features) {
      const data = { Milestone: saved.id, feature_name: feature.name.trim(),
        description: feature.description.trim(), feature_status: feature.status,
        feature_priority: feature.priority, feature_start_date: feature.startDate || null,
        feature_due_date: feature.dueDate ? `${feature.dueDate}T00:00:00Z` : null }
      const old = before?.features.find(item => item.id === feature.id)
      const prior = old && { Milestone: before.id, feature_name: old.name.trim(),
        description: old.description.trim(), feature_status: old.status,
        feature_priority: old.priority, feature_start_date: old.startDate || null,
        feature_due_date: old.dueDate ? `${old.dueDate}T00:00:00Z` : null }
      const savedFeature = feature.id && !changed(data, prior) ? { id: feature.id } :
        await apiRequest(feature.id ? `/features/${feature.id}/` : '/features/', {
          method: feature.id ? 'PATCH' : 'POST', body: data,
        })
      featureIds[feature.key] = savedFeature.id
    }
  }

  const sprintIds = {}
  for (const sprint of form.sprints) {
    const data = { project: id, Sprint_No: sprint.number.trim(), Sprint_Name: sprint.name.trim(),
      Sprint_start_date: sprint.startDate, Sprint_end_date: sprint.endDate,
      exclude_weekends: sprint.excludeWeekends, team_members: sprint.members,
      off_days: sprint.offDays }
    const old = initial.sprints.find(item => item.id === sprint.id)
    const prior = old && { project: id, Sprint_No: old.number.trim(), Sprint_Name: old.name.trim(),
      Sprint_start_date: old.startDate, Sprint_end_date: old.endDate,
      exclude_weekends: old.excludeWeekends, team_members: old.members,
      off_days: old.offDays }
    const saved = sprint.id && !changed(data, prior) ? { id: sprint.id } :
      await apiRequest(sprint.id ? `/sprints/${sprint.id}/` : '/sprints/', {
        method: sprint.id ? 'PATCH' : 'POST', body: data,
      })
    sprintIds[sprint.key] = saved.id
  }

  const taskIds = {}
  for (const task of form.tasks) {
    const data = { ...taskFields(task, null, null, !task.featureKey ? milestoneIds[task.milestoneKey] || null : null), project: id,
      sprint: sprintIds[task.sprintKey] || null, feature: featureIds[task.featureKey] || null }
    const old = initial.tasks.find(item => item.id === task.id)
    const prior = old && { ...taskFields(old, null, null, !old.featureKey ? initial.milestones.find(item => item.key === old.milestoneKey)?.id || null : null), project: id,
      sprint: initial.sprints.find(sprint => sprint.key === old.sprintKey)?.id || null,
      feature: initial.milestones.flatMap(m => m.features).find(feature => feature.key === old.featureKey)?.id || null }
    const saved = task.id && !changed(data, prior) ? { id: task.id } :
      await apiRequest(task.id ? `/tasks/${task.id}/` : '/tasks/', {
        method: task.id ? 'PATCH' : 'POST', body: data,
      })
    taskIds[task.key] = saved.id
  }

  for (const dependency of form.dependencies) {
    const data = { task: taskIds[dependency.taskKey],
      depends_on: taskIds[dependency.dependsOnKey] || null,
      description: dependency.description.trim(), dependency_type: dependency.dependencyType || 'optional',
      assigned_to: dependency.assignee || null,
      due_date: dependency.dueDate || null }
    const old = initial.dependencies.find(item => item.id === dependency.id)
    const prior = old && { task: old.taskId, depends_on: old.dependsOnId || null,
      description: old.description.trim(), dependency_type: old.dependencyType || 'optional',
      assigned_to: old.assignee || null,
      due_date: old.dueDate || null }
    if (!dependency.id || changed(data, prior)) {
      await apiRequest(dependency.id ? `/dependencies/${dependency.id}/` : '/dependencies/', {
        method: dependency.id ? 'PATCH' : 'POST', body: data,
      })
    }
  }
  if (form.startDate !== widerStart || form.endDate !== widerEnd) {
    await apiRequest(`/projects/${id}/`, { method: 'PATCH', body: {
      start_date: form.startDate || null, end_date: form.endDate || null,
    } })
  }
  await saveProjectFiles(id, form, originalFiles)
  return project
}

export async function createProject(form, projectOnly = false) {
  const project = await apiRequest('/projects/', {
    method: 'POST', body: projectOnly ? projectFields(form) : creationPayload(form),
  })
  await saveProjectFiles(project.id, form, [])
  return project
}
