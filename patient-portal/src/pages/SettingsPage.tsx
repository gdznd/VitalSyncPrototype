import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';

export function SettingsPage() {
  const navigate = useNavigate();
  const { onLogout } = useOutletContext<{ onLogout: () => void }>();
  const [dailyReminder, setDailyReminder] = useState(true);
  const [messageAlerts, setMessageAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [goalReminders, setGoalReminders] = useState(true);

  const [theme, setTheme] = useState<'light'|'dark'|'system'>(localStorage.getItem('theme') as 'light' | 'dark' | 'system' || 'system');
  const [accent, setAccent] = useState(localStorage.getItem('accent') || 'teal');
  const [textSize, setTextSize] = useState<'normal'|'large'|'xlarge'>('normal');
  const [language, setLanguage] = useState('English');

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem('accent', accent);
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
    document.documentElement.style.setProperty('--patient-font-scale', textSize === 'large' ? '1.08' : textSize === 'xlarge' ? '1.16' : '1');
  }, [accent, theme, textSize]);

  return (
    <section className="settings-panel">
      <div className="section-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h2>Control your experience</h2>
        </div>
      </div>

      <div className="settings-section">
        <h3>Notifications</h3>
        <div className="settings-row"><span>Daily Reminder</span><Toggle value={dailyReminder} onChange={setDailyReminder} /></div>
        <div className="settings-row"><span>Message Alerts</span><Toggle value={messageAlerts} onChange={setMessageAlerts} /></div>
        <div className="settings-row"><span>Weekly Summary</span><Toggle value={weeklySummary} onChange={setWeeklySummary} /></div>
        <div className="settings-row"><span>Goal Reminders</span><Toggle value={goalReminders} onChange={setGoalReminders} /></div>
      </div>

      <div className="settings-section">
        <h3>Appearance</h3>
        <div className="settings-row"><span>Theme</span><div className="radio-group"><label><input type="radio" name="theme" checked={theme==='light'} onChange={() => setTheme('light')} /> Light</label><label><input type="radio" name="theme" checked={theme==='dark'} onChange={() => setTheme('dark')} /> Dark</label><label><input type="radio" name="theme" checked={theme==='system'} onChange={() => setTheme('system')} /> System</label></div></div>
        <div className="settings-row"><div><span>Accent color</span></div><div className="color-options"><button className={`color-option ${accent === 'teal' ? 'active' : ''}`} style={{ background: '#258a88' }} onClick={() => setAccent('teal')} aria-label="Teal accent" /><button className={`color-option ${accent === 'navy' ? 'active' : ''}`} style={{ background: '#123b51' }} onClick={() => setAccent('navy')} aria-label="Navy accent" /><button className={`color-option ${accent === 'green' ? 'active' : ''}`} style={{ background: '#398b65' }} onClick={() => setAccent('green')} aria-label="Green accent" /><button className={`color-option ${accent === 'purple' ? 'active' : ''}`} style={{ background: '#7661b8' }} onClick={() => setAccent('purple')} aria-label="Purple accent" /></div></div>
      </div>

      <div className="settings-section">
        <h3>Accessibility</h3>
        <div className="settings-row"><span>Text Size</span><div className="radio-group"><label><input type="radio" name="textSize" checked={textSize==='normal'} onChange={() => setTextSize('normal')} /> Normal</label><label><input type="radio" name="textSize" checked={textSize==='large'} onChange={() => setTextSize('large')} /> Large</label><label><input type="radio" name="textSize" checked={textSize==='xlarge'} onChange={() => setTextSize('xlarge')} /> Extra Large</label></div></div>
        <div className="settings-row"><span>Language</span><select value={language} onChange={e => setLanguage(e.target.value)}><option>English</option><option>Filipino</option></select></div>
      </div>

      <div className="settings-section">
        <h3>Privacy & Data</h3>
        <p className="setting-help">Your health information is used to support your care team and is kept within this prototype workspace.</p>
        <div className="settings-row"><span>Privacy & Security</span><button className="secondary-button" type="button">View information</button></div>
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

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <button className={`toggle-switch ${value ? 'active' : ''}`} onClick={() => onChange(!value)} aria-pressed={value} />;
}
