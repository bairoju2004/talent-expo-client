import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { verifyEmail, resendVerificationEmail } from '../api/services';
import { useAuth } from '../context/AuthContext';

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { login } = useAuth();

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');
  const [userData, setUserData] = useState(null);
  const [resendEmail, setResendEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  // Prevent double-call in React 18 Strict Mode
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link.');
      return;
    }

    // Guard against Strict Mode double-invoke
    if (hasVerified.current) return;
    hasVerified.current = true;

    verifyEmail(token)
      .then((res) => {
        const data = res.data;
        setUserData(data);
        setStatus('success');
        setMessage('Your email has been verified successfully!');
        // DO NOT navigate or login here — user clicks the button manually
      })
      .catch((err) => {
        setStatus('error');
        setMessage(
          err.response?.data?.message ||
          'Verification failed. The link may have expired or already been used.'
        );
      });
  }, [token]);

  const handleContinue = () => {
    if (!userData) return;
    // Log the user in now
    login(userData);
    // Navigate to profile setup
    if (userData.role === 'artist') {
      navigate('/artist/profile');
    } else {
      navigate('/customer/profile');
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail.trim()) return;
    setResendLoading(true);
    setResendMessage('');
    try {
      const res = await resendVerificationEmail(resendEmail.trim().toLowerCase());
      setResendMessage(res.data.message || 'Verification email sent!');
    } catch (err) {
      setResendMessage(err.response?.data?.message || 'Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">

        {/* Loading */}
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
            <p className="text-gray-600 font-medium text-lg">Verifying your email…</p>
            <p className="text-gray-400 text-sm mt-1">Please wait a moment.</p>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Email Verified!</h2>
            <p className="text-green-600 font-medium text-sm mb-2">{message}</p>
            <p className="text-gray-500 text-sm mb-6">
              Welcome to TalentExpo,{' '}
              <span className="font-semibold text-purple-700">{userData?.name}</span>!
              Click below to set up your profile and get started.
            </p>

            <button
              onClick={handleContinue}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-xl transition text-base shadow-md"
            >
              {userData?.role === 'artist'
                ? 'Set Up My Artist Profile →'
                : 'Set Up My Customer Profile →'}
            </button>

            <div className="mt-4 p-3 bg-purple-50 border border-purple-100 rounded-xl">
              <p className="text-xs text-purple-600">
                🎭 You're registered as a{' '}
                <span className="font-bold capitalize">{userData?.role}</span>
              </p>
            </div>
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Verification Failed</h2>
            <p className="text-red-500 text-sm mb-6">{message}</p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-left mb-5">
              <p className="text-sm font-semibold text-gray-700 mb-1">Need a new verification link?</p>
              <p className="text-xs text-gray-500 mb-3">Enter your email and we'll send a fresh one.</p>
              <form onSubmit={handleResend} className="flex gap-2">
                <input
                  type="email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="your@gmail.com"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  type="submit"
                  disabled={resendLoading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
                >
                  {resendLoading ? '…' : 'Resend'}
                </button>
              </form>
              {resendMessage && (
                <p className="text-xs mt-2 text-green-600 font-medium">{resendMessage}</p>
              )}
            </div>

            <Link to="/login" className="text-purple-600 font-semibold hover:underline text-sm">
              ← Back to Sign In
            </Link>
          </>
        )}

      </div>
    </div>
  );
}

export default VerifyEmailPage;