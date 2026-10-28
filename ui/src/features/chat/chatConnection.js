import { io } from 'socket.io-client'

export function createChatConnection() {
  const base = new URL(import.meta.env.VITE_API_BASE_URL || '/api', window.location.origin)
  return io(base.origin, {
    path: `${base.pathname.replace(/\/$/, '')}/socket.io/`,
    withCredentials: true,
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    autoConnect: false,
  })
}

export async function chatRequest(socket, event, data) {
  if (!socket.connected) throw new Error('Chat is reconnecting. Please try again when connected.')
  const response = await socket.timeout(10000).emitWithAck(event, data)
  if (!response?.ok) throw new Error(response?.message || 'Chat action failed. Please try again.')
  return response
}
