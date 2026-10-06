import { useState } from 'react'
import type { Patient } from '../types/patient'
import type { Doctor } from '../types/doctor'
import { followUpPriority } from '../lib/patientUtils'
import DoctorPicker from './DoctorPicker'
import RecentActivitySummary from './RecentActivitySummary'

export function PatientProfile({ patient, onContact, onReminder, reminderSet, onBack, onEdit, onArchive, onUpdateFollowUp, onUpdateVisibility, doctors, activities }: { patient: Patient; onContact: () => void; onReminder: () => void; reminderSet: boolean; onBack: () => void; onEdit: () => void; onArchive: () => void; onUpdateFollowUp: (id: number, newDate: string) => void; onUpdateVisibility: (id: number, v: Patient['visibility'], selected?: number[]) => void; doctors: Doctor[]; activities: string[][] }) {
  const [followUp, setFollowUp] = useState(patient.followUpDate)
  const [vis, setVis] = useState<Patient['visibility']>(patient.visibility)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedDoctors, setSelectedDoctors] = useState<number[]>(patient.selectedDoctors ?? [])
  const handleFollowUp = (val: string) => { setFollowUp(val); onUpdateFollowUp(patient.id, val) }
  const handleVisibility = (v: Patient['visibility']) => { setVis(v); if (v !== 'Selected Doctors') onUpdateVisibility(patient.id, v); else setPickerOpen(true) }
  const selectedDoctorNames = doctors.filter((doctor) => selectedDoctors.includes(doctor.id)).map((doctor) => doctor.name)
  return <section className="patient-profile"><button className="back-button" onClick={onBack}>← Return to Registry</button><article className="profile-hero"><div className="profile-person"><span className="avatar profile-avatar" style={{ background: patient.color }}>{patient.initials}</span><div><h2>{patient.name}</h2><p>{patient.age} years old · {patient.residence}</p><p className="care-label">{patient.care}</p></div></div><div className="profile-actions"><button onClick={onContact}>Contact</button><button onClick={onReminder}>{reminderSet ? 'Reminder set' : 'Set reminder'}</button><button className="edit-button" onClick={onEdit}>Manage</button><button className="archive-button" onClick={onArchive}>Archive monitoring</button></div></article>
    <div className="profile-grid">
      <article className="profile-card"><h3>Patient information</h3>
        <dl>
          <div><dt>Unique ID</dt><dd>{patient.uniqueId}</dd></div>
          <div><dt>Visibility</dt><dd>
            <select className="patient-control patient-visibility-control" aria-label="Patient visibility" value={vis} onChange={(e) => handleVisibility(e.target.value as Patient['visibility'])}>
              <option>Assigned Only</option>
              <option>Selected Doctors</option>
              <option>All Doctors</option>
            </select>
            {vis === 'Selected Doctors' && <div className="selected-doctors-summary"><span>{selectedDoctorNames.length ? selectedDoctorNames.join(', ') : 'No doctors selected'}</span><button type="button" onClick={() => setPickerOpen(true)}>Open Doctor Picker</button></div>}
          </dd></div>
          <div><dt>Patient type</dt><dd>{patient.type}</dd></div>
          <div><dt>Follow-up</dt><dd><input className="patient-control patient-follow-up-control" aria-label="Patient follow-up date" type="date" value={followUp} onChange={(e) => handleFollowUp(e.target.value)} /></dd></div>
          <div><dt>Priority level</dt><dd><span className={`priority ${followUpPriority(followUp).toLowerCase()}`}>{followUpPriority(followUp)}</span></dd></div>
          <div><dt>Care focus</dt><dd>{patient.care}</dd></div>
        </dl>
      </article>
      <article className="profile-card"><h3>Today’s log</h3><div className="log-summary"><span>🍽</span><div><strong>Breakfast submitted</strong><p>8:14 AM · On time</p></div></div><div className="log-summary"><span>☾</span><div><strong>Sleep pending</strong><p>Due by 10:00 AM</p></div></div></article>
    </div>
    <RecentActivitySummary activities={activities} patientName={patient.name} patientUniqueId={patient.uniqueId} />
    {pickerOpen && <div className="modal-backdrop" onMouseDown={() => setPickerOpen(false)}><section className="modal doctor-picker-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><h2>Select doctors</h2><p>Choose which doctors can access this patient.</p></div><button type="button" onClick={() => setPickerOpen(false)}>×</button></div><DoctorPicker doctors={doctors} selectedIds={selectedDoctors} onChange={setSelectedDoctors} /><div className="modal-actions"><button type="button" onClick={() => setPickerOpen(false)}>Cancel</button><button type="button" className="primary" onClick={() => { onUpdateVisibility(patient.id, 'Selected Doctors', selectedDoctors); setPickerOpen(false) }}>Confirm selection</button></div></section></div>}
  </section>
}
