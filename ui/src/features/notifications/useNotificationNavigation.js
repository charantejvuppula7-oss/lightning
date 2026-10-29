import { useNavigate } from 'react-router-dom'
import { apiRequest, errorMessage } from '../../shared/api/apiClient.js'
import { useFeedback } from '../../shared/components/Feedback.jsx'
import { useProjectSelection } from '../projects/useProjectSelection.js'
import { notificationService } from './notificationService.js'

export default function useNotificationNavigation() {
  const navigate = useNavigate()
  const { setSelectedProjectId } = useProjectSelection()
  const { toast, feedback } = useFeedback()
  const openNotification = async id => {
    try {
      const { page, base, projectId, ...params } = await apiRequest(`/notifications/${id}/target/`)
      await notificationService.markAsRead(id)
      setSelectedProjectId(projectId)
      navigate(`/${base}/${page}?${new URLSearchParams(params)}`)
      return true
    } catch (error) { toast.error(errorMessage(error)); return false }
  }
  return { openNotification, feedback, toast }
}
