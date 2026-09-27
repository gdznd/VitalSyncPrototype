import { useState } from 'react';

export function ProfilePage() {
  const [profile, setProfile] = useState({
    name: 'John Smith',
    memberSince: '2020-06-12',
    primaryPhysician: 'Dr. Maria Santos',
    lastVisit: '2026-07-30',
    email: 'john.smith@example.com',
    address: '123 Main St, Anytown',
    emergencyContact: 'Jane Smith • 555-0123',
    conditions: ['Type 2 Diabetes', 'Hypertension']
  });

  const [editing, setEditing] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [height, setHeight] = useState('68.7');
  const [weight, setWeight] = useState('182');
  const bmi = Number(height) > 0 && Number(weight) > 0 ? (Number(weight) / (Number(height) * Number(height)) * 703).toFixed(1) : '--';

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setAvatar(URL.createObjectURL(file));
  };

  return (
    <section>
      <div className="profile-panel profile-top">
        <div className="profile-summary">
          <div className="profile-summary-avatar large">{avatar ? <img src={avatar} alt="avatar" /> : 'JS'}</div>
          <div>
            <p className="eyebrow">Patient profile</p>
            <h2>{profile.name}</h2>
            <div className="status-chip">{profile.conditions.join(' • ')}</div>
            <div className="profile-actions">
              {editing && <label className="secondary-button profile-photo-button">Change Photo<input type="file" accept="image/*" onChange={onFile} /></label>}
              <button className={editing ? 'primary-button' : 'secondary-button'} onClick={() => setEditing(e => !e)}>{editing ? 'Save changes' : 'Edit Profile'}</button>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-panel">
          <div className="profile-card-header"><div><h3>Personal Information</h3><p>{editing ? 'Update the details you would like to keep current.' : 'Your contact details are kept private and secure.'}</p></div>{editing && <span className="status-chip">Editing</span>}</div>
          
          <div className="profile-section-group">
            <h4 className="profile-subheading">Contact Information</h4>
            <div className="field-grid">
              {editing ? <label>Email<input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} /></label> : <div className="profile-value-field"><span>Email</span><strong>{profile.email}</strong></div>}
              {editing ? <label>Address<textarea value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} /></label> : <div className="profile-value-field"><span>Address</span><strong>{profile.address}</strong></div>}
              {editing ? <label>Emergency contact<input value={profile.emergencyContact} onChange={e => setProfile(p => ({ ...p, emergencyContact: e.target.value }))} /></label> : <div className="profile-value-field"><span>Emergency contact</span><strong>{profile.emergencyContact}</strong></div>}
            </div>
          </div>

          <div className="profile-section-divider" />

          <div className="profile-section-group">
            <h4 className="profile-subheading">Care Information</h4>
            <div className="field-grid">
              <div className="profile-value-field"><span>Member since</span><strong>{profile.memberSince}</strong></div>
              <div className="profile-value-field"><span>Primary physician</span><strong>{profile.primaryPhysician}</strong></div>
              <div className="profile-value-field"><span>Last visit</span><strong>{profile.lastVisit}</strong></div>
            </div>
          </div>
        </div>

        <div className="profile-panel">
          <div className="profile-card-header">
            <div>
              <h3>Health Summary</h3>
              <p>Physical metrics and practitioner-managed conditions.</p>
            </div>
          </div>

          <div className="metric-row">
            <div className="metric-card"><p>Age</p><strong>48</strong><small>years</small></div>
            <div className="metric-card editable-metric"><p>Weight</p>{editing ? <input aria-label="Weight in pounds" type="number" min="1" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} /> : <strong>{weight} lbs</strong>}<small> pounds</small></div>
            <div className="metric-card editable-metric"><p>Height</p>{editing ? <input aria-label="Height in inches" type="number" min="1" step="0.1" value={height} onChange={e => setHeight(e.target.value)} /> : <strong>{height} in</strong>}<small> inches</small></div>
          </div>

          <div className="bmi-highlight-card">
            <div className="bmi-info">
              <p>BMI</p>
              <strong>{bmi}</strong>
              <small>Calculated from height and weight</small>
            </div>
          </div>

          <div className="profile-section-divider" />

          <div className="conditions-section">
            <h4 className="profile-subheading">Practitioner-managed conditions</h4>
            <p className="form-note">Shown for reference in your care plan.</p>
            <ul className="conditions-list">
              {profile.conditions.map((c, i) => <li key={i}><span className="condition-bullet">✦</span>{c}</li>)}
            </ul>
          </div>
        </div>

        <div className="profile-panel">
          <div className="profile-card-header"><div><h3>Lifestyle Overview</h3><p>A quick picture of your most recent routines.</p></div><span className="status-chip">This week</span></div>
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
