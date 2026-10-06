import { projectOptions, projectSetup } from './editor/projectApi.js'

export async function projectTaskOptions(projectId) {
  const [project, options] = await Promise.all([projectSetup(projectId), projectOptions()])
  const memberIds = new Set([
    ...(project.team_members || []), ...(project.project_managers || []), project.created_by,
  ].filter(Boolean).map(String))
  return {
    project,
    users: (options.users || []).filter(user => memberIds.has(String(user.id))),
  }
}
