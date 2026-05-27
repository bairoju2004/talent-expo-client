import { useEffect, useState, useRef } from 'react';
import { getCustomerProfile, updateCustomerProfile, uploadCustomerProfilePicture, deleteCustomerProfilePicture } from '../api/services';
import { useAuth } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://talentexpo-production.up.railway.app';
// Smart URL resolver: Cloudinary URLs are already full, local paths need BASE_URL prefix
const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
};


// ── Profile Pic Lightbox ─────────────────────────────────────────────────────
function PicLightbox({ avatarSrc, userName, onClose, onUpload, onDelete }) {
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm px-4">
      <div className="flex flex-col items-center gap-6 max-w-sm w-full">
        <div className="w-64 h-64 rounded-full overflow-hidden border-4 border-white/30 shadow-2xl">
          {avatarSrc
            ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white text-7xl font-bold">{userName?.[0]?.toUpperCase()}</span>
              </div>}
        </div>
        <p className="text-white font-bold text-xl">{userName}</p>
        <div className="flex flex-col gap-3 w-full">
          <button onClick={onUpload}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-white text-gray-900 font-semibold rounded-2xl hover:bg-gray-100 transition-all">
            📷 {avatarSrc ? 'Change Photo' : 'Upload Photo'}
          </button>
          {avatarSrc && (
            <button onClick={onDelete}
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-2xl transition-all">
              🗑️ Remove Photo
            </button>
          )}
          <button onClick={onClose}
            className="w-full px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl transition-all">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CustomerProfileViewPage() {
  const { user } = useAuth();

  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [editing, setEditing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Profile picture
  const [picLightbox, setPicLightbox] = useState(false);
  const [picUploading, setPicUploading] = useState(false);
  const [picError, setPicError]         = useState('');
  const [picPreview, setPicPreview]     = useState(null);
  const [showPicMenu, setShowPicMenu]   = useState(false);
  const fileInputRef = useRef(null);
  const picMenuRef   = useRef(null);
  const avatarRef    = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const [formData, setFormData] = useState({
    fullName: '', phoneNumber: '', location: '', bio: '',
  });

  useEffect(() => {
    getCustomerProfile()
      .then((res) => {
        setProfile(res.data);
        setFormData({
          fullName:    res.data.fullName    || '',
          phoneNumber: res.data.phoneNumber || '',
          location:    res.data.location    || '',
          bio:         res.data.bio         || '',
        });
      })
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, []);

  // ── Profile picture ──────────────────────────────────────────────
  const handlePicClick = () => {
    const hasPic = !!(picPreview || profile?.profilePicture);
    if (hasPic) { setPicLightbox(true); return; }
    if (!showPicMenu && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, left: rect.left - 64 });
    }
    setShowPicMenu((v) => !v);
  };

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (picMenuRef.current && !picMenuRef.current.contains(e.target)) setShowPicMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDeletePic = async () => {
    setShowPicMenu(false);
    setPicError('');
    setPicUploading(true);
    try {
      await deleteCustomerProfilePicture();
      setProfile((prev) => ({ ...prev, profilePicture: null }));
      setPicPreview(null);
      setSuccessMsg('Profile picture removed. ✅');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setPicError('Failed to remove picture.');
    } finally {
      setPicUploading(false);
    }
  };

  const handlePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setShowPicMenu(false);

    // Client-side validation
    if (!file.type.startsWith('image/')) {
      setPicError('Only image files are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setPicError('Image must be under 5MB.');
      return;
    }

    // Show local preview instantly
    setPicPreview(URL.createObjectURL(file));
    setPicError('');
    setPicUploading(true);

    try {
      const fd = new FormData();
      fd.append('profilePicture', file);
      const res = await uploadCustomerProfilePicture(fd);
      setProfile((prev) => ({ ...prev, profilePicture: res.data.profilePicture }));
      setPicPreview(null); // clear preview — now use profile.profilePicture
      setSuccessMsg('Profile picture updated! ✅');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setPicError('Failed to upload picture. Please try again.');
      setPicPreview(null);
    } finally {
      setPicUploading(false);
    }
  };

  // ── Profile details ──────────────────────────────────────────────
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await updateCustomerProfile(formData);
      setProfile(res.data);
      setEditing(false);
      setSuccessMsg('Profile updated successfully! ✅');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setFormData({
      fullName:    profile.fullName    || '',
      phoneNumber: profile.phoneNumber || '',
      location:    profile.location    || '',
      bio:         profile.bio         || '',
    });
  };

  // Resolve the avatar src — prefer uploaded pic, else null (show letter)
  const avatarSrc = picPreview
    || (profile?.profilePicture ? resolveUrl(profile.profilePicture) : null);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 mt-4">Loading profile...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      {picLightbox && (
        <PicLightbox
          avatarSrc={avatarSrc}
          userName={user?.name}
          onClose={() => setPicLightbox(false)}
          onUpload={() => { setPicLightbox(false); fileInputRef.current?.click(); }}
          onDelete={() => { setPicLightbox(false); handleDeletePic(); }}
        />
      )}
      <div className="max-w-2xl mx-auto">

        {/* ── Profile Header Card ── */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-8 text-white text-center mb-6 shadow-lg">
          <style>{`@keyframes fadeInMenu { from { opacity:0; transform:translateY(-6px) translateX(-50%); } to { opacity:1; transform:translateY(0) translateX(-50%); } }`}</style>

          {/* Avatar with upload overlay */}
          <div className="relative inline-block mb-4" ref={picMenuRef}>
            <div
              ref={avatarRef}
              onClick={handlePicClick}
              className="w-24 h-24 rounded-full mx-auto cursor-pointer relative overflow-hidden border-4 border-white/40 shadow-lg group"
            >
              {avatarSrc ? (
                <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-white/20 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">{user?.name?.[0]?.toUpperCase()}</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1">
                {picUploading
                  ? <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <><span className="text-white text-xl">📷</span><span className="text-white text-[10px] font-semibold">Change Photo</span></>
                }
              </div>
            </div>

            {/* Camera badge */}
            <button
              onClick={handlePicClick}
              className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-purple-300 hover:bg-purple-50 transition-all"
              title="Change photo"
            >
              <span className="text-sm">📷</span>
            </button>

            {/* Popup menu — fixed positioning to escape parent overflow/clip */}
            {showPicMenu && (
              <div
                className="fixed z-[999] bg-gray-900 text-white rounded-2xl shadow-2xl overflow-hidden w-52 border border-white/10"
                style={{ top: menuPos.top, left: menuPos.left, animation: 'fadeInMenu 0.15s ease' }}
              >
                <button
                  onClick={() => { setShowPicMenu(false); fileInputRef.current?.click(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-all text-sm font-medium"
                >
                  <span className="text-lg">📷</span> Upload photo
                </button>
                {avatarSrc && (
                  <button
                    onClick={handleDeletePic}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 transition-all text-sm font-medium text-red-400"
                  >
                    <span className="text-lg">🗑️</span> Remove photo
                  </button>
                )}
              </div>
            )}

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePicChange} className="hidden" />
          </div>

          {picError && (
            <p className="text-red-300 text-xs mb-2">⚠️ {picError}</p>
          )}
          {picUploading && (
            <p className="text-purple-200 text-xs mb-2">Uploading...</p>
          )}

          <h1 className="text-2xl font-bold">{user?.name}</h1>
          <p className="text-purple-200 mt-1">{user?.email}</p>
          <span className="inline-block mt-3 px-4 py-1 bg-white/20 rounded-full text-sm font-semibold capitalize">
            {user?.role}
          </span>
        </div>

        {/* Success / Error messages */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
            {successMsg}
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
            {error}
          </div>
        )}

        {/* ── Profile Details Card ── */}
        <div className="bg-white rounded-2xl shadow-md p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800">Profile Details</h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>

          {/* View Mode */}
          {!editing && profile && (
            <div className="space-y-4">
              {[
                { icon: '👤', label: 'Full Name',     value: profile.fullName },
                { icon: '📧', label: 'Email',         value: user?.email },
                { icon: '📱', label: 'Phone Number',  value: profile.phoneNumber },
                { icon: '📍', label: 'Location',      value: profile.location },
                { icon: '📝', label: 'About',         value: profile.bio },
                {
                  icon: '📅', label: 'Member Since',
                  value: profile.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'long', day: 'numeric',
                      })
                    : null,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">{item.icon}</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">{item.label}</p>
                    <p className="text-gray-800 font-semibold mt-0.5">{item.value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Edit Mode */}
          {editing && (
            <div className="space-y-5">
              {[
                { label: 'Full Name',     name: 'fullName',    type: 'text', placeholder: 'Your full name' },
                { label: 'Phone Number',  name: 'phoneNumber', type: 'tel',  placeholder: '+91 98765 43210' },
                { label: 'Location',      name: 'location',    type: 'text', placeholder: 'e.g. Hyderabad, India' },
              ].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    placeholder={field.placeholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">About You</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-all"
                >
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default CustomerProfileViewPage;