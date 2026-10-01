import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '../lib/api';

export function ChangePasswordPage({ temporary, onComplete }: { temporary: boolean; onComplete: () => void }) {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await patientApi.changePassword(currentPassword, newPassword);
      onComplete();
      navigate('/', { replace: true });
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : 'Could not update your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <section className="page-card login-card">
        <div className="login-brand"><span className="login-brand-mark">VS</span><div><p className="eyebrow">Patient Portal</p><h1>VitalSync</h1></div></div>
        <h2>{temporary ? 'Set a new password' : 'Change password'}</h2>
        <p className="login-copy">{temporary ? 'Choose a new password to continue to your Patient Portal.' : 'Enter your current password and choose a new one.'}</p>
        <form className="login-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="current-password">Current password</label>
            <input id="current-password" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="new-password">New password</label>
            <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button login-submit" disabled={submitting}>{submitting ? 'Updating...' : 'Update password'}</button>
        </form>
      </section>
    </div>
  );
}