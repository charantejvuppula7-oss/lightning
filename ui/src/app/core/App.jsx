import { BrowserRouter } from 'react-router-dom'
import { ProjectSelectionProvider } from '../../features/projects/ProjectSelection.jsx'
import { NotificationPopup } from '../../features/notifications/NotificationPopup.jsx'
import AppRoutes from '../routes/AppRoutes.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <ProjectSelectionProvider>
        <NotificationPopup />
        <AppRoutes />
      </ProjectSelectionProvider>
    </BrowserRouter>
  )
}
