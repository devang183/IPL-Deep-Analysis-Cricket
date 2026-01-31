import { useState, useEffect } from 'react';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';

function AuthPage() {
  const [view, setView] = useState('login'); // 'login', 'register', 'forgot-password', 'reset-password'

  // Check if this is a password reset link (has token and email params)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');

    if (token && email) {
      setView('reset-password');
    }
  }, []);

  switch (view) {
    case 'register':
      return <Register onSwitchToLogin={() => setView('login')} />;
    case 'forgot-password':
      return <ForgotPassword onBackToLogin={() => setView('login')} />;
    case 'reset-password':
      return <ResetPassword onBackToLogin={() => setView('login')} />;
    case 'login':
    default:
      return (
        <Login
          onSwitchToRegister={() => setView('register')}
          onForgotPassword={() => setView('forgot-password')}
        />
      );
  }
}

export default AuthPage;
