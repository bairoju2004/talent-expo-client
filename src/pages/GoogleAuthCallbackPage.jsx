import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function GoogleAuthCallbackPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token  = searchParams.get('token');
    const id     = searchParams.get('id');
    const name   = searchParams.get('name');
    const email  = searchParams.get('email');
    const role   = searchParams.get('role');
    const isNew  = searchParams.get('isNew') === 'true';
    const err    = searchParams.get('error');

    if (err || !token) {
      setError('Google Sign-In failed. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Store user in auth context
    login({ _id: id, name, email, role, token, isEmailVerified: true });

    if (isNew) {
      // Brand new account — send to profile setup
      if (role === 'artist') {
        navigate('/artist/profile');
      } else {
        navigate('/customer/profile');
      }
    } else {
      // Existing account — send to main app
      if (role === 'artist') {
        navigate('/browse');
      } else if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/browse');
      }
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Sign-In Failed</h2>
          <p className="text-red-500 text-sm">{error}</p>
          <p className="text-gray-400 text-xs mt-2">Redirecting back to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
        <p className="text-gray-600 font-medium">Signing you in with Google…</p>
      </div>
    </div>
  );
}

export default GoogleAuthCallbackPage;
