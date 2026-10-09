import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { patientApi } from '../lib/api';

export function ChangePasswordPage({ temporary, onComplete }: { temporary: boolean; onComplete: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'verify' | 'password'>('request');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const requestCode = async () => {
    setError('');
    setSubmitting(true);
    try {
      await patientApi.requestPasswordChangeCode();
      setStep('verify');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send a verification code.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await patientApi.verifyPasswordChangeCode(code.trim());
      setStep('password');
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : 'Could not verify the code.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await patientApi.changePassword(newPassword);
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
        {step === 'request' && (
          <>
            <p className="login-copy">{temporary
              ? 'Verify your registered email to finish setting up your Patient Portal account.'
              : 'A one-time verification code will be sent to your registered email.'}</p>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="button" className="primary-button login-submit" onClick={() => void requestCode()} disabled={submitting}>
              {submitting ? 'Sending...' : 'Send verification code'}
            </button>
          </>
        )}
        {step === 'verify' && (
          <form className="login-form" onSubmit={verifyCode}>
            <p className="login-copy">Enter the six-digit code sent to your registered email.</p>
            <div className="form-group">
              <label htmlFor="verification-code">Verification code</label>
              <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} required />
            </div>
            {error && <p className="login-error" role="alert">{error}</p>}
            <button type="submit" className="primary-button login-submit" disabled={submitting}>{submitting ? 'Verifying...' : 'Verify code'}</button>
            <button type="button" className="secondary-button login-submit" onClick={() => void requestCode()} disabled={submitting}>Send a new code</button>
          </form>
        )}
        {step === 'password' && (
          <form className="login-form" onSubmit={submitPassword}>
            <p className="login-copy">Choose a new password to continue.</p>
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
        )}
      </section>
    </div>
  );
}