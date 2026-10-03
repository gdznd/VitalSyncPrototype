import { useEffect, useState } from 'react';
import { PatientProfileChanges, PatientProfileDto, patientApi } from '../lib/api';

const emptyChanges: PatientProfileChanges = {
  phone: '',
  homeAddress: '',
  emergencyContact: '',
  dateOfBirth: '',
  weightLbs: '',
  heightInches: '',
};

function formatDate(value: string | null) {
  if (!value) return 'Not provided';
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

export function ProfilePage() {
  const [profile, setProfile] = useState<PatientProfileDto | null>(null);
  const [changes, setChanges] = useState<PatientProfileChanges>(emptyChanges);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    patientApi.getProfile()
      .then(({ profile: result }) => {
        if (!active) return;
        setProfile(result);
        setChanges({
          phone: result.phone,
          homeAddress: result.homeAddress,
          emergencyContact: result.emergencyContact,
          dateOfBirth: result.dateOfBirth,
          weightLbs: result.weightLbs,
          heightInches: result.heightInches,
        });
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not load your profile.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const bmi = Number(changes.heightInches) > 0 && Number(changes.weightLbs) > 0
    ? (Number(changes.weightLbs) / (Number(changes.heightInches) * Number(changes.heightInches)) * 703).toFixed(1)
    : '--';

  const onFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
  };

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const saveProfile = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await patientApi.updateProfile(changes);
      setProfile(result.profile);
      setChanges({
        phone: result.profile.phone,
        homeAddress: result.profile.homeAddress,
        emergencyContact: result.profile.emergencyContact,
        dateOfBirth: result.profile.dateOfBirth,
        weightLbs: result.profile.weightLbs,
        heightInches: result.profile.heightInches,
      });
      setAvatarPreview(null);
      setEditing(false);
      setNotice('Your profile was updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const saveEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await patientApi.changeEmail(currentPassword, email);
      setEmail('');
      setProfile(current => current ? { ...current, email: result.email } : current);
      setCurrentPassword('');
      setNotice('Your login email was updated.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update your login email.');
    } finally {
      setEmailSaving(false);
    }
  };

  const cancelProfileEdit = () => {
    if (!profile) return;
    setChanges({
      phone: profile.phone,
      homeAddress: profile.homeAddress,
      emergencyContact: profile.emergencyContact,
      dateOfBirth: profile.dateOfBirth,
      weightLbs: profile.weightLbs,
      heightInches: profile.heightInches,
    });
    setAvatarPreview(null);
    setEditing(false);
  };

  if (loading) return <section className="profile-panel" aria-live="polite">Loading your profile…</section>;
  if (!profile) return <section className="profile-panel" role="alert">{error || 'Your profile could not be loaded.'}</section>;

  return (
    <section>
      {error && <p className="form-note" role="alert">{error}</p>}
      {notice && <p className="form-note" role="status">{notice}</p>}
      <div className="profile-panel profile-top">
        <div className="profile-summary">
          <div className="profile-summary-avatar large">
            {avatarPreview ? <img src={avatarPreview} alt="Temporary profile photo preview" /> : profile.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="eyebrow">Patient profile</p>
            <h2>{profile.name}</h2>
            <div className="status-chip">{profile.careFocus || 'Care focus not set'}</div>
            <div className="profile-actions">
              {editing && (
                <label className="secondary-button profile-photo-button">
                  Preview Photo
                  <input type="file" accept="image/*" onChange={onFile} />
                </label>
              )}
              {editing
                ? <button className="primary-button" disabled={saving} onClick={saveProfile}>{saving ? 'Saving…' : 'Save changes'}</button>
                : <button className="secondary-button" onClick={() => { setError(''); setNotice(''); setEditing(true); }}>Edit Profile</button>}
              {editing && <button className="secondary-button" disabled={saving} onClick={cancelProfileEdit}>Cancel</button>}
            </div>
            {editing && <p className="form-note">Photo preview is temporary and is not uploaded or saved.</p>}
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-panel">
          <div className="profile-card-header">
            <div><h3>Personal Information</h3><p>{editing ? 'Update the profile details you are allowed to manage.' : 'Your contact details are kept private.'}</p></div>
            {editing && <span className="status-chip">Editing</span>}
          </div>

          <div className="profile-section-group">
            <h4 className="profile-subheading">Contact Information</h4>
            <div className="field-grid">
              <div className="profile-value-field"><span>Login email</span><strong>{profile.email}</strong></div>
              {editing
                ? <label>Phone<input value={changes.phone} maxLength={50} onChange={event => setChanges(value => ({ ...value, phone: event.target.value }))} /></label>
                : <div className="profile-value-field"><span>Phone</span><strong>{profile.phone || 'Not provided'}</strong></div>}
              {editing
                ? <label>Home address<textarea value={changes.homeAddress} maxLength={1000} onChange={event => setChanges(value => ({ ...value, homeAddress: event.target.value }))} /></label>
                : <div className="profile-value-field"><span>Home address</span><strong>{profile.homeAddress || 'Not provided'}</strong></div>}
              {editing
                ? <label>Emergency contact<input value={changes.emergencyContact} maxLength={255} onChange={event => setChanges(value => ({ ...value, emergencyContact: event.target.value }))} /></label>
                : <div className="profile-value-field"><span>Emergency contact</span><strong>{profile.emergencyContact || 'Not provided'}</strong></div>}
            </div>
          </div>

          <div className="profile-section-divider" />

          <div className="profile-section-group">
            <h4 className="profile-subheading">Care Information</h4>
            <div className="field-grid">
              <div className="profile-value-field"><span>Member since</span><strong>{formatDate(profile.memberSince)}</strong></div>
              <div className="profile-value-field"><span>Managing doctor</span><strong>{profile.primaryPhysician || 'Not assigned'}</strong></div>
              <div className="profile-value-field"><span>Care focus</span><strong>{profile.careFocus || 'Not set'}</strong></div>
            </div>
          </div>
        </div>

        <div className="profile-panel">
          <div className="profile-card-header">
            <div><h3>Health Summary</h3><p>Age is calculated from your date of birth. Care focus is managed by your doctor.</p></div>
          </div>

          <div className="metric-row">
            <div className="metric-card"><p>Age</p><strong>{profile.age ?? '--'}</strong><small>years</small></div>
            <div className="metric-card editable-metric">
              <p>Weight</p>
              {editing ? <input aria-label="Weight in pounds" type="number" min="0.1" max="9999.99" step="0.1" value={changes.weightLbs} onChange={event => setChanges(value => ({ ...value, weightLbs: event.target.value }))} /> : <strong>{profile.weightLbs ? `${profile.weightLbs} lbs` : '--'}</strong>}
              <small> pounds</small>
            </div>
            <div className="metric-card editable-metric">
              <p>Height</p>
              {editing ? <input aria-label="Height in inches" type="number" min="0.1" max="9999.99" step="0.1" value={changes.heightInches} onChange={event => setChanges(value => ({ ...value, heightInches: event.target.value }))} /> : <strong>{profile.heightInches ? `${profile.heightInches} in` : '--'}</strong>}
              <small> inches</small>
            </div>
            <div className="metric-card editable-metric">
              <p>Date of birth</p>
              {editing
                ? <input aria-label="Date of birth" type="date" value={changes.dateOfBirth} onChange={event => setChanges(value => ({ ...value, dateOfBirth: event.target.value }))} />
                : <strong>{profile.dateOfBirth ? formatDate(profile.dateOfBirth) : 'Not provided'}</strong>}
            </div>
          </div>

          <div className="bmi-highlight-card">
            <div className="bmi-info"><p>BMI</p><strong>{bmi}</strong><small>Calculated from height and weight</small></div>
          </div>

          <div className="profile-section-divider" />

          <form className="profile-section-group" onSubmit={saveEmail}>
            <h4 className="profile-subheading">Login Email</h4>
            <p className="form-note">Changing your login email is a separate account operation and requires your current password.</p>
            <div className="field-grid">
              <label>New email<input required type="email" placeholder={profile.email} value={email} onChange={event => setEmail(event.target.value)} /></label>
              <label>Current password<input required type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>
            </div>
            <button className="secondary-button" type="submit" disabled={emailSaving}>{emailSaving ? 'Updating…' : 'Update login email'}</button>
          </form>
        </div>

        <div className="profile-panel">
          <div className="profile-card-header"><div><h3>Lifestyle Overview</h3><p>This overview is still demo content and is not sourced from your saved logs.</p></div><span className="status-chip">Demo</span></div>
          <div className="lifestyle-overview">
            <div className="lifestyle-stat"><span>🥗</span><div><strong>5 meals</strong><small>Nutrition logged</small></div><i>On track</i></div>
            <div className="lifestyle-stat"><span>🚶</span><div><strong>3 sessions</strong><small>Physical activity</small></div><i>90 min</i></div>
            <div className="lifestyle-stat"><span>😴</span><div><strong>7h 10m</strong><small>Average sleep</small></div><i>Steady</i></div>
            <div className="lifestyle-stat"><span>☀</span><div><strong>Feeling balanced</strong><small>Recent reflection</small></div><i>Check-in</i></div>
          </div>
        </div>
      </div>
    </section>
  );
}
