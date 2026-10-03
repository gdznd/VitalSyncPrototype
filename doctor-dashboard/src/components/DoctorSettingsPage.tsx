import { useEffect, useState } from 'react'
import { api, type DoctorPreferencesDto } from '../lib/api'

const defaultPreferences: DoctorPreferencesDto = {
  clinic: '',
  theme: 'system',
  accent: 'teal',
  defaultPatientType: 'Out-patient',
  defaultFollowUpDays: 7,
  defaultVisibility: 'Assigned Only',
  notifications: { dashboard: true, messages: true, reminders: true, activity: true },
}

export function DoctorSettingsPage() {
  const [preferences, setPreferences] = useState(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  useEffect(() => {
    let active = true
    api.getAccountPreferences()
      .then(({ preferences: loaded }) => { if (active) setPreferences(loaded) })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load settings.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      preferences.theme === 'system'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        : preferences.theme,
    )
    document.documentElement.setAttribute('data-accent', preferences.accent)
  }, [preferences.theme, preferences.accent])

  const save = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { preferences: savedPreferences } = await api.updateAccountPreferences(preferences)
      setPreferences(savedPreferences)
      setSaved(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }

  const updateNotification = (key: keyof DoctorPreferencesDto['notifications']) => {
    setPreferences((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: !current.notifications[key] },
    }))
    setSaved(false)
  }

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordSaved(false)
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match.')
      return
    }

    setPasswordSaving(true)
    try {
      await api.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordSaved(true)
      setPasswordDialogOpen(false)
    } catch (requestError) {
      setPasswordError(requestError instanceof Error ? requestError.message : 'Could not update your password.')
    } finally {
      setPasswordSaving(false)
    }
  }

  const closePasswordDialog = () => {
    if (passwordSaving) return
    setPasswordDialogOpen(false)
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
  }

  return (
    <section className="settings-page">
      <header className="patients-header">
        <div>
          <h2>Settings</h2>
          <p className="header-copy">Manage your workspace preferences and account security.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => void save()} disabled={loading || saving}>
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </header>
      {loading && <p className="muted">Loading settings...</p>}
      {error && <p className="inline-note error" role="alert">{error}</p>}
      {saved && <p className="inline-note" role="status">Preferences saved to your account.</p>}

      <div className="settings-grid">
        <section className="settings-section">
          <h3>Appearance</h3>
          <div className="settings-field">
            <label>Theme</label>
            <select value={preferences.theme} disabled={loading} onChange={(event) => {
              setPreferences((current) => ({ ...current, theme: event.target.value as DoctorPreferencesDto['theme'] }))
              setSaved(false)
            }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>
          <div className="settings-field">
            <label>Accent Color</label>
            <div className="color-options">
              {(['teal', 'blue', 'purple', 'green'] as const).map((accent) => (
                <button
                  key={accent}
                  type="button"
                  aria-label={`${accent} accent`}
                  className={`color-option ${preferences.accent === accent ? 'active' : ''}`}
                  style={{ background: { teal: '#258a88', blue: '#4184a9', purple: '#7662b4', green: '#508f7c' }[accent] }}
                  onClick={() => { setPreferences((current) => ({ ...current, accent })); setSaved(false) }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h3>Workspace / Clinic</h3>
          <div className="settings-field"><label>Clinic / organization reference</label><input maxLength={255} value={preferences.clinic} disabled={loading} onChange={(event) => { setPreferences((current) => ({ ...current, clinic: event.target.value })); setSaved(false) }} /></div>
          <div className="settings-field"><label>Default Patient Type</label><select value={preferences.defaultPatientType} disabled={loading} onChange={(event) => { setPreferences((current) => ({ ...current, defaultPatientType: event.target.value as DoctorPreferencesDto['defaultPatientType'] })); setSaved(false) }}><option>Out-patient</option><option>In-patient</option></select></div>
          <div className="settings-field"><label>Default Follow-up Interval</label><select value={preferences.defaultFollowUpDays} disabled={loading} onChange={(event) => { setPreferences((current) => ({ ...current, defaultFollowUpDays: Number(event.target.value) as DoctorPreferencesDto['defaultFollowUpDays'] })); setSaved(false) }}><option value={3}>3 days</option><option value={7}>7 days</option><option value={14}>14 days</option><option value={30}>30 days</option></select></div>
          <div className="settings-field"><label>Default Patient Visibility</label><select value={preferences.defaultVisibility} disabled={loading} onChange={(event) => { setPreferences((current) => ({ ...current, defaultVisibility: event.target.value as DoctorPreferencesDto['defaultVisibility'] })); setSaved(false) }}><option>Assigned Only</option><option>Selected Doctors</option><option>All Doctors</option></select></div>
        </section>

        <section className="settings-section">
          <h3>Notifications</h3>
          {([['dashboard', 'Dashboard Notifications'], ['messages', 'New Messages'], ['reminders', 'Follow-up Reminders'], ['activity', 'Patient Activity Updates']] as const).map(([key, label]) => <div className="settings-toggle" key={key}><span>{label}</span><button type="button" aria-label={`Toggle ${label}`} aria-pressed={preferences.notifications[key]} disabled={loading} className={preferences.notifications[key] ? 'toggle active' : 'toggle'} onClick={() => updateNotification(key)} /></div>)}
          <p className="setting-help">Notification preferences are stored; this prototype does not deliver push notifications.</p>
        </section>

        <section className="settings-section">
          <h3>Account</h3>
          <button className="secondary-button" type="button" onClick={() => { setPasswordError(''); setPasswordSaved(false); setPasswordDialogOpen(true) }}>Change Password</button>
          <button className="secondary-button" style={{ marginTop: '10px' }}>Privacy &amp; Security</button>
        </section>

        <section className="settings-section">
          <h3>About</h3>
          <p className="version-info">VitalSync Prototype v0.1.0</p>
          <p className="version-info">Capstone Project · Lifestyle Medicine Dashboard</p>
        </section>
      </div>
      {passwordSaved && <p className="inline-note" role="status">Password updated successfully.</p>}
      {passwordDialogOpen && (
        <div className="modal-backdrop" onMouseDown={closePasswordDialog}>
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="doctor-password-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-heading"><div><h2 id="doctor-password-title">Change password</h2><p>Confirm your current password to set a new one.</p></div><button type="button" aria-label="Close" onClick={closePasswordDialog}>×</button></div>
            <form onSubmit={(event) => void changePassword(event)}>
              <div className="settings-field"><label htmlFor="doctor-current-password">Current password</label><input id="doctor-current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></div>
              <div className="settings-field"><label htmlFor="doctor-new-password">New password</label><input id="doctor-new-password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></div>
              <div className="settings-field"><label htmlFor="doctor-confirm-password">Confirm new password</label><input id="doctor-confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></div>
              {passwordError && <p className="inline-note error" role="alert">{passwordError}</p>}
              <div className="modal-actions"><button className="secondary-button" type="button" onClick={closePasswordDialog} disabled={passwordSaving}>Cancel</button><button className="primary-button" type="submit" disabled={passwordSaving}>{passwordSaving ? 'Updating...' : 'Update password'}</button></div>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}
