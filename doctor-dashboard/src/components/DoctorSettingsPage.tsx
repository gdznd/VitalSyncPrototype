import { useState, useEffect } from 'react'

export function DoctorSettingsPage() {
  const [clinic, setClinic] = useState(localStorage.getItem('clinic') || 'VitalSync Lifestyle Clinic')
  const [patientType, setPatientType] = useState(localStorage.getItem('defaultPatientType') || 'Out-patient')
  const [followUp, setFollowUp] = useState(localStorage.getItem('defaultFollowUp') || '7 days')
  const [visibility, setVisibility] = useState(localStorage.getItem('defaultVisibility') || 'Assigned Only')
  const [notifications, setNotifications] = useState({ dashboard: true, messages: true, reminders: true, activity: true })
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'System')
  const [accent, setAccent] = useState(localStorage.getItem('accent') || 'teal')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme === 'System' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : theme.toLowerCase())
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent)
    localStorage.setItem('accent', accent)
  }, [accent])

  useEffect(() => {
    localStorage.setItem('clinic', clinic)
    localStorage.setItem('defaultPatientType', patientType)
    localStorage.setItem('defaultFollowUp', followUp)
    localStorage.setItem('defaultVisibility', visibility)
  }, [clinic, patientType, followUp, visibility])

  const toggleNotification = (key: keyof typeof notifications) => setNotifications((current) => ({ ...current, [key]: !current[key] }))

  return (
    <section className="settings-page">
      <header className="patients-header">
        <div>
          <h2>Settings</h2>
          <p className="header-copy">Manage your workspace preferences and account security.</p>
        </div>
      </header>
      
      <div className="settings-grid">
        <section className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-field">
            <label>Theme</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option>Light</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Accent Color</label>
            <div className="color-options">
              <button className={`color-option ${accent === 'teal' ? 'active' : ''}`} style={{ background: '#258a88' }} onClick={() => setAccent('teal')} />
              <button className={`color-option ${accent === 'blue' ? 'active' : ''}`} style={{ background: '#4184a9' }} onClick={() => setAccent('blue')} />
              <button className={`color-option ${accent === 'purple' ? 'active' : ''}`} style={{ background: '#7662b4' }} onClick={() => setAccent('purple')} />
              <button className={`color-option ${accent === 'green' ? 'active' : ''}`} style={{ background: '#508f7c' }} onClick={() => setAccent('green')} />
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Workspace / Clinic</h3>
          <div className="settings-field"><label>Clinic / organization reference</label><input value={clinic} onChange={(e) => setClinic(e.target.value)} /></div>
          <div className="settings-field"><label>Default Patient Type</label><select value={patientType} onChange={(e) => setPatientType(e.target.value)}><option>Out-patient</option><option>In-patient</option></select></div>
          <div className="settings-field"><label>Default Follow-up Interval</label><select value={followUp} onChange={(e) => setFollowUp(e.target.value)}><option>3 days</option><option>7 days</option><option>14 days</option><option>30 days</option></select></div>
          <div className="settings-field"><label>Default Patient Visibility</label><select value={visibility} onChange={(e) => setVisibility(e.target.value)}><option>Assigned Only</option><option>Selected Doctors</option><option>All Doctors</option></select></div>
        </section>

        <section className="settings-section">
          <h3>Notifications</h3>
          {([['dashboard', 'Dashboard Notifications'], ['messages', 'New Messages'], ['reminders', 'Follow-up Reminders'], ['activity', 'Patient Activity Updates']] as const).map(([key, label]) => <div className="settings-toggle" key={key}><span>{label}</span><button aria-label={`Toggle ${label}`} className={notifications[key] ? 'toggle active' : 'toggle'} onClick={() => toggleNotification(key)} /></div>)}
        </section>

        <section className="settings-section">
          <h3>Account</h3>
          <button className="secondary-button">Change Password</button>
          <button className="secondary-button" style={{ marginTop: '10px' }}>Privacy & Security</button>
        </section>

        <section className="settings-section">
          <h3>About</h3>
          <p className="version-info">VitalSync Prototype v0.1.0</p>
          <p className="version-info">Capstone Project · Lifestyle Medicine Dashboard</p>
        </section>
      </div>
    </section>
  )
}
