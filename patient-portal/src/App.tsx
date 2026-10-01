import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { clearAuthToken, getAuthToken, patientApi, type PatientAuthUser } from './lib/api';
import SummaryPage from './pages/SummaryPage';
import { GoalsPage } from './pages/GoalsPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { MessagesPage } from './pages/MessagesPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import './App.css';

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [patientName, setPatientName] = useState('');

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getAuthToken()) {
        setAuthReady(true);
        return;
      }

      try {
        const { user } = await patientApi.me();
        if (user.role !== 'patient') {
          clearAuthToken();
          return;
        }
        if (active) {
          setSignedIn(true);
          setRequiresPasswordChange(user.is_temporary_password);
          setPatientName(user.name || user.email);
        }
      } catch {
        clearAuthToken();
      } finally {
        if (active) setAuthReady(true);
      }
    }

    void restoreSession();
    return () => { active = false; };
  }, []);

  const handleLogin = (user: PatientAuthUser) => {
    setRequiresPasswordChange(user.is_temporary_password);
    setPatientName(user.name || user.email);
    setSignedIn(true);
  };

  const handleLogout = () => {
    clearAuthToken();
    setSignedIn(false);
    setRequiresPasswordChange(false);
    setPatientName('');
  };

  return (
    <BrowserRouter>
      {!authReady ? <main aria-busy="true">Checking your session...</main> : (
        <Routes>
          <Route path="/login" element={signedIn ? <Navigate to={requiresPasswordChange ? '/change-password' : '/'} replace /> : <LoginPage onLogin={handleLogin} />} />
          <Route path="/change-password" element={signedIn ? <ChangePasswordPage temporary={requiresPasswordChange} onComplete={() => setRequiresPasswordChange(false)} /> : <Navigate to="/login" replace />} />
          <Route element={signedIn && !requiresPasswordChange ? <AppShell patientName={patientName} onLogout={handleLogout} /> : <Navigate to={signedIn ? '/change-password' : '/login'} replace />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}
