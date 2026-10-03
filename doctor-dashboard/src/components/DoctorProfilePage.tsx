import { useEffect, useState } from 'react'
import { api, type DoctorProfileChanges, type DoctorProfileDto } from '../lib/api'

type Props = { onProfileUpdated: (profile: DoctorProfileDto) => void }

export function DoctorProfilePage({ onProfileUpdated }: Props) {
  const [doctor, setDoctor] = useState<DoctorProfileDto | null>(null)
  const [error, setError] = useState('')
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    let active = true
    api.getDoctorProfile()
      .then(({ profile }) => {
        if (active) setDoctor(profile)
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load doctor profile.')
        }
      })
    return () => { active = false }
  }, [])

  const saveProfile = async (changes: DoctorProfileChanges) => {
    const { profile } = await api.updateDoctorProfile(changes)
    setDoctor(profile)
    onProfileUpdated(profile)
  }

  if (!doctor) {
    return <section aria-live="polite">{error || 'Loading doctor profile…'}</section>
  }

  return (
    <section>
      <article className="profile-hero">
        <div className="profile-person">
          <span className="avatar profile-avatar" style={{ background: doctor.color }}>{doctor.initials || 'DR'}</span>
          <div>
            <h2>{doctor.name}</h2>
            <p>{doctor.specialty || 'VitalSync clinician'}</p>
            <p className="care-label">{doctor.clinic || 'Clinic not specified'}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button className="edit-button" onClick={() => { setError(''); setShowEdit(true) }}>Edit Profile</button>
        </div>
      </article>
      <div className="profile-grid">
        <article className="profile-card">
          <h3>Contact information</h3>
          <dl>
            <div><dt>Account email</dt><dd>{doctor.email}</dd></div>
            <div><dt>Phone</dt><dd>{doctor.phone || 'Not specified'}</dd></div>
            <div><dt>Professional license</dt><dd>{doctor.license || 'Not specified'}</dd></div>
          </dl>
        </article>
        <article className="profile-card">
          <h3>About</h3>
          <p style={{ fontSize: '12px' }}>{doctor.about || 'No professional description added.'}</p>
        </article>
      </div>
      {error && <p role="alert" className="inline-note error">{error}</p>}
      {showEdit && (
        <EditProfileModal
          doctor={doctor}
          onSave={saveProfile}
          onClose={() => setShowEdit(false)}
        />
      )}
    </section>
  )
}

function EditProfileModal({
  doctor,
  onSave,
  onClose,
}: {
  doctor: DoctorProfileDto
  onSave: (changes: DoctorProfileChanges) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<DoctorProfileChanges>({
    name: doctor.name,
    specialty: doctor.specialty,
    clinic: doctor.clinic,
    about: doctor.about,
    license: doctor.license,
    phone: doctor.phone,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(form)
      onClose()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save doctor profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-heading">
          <div><h2>Edit profile</h2></div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          <label>Full name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={255} /></label>
          <label>Specialty<input value={form.specialty} onChange={(event) => setForm({ ...form, specialty: event.target.value })} maxLength={255} /></label>
          <label>Clinic/Hospital<input value={form.clinic} onChange={(event) => setForm({ ...form, clinic: event.target.value })} maxLength={255} /></label>
          <label>Account email<input value={doctor.email} readOnly /></label>
          <label>Phone number<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} maxLength={50} /></label>
          <label>Professional license<input value={form.license} onChange={(event) => setForm({ ...form, license: event.target.value })} maxLength={255} /></label>
          <label style={{ gridColumn: 'span 2' }}>About<textarea style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '7px', border: '1px solid #dfe8ea' }} value={form.about} onChange={(event) => setForm({ ...form, about: event.target.value })} maxLength={4000} /></label>
        </div>
        {error && <p role="alert" className="inline-note error">{error}</p>}
        <div className="form-footer">
          <button type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </div>
  )
}
