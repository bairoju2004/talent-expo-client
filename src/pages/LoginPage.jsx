import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { loginUser, resendVerificationEmail } from '../api/services';
import { useAuth } from '../context/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const validateEmail = (email) => {
  if (!email.trim()) return 'Email address is required.';
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) return 'Enter a valid email address (e.g. you@example.com).';
  return '';
};

const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  return '';
};

function GoogleButton() {
  return (
    <button
      type="button"
      onClick={() => { window.location.href = `${API_BASE}/auth/google/intent/login`; }}
      className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl transition text-sm shadow-sm"
    >
      <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
        <path fill="none" d="M0 0h48v48H0z"/>
      </svg>
      Continue with Google
    </button>
  );
}

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  // Unverified email state
  const [showResend, setShowResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [searchParams] = useSearchParams();

  // Show error banners from Google OAuth redirects
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'banned') setServerError('Your account has been suspended. Please contact support.');
    if (error === 'google_failed') setServerError('Google Sign-In failed. Please try again.');
  }, []);

  const validateField = (name, value) => {
    if (name === 'email') return validateEmail(value);
    if (name === 'password') return validatePassword(value);
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    setServerError('');
    setShowResend(false);
    setResendMsg('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const triggerLock = () => {
    setLocked(true);
    let secs = 30;
    setLockTimer(secs);
    const interval = setInterval(() => {
      secs--;
      setLockTimer(secs);
      if (secs <= 0) {
        clearInterval(interval);
        setLocked(false);
        setLoginAttempts(0);
        setServerError('');
      }
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (locked) return;

    setTouched({ email: true, password: true });
    const newErrors = {
      email: validateEmail(formData.email),
      password: validatePassword(formData.password),
    };
    setErrors(newErrors);
    if (Object.values(newErrors).some((err) => err)) return;

    setLoading(true);
    setServerError('');
    setShowResend(false);
    setResendMsg('');

    try {
      const res = await loginUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      login(res.data);
      setLoginAttempts(0);
      navigate('/browse');
    } catch (err) {
      // Email not verified — show resend button, don't count as failed attempt
      if (err.response?.status === 403 && err.response?.data?.isEmailVerified === false) {
        setServerError(err.response.data.message);
        setShowResend(true);
        setLoading(false);
        return;
      }

      const attempts = loginAttempts + 1;
      setLoginAttempts(attempts);
      if (attempts >= 5) {
        triggerLock();
        setServerError('Too many failed attempts. Please wait 30 seconds before trying again.');
      } else {
        const remaining = 5 - attempts;
        setServerError(
          err.response?.status === 401
            ? `Incorrect email or password. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
            : err.response?.data?.message || 'Login failed. Please try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      await resendVerificationEmail(formData.email.trim().toLowerCase());
      setResendMsg('✅ Verification email sent! Check your inbox.');
    } catch (err) {
      setResendMsg('❌ Failed to resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const InputError = ({ field }) =>
    touched[field] && errors[field] ? (
      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
        <span>⚠</span> {errors[field]}
      </p>
    ) : null;

  const inputClass = (field) =>
    `w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition text-sm ${
      touched[field] && errors[field]
        ? 'border-red-400 focus:ring-red-300 bg-red-50'
        : touched[field] && !errors[field]
        ? 'border-green-400 focus:ring-green-300 bg-green-50'
        : 'border-gray-300 focus:ring-purple-400 bg-white'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎭</div>
          <h1 className="text-3xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your TalentExpo account</p>
        </div>

        {/* Google Sign-In */}
        <div className="mb-5">
          <GoogleButton />
        </div>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or sign in with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Lockout banner */}
        {locked && (
          <div className="bg-orange-50 border border-orange-300 text-orange-700 px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-2">
            <span className="mt-0.5 text-lg">🔒</span>
            <div>
              <p className="font-semibold">Account temporarily locked</p>
              <p>Too many failed attempts. Try again in <span className="font-bold">{lockTimer}s</span>.</p>
            </div>
          </div>
        )}

        {/* Server error */}
        {serverError && !locked && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            <div className="flex items-start gap-2">
              <span>⚠️</span>
              <span>{serverError}</span>
            </div>
            {/* Resend verification button */}
            {showResend && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-xs text-red-600 mb-2">Didn't receive the email?</p>
                <button
                  onClick={handleResendVerification}
                  disabled={resendLoading}
                  className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-xs font-semibold px-4 py-2 rounded-lg transition"
                >
                  {resendLoading ? 'Sending...' : 'Resend Verification Email'}
                </button>
                {resendMsg && (
                  <p className="text-xs mt-2 font-medium text-gray-700">{resendMsg}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Attempt warning bar */}
        {loginAttempts > 0 && loginAttempts < 5 && !locked && !showResend && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Login attempts</span>
              <span className={loginAttempts >= 3 ? 'text-red-500 font-bold' : ''}>{loginAttempts}/5</span>
            </div>
            <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  loginAttempts <= 2 ? 'bg-yellow-400' : loginAttempts <= 3 ? 'bg-orange-400' : 'bg-red-500'
                }`}
                style={{ width: `${(loginAttempts / 5) * 100}%` }}
              />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="you@gmail.com"
                autoComplete="email"
                disabled={locked}
                className={`${inputClass('email')} ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              {touched.email && !errors.email && formData.email && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">✓</span>
              )}
            </div>
            <InputError field="email" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <Link to="/forgot-password" className="text-xs text-purple-600 hover:underline font-medium">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={locked}
                className={`${inputClass('password')} pr-12 ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                disabled={locked}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm transition-colors"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <InputError field="password" />
          </div>

          <button
            type="submit"
            disabled={loading || locked}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all text-base shadow-md"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in...
              </span>
            ) : locked ? (
              `🔒 Locked — wait ${lockTimer}s`
            ) : (
              'Sign In →'
            )}
          </button>
        </form>

        <div className="mt-5 p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-xs text-gray-500 text-center flex items-center justify-center gap-1">
            <span>🔐</span>
            Your connection is secure and your data is encrypted.
          </p>
        </div>

        <p className="text-center text-gray-500 mt-5 text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-purple-600 font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
