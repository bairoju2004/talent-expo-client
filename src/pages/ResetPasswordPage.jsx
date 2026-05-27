import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../api/services';

const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 64) return 'Password must be under 64 characters.';
  if (!/[A-Z]/.test(password)) return 'Must contain at least one uppercase letter (A-Z).';
  if (!/[a-z]/.test(password)) return 'Must contain at least one lowercase letter (a-z).';
  if (!/[0-9]/.test(password)) return 'Must contain at least one number (0-9).';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password))
    return 'Must contain at least one special character.';
  return '';
};

function PasswordChecklist({ password }) {
  const checks = [
    { label: 'At least 8 characters',     pass: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)', pass: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)', pass: /[a-z]/.test(password) },
    { label: 'One number (0-9)',           pass: /[0-9]/.test(password) },
    { label: 'One special character',      pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
  ];
  return (
    <ul className="mt-2 space-y-1">
      {checks.map(({ label, pass }) => (
        <li key={label} className={`text-xs flex items-center gap-1.5 ${pass ? 'text-green-600' : 'text-gray-400'}`}>
          <span>{pass ? '✅' : '○'}</span> {label}
        </li>
      ))}
    </ul>
  );
}

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setServerError('Invalid or missing reset token. Please request a new reset link.');
  }, [token]);

  const handleChange = (field, value) => {
    if (field === 'password') {
      setPassword(value);
      if (touched.password) setErrors((prev) => ({ ...prev, password: validatePassword(value) }));
      if (touched.confirm)  setErrors((prev) => ({ ...prev, confirm: value !== confirm ? 'Passwords do not match.' : '' }));
    } else {
      setConfirm(value);
      if (touched.confirm) setErrors((prev) => ({ ...prev, confirm: password !== value ? 'Passwords do not match.' : '' }));
    }
    setServerError('');
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'password') setErrors((prev) => ({ ...prev, password: validatePassword(password) }));
    if (field === 'confirm')  setErrors((prev) => ({ ...prev, confirm: password !== confirm ? 'Passwords do not match.' : '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ password: true, confirm: true });
    const passErr = validatePassword(password);
    const confErr = password !== confirm ? 'Passwords do not match.' : '';
    setErrors({ password: passErr, confirm: confErr });
    if (passErr || confErr) return;

    setLoading(true);
    setServerError('');
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Password reset!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your password has been updated successfully. Redirecting you to login…
          </p>
          <Link
            to="/login"
            className="inline-block bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-xl transition"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-2xl font-bold text-gray-800">Reset your password</h1>
          <p className="text-gray-500 mt-1 text-sm">Choose a strong new password below.</p>
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-2">
            <span>⚠️</span>
            <div>
              <span>{serverError}</span>
              {serverError.includes('expired') && (
                <p className="mt-1">
                  <Link to="/forgot-password" className="text-purple-600 underline font-medium">
                    Request a new link
                  </Link>
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* New Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => handleChange('password', e.target.value)}
                onBlur={() => handleBlur('password')}
                placeholder="Create a strong password"
                disabled={!token}
                className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 transition text-sm ${
                  touched.password && errors.password
                    ? 'border-red-400 focus:ring-red-300 bg-red-50'
                    : touched.password && !errors.password
                    ? 'border-green-400 focus:ring-green-300 bg-green-50'
                    : 'border-gray-300 focus:ring-purple-400 bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPass((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
            {touched.password && errors.password && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.password}</p>
            )}
            {password && <PasswordChecklist password={password} />}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => handleChange('confirm', e.target.value)}
                onBlur={() => handleBlur('confirm')}
                placeholder="Repeat your new password"
                disabled={!token}
                className={`w-full px-4 py-3 pr-12 border rounded-xl focus:outline-none focus:ring-2 transition text-sm ${
                  touched.confirm && errors.confirm
                    ? 'border-red-400 focus:ring-red-300 bg-red-50'
                    : touched.confirm && !errors.confirm && confirm
                    ? 'border-green-400 focus:ring-green-300 bg-green-50'
                    : 'border-gray-300 focus:ring-purple-400 bg-white'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
              >
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            {touched.confirm && errors.confirm && (
              <p className="text-red-500 text-xs mt-1">⚠ {errors.confirm}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition text-base shadow-md"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resetting…
              </span>
            ) : (
              'Reset Password →'
            )}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-6 text-sm">
          <Link to="/login" className="text-purple-600 font-semibold hover:underline">
            ← Back to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
