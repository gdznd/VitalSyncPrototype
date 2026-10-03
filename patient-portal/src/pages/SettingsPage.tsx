import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { patientApi, type PatientPreferencesDto } from '../lib/api';

const defaultPreferences: PatientPreferencesDto = {
  theme: 'system',
  accent: 'teal',
  textSize: 'normal',
  language: 'English',
  notifications: {
    dailyReminder: true,
    messageAlerts: true,
    weeklySummary: false,
    goalReminders: true,
  },
};

export function SettingsPage() {
  const navigate = useNavigate();
  const { onLogout } = useOutletContext<{ onLogout: () => void }>();
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let active = true;
    patientApi.getPreferences()
      .then(({ preferences: loaded }) => { if (active) setPreferences(loaded); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : 'Could not load settings.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', preferences.accent);
    document.documentElement.dataset.theme = preferences.theme;
    document.documentElement.style.setProperty(
      '--patient-font-scale',
      preferences.textSize === 'large' ? '1.08' : preferences.textSize === 'xlarge' ? '1.16' : '1',
    );
  }, [preferences.accent, preferences.theme, preferences.textSize]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const { preferences: savedPreferences } = await patientApi.updatePreferences(preferences);
      setPreferences(savedPreferences);
      setSaved(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not save settings.');
    } finally {
      setSaving(false);
    }
  };

  const updateNotification = (key: keyof PatientPreferencesDto['notifications'], value: boolean) => {
    setPreferences((current) => ({
      ...current,
      notifications: { ...current.notifications, [key]: value },
    }));
    setSaved(false);
  };

  return (
    <section className="settings-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Control your experience</h2>
        </div>
        <button className="primary-button" type="button" onClick={() => void save()} disabled={loading || saving}>
          {saving ? 'Saving...' : 'Save preferences'}
        </button>
      </div>
      {loading && <p role="status">Loading settings...</p>}
      {error && <p className="inline-note error" role="alert">{error}</p>}
      {saved && <p className="inline-note" role="status">Preferences saved to your account.</p>}

      <div className="settings-section">
        <h3>Notifications</h3>
        <div className="settings-row"><span>Daily Reminder</span><Toggle value={preferences.notifications.dailyReminder} disabled={loading} onChange={(value) => updateNotification('dailyReminder', value)} /></div>
        <div className="settings-row"><span>Message Alerts</span><Toggle value={preferences.notifications.messageAlerts} disabled={loading} onChange={(value) => updateNotification('messageAlerts', value)} /></div>
        <div className="settings-row"><span>Weekly Summary</span><Toggle value={preferences.notifications.weeklySummary} disabled={loading} onChange={(value) => updateNotification('weeklySummary', value)} /></div>
        <div className="settings-row"><span>Goal Reminders</span><Toggle value={preferences.notifications.goalReminders} disabled={loading} onChange={(value) => updateNotification('goalReminders', value)} /></div>
        <p className="setting-help">Preferences are stored; notification delivery is not enabled in this prototype.</p>
      </div>

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row"><span>Theme</span><div className="radio-group"><label><input type="radio" name="theme" checked={preferences.theme === 'light'} disabled={loading} onChange={() => { setPreferences((current) => ({ ...current, theme: 'light' })); setSaved(false); }} /> Light</label><label><input type="radio" name="theme" checked={preferences.theme === 'dark'} disabled={loading} onChange={() => { setPreferences((current) => ({ ...current, theme: 'dark' })); setSaved(false); }} /> Dark</label><label><input type="radio" name="theme" checked={preferences.theme === 'system'} disabled={loading} onChange={() => { setPreferences((current) => ({ ...current, theme: 'system' })); setSaved(false); }} /> System</label></div></div>
        <div className="settings-row"><div><span>Accent color</span></div><div className="color-options">{(['teal', 'navy', 'green', 'purple'] as const).map((accent) => <button key={accent} type="button" className={`color-option ${preferences.accent === accent ? 'active' : ''}`} style={{ background: { teal: '#258a88', navy: '#123b51', green: '#398b65', purple: '#7661b8' }[accent] }} onClick={() => { setPreferences((current) => ({ ...current, accent })); setSaved(false); }} aria-label={`${accent} accent`} disabled={loading} />)}</div></div>
      </div>

      <div className="settings-section">
        <h3>Accessibility</h3>
        <div className="settings-row"><span>Text Size</span><div className="radio-group"><label><input type="radio" name="textSize" checked={preferences.textSize === 'normal'} disabled={loading} onChange={() => { setPreferences((current) => ({ ...current, textSize: 'normal' })); setSaved(false); }} /> Normal</label><label><input type="radio" name="textSize" checked={preferences.textSize === 'large'} disabled={loading} onChange={() => { setPreferences((current) => ({ ...current, textSize: 'large' })); setSaved(false); }} /> Large</label><label><input type="radio" name="textSize" checked={preferences.textSize === 'xlarge'} disabled={loading} onChange={() => { setPreferences((current) => ({ ...current, textSize: 'xlarge' })); setSaved(false); }} /> Extra Large</label></div></div>
        <div className="settings-row"><span>Language</span><select value={preferences.language} disabled={loading} onChange={(event) => { setPreferences((current) => ({ ...current, language: event.target.value as PatientPreferencesDto['language'] })); setSaved(false); }}><option>English</option><option>Filipino</option></select></div>
      </div>

      <div className="settings-section">
        <h3>Privacy &amp; Data</h3>
        <p className="setting-help">Your health information is used to support your care team and is kept within this prototype workspace.</p>
        <div className="settings-row"><span>Privacy &amp; Security</span><button className="secondary-button" type="button">View information</button></div>
        <div className="settings-row"><span>Health Information Privacy</span><button className="secondary-button" type="button">View information</button></div>
      </div>

      <div className="settings-section">
        <h3>Account</h3>
        <div className="settings-row"><div><span>Change Password</span><small className="setting-help">Update your account password.</small></div><button className="secondary-button" type="button" onClick={() => navigate('/change-password')}>Change Password</button></div>
        <div className="settings-row"><div><span>Sign out</span></div><button className="danger-button" type="button" onClick={onLogout}>Sign out</button></div>
      </div>
    </section>
  );
}

function Toggle({ value, onChange, disabled }: { value: boolean; onChange: (value: boolean) => void; disabled: boolean }) {
  return <button type="button" className={`toggle-switch ${value ? 'active' : ''}`} disabled={disabled} onClick={() => onChange(!value)} aria-pressed={value} />;
}
