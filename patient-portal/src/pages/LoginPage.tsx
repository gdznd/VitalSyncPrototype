export function LoginPage({ onLogin }: { onLogin: () => void }) {

  return (
    <div className="login-container">
      <section className="page-card login-card">
        <div className="login-brand"><span className="login-brand-mark">VS</span><div><p className="eyebrow">Patient Portal</p><h1>VitalSync</h1></div></div>
        <h2>Welcome Back</h2>
        <p className="login-copy">Continue your lifestyle journey and stay connected with your care team.</p>
        <form className="login-form" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <div className="form-group">
            <label htmlFor="patient-email">Email address</label>
            <input id="patient-email" type="email" placeholder="john@example.com" required />
          </div>
          <div className="form-group">
            <label htmlFor="patient-password">Password</label>
            <input id="patient-password" type="password" placeholder="Enter your password" required />
          </div>
          <div className="form-options">
            <label>
              <input type="checkbox" /> <span>Remember me</span>
            </label>
            <a href="#forgot-password">Forgot password?</a>
          </div>
          <button type="submit" className="primary-button login-submit">Log in</button>
        </form>
        <p className="login-note">Your health information is kept private and secure.</p>
      </section>
    </div>
  );
}
