import type { Patient } from '../types/patient'
import type { Doctor } from '../types/doctor'
import { PatientProfile } from './PatientProfile'

export function PatientWorkspace({
  patient,
  active,
  onReturn,
  onContact,
  onReminder,
  reminderSet,
  onEdit,
  onArchive,
  onUpdateFollowUp,
  onUpdateVisibility,
  doctors,
  activities,
  messagesView,
  goalsView,
  historyView,
}: {
  patient: Patient
  active: string
  onReturn: () => void
  onContact: () => void
  onReminder: () => void
  reminderSet: boolean
  onEdit: () => void
  onArchive: () => void
  onUpdateFollowUp: (id: number, newDate: string) => void
  onUpdateVisibility: (id: number, v: Patient['visibility'], selected?: number[]) => void
  doctors: Doctor[]
  activities: string[][]
  messagesView?: React.ReactNode
  goalsView?: React.ReactNode
  historyView?: React.ReactNode
}) {
  if (active === 'Messages') return messagesView ?? null
  if (active === 'Goals') return goalsView ?? null
  if (active === 'History') return historyView ?? null
  return (
    <PatientProfile
      patient={patient}
      onContact={onContact}
      onReminder={onReminder}
      reminderSet={reminderSet}
      onBack={onReturn}
      onEdit={onEdit}
      onArchive={onArchive}
      onUpdateFollowUp={onUpdateFollowUp}
      onUpdateVisibility={onUpdateVisibility}
      doctors={doctors}
      activities={activities}
    />
  )
}
