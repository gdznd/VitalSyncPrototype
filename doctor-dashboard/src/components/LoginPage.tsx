import { useState } from 'react'
import { api, clearAuthToken, type AuthUser } from '../lib/api'

type AuthView = 'login' | 'register' | 'verify' | 'forgot'

export function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [view, setView] = useState<AuthView>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [specialty, setSpecialty] = useState('Lifestyle Medicine')
  const [verificationCode, setVerificationCode] = useState('')
  const [resetEmail, setResetEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const submitLogin = async (event: React.FormEvent) => {
      event.preventDefault()
      if (!email.trim() || !password) {
        setError('Email and password are required.')
        return
      }
    try {
      const response = await api.login(email, password)
      if (response.user.role !== 'doctor') {
        clearAuthToken()
        setError('This account is not a doctor account.')
        return
      }
      onLogin(response.user)
      setError('')
    } catch (err: any) {
        setError(err.message || 'No matching doctor account was found. Try a registered clinic email and password.')
      }
    }

  const submitRegister = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Name, email, and password are required.')
      return
    }
    try {
      await api.registerDoctor({ name: fullName, email, password, specialty })
      setEmail(email.trim().toLowerCase())
      setPassword('')
      setFullName('')
      setVerificationCode('')
      setView('verify')
      setSuccess('Check your email for a six-digit verification code. You must verify this address before signing in.')
      setError('')
    } catch (err: any) {
      setError(err.message || 'An account already exists for that doctor email.')
    }
  }

  const submitVerification = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!email.trim() || !verificationCode.trim()) {
      setError('Email and verification code are required.')
      return
    }
    try {
      await api.verifyDoctorRegistration(email, verificationCode.trim())
      setVerificationCode('')
      setView('login')
      setSuccess('Email verified. You can now sign in.')
      setError('')
    } catch (err: any) {
      setError(err.message || 'Could not verify this email address.')
    }
  }

  const resendVerification = async () => {
    if (!email.trim()) {
      setError('Enter the email address used to create the account.')
      return
    }
    try {
      const response = await api.resendDoctorRegistrationCode(email)
      setSuccess(response.message)
      setError('')
    } catch (err: any) {
      setError(err.message || 'Could not resend the verification code.')
    }
  }

  const submitRecovery = (event: React.FormEvent) => {
    event.preventDefault()
    if (!resetEmail.trim()) {
      setError('Enter the email address tied to your doctor account.')
      return
    }
    setError('')
    setSuccess(`If an account exists for ${resetEmail.trim()}, password recovery instructions would be sent.`)
    setResetEmail('')
    setView('login')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="brand" style={{ justifyContent: 'center', marginBottom: '24px' }}><span className="brand-mark">✦</span><span>VitalSync</span></div>
        {view === 'login' && (
          <>
            <h2>Sign in to VitalSync</h2>
            <p className="login-subtitle">Enter your credentials to access the clinic workspace.</p>
            <form className="auth-form" onSubmit={submitLogin}>
              <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
              <div className="login-actions">
                <button type="button" className="text-button" onClick={() => { setError(''); setSuccess(''); setView('forgot') }}>Forgot password?</button>
              </div>
              <button className="primary" style={{ width: '100%', marginTop: '8px' }} type="submit">Sign in</button>
              <div className="login-form-links">
                <span>Don&apos;t have an account? <button type="button" className="text-button" onClick={() => { setError(''); setSuccess(''); setView('register') }}>Create one</button></span>
                <button type="button" className="text-button" onClick={() => { setError(''); setSuccess(''); setVerificationCode(''); setView('verify') }}>Verify your email</button>
              </div>
            </form>
          </>
        )}
        {view === 'register' && (
          <>
            <h2>Register doctor account</h2>
            <p className="login-subtitle">Create your doctor account with your email address. You will need to verify that address before signing in.</p>
            <form className="auth-form" onSubmit={submitRegister}>
              <label>Full name<input value={fullName} onChange={(e) => setFullName(e.target.value)} required /></label>
              <label>Specialty<select value={specialty} onChange={(e) => setSpecialty(e.target.value)}><option>Lifestyle Medicine</option><option>Cardiology</option><option>Rehab</option><option>Primary Care</option><option>General Medicine</option></select></label>
              <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></label>
              <button className="primary" style={{ width: '100%' }} type="submit">Create account</button>
              <div className="login-form-links"><button type="button" className="text-button" onClick={() => { setError(''); setSuccess(''); setView('login') }}>Back to login</button></div>
            </form>
          </>
        )}
        {view === 'verify' && (
          <>
            <h2>Verify your email</h2>
            <p className="login-subtitle">Enter the six-digit code sent to your email address. The code expires in 10 minutes.</p>
            <form className="auth-form" onSubmit={submitVerification}>
              <label>Email address<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
              <label>Verification code<input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} required /></label>
              <button className="primary" style={{ width: '100%' }} type="submit">Verify email</button>
              <div className="login-form-links">
                <button type="button" className="text-button" onClick={() => void resendVerification()}>Resend code</button>
                <button type="button" className="text-button" onClick={() => { setError(''); setSuccess(''); setView('login') }}>Back to login</button>
              </div>
            </form>
          </>
        )}
        {view === 'forgot' && (
          <>
            <h2>Recover access</h2>
            <p className="login-subtitle">Enter your clinic email to receive mock recovery instructions.</p>
            <form className="auth-form" onSubmit={submitRecovery}>
              <label>Email address<input type="email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} required /></label>
              <button className="primary" style={{ width: '100%' }} type="submit">Send recovery instructions</button>
              <div className="login-form-links"><button type="button" className="text-button" onClick={() => { setError(''); setSuccess(''); setView('login') }}>Back to login</button></div>
            </form>
          </>
        )}
        {(error || success) && <div className={error ? 'inline-note error' : 'inline-note success'}>{error || success}</div>}
      </div>
    </div>
  )
}
