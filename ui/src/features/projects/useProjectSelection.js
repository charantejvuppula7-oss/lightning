import { useContext } from 'react'
import { ProjectSelectionContext } from './projectSelectionContext.js'

export function useProjectSelection() {
  return useContext(ProjectSelectionContext)
}
