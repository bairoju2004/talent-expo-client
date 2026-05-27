import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getArtistProfile,
  updateArtistProfile,
  uploadPost,
  getArtistPosts,
  deletePost,
  uploadArtistProfilePicture,
  deleteArtistProfilePicture,
  getArtistReviews,
} from '../api/services';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://localhost:5000';

// Smart URL resolver: Cloudinary URLs are already full, local paths need BASE_URL prefix
const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
};


const TALENT_CATEGORIES = [
  'Dance', 'Music', 'Comedy', 'Magic', 'Acting',
  'Singing', 'Photography', 'Painting', 'DJ', 'Other'
];

// ── Post Viewer Modal ────────────────────────────────────────────────────────
function PostViewerModal({ post, posts, avatarSrc, userName, onClose, onPostClick, BASE_URL }) {
  const [si, setSi] = useState(0);
  const files = post.files?.length ? post.files : [{ url: post.fileUrl, fileType: post.fileType }];
  const cur = files[si] || files[0];
  const morePosts = posts.filter(p => p._id !== post._id);

  useEffect(() => { setSi(0); }, [post._id]);
  useEffect(() => {
    const fn = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [onClose]);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm px-2 py-2">
      <div className="relative bg-white rounded-3xl overflow-hidden shadow-2xl w-full flex" style={{ maxWidth: '860px', height: '88vh' }}>
        {/* Media */}
        <div className="relative bg-black flex items-center justify-center flex-shrink-0" style={{ width: '55%' }}>
          {cur?.fileType === 'video'
            ? <video key={si} src={resolveUrl(cur.url)} className="w-full h-full object-contain" controls autoPlay />
            : <img src={resolveUrl(cur.url)} className="w-full h-full object-contain" alt="" />}
          {files.length > 1 && (
            <>
              <button onClick={() => setSi(i => Math.max(0,i-1))} disabled={si===0} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white text-2xl flex items-center justify-center disabled:opacity-25">‹</button>
              <button onClick={() => setSi(i => Math.min(files.length-1,i+1))} disabled={si===files.length-1} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 text-white text-2xl flex items-center justify-center disabled:opacity-25">›</button>
              <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">{si+1}/{files.length}</span>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {files.map((_,i) => <button key={i} onClick={()=>setSi(i)} className={`h-1.5 rounded-full transition-all ${i===si?'bg-white w-4':'bg-white/50 w-1.5'}`}/>)}
              </div>
            </>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-lg font-bold transition-all">×</button>
        </div>
        {/* Scrollable right panel */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-100">
          <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow">
              {avatarSrc
                ? <img src={avatarSrc} className="w-full h-full object-cover" alt="" />
                : <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center"><span className="text-white font-bold text-sm">{userName?.[0]?.toUpperCase()}</span></div>}
            </div>
            <p className="font-bold text-gray-800">{userName}</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-50">
              {post.caption
                ? <p className="text-gray-700 text-sm leading-relaxed">{post.caption}</p>
                : <p className="text-gray-400 text-sm italic">No caption</p>}
              <p className="text-xs text-gray-400 mt-2">
                {new Date(post.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
              </p>
            </div>
            {morePosts.length > 0 && (
              <div className="px-5 py-4">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">More Posts</p>
                <div className="grid grid-cols-3 gap-2">
                  {morePosts.map(p => {
                    const c = p.files?.[0] || { url: p.fileUrl, fileType: p.fileType };
                    return (
                      <button key={p._id} onClick={() => onPostClick(p)} className="aspect-square rounded-xl overflow-hidden bg-black hover:opacity-90 transition-all relative">
                        {c.fileType === 'video' ? <video src={resolveUrl(c.url)} className="w-full h-full object-cover" /> : <img src={resolveUrl(c.url)} className="w-full h-full object-cover" alt="" />}
                        {p.files?.length > 1 && <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">⧉</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Profile Pic Lightbox ──────────────────────────────────────────────────────
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

function ArtistProfileViewPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState('posts');
  const [selectedPost, setSelectedPost] = useState(null);
  const [picLightbox, setPicLightbox] = useState(false);

  // Profile
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [formData, setFormData] = useState({
    fullName: '', talentCategory: '', experience: '', description: '',
  });

  // Profile picture
  const [picUploading, setPicUploading] = useState(false);
  const [picError, setPicError]         = useState('');
  const [picPreview, setPicPreview]     = useState(null);
  const [showPicMenu, setShowPicMenu]   = useState(false);
  const fileInputRef = useRef(null);
  const picMenuRef   = useRef(null);
  const avatarRef    = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  // Posts
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); // array of File objects
  const [previewUrls, setPreviewUrls] = useState([]);     // array of object URLs
  const [activePreview, setActivePreview] = useState(0);  // index of previewed file
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Reviews
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ avgRating: null, total: 0, distribution: {} });
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Set tab from navigation state
  useEffect(() => {
    if (location.state?.tab) setActiveTab(location.state.tab);
  }, [location.state]);

  // Load profile
  useEffect(() => {
    getArtistProfile()
      .then((res) => {
        setProfile(res.data);
        setFormData({
          fullName: res.data.fullName || '',
          talentCategory: res.data.talentCategory || '',
          experience: res.data.experience || '',
          description: res.data.description || '',
        });
      })
      .finally(() => setProfileLoading(false));
  }, []);

  // Load posts
  useEffect(() => {
    if (user?._id) {
      getArtistPosts(user._id)
        .then((res) => setPosts(res.data))
        .finally(() => setPostsLoading(false));
    }
  }, [user]);

  // Load reviews when tab is opened
  useEffect(() => {
    if (activeTab !== 'reviews' || !user?._id) return;
    setReviewsLoading(true);
    getArtistReviews(user._id)
      .then((res) => {
        setReviews(res.data.reviews);
        setReviewStats({ avgRating: res.data.avgRating, total: res.data.total, distribution: res.data.distribution });
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [activeTab, user]);

  // Profile handlers
  const handleFormChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const res = await updateArtistProfile(formData);
      setProfile(res.data);
      setEditing(false);
      setProfileSuccess('Profile updated successfully! ✅');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setProfileError('');
    setFormData({
      fullName: profile.fullName || '',
      talentCategory: profile.talentCategory || '',
      experience: profile.experience || '',
      description: profile.description || '',
    });
  };

  // Post handlers
  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    if (!newFiles.length) return;
    const combined = [...selectedFiles, ...newFiles].slice(0, 10); // cap at 10
    setSelectedFiles(combined);
    setPreviewUrls(combined.map((f) => URL.createObjectURL(f)));
    setActivePreview(combined.length - newFiles.length); // jump to first newly added
    setUploadError('');
    // reset input so the same file can be re-selected if removed
    e.target.value = '';
  };

  const handleRemoveFile = (idx) => {
    const next = selectedFiles.filter((_, i) => i !== idx);
    setSelectedFiles(next);
    setPreviewUrls(next.map((f) => URL.createObjectURL(f)));
    setActivePreview(Math.min(activePreview, Math.max(0, next.length - 1)));
  };

  const handleUpload = async () => {
    if (!selectedFiles.length) { setUploadError('Please select at least one file.'); return; }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    const formDataUpload = new FormData();
    selectedFiles.forEach((f) => formDataUpload.append('files', f));
    formDataUpload.append('caption', caption);
    try {
      const res = await uploadPost(formDataUpload);
      setPosts((prev) => [res.data, ...prev]);
      setCaption('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setActivePreview(0);
      setUploadSuccess('Post uploaded! 🎉');
      setTimeout(() => {
        setUploadSuccess('');
        setShowUploadModal(false);
      }, 1200);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('Delete this post?')) return;
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p._id !== postId));
    } catch { alert('Failed to delete.'); }
  };

  // ── Profile picture ──────────────────────────────────────────────
  const handlePicClick = () => {
    // If there's already a profile pic, open the lightbox first
    const hasPic = !!(picPreview || profile?.profilePicture);
    if (hasPic) {
      setPicLightbox(true);
      return;
    }
    // No pic yet — open upload menu directly
    if (!showPicMenu && avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 8, left: rect.left });
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
      await deleteArtistProfilePicture();
      setProfile((prev) => ({ ...prev, profilePicture: null }));
      setPicPreview(null);
      setProfileSuccess('Profile picture removed. ✅');
      setTimeout(() => setProfileSuccess(''), 3000);
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
    if (!file.type.startsWith('image/')) { setPicError('Only image files allowed.'); return; }
    if (file.size > 5 * 1024 * 1024) { setPicError('Image must be under 5MB.'); return; }

    setPicPreview(URL.createObjectURL(file));
    setPicError('');
    setPicUploading(true);
    try {
      const fd = new FormData();
      fd.append('profilePicture', file);
      const res = await uploadArtistProfilePicture(fd);
      setProfile((prev) => ({ ...prev, profilePicture: res.data.profilePicture }));
      setPicPreview(null); // clear preview — now use profile.profilePicture
      setProfileSuccess('Profile picture updated! ✅');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch {
      setPicError('Upload failed. Please try again.');
      setPicPreview(null);
    } finally {
      setPicUploading(false);
    }
  };

  const avatarSrc = picPreview
    || (profile?.profilePicture ? resolveUrl(profile.profilePicture) : null);


  // PostViewerModal and PicLightbox are rendered directly in JSX below

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Post Viewer Modal */}
      {selectedPost && (
        <PostViewerModal
          post={selectedPost}
          posts={posts}
          avatarSrc={avatarSrc}
          userName={user?.name}
          onClose={() => setSelectedPost(null)}
          onPostClick={(p) => setSelectedPost(p)}
          BASE_URL={BASE_URL}
        />
      )}

      {/* Profile Pic Lightbox */}
      {picLightbox && (
        <PicLightbox
          avatarSrc={avatarSrc}
          userName={user?.name}
          onClose={() => setPicLightbox(false)}
          onUpload={() => { setPicLightbox(false); fileInputRef.current?.click(); }}
          onDelete={() => { setPicLightbox(false); handleDeletePic(); }}
        />
      )}

      {/* Profile Banner */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 pt-10 pb-0 px-4">
        <div className="max-w-4xl mx-auto">
          <style>{`
            @keyframes fadeInMenu { from { opacity:0; transform:translateY(-6px); } to { opacity:1; transform:translateY(0); } }
            @keyframes bounceInModal { 0% { opacity:0; transform:scale(0.7); } 60% { opacity:1; transform:scale(1.04); } 80% { transform:scale(0.97); } 100% { transform:scale(1); } }
          `}</style>

          {/* Avatar + Info */}
          <div className="flex items-end gap-5 mb-0">

            {/* Clickable avatar with popup menu */}
            <div className="relative flex-shrink-0 mb-4" ref={picMenuRef}>
              <div
                ref={avatarRef}
                onClick={handlePicClick}
                className="w-24 h-24 rounded-full cursor-pointer overflow-hidden border-4 border-white/40 shadow-lg group"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <span className="text-4xl font-bold text-white">
                      {user?.name?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-1">
                  {picUploading
                    ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    : <><span className="text-white text-xl">📷</span><span className="text-white text-[9px] font-semibold">Change</span></>
                  }
                </div>
              </div>

              {/* Camera badge */}
              <button
                onClick={handlePicClick}
                className="absolute bottom-0 right-0 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow border-2 border-purple-400 hover:bg-purple-50 transition-all"
              >
                <span className="text-sm">📷</span>
              </button>

              {/* Popup menu — fixed so it escapes parent overflow/clip */}
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

            <div className="text-white pb-4">
              <h1 className="text-2xl font-bold">{user?.name}</h1>
              <p className="text-purple-200 text-sm">{user?.email}</p>
              {profile?.talentCategory && (
                <span className="inline-block mt-1 px-3 py-0.5 bg-white/20 rounded-full text-xs font-semibold">
                  🎨 {profile.talentCategory}
                </span>
              )}
              {picError && <p className="text-red-300 text-xs mt-1">⚠️ {picError}</p>}
              {picUploading && <p className="text-purple-200 text-xs mt-1">Uploading photo...</p>}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-0 border-t border-white/20">
            <div className="text-center py-3 text-white">
              <p className="text-xl font-bold">{posts.length}</p>
              <p className="text-xs text-purple-200">Posts</p>
            </div>
            <div className="text-center py-3 text-white border-l border-white/20">
              <p className="text-xl font-bold">{profile?.experience || 0}</p>
              <p className="text-xs text-purple-200">Years Exp</p>
            </div>
            <div className="text-center py-3 text-white border-l border-white/20">
              {reviewStats.avgRating ? (
                <>
                  <p className="text-xl font-bold flex items-center justify-center gap-1"><span className="text-yellow-300">★</span>{reviewStats.avgRating}</p>
                  <p className="text-xs text-purple-200">{reviewStats.total} review{reviewStats.total !== 1 ? 's' : ''}</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-white/40">—</p>
                  <p className="text-xs text-purple-200">No reviews</p>
                </>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-t border-white/20">
            {[
              { key: 'posts',   label: '🖼️ Posts' },
              { key: 'reviews', label: '⭐ Reviews' },
              { key: 'profile', label: '👤 Profile' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'text-white border-b-2 border-white'
                    : 'text-purple-300 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* ── POSTS TAB ── */}
        {activeTab === 'posts' && (
          <div>
            {/* Small Add Post button */}
            <div className="flex justify-end mb-5">
              <button
                onClick={() => { setShowUploadModal(true); setUploadError(''); setUploadSuccess(''); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-md transition-all text-sm"
              >
                <span className="text-lg font-bold">+</span> New Post
              </button>
            </div>

            {/* Upload Modal */}
            {showUploadModal && (
              <div
                className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
                onClick={(e) => { if (e.target === e.currentTarget) { setShowUploadModal(false); setSelectedFiles([]); setPreviewUrls([]); setActivePreview(0); setCaption(''); } }}
              >
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
                  style={{ animation: 'bounceInModal 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>

                  {/* Modal header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow">
                        {avatarSrc
                          ? <img src={avatarSrc} alt="You" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center"><span className="text-white font-bold text-sm">{user?.name?.[0]?.toUpperCase()}</span></div>
                        }
                      </div>
                      <span className="font-bold text-gray-800">New Post</span>
                    </div>
                    <button
                      onClick={() => { setShowUploadModal(false); setSelectedFiles([]); setPreviewUrls([]); setActivePreview(0); setCaption(''); }}
                      className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-lg font-bold transition-all"
                    >×</button>
                  </div>

                  {/* Modal body */}
                  <div className="p-6 space-y-4">
                    {uploadError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{uploadError}</div>}
                    {uploadSuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">{uploadSuccess}</div>}

                    {/* Main preview area */}
                    {previewUrls.length > 0 ? (
                      <div className="relative rounded-2xl overflow-hidden bg-black" style={{ minHeight: '180px' }}>
                        {/* Current file preview */}
                        <div className="flex items-center justify-center" style={{ minHeight: '180px' }}>
                          {selectedFiles[activePreview]?.type.startsWith('video/') ? (
                            <video src={previewUrls[activePreview]} className="max-h-44 w-full object-contain rounded-xl" controls />
                          ) : (
                            <img src={previewUrls[activePreview]} className="max-h-44 w-full object-contain rounded-xl" alt="preview" />
                          )}
                        </div>

                        {/* Prev / Next arrows */}
                        {previewUrls.length > 1 && (
                          <>
                            <button
                              onClick={() => setActivePreview((p) => Math.max(0, p - 1))}
                              disabled={activePreview === 0}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/80 transition-all"
                            >‹</button>
                            <button
                              onClick={() => setActivePreview((p) => Math.min(previewUrls.length - 1, p + 1))}
                              disabled={activePreview === previewUrls.length - 1}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/80 transition-all"
                            >›</button>
                            {/* Dot indicators */}
                            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                              {previewUrls.map((_, i) => (
                                <button key={i} onClick={() => setActivePreview(i)}
                                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === activePreview ? 'bg-white w-3' : 'bg-white/50'}`}
                                />
                              ))}
                            </div>
                          </>
                        )}

                        {/* File count badge */}
                        {previewUrls.length > 1 && (
                          <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                            {activePreview + 1}/{previewUrls.length}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* Empty drop zone */
                      <div
                        onClick={() => document.getElementById('fileInput').click()}
                        className="border-2 border-dashed border-purple-300 hover:border-purple-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-purple-50 hover:bg-purple-100"
                      >
                        <p className="text-3xl mb-2">📁</p>
                        <p className="text-purple-600 font-semibold text-sm">Click to select images or videos</p>
                        <p className="text-gray-400 text-xs mt-1">Up to 10 files · JPG, PNG, MP4, MOV</p>
                      </div>
                    )}

                    {/* Thumbnail strip + add more */}
                    {previewUrls.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {previewUrls.map((url, i) => (
                          <div key={i} className="relative flex-shrink-0 group">
                            <button onClick={() => setActivePreview(i)}
                              className={`w-14 h-14 rounded-xl overflow-hidden border-2 transition-all ${i === activePreview ? 'border-purple-500' : 'border-transparent'}`}>
                              {selectedFiles[i]?.type.startsWith('video/') ? (
                                <video src={url} className="w-full h-full object-cover" />
                              ) : (
                                <img src={url} className="w-full h-full object-cover" alt="" />
                              )}
                            </button>
                            {/* Remove X */}
                            <button onClick={() => handleRemoveFile(i)}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all leading-none">
                              ×
                            </button>
                          </div>
                        ))}
                        {/* Add more button */}
                        {selectedFiles.length < 10 && (
                          <button onClick={() => document.getElementById('fileInput').click()}
                            className="flex-shrink-0 w-14 h-14 rounded-xl border-2 border-dashed border-purple-300 hover:border-purple-500 bg-purple-50 hover:bg-purple-100 flex items-center justify-center text-purple-500 text-2xl transition-all">
                            +
                          </button>
                        )}
                      </div>
                    )}

                    <input id="fileInput" type="file" accept="image/*,video/*" multiple onChange={handleFileChange} className="hidden" />

                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption... (optional)"
                      rows={2}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition resize-none text-sm"
                    />

                    <button
                      onClick={handleUpload}
                      disabled={uploading || !selectedFiles.length}
                      className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-all"
                    >
                      {uploading ? 'Uploading...' : `🚀 Publish Post${selectedFiles.length > 1 ? ` (${selectedFiles.length} files)` : ''}`}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Posts Grid */}
            {postsLoading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl shadow-md">
                <p className="text-5xl mb-4">🎭</p>
                <p className="text-gray-500 text-xl">No posts yet</p>
                <p className="text-gray-400 mt-2">Upload your first image or video above!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {posts.map((post) => {
                  const cover = post.files?.[0] || { url: post.fileUrl, fileType: post.fileType };
                  const isCarousel = post.files?.length > 1;
                  return (
                    <div key={post._id} onClick={() => setSelectedPost(post)} className="relative group rounded-2xl overflow-hidden shadow-md bg-black aspect-square cursor-pointer">
                      {cover.fileType === 'video' ? (
                        <video src={resolveUrl(cover.url)} className="w-full h-full object-cover" />
                      ) : (
                        <img src={resolveUrl(cover.url)} alt={post.caption} className="w-full h-full object-cover" />
                      )}
                      {/* Artist avatar pill */}
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full pl-0.5 pr-2 py-0.5">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow">
                          {avatarSrc
                            ? <img src={avatarSrc} alt={user?.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center"><span className="text-white text-[9px] font-bold">{user?.name?.[0]?.toUpperCase()}</span></div>
                          }
                        </div>
                        <span className="text-white text-[10px] font-semibold truncate max-w-[70px]">{user?.name}</span>
                      </div>
                      {/* Carousel indicator */}
                      {isCarousel && (
                        <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⧉ {post.files.length}
                        </span>
                      )}
                      {cover.fileType === 'video' && !isCarousel && (
                        <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">🎥 Video</span>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2">
                        {cover.fileType === 'video' && <span className="text-white text-3xl">▶️</span>}
                        {post.caption && (
                          <p className="text-white text-xs text-center px-3 line-clamp-2">{post.caption}</p>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(post._id); }}
                          className="mt-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && (
          <div className="space-y-6">
            {reviewsLoading ? (
              <div className="text-center py-20">
                <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4 text-sm">Loading reviews...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-md">
                <p className="text-5xl mb-4">⭐</p>
                <p className="text-gray-500 text-xl font-semibold">No reviews yet</p>
                <p className="text-gray-400 mt-2 text-sm">Reviews will appear here after customers rate completed bookings.</p>
              </div>
            ) : (
              <>
                {/* Summary card */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-5">Your Ratings</h2>
                  <div className="flex gap-8 items-start">
                    <div className="text-center flex-shrink-0">
                      <p className="text-6xl font-extrabold text-gray-800 leading-none">{reviewStats.avgRating}</p>
                      <div className="flex justify-center mt-2 gap-0.5">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className={`text-lg ${s <= Math.round(reviewStats.avgRating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{reviewStats.total} review{reviewStats.total !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[5,4,3,2,1].map((star) => {
                        const count = reviewStats.distribution[star] || 0;
                        const pct = reviewStats.total > 0 ? Math.round((count / reviewStats.total) * 100) : 0;
                        return (
                          <div key={star} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
                            <span className="text-yellow-400 text-xs">★</span>
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400 w-6">{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Individual reviews */}
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review._id} className="bg-white rounded-2xl shadow-md p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {review.customerPic
                            ? <img src={resolveUrl(review.customerPic)} alt={review.customerName} className="w-11 h-11 rounded-full object-cover shadow" />
                            : <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow">
                                <span className="text-white font-bold text-sm">{review.customerName?.[0]?.toUpperCase()}</span>
                              </div>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <p className="font-bold text-gray-800">{review.customerName}</p>
                            <span className="text-xs text-gray-400">
                              {new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex gap-0.5 mt-1">
                            {[1,2,3,4,5].map((s) => (
                              <span key={s} className={`text-sm ${s <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                            ))}
                          </div>
                          {review.comment && (
                            <p className="text-gray-600 text-sm mt-3 leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
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

            {profileSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl mb-4 text-sm">{profileSuccess}</div>
            )}
            {profileError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{profileError}</div>
            )}

            {/* View Mode */}
            {!editing && profile && (
              <div className="space-y-4">
                {[
                  { icon: '👤', label: 'Full Name',       value: profile.fullName },
                  { icon: '📧', label: 'Email',           value: user?.email },
                  { icon: '🎨', label: 'Talent Category', value: profile.talentCategory },
                  { icon: '⭐', label: 'Experience',      value: profile.experience ? `${profile.experience} years` : null },
                  { icon: '📝', label: 'About',           value: profile.description },
                  {
                    icon: '📅', label: 'Member Since',
                    value: profile.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
                      : null
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Talent Category</label>
                  <select name="talentCategory" value={formData.talentCategory} onChange={handleFormChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition bg-white">
                    <option value="">Select talent...</option>
                    {TALENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                  <input type="number" name="experience" value={formData.experience} onChange={handleFormChange} min="0" max="50"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">About You</label>
                  <textarea name="description" value={formData.description} onChange={handleFormChange} rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-all">
                    {saving ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button onClick={handleCancel}
                    className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-all">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ArtistProfileViewPage;