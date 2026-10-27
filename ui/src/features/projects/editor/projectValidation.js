import { roleSlug } from '../../../shared/utils/roles.js'

export const fileLimit = 100 * 1024 * 1024
export const isManagerOption = user => ['admin', 'pm'].includes(roleSlug(user?.role_link__name || user?.role))

const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') &&
  !Number.isNaN(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
const within = (value, start, end) => (!start || value >= start) && (!end || value <= end)

export function validateFeature(feature, milestone, { today, original } = {}) {
  if (!feature.name.trim()) return 'Feature name is required.'
  if (!validDate(feature.startDate)) return 'Feature start date is required.'
  if (!validDate(feature.dueDate)) return 'Feature end date is required.'
  if (feature.dueDate < feature.startDate) return 'Feature end date must be on or after its start date.'
  if (!within(feature.startDate, milestone.startDate, milestone.dueDate) || !within(feature.dueDate, milestone.startDate, milestone.dueDate))
    return 'Feature dates must be within the milestone dates.'
  if (today && ['startDate', 'dueDate'].some(name => feature[name] < today && feature[name] !== original?.[name]))
    return 'Feature dates cannot be in the past.'
  return ''
}

export function assignTaskToSprint(task, sprints) {
  const sprint = sprints.find(item => item.key === task.sprintKey) ||
    sprints.find(item => task.startDate && task.dueDate && within(task.startDate, item.startDate, item.endDate) && within(task.dueDate, item.startDate, item.endDate))
  return { ...task, sprintKey: sprint?.key || '' }
}

export function validateSprintSettings(form) {
  const start = form.sprintStartDate || form.startDate
  const end = form.sprintEndDate || form.endDate
  if (!validDate(start) || !validDate(end) || end <= start)
    return 'Set a valid project date range before generating sprints.'
  if (!within(start, form.startDate, form.endDate) || !within(end, form.startDate, form.endDate))
    return 'Sprint timeline must be within the project dates.'
  if (!Number.isInteger(Number(form.sprintDuration)) || Number(form.sprintDuration) < 1)
    return 'Sprint duration must be a positive whole number of days.'
  if (!Number.isInteger(Number(form.pointsPerDay)) || Number(form.pointsPerDay) < 1)
    return 'Points per day must be a positive whole number.'
  if (!form.weekendDays?.length || form.weekendDays.length === 7)
    return 'Choose at least one weekend day and keep at least one working day.'
  return ''
}

export function generateProjectSprints(form) {
  if (validateSprintSettings(form)) return []
  const day = 86400000
  const last = Date.parse(`${form.sprintEndDate || form.endDate}T00:00:00Z`)
  const date = time => new Date(time).toISOString().slice(0, 10)
  const isOff = time => form.weekendDays.includes(new Date(time).getUTCDay()) || form.holidays.includes(date(time))
  const sprints = []
  let cursor = Date.parse(`${form.sprintStartDate || form.startDate}T00:00:00Z`)
  while (cursor <= last) {
    while (cursor <= last && isOff(cursor)) cursor += day
    if (cursor > last) break
    const start = cursor
    let end = cursor
    let workingDays = 0
    const offDays = []
    while (cursor <= last && workingDays < Number(form.sprintDuration)) {
      if (isOff(cursor)) offDays.push(date(cursor))
      else workingDays += 1
      end = cursor
      cursor += day
    }
    if (sprints.length === 500) return []
    const previous = form.sprints.find(sprint => sprint.startDate === date(start) && sprint.endDate === date(end))
    const index = sprints.length + 1
    sprints.push({ ...previous, key: previous?.key || `sprint-${date(start)}-${date(end)}`,
      number: previous?.number || `SP-${String(index).padStart(3, '0')}`,
      name: previous?.name || `Sprint ${index}`, startDate: date(start), endDate: date(end),
      excludeWeekends: form.weekendDays.length === 2 && form.weekendDays.includes(0) && form.weekendDays.includes(6),
      offDays, members: [...form.members] })
  }
  return sprints
}

export function syncProjectSprints(form) {
  const sprints = generateProjectSprints(form)
  return { ...form, sprints, tasks: form.tasks.map(task => assignTaskToSprint(task, sprints)) }
}

export function validateProject(form, { projectOnly = false, users = [], currentUserId, today, rejectPastDates = false } = {}) {
  const errors = {}
  const manager = users.find(user => String(user.id) === String(form.projectManager))
  const memberIds = new Set([...form.members, form.projectManager, currentUserId].filter(Boolean).map(String))
  const availableIds = new Set(users.map(user => String(user.id)))
  if (!form.projectCode.trim()) errors.projectCode = 'Project code is required.'
  else if (form.projectCode.trim().length < 2) errors.projectCode = 'Project code must be at least 2 characters.'
  if (!form.projectName.trim()) errors.projectName = 'Project name is required.'
  else if (form.projectName.trim().length < 3) errors.projectName = 'Project name must be at least 3 characters.'
  if (!form.description.trim()) errors.description = 'Description is required.'
  else if (form.description.trim().length < 10) errors.description = 'Description must be at least 10 characters.'
  if (!form.customer.trim()) errors.customer = 'Customer is required.'
  else if (form.customer.trim().length < 2) errors.customer = 'Customer must be at least 2 characters.'
  if (!form.projectManager) errors.projectManager = 'Select a project manager.'
  else if (!manager || !isManagerOption(manager)) errors.projectManager = 'Select an active project manager or administrator.'
  if (!form.priority) errors.priority = 'Select a priority.'
  if (!form.projectType) errors.projectType = 'Select a project type.'
  if (!validDate(form.startDate)) errors.startDate = 'A valid start date is required.'
  if (!validDate(form.endDate)) errors.endDate = 'A valid end date is required.'
  if (rejectPastDates && today && form.startDate && form.startDate < today) errors.startDate = 'Start date cannot be in the past.'
  if (form.startDate && form.endDate && form.endDate <= form.startDate) errors.endDate = 'End date must be after start date.'
  if (!form.files.some(item => item.is_pdr)) errors.pdrFile = 'Upload a PDR to continue.'
  if (!form.pdrVersion.trim()) errors.pdrVersion = 'PDR version is required.'
  if (form.files.some(item => item.is_pdr && item.file?.size > fileLimit)) errors.pdrFile = 'PDR file exceeds the 100 MB limit.'
  if (form.files.some(item => !item.is_pdr && item.file?.size > fileLimit)) errors.resourceFiles = 'Resource files must be 100 MB or smaller.'
  if (!form.departments.length) errors.departments = 'Select at least one department.'
  if (form.members.some(id => !availableIds.has(String(id)))) errors.departments = 'Remove unavailable team members and select active members.'
  if (projectOnly) return errors
  if (!form.milestones.length) errors.milestones = 'Add at least one milestone.'
  form.milestones.forEach((milestone, index) => {
    if (!milestone.name.trim()) errors.milestones = `Milestone ${index + 1} needs a name.`
    if (!validDate(milestone.startDate) || !validDate(milestone.dueDate)) errors.milestones = `Milestone ${index + 1} needs valid start and end dates.`
    if (milestone.startDate && milestone.dueDate && milestone.dueDate < milestone.startDate) errors.milestones = `Milestone ${index + 1} dates are invalid.`
    if (!milestone.features.length) errors.milestones = `Milestone ${index + 1} needs at least one feature.`
    if (!within(milestone.startDate, form.startDate, form.endDate) || !within(milestone.dueDate, form.startDate, form.endDate))
      errors.milestones = `Milestone ${index + 1} dates must be within the project dates.`
    milestone.features.forEach((feature, featureIndex) => {
      const error = validateFeature(feature, milestone)
      if (error) errors.milestones = `Feature ${featureIndex + 1} in milestone ${index + 1}: ${error}`
    })
  })
  const sprintSettingsError = validateSprintSettings(form)
  if (sprintSettingsError) errors.sprints = sprintSettingsError
  if (!form.sprints.length) errors.sprints = sprintSettingsError || 'Select a date range with working days to generate sprints before continuing.'
  form.sprints.forEach((sprint, index) => {
    if (!sprint.name.trim() || !validDate(sprint.startDate) || !validDate(sprint.endDate) || sprint.endDate < sprint.startDate)
      errors.sprints = `Sprint ${index + 1} needs a name and valid dates.`
    if (!within(sprint.startDate, form.startDate, form.endDate) || !within(sprint.endDate, form.startDate, form.endDate))
      errors.sprints = `Sprint ${index + 1} dates must be within the project dates.`
    if (sprint.offDays.some(day => day < sprint.startDate || day > sprint.endDate))
      errors.sprints = `Sprint ${index + 1} has an off day outside its dates.`
    if (sprint.members.some(id => !memberIds.has(String(id)))) errors.sprints = `Sprint ${index + 1} includes a removed team member.`
  })
  if (!form.tasks.length) errors.tasks = 'Add at least one task.'
  form.tasks.forEach((task, index) => {
    const sprint = form.sprints.find(item => item.key === task.sprintKey)
    const milestone = form.milestones.find(item => item.key === task.milestoneKey)
    const feature = milestone?.features.find(item => item.key === task.featureKey)
    if (!task.name.trim() || !task.assignee) errors.tasks = `Task ${index + 1} needs a name and assignee.`
    if (!sprint) errors.tasks = `Task ${index + 1} must be assigned to an existing sprint.`
    if ((task.milestoneKey && !milestone) || (task.featureKey && !feature)) errors.tasks = `Task ${index + 1} needs a valid milestone and feature.`
    if (!validDate(task.startDate) || !validDate(task.dueDate)) errors.tasks = `Task ${index + 1} needs valid start and due dates.`
    if (task.startDate && task.dueDate && task.dueDate < task.startDate) errors.tasks = `Task ${index + 1} dates are invalid.`
    if (sprint && (!within(task.startDate, sprint.startDate, sprint.endDate) || !within(task.dueDate, sprint.startDate, sprint.endDate)))
      errors.tasks = `Task ${index + 1} dates must be within its sprint.`
    if (feature && (!within(task.startDate, feature.startDate || milestone.startDate, feature.dueDate || milestone.dueDate) ||
      !within(task.dueDate, feature.startDate || milestone.startDate, feature.dueDate || milestone.dueDate)))
      errors.tasks = `Task ${index + 1} dates must be within its milestone and feature.`
    if (milestone && !feature && (!within(task.startDate, milestone.startDate, milestone.dueDate) || !within(task.dueDate, milestone.startDate, milestone.dueDate)))
      errors.tasks = `Task ${index + 1} dates must be within its milestone.`
    if (!memberIds.has(String(task.assignee)) || (task.reviewer && !memberIds.has(String(task.reviewer))))
      errors.tasks = `Task ${index + 1} assignee and reviewer must be project team members.`
    if (task.reviewer && String(task.reviewer) === String(task.assignee))
      errors.tasks = `Task ${index + 1} reviewer and assignee must be different team members.`
  })
  form.dependencies.forEach((dependency, index) => {
    if (!dependency.taskKey) errors.tasks = `Dependency ${index + 1} needs a task.`
    if (!dependency.assignee || !validDate(dependency.dueDate)) errors.tasks = `Dependency ${index + 1} needs an assignee and due date.`
    if (dependency.taskKey === dependency.dependsOnKey) errors.tasks = `Dependency ${index + 1} cannot point to its own task.`
    if (!form.tasks.some(task => task.key === dependency.taskKey) ||
      (dependency.dependsOnKey && !form.tasks.some(task => task.key === dependency.dependsOnKey)))
      errors.tasks = `Dependency ${index + 1} references a removed task.`
    if (dependency.assignee && !memberIds.has(String(dependency.assignee))) errors.tasks = `Dependency ${index + 1} assignee must be a project team member.`
  })
  return errors
}
