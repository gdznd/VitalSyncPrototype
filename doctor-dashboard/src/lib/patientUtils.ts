import type { Patient } from '../types/patient'

export const followUpPriority = (followUpDate: string): Patient['priority'] => {
  const days = Math.ceil((new Date(`${followUpDate}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  return days < 0 ? 'High' : days <= 3 ? 'Medium' : 'Low'
}
