import type { Patient } from '../types/patient'
import type { Doctor } from '../types/doctor'
import type { ProviderGoal } from '../types/providerGoal'
import { PatientProfile } from './PatientProfile'
import { PatientGoalsView } from './PatientGoalsView'
import { PatientMessagesView } from './PatientMessagesView'

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
  providerGoals,
  currentDoctorName,
  onSaveProviderGoals,
  onMessageSelect,
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
  providerGoals: ProviderGoal[]
  currentDoctorName: string
  onSaveProviderGoals: (goals: ProviderGoal[]) => void
  onMessageSelect: (id: number) => void
  historyView?: React.ReactNode
}) {
  if (active === 'Messages') return <PatientMessagesView patients={[patient]} selected={patient} onSelect={onMessageSelect} />
  if (active === 'Goals') return <PatientGoalsView patient={patient} goals={providerGoals.filter((goal) => goal.patientUniqueId === patient.uniqueId)} currentDoctorName={currentDoctorName} onSave={onSaveProviderGoals} />
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
