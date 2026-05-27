import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { registerUser } from '../api/services';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Validation ────────────────────────────────────────────────────────────────
const validateName = (name) => {
  if (!name.trim()) return 'Full name is required.';
  if (name.trim().length < 3) return 'Name must be at least 3 characters.';
  if (name.trim().length > 50) return 'Name must be under 50 characters.';
  if (!/^[a-zA-Z\s'-]+$/.test(name.trim())) return 'Name can only contain letters, spaces, hyphens and apostrophes.';
  return '';
};
const validateEmail = (email) => {
  if (!email.trim()) return 'Email address is required.';
  const re = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!re.test(email.trim())) return 'Enter a valid Gmail address (e.g. you@gmail.com).';
  return '';
};
const validatePassword = (password) => {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 64) return 'Password must be under 64 characters.';
  if (!/[A-Z]/.test(password)) return 'Must contain at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Must contain at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Must contain at least one number.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) return 'Must contain at least one special character.';
  return '';
};
const validateConfirm = (password, confirm) => {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
};

function getStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) score++;
  if (score <= 2) return { label: 'Weak',   color: 'bg-red-500',   width: 'w-1/4', textColor: 'text-red-600' };
  if (score <= 4) return { label: 'Fair',   color: 'bg-yellow-400', width: 'w-2/4', textColor: 'text-yellow-600' };
  if (score === 5) return { label: 'Good',  color: 'bg-blue-500',  width: 'w-3/4', textColor: 'text-blue-600' };
  return              { label: 'Strong', color: 'bg-green-500', width: 'w-full', textColor: 'text-green-600' };
}

function PasswordChecklist({ password }) {
  const checks = [
    { label: 'At least 8 characters',      pass: password.length >= 8 },
    { label: 'One uppercase letter (A-Z)',  pass: /[A-Z]/.test(password) },
    { label: 'One lowercase letter (a-z)',  pass: /[a-z]/.test(password) },
    { label: 'One number (0-9)',            pass: /[0-9]/.test(password) },
    { label: 'One special character',       pass: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password) },
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

// ── Google button — role must be selected first ───────────────────────────────
function GoogleButton({ role }) {
  const handleClick = () => {
    if (!role) return; // button is disabled if no role selected
    window.location.href = `${API_BASE}/auth/google/intent/register/${role}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!role}
      title={!role ? 'Please select Customer or Artist first' : ''}
      className={`w-full flex items-center justify-center gap-3 border border-gray-300 font-semibold py-3 rounded-xl transition text-sm shadow-sm ${
        role
          ? 'bg-white hover:bg-gray-50 text-gray-700 cursor-pointer'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill={role ? "#EA4335" : "#ccc"} d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
        <path fill={role ? "#4285F4" : "#ccc"} d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
        <path fill={role ? "#FBBC05" : "#ccc"} d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
        <path fill={role ? "#34A853" : "#ccc"} d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
      </svg>
      {role ? `Sign up as ${role.charAt(0).toUpperCase() + role.slice(1)} with Google` : 'Select a role to sign up with Google'}
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [formData, setFormData] = useState({ role: '', name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors]   = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [registered, setRegistered]       = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [googleNotice, setGoogleNotice]   = useState('');

  useEffect(() => {
    const error = searchParams.get('error');
    const email = searchParams.get('email');
    const name  = searchParams.get('name');
    if (error === 'no_account') {
      setGoogleNotice('No TalentExpo account found for this Google email. Please register below first, then you can sign in with Google.');
      if (email) setFormData((prev) => ({ ...prev, email }));
      if (name)  setFormData((prev) => ({ ...prev, name }));
    }
  }, []);

  const validateField = (name, value) => {
    if (name === 'role')    return value ? '' : 'Please select a role.';
    if (name === 'name')    return validateName(value);
    if (name === 'email')   return validateEmail(value);
    if (name === 'password') return validatePassword(value);
    if (name === 'confirm') return validateConfirm(formData.password, value);
    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (touched[name]) setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    if (name === 'password' && touched.confirm)
      setErrors((prev) => ({ ...prev, confirm: validateConfirm(value, formData.confirm) }));
    setServerError('');
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const allTouched = { role: true, name: true, email: true, password: true, confirm: true };
    setTouched(allTouched);
    const newErrors = Object.fromEntries(
      Object.keys(allTouched).map((k) => [k, validateField(k, formData[k])])
    );
    setErrors(newErrors);
    if (Object.values(newErrors).some((err) => err)) return;

    setLoading(true);
    setServerError('');
    try {
      await registerUser({
        role: formData.role,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });
      setRegisteredEmail(formData.email.trim().toLowerCase());
      setRegistered(true);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── After manual register — show "check your email" screen ───────────────
  if (registered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">Check your Gmail!</h2>
          <p className="text-gray-500 text-sm mb-2">We've sent a verification link to:</p>
          <p className="font-semibold text-purple-700 text-sm mb-5">{registeredEmail}</p>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-left mb-5">
            <p className="text-sm text-purple-800 font-medium mb-1">What happens next?</p>
            <ol className="text-xs text-purple-700 space-y-1 list-decimal list-inside">
              <li>Open your Gmail inbox</li>
              <li>Click the verification link in the email</li>
              <li>You'll be automatically logged in</li>
              <li>Fill in your {formData.role} profile details</li>
              <li>Start using TalentExpo! 🎉</li>
            </ol>
          </div>
          <p className="text-gray-400 text-xs">
            Didn't receive it? Check your spam folder or{' '}
            <button
              onClick={() => { setRegistered(false); }}
              className="text-purple-600 hover:underline font-medium"
            >
              try again
            </button>.
          </p>
        </div>
      </div>
    );
  }

  const strength = formData.password ? getStrength(formData.password) : null;

  const InputError = ({ field }) =>
    touched[field] && errors[field] ? (
      <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><span>⚠</span> {errors[field]}</p>
    ) : null;

  const inputClass = (field) =>
    `w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition text-sm ${
      touched[field] && errors[field]     ? 'border-red-400 focus:ring-red-300 bg-red-50'
      : touched[field] && !errors[field] ? 'border-green-400 focus:ring-green-300 bg-green-50'
      : 'border-gray-300 focus:ring-purple-400 bg-white'
    }`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎭</div>
          <h1 className="text-3xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-500 mt-1 text-sm">Join TalentExpo today</p>
        </div>

        {/* Google no-account notice */}
        {googleNotice && (
          <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-2">
            <span className="text-lg mt-0.5">ℹ️</span>
            <span>{googleNotice}</span>
          </div>
        )}

        {/* Role selector FIRST — Google button depends on it */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">I am a…</label>
          <div className="grid grid-cols-2 gap-3">
            {['customer', 'artist'].map((r) => (
              <label
                key={r}
                className={`flex items-center justify-center gap-2 p-3 border-2 rounded-xl cursor-pointer transition text-sm font-medium capitalize ${
                  formData.role === r
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-purple-300 text-gray-600'
                }`}
              >
                <input
                  type="radio" name="role" value={r}
                  checked={formData.role === r}
                  onChange={handleChange} onBlur={handleBlur}
                  className="sr-only"
                />
                <span>{r === 'customer' ? '👤' : '🎤'}</span> {r}
              </label>
            ))}
          </div>
          {touched.role && errors.role && (
            <p className="text-red-500 text-xs mt-1">⚠ {errors.role}</p>
          )}
        </div>

        {/* Google Sign-Up — enabled only when role is selected */}
        <div className="mb-5">
          <GoogleButton role={formData.role} />
          <p className="text-xs text-gray-400 text-center mt-2">
            {formData.role
              ? 'Google accounts skip email verification.'
              : 'Select a role above to enable Google sign-up.'}
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">or register with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-5 text-sm flex items-start gap-2">
            <span>⚠️</span><span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
            <input type="text" name="name" value={formData.name}
              onChange={handleChange} onBlur={handleBlur}
              placeholder="Your full name" autoComplete="name"
              className={inputClass('name')} />
            <InputError field="name" />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Gmail Address</label>
            <input type="email" name="email" value={formData.email}
              onChange={handleChange} onBlur={handleBlur}
              placeholder="you@gmail.com" autoComplete="email"
              className={inputClass('email')} />
            <InputError field="email" />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input type={showPassword ? 'text' : 'password'} name="password"
                value={formData.password} onChange={handleChange} onBlur={handleBlur}
                placeholder="Create a strong password" autoComplete="new-password"
                className={`${inputClass('password')} pr-12`} />
              <button type="button" onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <InputError field="password" />
            {strength && (
              <div className="mt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Strength</span>
                  <span className={`font-semibold ${strength.textColor}`}>{strength.label}</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                </div>
              </div>
            )}
            {formData.password && <PasswordChecklist password={formData.password} />}
          </div>

          {/* Confirm */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirm Password</label>
            <div className="relative">
              <input type={showConfirm ? 'text' : 'password'} name="confirm"
                value={formData.confirm} onChange={handleChange} onBlur={handleBlur}
                placeholder="Repeat your password" autoComplete="new-password"
                className={`${inputClass('confirm')} pr-12`} />
              <button type="button" onClick={() => setShowConfirm((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                {showConfirm ? '🙈' : '👁️'}
              </button>
            </div>
            <InputError field="confirm" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition-all text-base shadow-md">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account…
              </span>
            ) : 'Create Account →'}
          </button>
        </form>

        <p className="text-center text-gray-500 mt-5 text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-600 font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
