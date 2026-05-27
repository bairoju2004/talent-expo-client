import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://talentexpo-production.up.railway.app';

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  accepted:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color = 'purple' }) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    green:  'bg-green-50 text-green-600',
    blue:   'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red:    'bg-red-50 text-red-600',
    gray:   'bg-gray-50 text-gray-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold text-gray-800">{value ?? '—'}</p>
      <p className="text-sm font-semibold text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Mini Bar Chart ────────────────────────────────────────────────────────────
function BarChart({ data, color = '#8b5cf6' }) {
  if (!data?.length) return <p className="text-gray-400 text-sm text-center py-8">No data yet</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="flex items-end gap-2 h-28 mt-2">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const label = `${MONTH_NAMES[(d._id.month - 1)]} ${String(d._id.year).slice(2)}`;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-gray-500 font-medium">{d.count}</span>
            <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(pct, 4)}%`, backgroundColor: color }} />
            <span className="text-[9px] text-gray-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <p className="text-gray-800 font-semibold text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ban Dialog ────────────────────────────────────────────────────────────────
function BanDialog({ user, onConfirm, onCancel }) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h3 className="text-gray-800 font-bold text-lg mb-1">Ban {user.name}?</h3>
        <p className="text-gray-500 text-sm mb-4">This user will be immediately locked out.</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for ban (optional)"
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 resize-none text-sm mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-all">
            Cancel
          </button>
          <button onClick={() => onConfirm(reason)} className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl transition-all">
            Ban User
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const [confirm, setConfirm] = useState(null); // { message, onConfirm }
  const [banTarget, setBanTarget] = useState(null); // user object

  // ── Overview ──────────────────────────────────────────────────────────────
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // ── Users ─────────────────────────────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPages, setUsersPages] = useState(1);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // ── Bookings ──────────────────────────────────────────────────────────────
  const [bookings, setBookings] = useState([]);
  const [bookingsTotal, setBookingsTotal] = useState(0);
  const [bookingsPage, setBookingsPage] = useState(1);
  const [bookingsPages, setBookingsPages] = useState(1);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingStatusFilter, setBookingStatusFilter] = useState('all');

  // ── Posts ─────────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsPage, setPostsPage] = useState(1);
  const [postsPages, setPostsPages] = useState(1);
  const [postsLoading, setPostsLoading] = useState(false);

  // ── Reviews ───────────────────────────────────────────────────────────────
  const [reviews, setReviews] = useState([]);
  const [reviewsTotal, setReviewsTotal] = useState(0);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsPages, setReviewsPages] = useState(1);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Guard — redirect non-admins
  useEffect(() => {
    if (user && user.role !== 'admin') navigate('/');
    if (!user) navigate('/login');
  }, [user, navigate]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Fetch analytics ───────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'overview') return;
    setAnalyticsLoading(true);
    axiosInstance.get('/admin/analytics')
      .then(r => setAnalytics(r.data))
      .catch(() => showToast('Failed to load analytics', 'error'))
      .finally(() => setAnalyticsLoading(false));
  }, [activeTab]);

  // ── Fetch users ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(() => {
    setUsersLoading(true);
    axiosInstance.get('/admin/users', {
      params: { search: userSearch, role: userRoleFilter, page: usersPage, limit: 20 },
    })
      .then(r => { setUsers(r.data.users); setUsersTotal(r.data.total); setUsersPages(r.data.pages); })
      .catch(() => showToast('Failed to load users', 'error'))
      .finally(() => setUsersLoading(false));
  }, [userSearch, userRoleFilter, usersPage]);

  useEffect(() => { if (activeTab === 'users') fetchUsers(); }, [activeTab, fetchUsers]);

  // ── Fetch bookings ────────────────────────────────────────────────────────
  const fetchBookings = useCallback(() => {
    setBookingsLoading(true);
    axiosInstance.get('/admin/bookings', {
      params: { status: bookingStatusFilter, page: bookingsPage, limit: 20 },
    })
      .then(r => { setBookings(r.data.bookings); setBookingsTotal(r.data.total); setBookingsPages(r.data.pages); })
      .catch(() => showToast('Failed to load bookings', 'error'))
      .finally(() => setBookingsLoading(false));
  }, [bookingStatusFilter, bookingsPage]);

  useEffect(() => { if (activeTab === 'bookings') fetchBookings(); }, [activeTab, fetchBookings]);

  // ── Fetch posts ───────────────────────────────────────────────────────────
  const fetchPosts = useCallback(() => {
    setPostsLoading(true);
    axiosInstance.get('/admin/posts', { params: { page: postsPage, limit: 24 } })
      .then(r => { setPosts(r.data.posts); setPostsTotal(r.data.total); setPostsPages(r.data.pages); })
      .catch(() => showToast('Failed to load posts', 'error'))
      .finally(() => setPostsLoading(false));
  }, [postsPage]);

  useEffect(() => { if (activeTab === 'posts') fetchPosts(); }, [activeTab, fetchPosts]);

  // ── Fetch reviews ─────────────────────────────────────────────────────────
  const fetchReviews = useCallback(() => {
    setReviewsLoading(true);
    axiosInstance.get('/admin/reviews', { params: { page: reviewsPage, limit: 20 } })
      .then(r => { setReviews(r.data.reviews); setReviewsTotal(r.data.total); setReviewsPages(r.data.pages); })
      .catch(() => showToast('Failed to load reviews', 'error'))
      .finally(() => setReviewsLoading(false));
  }, [reviewsPage]);

  useEffect(() => { if (activeTab === 'reviews') fetchReviews(); }, [activeTab, fetchReviews]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleBanUser = async (userId, isBanned, reason = '') => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/ban`, { isBanned, banReason: reason });
      showToast(isBanned ? 'User banned' : 'User unbanned');
      fetchUsers();
    } catch { showToast('Action failed', 'error'); }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      showToast('User deleted');
      fetchUsers();
    } catch { showToast('Delete failed', 'error'); }
    setConfirm(null);
  };

  const handleUpdateBooking = async (bookingId, status) => {
    try {
      await axiosInstance.put(`/admin/bookings/${bookingId}`, { status });
      showToast('Booking updated');
      fetchBookings();
    } catch { showToast('Update failed', 'error'); }
  };

  const handleDeletePost = async (postId) => {
    try {
      await axiosInstance.delete(`/admin/posts/${postId}`);
      showToast('Post removed');
      fetchPosts();
    } catch { showToast('Delete failed', 'error'); }
    setConfirm(null);
  };

  const handleDeleteReview = async (reviewId) => {
    try {
      await axiosInstance.delete(`/admin/reviews/${reviewId}`);
      showToast('Review removed');
      fetchReviews();
    } catch { showToast('Delete failed', 'error'); }
    setConfirm(null);
  };

  const handleLogout = async () => { await logout(); navigate('/'); };

  if (!user || user.role !== 'admin') return null;

  // ── Sidebar nav ───────────────────────────────────────────────────────────
  const NAV = [
    { key: 'overview',  icon: '📊', label: 'Overview' },
    { key: 'users',     icon: '👥', label: 'Users' },
    { key: 'bookings',  icon: '📅', label: 'Bookings' },
    { key: 'posts',     icon: '🖼️',  label: 'Posts' },
    { key: 'reviews',   icon: '⭐', label: 'Reviews' },
  ];

  // ── Pagination ────────────────────────────────────────────────────────────
  const Pagination = ({ page, pages, onPage }) => {
    if (pages <= 1) return null;
    return (
      <div className="flex items-center justify-center gap-2 mt-6">
        <button onClick={() => onPage(page - 1)} disabled={page === 1}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-all">
          ← Prev
        </button>
        <span className="text-sm text-gray-500 font-medium px-2">Page {page} of {pages}</span>
        <button onClick={() => onPage(page + 1)} disabled={page === pages}
          className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium disabled:opacity-40 hover:bg-gray-50 transition-all">
          Next →
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-[600] px-5 py-3 rounded-2xl shadow-xl text-white text-sm font-semibold transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.msg}
        </div>
      )}

      {/* Confirm dialog */}
      {confirm && <ConfirmDialog message={confirm.message} onConfirm={confirm.onConfirm} onCancel={() => setConfirm(null)} />}

      {/* Ban dialog */}
      {banTarget && (
        <BanDialog
          user={banTarget}
          onConfirm={(reason) => { handleBanUser(banTarget._id, true, reason); setBanTarget(null); }}
          onCancel={() => setBanTarget(null)}
        />
      )}

      {/* ── SIDEBAR ── */}
      <div className="w-56 flex-shrink-0 bg-gray-900 text-white flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/10">
          <p className="text-lg font-extrabold text-purple-400">🎭 TalentExpo</p>
          <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(n => (
            <button key={n.key} onClick={() => setActiveTab(n.key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === n.key ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-white/10 hover:text-white'}`}>
              <span className="text-base">{n.icon}</span>
              {n.label}
            </button>
          ))}
        </nav>

        {/* Admin user + logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium">
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-8 py-4 flex-shrink-0">
          <h1 className="text-xl font-extrabold text-gray-800">
            {NAV.find(n => n.key === activeTab)?.icon} {NAV.find(n => n.key === activeTab)?.label}
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* ══════════ OVERVIEW ══════════ */}
          {activeTab === 'overview' && (
            analyticsLoading ? (
              <div className="flex items-center justify-center py-32">
                <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : analytics ? (
              <div className="space-y-8 max-w-5xl">

                {/* KPI row 1 — Users */}
                <div>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Users</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard icon="👥" label="Total Users"    value={analytics.users.total}     color="purple" />
                    <StatCard icon="🎨" label="Artists"        value={analytics.users.artists}   color="blue" />
                    <StatCard icon="🎯" label="Customers"      value={analytics.users.customers} color="green" />
                    <StatCard icon="🚫" label="Banned"         value={analytics.users.banned}    color="red" />
                  </div>
                </div>

                {/* KPI row 2 — Bookings */}
                <div>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Bookings</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard icon="📅" label="Total"     value={analytics.bookings.total}     color="purple" />
                    <StatCard icon="⏳" label="Pending"   value={analytics.bookings.pending}   color="yellow" />
                    <StatCard icon="✅" label="Accepted"  value={analytics.bookings.accepted}  color="green" />
                    <StatCard icon="🎉" label="Completed" value={analytics.bookings.completed} color="blue" />
                  </div>
                </div>

                {/* KPI row 3 — Content */}
                <div>
                  <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Content</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <StatCard icon="🖼️"  label="Posts"    value={analytics.content.posts}    color="purple" />
                    <StatCard icon="⭐"  label="Reviews"  value={analytics.content.reviews}  sub={analytics.avgRating ? `Avg: ${analytics.avgRating}★` : null} color="yellow" />
                    <StatCard icon="💬"  label="Messages" value={analytics.content.messages} color="blue" />
                    <StatCard icon="❌"  label="Rejected" value={analytics.bookings.rejected} color="red" />
                  </div>
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-1">Bookings — Last 6 Months</h3>
                    <BarChart data={analytics.bookingsByMonth} color="#8b5cf6" />
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-sm font-bold text-gray-700 mb-1">Registrations — Last 6 Months</h3>
                    <BarChart data={analytics.registrationsByMonth} color="#06b6d4" />
                  </div>
                </div>

                {/* Top categories */}
                {analytics.topCategories?.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-md">
                    <h3 className="text-sm font-bold text-gray-700 mb-4">Top Talent Categories by Bookings</h3>
                    <div className="space-y-3">
                      {analytics.topCategories.map((c, i) => {
                        const max = analytics.topCategories[0].count;
                        const pct = Math.round((c.count / max) * 100);
                        return (
                          <div key={i} className="flex items-center gap-3">
                            <span className="text-xs font-bold text-gray-500 w-4">{i + 1}</span>
                            <div className="flex-1">
                              <div className="flex justify-between mb-1">
                                <span className="text-sm font-semibold text-gray-700">{c._id}</span>
                                <span className="text-xs text-gray-400">{c.count} bookings</span>
                              </div>
                              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null
          )}

          {/* ══════════ USERS ══════════ */}
          {activeTab === 'users' && (
            <div className="max-w-5xl space-y-5">
              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <input
                  type="text"
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); setUsersPage(1); }}
                  placeholder="Search name or email..."
                  className="flex-1 min-w-48 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                />
                <select value={userRoleFilter} onChange={e => { setUserRoleFilter(e.target.value); setUsersPage(1); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="all">All Roles</option>
                  <option value="artist">Artists</option>
                  <option value="customer">Customers</option>
                </select>
                <span className="self-center text-sm text-gray-400">{usersTotal} users</span>
              </div>

              {usersLoading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {users.map(u => (
                    <div key={u._id} className={`bg-white rounded-2xl shadow-sm border p-5 flex items-center gap-4 flex-wrap ${u.isBanned ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {u.profilePicture
                          ? <img src={`${BASE_URL}${u.profilePicture}`} alt={u.name} className="w-12 h-12 rounded-full object-cover shadow" />
                          : <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow">
                              <span className="text-white font-bold">{u.name?.[0]?.toUpperCase()}</span>
                            </div>
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-800">{u.fullName || u.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.role === 'artist' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {u.role}
                          </span>
                          {u.talentCategory && (
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{u.talentCategory}</span>
                          )}
                          {u.isBanned && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-semibold">🚫 Banned</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 mt-0.5">{u.email}</p>
                        {u.isBanned && u.banReason && (
                          <p className="text-xs text-red-500 mt-1">Reason: {u.banReason}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">Joined {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        {u.isBanned ? (
                          <button onClick={() => handleBanUser(u._id, false)}
                            className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 text-xs font-semibold rounded-lg transition-all">
                            ✅ Unban
                          </button>
                        ) : (
                          <button onClick={() => setBanTarget(u)}
                            className="px-3 py-1.5 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-semibold rounded-lg transition-all">
                            🚫 Ban
                          </button>
                        )}
                        <button
                          onClick={() => setConfirm({ message: `Permanently delete ${u.name} and all their data?`, onConfirm: () => handleDeleteUser(u._id) })}
                          className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold rounded-lg transition-all">
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={usersPage} pages={usersPages} onPage={setUsersPage} />
            </div>
          )}

          {/* ══════════ BOOKINGS ══════════ */}
          {activeTab === 'bookings' && (
            <div className="max-w-5xl space-y-5">
              <div className="flex flex-wrap gap-3 items-center">
                <select value={bookingStatusFilter} onChange={e => { setBookingStatusFilter(e.target.value); setBookingsPage(1); }}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-400">
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="completed">Completed</option>
                  <option value="rejected">Rejected</option>
                </select>
                <span className="text-sm text-gray-400">{bookingsTotal} bookings</span>
              </div>

              {bookingsLoading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {bookings.map(b => (
                    <div key={b._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                      <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[b.status]}`}>
                              {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                            </span>
                            <span className="text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-medium">Customer</p>
                              <p className="font-semibold text-gray-700">{b.customer?.name}</p>
                              <p className="text-xs text-gray-400">{b.customer?.email}</p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 uppercase font-medium">Artist</p>
                              <p className="font-semibold text-gray-700">{b.artist?.name}</p>
                              <p className="text-xs text-gray-400">{b.artist?.email}</p>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-6 text-sm">
                            <div>
                              <span className="text-xs text-gray-400">Date: </span>
                              <span className="text-gray-700 font-medium">{new Date(b.eventDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                              <span className="text-xs text-gray-400">Location: </span>
                              <span className="text-gray-700 font-medium">{b.eventLocation}</span>
                            </div>
                          </div>
                          {b.message && <p className="text-xs text-gray-500 mt-2 italic">"{b.message}"</p>}
                        </div>

                        {/* Dispute resolution controls */}
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-gray-400 font-medium">Override Status</p>
                          <div className="flex gap-2 flex-wrap">
                            {['pending','accepted','rejected','completed'].filter(s => s !== b.status).map(s => (
                              <button key={s} onClick={() => handleUpdateBooking(b._id, s)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${STATUS_STYLES[s]} hover:opacity-80`}>
                                → {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={bookingsPage} pages={bookingsPages} onPage={setBookingsPage} />
            </div>
          )}

          {/* ══════════ POSTS ══════════ */}
          {activeTab === 'posts' && (
            <div className="max-w-5xl space-y-5">
              <p className="text-sm text-gray-400">{postsTotal} posts total</p>
              {postsLoading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {posts.map(p => {
                    const cover = p.files?.[0] || { url: p.fileUrl, fileType: p.fileType };
                    return (
                      <div key={p._id} className="relative group rounded-2xl overflow-hidden bg-black aspect-square shadow-sm">
                        {cover.fileType === 'video'
                          ? <video src={`${BASE_URL}${cover.url}`} className="w-full h-full object-cover" />
                          : <img src={`${BASE_URL}${cover.url}`} alt="" className="w-full h-full object-cover" />
                        }
                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-between p-3">
                          <div>
                            <p className="text-white text-xs font-bold truncate">{p.artist?.name}</p>
                            <p className="text-white/60 text-[10px] truncate">{p.artist?.email}</p>
                          </div>
                          {p.caption && <p className="text-white/80 text-[10px] line-clamp-2">{p.caption}</p>}
                          <button
                            onClick={() => setConfirm({ message: 'Remove this post?', onConfirm: () => handleDeletePost(p._id) })}
                            className="w-full bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-2 rounded-lg transition-all">
                            🗑️ Remove Post
                          </button>
                        </div>
                        {p.files?.length > 1 && (
                          <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">⧉ {p.files.length}</span>
                        )}
                        {cover.fileType === 'video' && (
                          <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">🎥</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <Pagination page={postsPage} pages={postsPages} onPage={setPostsPage} />
            </div>
          )}

          {/* ══════════ REVIEWS ══════════ */}
          {activeTab === 'reviews' && (
            <div className="max-w-3xl space-y-5">
              <p className="text-sm text-gray-400">{reviewsTotal} reviews total</p>
              {reviewsLoading ? (
                <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between flex-wrap gap-2">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-800 text-sm">{r.customer?.name}</span>
                              <span className="text-gray-400 text-xs">→</span>
                              <span className="font-semibold text-purple-700 text-sm">{r.artist?.name}</span>
                            </div>
                            <div className="flex gap-0.5 mt-1">
                              {[1,2,3,4,5].map(s => (
                                <span key={s} className={`text-sm ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                              ))}
                            </div>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {new Date(r.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                          </span>
                        </div>
                        {r.comment && (
                          <p className="text-sm text-gray-600 mt-2 leading-relaxed">{r.comment}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">{r.customer?.email} → {r.artist?.email}</p>
                      </div>
                      <button
                        onClick={() => setConfirm({ message: 'Remove this review?', onConfirm: () => handleDeleteReview(r._id) })}
                        className="flex-shrink-0 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-semibold rounded-lg transition-all self-start">
                        🗑️ Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Pagination page={reviewsPage} pages={reviewsPages} onPage={setReviewsPage} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}