import { useState } from 'react'

const initialDoctor = {
  initials: 'JD',
  name: 'Dr. Jamie Dizon',
  specialty: 'Lifestyle Medicine',
  clinic: 'VitalSync Clinic, Makati',
  email: 'jamie.dizon@vitalsync.test',
  phone: '+63 917 555 0199',
  license: 'PRC License No. 12345 · Specialist, Lifestyle Medicine',
  about: 'Dr. Jamie Dizon is a Lifestyle Medicine specialist dedicated to supporting sustainable, evidence-based behavioral change. Her clinical focus is nutrition, physical activity, and sleep optimization to prevent and manage chronic conditions.',
}

export function DoctorProfilePage() {
  const [doctor, setDoctor] = useState(initialDoctor)
  const [showEdit, setShowEdit] = useState(false)

  return (
    <section>
      <article className="profile-hero">
        <div className="profile-person">
          <span className="avatar profile-avatar" style={{ background: '#d8e8ed' }}>{doctor.initials}</span>
          <div>
            <h2>{doctor.name}</h2>
            <p>{doctor.specialty}</p>
            <p className="care-label">{doctor.clinic}</p>
          </div>
        </div>
        <div className="profile-actions">
          <button className="edit-button" onClick={() => setShowEdit(true)}>Edit Profile</button>
        </div>
      </article>
      <div className="profile-grid">
        <article className="profile-card">
          <h3>Contact information</h3>
          <dl>
            <div><dt>Email</dt><dd>{doctor.email}</dd></div>
            <div><dt>Phone</dt><dd>{doctor.phone}</dd></div>
            <div><dt>Professional license</dt><dd>{doctor.license}</dd></div>
          </dl>
        </article>
        <article className="profile-card">
          <h3>About</h3>
          <p style={{ fontSize: '12px' }}>{doctor.about}</p>
        </article>
      </div>
      {showEdit && <EditProfileModal doctor={doctor} onSave={(updated) => { setDoctor(updated); setShowEdit(false) }} onClose={() => setShowEdit(false)} />}
    </section>
  )
}

function EditProfileModal({ doctor, onSave, onClose }: { doctor: typeof initialDoctor; onSave: (d: typeof initialDoctor) => void; onClose: () => void }) {
  const [form, setForm] = useState(doctor)
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-heading">
          <div><h2>Edit profile</h2></div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="form-grid">
          <label>Full name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Specialty<input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} /></label>
          <label>Clinic/Hospital<input value={form.clinic} onChange={(e) => setForm({ ...form, clinic: e.target.value })} /></label>
          <label>Email<input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Phone number<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label>Professional license<input value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} /></label>
          <label style={{ gridColumn: 'span 2' }}>About<textarea style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '7px', border: '1px solid #dfe8ea' }} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} /></label>
        </div>
        <div className="form-footer">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={() => onSave(form)}>Save changes</button>
        </div>
      </div>
    </div>
  )
}
