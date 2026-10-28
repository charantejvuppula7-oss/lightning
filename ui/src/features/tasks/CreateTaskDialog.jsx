import TaskEditor from './TaskEditor.jsx'
import { saveTask } from './saveTask.js'

export default function CreateTaskDialog({ project, projects, onClose, onCreated }) {
  return <TaskEditor isOpen isCreate projectId={project?.id} projects={projects} onClose={onClose}
    onSave={async values => {
      await saveTask({ projectId: project?.id, values })
      onCreated?.()
      onClose()
    }} />
}
