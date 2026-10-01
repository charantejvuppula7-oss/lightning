import { createContext, useContext } from 'react'

export const ProjectSelectionContext = createContext(null)

export function useProjectSelection() {
  return useContext(ProjectSelectionContext)
}
