import { useContext } from 'react'
import { ProjectSelectionContext } from '../../features/projects/projectSelectionContext.js'

export function useProjectSelection() {
  return useContext(ProjectSelectionContext)
}
