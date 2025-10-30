import { useState } from 'react';
import Login from './Login';
import Register from './Register';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);

  return isLogin ? (
    <Login onSwitchToRegister={() => setIsLogin(false)} />
  ) : (
    <Register onSwitchToLogin={() => setIsLogin(true)} />
  );
}

export default AuthPage;
