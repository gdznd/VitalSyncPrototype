export type Patient = {
  id: number; name: string; initials: string; age: number; residence: string; care: string; phone: string; email: string
  detail: string; status: 'Needs attention' | 'On track' | 'Follow up'; priority: 'High' | 'Medium' | 'Low'; type: 'Out-patient' | 'In-patient'; color: string; assignedSince?: string; followUpDate: string; uniqueId: string; active: boolean; visibility: 'Assigned Only' | 'Selected Doctors' | 'All Doctors'; selectedDoctors?: number[]
  managingDoctor?: string
}
