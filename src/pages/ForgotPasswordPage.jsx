import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api/services';

function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateEmail = (val) => {
    if (!val.trim()) return 'Email address is required.';
    const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    if (!re.test(val.trim())) return 'Enter a valid email address.';
    return '';
  };

  const handleChange = (e) => {
    setEmail(e.target.value);
    if (touched) setEmailError(validateEmail(e.target.value));
    setServerError('');
  };

  const handleBlur = () => {
    setTouched(true);
    setEmailError(validateEmail(email));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(true);
    const err = validateEmail(email);
    setEmailError(err);
    if (err) return;

    setLoading(true);
    setServerError('');
    try {
      await forgotPassword(email.trim().toLowerCase());
      setSubmitted(true);
    } catch (error) {
      setServerError(
        error.response?.data?.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Check your inbox</h2>
          <p className="text-gray-500 text-sm mb-6">
            If <span className="font-semibold text-gray-700">{email}</span> is registered,
            we've sent a password reset link. It expires in <strong>1 hour</strong>.
          </p>
          <p className="text-xs text-gray-400 mb-6">
            Didn't receive it? Check your spam folder, or{' '}
            <button
              onClick={() => { setSubmitted(false); setEmail(''); setTouched(false); }}
              className="text-purple-600 hover:underline font-medium"
            >
              try again
            </button>
            .
          </p>
          <Link
            to="/login"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-xl transition"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-2xl font-bold text-gray-800">Forgot your password?</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-2">
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={handleChange}
              onBlur={handleBlur}
              placeholder="you@gmail.com"
              autoComplete="email"
              className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition text-sm ${
                touched && emailError
                  ? 'border-red-400 focus:ring-red-300 bg-red-50'
                  : touched && !emailError
                  ? 'border-green-400 focus:ring-green-300 bg-green-50'
                  : 'border-gray-300 focus:ring-purple-400 bg-white'
              }`}
            />
            {touched && emailError && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span>⚠</span> {emailError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition text-base shadow-md"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Sending...
              </span>
            ) : (
              'Send Reset Link →'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          Remember your password?{' '}
          <Link to="/login" className="text-purple-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
