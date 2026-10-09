import { useState } from 'react';
import { clearAuthToken, patientApi, type PatientAuthUser } from '../lib/api';

export function LoginPage({ onLogin }: { onLogin: (user: PatientAuthUser) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const response = await patientApi.login(email.trim(), password);
      if (response.user.role !== 'patient') {
        clearAuthToken();
        setError('This account is not a patient account.');
        return;
      }
      onLogin(response.user);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not sign in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-container">
      <section className="page-card login-card">
        <div className="login-brand"><span className="login-brand-mark">VS</span><div><p className="eyebrow">Patient Portal</p><h1>VitalSync</h1></div></div>
        <h2>Welcome Back</h2>
        <p className="login-copy">Continue your lifestyle journey and stay connected with your care team.</p>
        <form className="login-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="patient-email">Email address</label>
            <input id="patient-email" type="email" placeholder="john@example.com" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="patient-password">Password</label>
            <input id="patient-password" type="password" placeholder="Enter your password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          <div className="form-options">
            <label>
              <input type="checkbox" /> <span>Remember me</span>
            </label>
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button login-submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Log in'}</button>
        </form>
        <p className="login-note">Your health information is kept private and secure.</p>
      </section>
    </div>
  );
}
