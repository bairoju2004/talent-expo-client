import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  getArtistsByTalent,
  getArtistPosts,
  getMyBookings,
  getMessages,
  getUnreadCount,
  updateBookingStatus,
  getArtistProfile,
  getCustomerProfile,
  submitReview,
  checkReviewed,
  getArtistReviews,
  getUnreadBookingNotificationCount,
  markBookingNotificationsRead,
} from '../api/services';
import { useAuth } from '../context/AuthContext';
import NotificationCenter from '../components/NotificationCenter';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');
const BASE_URL = 'http://localhost:5000';
// Smart URL resolver: Cloudinary URLs are already full, local paths need BASE_URL prefix
const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
};


// Reusable avatar: shows profile pic if available, else gradient + initial
function ArtistAvatar({ profilePicture, name, size = 'md', className = '' }) {
  const sizes = { sm: 'w-8 h-8 text-sm', md: 'w-10 h-10 text-base', lg: 'w-14 h-14 text-xl' };
  const sizeClass = sizes[size] || sizes.md;
  const src = profilePicture ? resolveUrl(profilePicture) : null;
  return (
    <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0 ${src ? '' : 'bg-gradient-to-br from-purple-400 to-indigo-500'} flex items-center justify-center shadow-md ${className}`}>
      {src
        ? <img src={src} alt={name} className="w-full h-full object-cover" />
        : <span className="font-bold text-white">{name?.[0]?.toUpperCase()}</span>
      }
    </div>
  );
}

const TALENT_CATEGORIES = [
  { name: 'Dance',       emoji: '💃' },
  { name: 'Music',       emoji: '🎵' },
  { name: 'Comedy',      emoji: '😂' },
  { name: 'Magic',       emoji: '🎩' },
  { name: 'Acting',      emoji: '🎭' },
  { name: 'Singing',     emoji: '🎤' },
  { name: 'Photography', emoji: '📸' },
  { name: 'Painting',    emoji: '🎨' },
  { name: 'DJ',          emoji: '🎧' },
  { name: 'Other',       emoji: '⭐' },
];

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  accepted:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

// ── Post Modal ────────────────────────────────────────────────────────────────
function PostModal({ post, allPosts, onClose, onArtistClick, onPostClick }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const moreRef = useRef(null);

  const files = post?.files?.length
    ? post.files
    : post ? [{ url: post.fileUrl, fileType: post.fileType }] : [];

  const current = files[slideIndex] || files[0];

  // More posts from same artist, excluding current
  const morePosts = (allPosts || []).filter(
    (p) => p.artistId === post?.artistId && p._id !== post?._id
  );

  useEffect(() => { setSlideIndex(0); }, [post]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setSlideIndex((i) => Math.min(files.length - 1, i + 1));
      if (e.key === 'ArrowLeft')  setSlideIndex((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, files.length]);

  if (!post) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-2 py-2"
      style={{ animation: 'fadeInBackdrop 0.2s ease' }}
    >
      <div
        className="relative bg-white rounded-3xl overflow-hidden shadow-2xl w-full flex"
        style={{ maxWidth: '900px', height: '90vh', animation: 'bounceInModal 0.4s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        {/* ── LEFT: Media ── */}
        <div className="relative bg-black flex items-center justify-center flex-shrink-0" style={{ width: '55%' }}>
          {current?.fileType === 'video' ? (
            <video
              key={slideIndex}
              src={resolveUrl(current.url)}
              className="w-full h-full object-contain"
              controls autoPlay
            />
          ) : (
            <img
              src={resolveUrl(current?.url)}
              alt={post.caption || 'post'}
              className="w-full h-full object-contain"
            />
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-9 h-9 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center text-lg font-bold transition-all"
          >×</button>

          {/* Prev / Next */}
          {files.length > 1 && (
            <>
              <button onClick={() => setSlideIndex((i) => Math.max(0, i - 1))} disabled={slideIndex === 0}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-2xl flex items-center justify-center disabled:opacity-25 transition-all">‹</button>
              <button onClick={() => setSlideIndex((i) => Math.min(files.length - 1, i + 1))} disabled={slideIndex === files.length - 1}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-2xl flex items-center justify-center disabled:opacity-25 transition-all">›</button>
              <span className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full font-medium">{slideIndex + 1} / {files.length}</span>
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
                {files.map((_, i) => (
                  <button key={i} onClick={() => setSlideIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === slideIndex ? 'bg-white w-4' : 'bg-white/50 w-1.5'}`} />
                ))}
              </div>
            </>
          )}

          {/* Thumbnail strip */}
          {files.length > 1 && (
            <div className="absolute bottom-10 left-0 right-0 flex gap-2 px-4 justify-center">
              {files.map((f, i) => (
                <button key={i} onClick={() => setSlideIndex(i)}
                  className={`flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${i === slideIndex ? 'border-purple-400' : 'border-transparent opacity-60 hover:opacity-90'}`}>
                  {f.fileType === 'video'
                    ? <video src={resolveUrl(f.url)} className="w-full h-full object-cover" />
                    : <img src={resolveUrl(f.url)} className="w-full h-full object-cover" alt="" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Scrollable info + more posts ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-gray-100">
          {/* Artist header — sticky */}
          <div className="flex-shrink-0 px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <button onClick={() => onArtistClick(post.artistId)} className="flex items-center gap-3 group text-left flex-1 min-w-0">
              <ArtistAvatar profilePicture={post.artistProfilePicture} name={post.artistName} size="md" />
              <div className="min-w-0">
                <p className="font-bold text-gray-800 group-hover:text-purple-600 transition-colors truncate">{post.artistName}</p>
                {post.talentCategory && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{post.talentCategory}</span>
                )}
              </div>
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">
            {/* Caption */}
            <div className="px-5 py-4 border-b border-gray-50">
              {post.caption
                ? <p className="text-gray-700 text-sm leading-relaxed">{post.caption}</p>
                : <p className="text-gray-400 text-sm italic">No caption</p>
              }
              <div className="flex gap-2 mt-3 flex-wrap">
                {files.length > 1 && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">⧉ {files.length} photos</span>}
                {current?.fileType === 'video' && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🎥 Video</span>}
              </div>
            </div>

            {/* More from this artist */}
            {morePosts.length > 0 && (
              <div className="px-5 py-4" ref={moreRef}>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">More from {post.artistName}</p>
                <div className="grid grid-cols-3 gap-2">
                  {morePosts.map((p) => {
                    const c = p.files?.[0] || { url: p.fileUrl, fileType: p.fileType };
                    return (
                      <button key={p._id} onClick={() => onPostClick(p)}
                        className="aspect-square rounded-xl overflow-hidden bg-black group relative hover:opacity-90 transition-all">
                        {c.fileType === 'video'
                          ? <video src={resolveUrl(c.url)} className="w-full h-full object-cover" />
                          : <img src={resolveUrl(c.url)} className="w-full h-full object-cover" alt="" />}
                        {p.files?.length > 1 && (
                          <span className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">⧉</span>
                        )}
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

// ── Masonry Grid ──────────────────────────────────────────────────────────────
function MasonryGrid({ items, onPostClick }) {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-3">
      {items.map((item, index) => {
        const cover = item.files?.[0] || { url: item.fileUrl, fileType: item.fileType };
        const isCarousel = item.files?.length > 1;
        return (
          <div
            key={item._id || index}
            onClick={() => onPostClick(item)}
            className="break-inside-avoid mb-3 rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group relative bg-black"
            style={{ display: 'inline-block', width: '100%' }}
          >
            {cover.fileType === 'video' ? (
              <video
                src={resolveUrl(cover.url)}
                className="w-full object-cover group-hover:opacity-80 transition-all"
                style={{ minHeight: '120px' }}
              />
            ) : (
              <img
                src={resolveUrl(cover.url)}
                alt={item.caption || 'post'}
                className="w-full object-cover group-hover:opacity-80 transition-all"
                style={{ minHeight: '120px' }}
              />
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                <span className="text-white text-2xl">
                  {isCarousel ? '⧉' : cover.fileType === 'video' ? '▶️' : '🔍'}
                </span>
              </div>
            </div>

            {/* Artist name + caption at bottom */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-all">
              {item.artistName && (
                <p className="text-white text-xs font-bold truncate">🎨 {item.artistName}</p>
              )}
              {item.caption && (
                <p className="text-white/70 text-xs line-clamp-1 mt-0.5">{item.caption}</p>
              )}
            </div>

            {/* Carousel badge */}
            {isCarousel && (
              <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                ⧉ {item.files.length}
              </span>
            )}
            {cover.fileType === 'video' && !isCarousel && (
              <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">🎥</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function StarRating({ value, onChange, size = 'md', readOnly = false }) {
  const [hovered, setHovered] = useState(null);
  const sizes = { sm: 'text-base', md: 'text-2xl', lg: 'text-3xl' };
  const display = hovered ?? value ?? 0;
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHovered(star)}
          onMouseLeave={() => !readOnly && setHovered(null)}
          className={`${sizes[size]} transition-transform ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
        >
          <span className={star <= display ? 'text-yellow-400' : 'text-gray-200'}>★</span>
        </button>
      ))}
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────────────
function ReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const artistName = booking?.artist?.name || 'the artist';

  const handleSubmit = async () => {
    if (!rating) { setError('Please select a star rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      const res = await submitReview({ bookingId: booking._id, rating, comment });
      onSubmitted(booking._id, res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'bounceInModal 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}
      >
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Rate Your Experience</h2>
              <p className="text-purple-200 text-sm mt-0.5">with {artistName}</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white font-bold transition-all"
            >×</button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-600 mb-3">How would you rate this artist?</p>
            <div className="flex justify-center">
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
            {rating > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent!'][rating]}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Your Review <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share details about your experience..."
              rows={4}
              maxLength={1000}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition resize-none text-sm"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{comment.length}/1000</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || !rating}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-all"
          >
            {submitting ? 'Submitting...' : '⭐ Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BrowseArtistsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const homeSearchRef = useRef(null);
  const homeDropdownRef = useRef(null);
  const exploreInputRef = useRef(null);

  const defaultActiveNav = location.state?.activeNav || (location.pathname === '/browse-messages' ? 'messages' : 'home');
  const [activeNav, setActiveNav] = useState(defaultActiveNav);

  // Reactively switch tab when navigating to /browse with location.state
  // (e.g. clicking a booking notification while already on the /browse page)
  useEffect(() => {
    if (location.state?.activeNav) {
      setActiveNav(location.state.activeNav);
    }
  }, [location.state]);
  // Ref so socket handlers always see the current activeNav without stale closures
  const activeNavRef = useRef(activeNav);
  const [homeSearchText, setHomeSearchText] = useState('');
  const [homeIsFocused, setHomeIsFocused] = useState(false);
  const [homeBounced, setHomeBounced] = useState(null);
  const [exploreSearchText, setExploreSearchText] = useState('');
  const [exploreBounced, setExploreBounced] = useState(null);

  // Post modal
  const [selectedPost, setSelectedPost] = useState(null);

  // Own profile picture for sidebar
  const [ownProfilePic, setOwnProfilePic] = useState(null);

  const [artists, setArtists] = useState([]);
  const [allArtists, setAllArtists] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [recentHistory, setRecentHistory] = useState([]);

  // Messages tab — stores deduplicated bookings (one per person)
  const [bookings, setBookings] = useState([]);
  const [bookingMessages, setBookingMessages] = useState({});
  const [messagesLoading, setMessagesLoading] = useState(false);
  // Per-chat unread counts — updated globally via socket regardless of active tab
  const [msgUnreadCounts, setMsgUnreadCounts] = useState({});

  // Bookings tab — stores all bookings
  const [myBookings, setMyBookings] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [customerBookingNotifications, setCustomerBookingNotifications] = useState(0);
  // Green badge count on Bookings nav — unread booking notifications for both roles
  const [bookingNotifCount, setBookingNotifCount] = useState(0);
  // Bookings sort & filter
  const [bookingSortBy, setBookingSortBy] = useState('newest');
  const [bookingFilterStatus, setBookingFilterStatus] = useState('all');

  // Reviews
  const [reviewModalBooking, setReviewModalBooking] = useState(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState(new Set());
  const [artistRatings, setArtistRatings] = useState({}); // artistUserId -> { avgRating, total }

  // Helper: get the other person's ID from a booking
  const getOtherId = (booking) => {
    return String(
      user?.role === 'customer'
        ? (booking.artist?._id || booking.artist)
        : (booking.customer?._id || booking.customer)
    );
  };

  // Helper: get the other person's name from a booking
  const getOtherName = (booking) => {
    if (user?.role === 'customer') return booking.artist?.name || 'Artist';
    return booking.customer?.name || 'Customer';
  };

  // For a given booking, find the FIRST/oldest booking with the same person
  const getFirstBookingId = (booking) => {
    const otherId = getOtherId(booking);
    const first = myBookings.find((b) => getOtherId(b) === otherId);
    return first?._id || booking._id;
  };

  // ── Fetch own profile picture for sidebar ──
  useEffect(() => {
    if (!user) return;
    const fetchOwnPic = user.role === 'artist' ? getArtistProfile : getCustomerProfile;
    fetchOwnPic()
      .then((res) => setOwnProfilePic(res.data.profilePicture || null))
      .catch(() => {});
  }, [user]);

  // ── Global socket listener — tracks unread messages from ANY tab ──
  useEffect(() => {
    if (!user) return;

    // Join the user's personal notification room so we receive 'notification' events
    socket.emit('joinUserRoom', user._id);

    // Join all booking rooms so we receive real-time messages
    // Start counts at 0 — only increment from live socket events this session
    getMyBookings().then((res) => {
      res.data.forEach((b) => socket.emit('joinRoom', b._id));
    }).catch(() => {});

    // Increment badge only when a NEW message arrives live (from other person)
    const handleNewMsg = (message) => {
      if (message.sender?.toString() !== user._id?.toString()) {
        setMsgUnreadCounts((prev) => ({
          ...prev,
          [message.bookingId]: (prev[message.bookingId] || 0) + 1,
        }));
      }
    };

    // Increment booking notif badge in real-time when a relevant notification arrives
    // Artist: 'new_booking' (customer sent request) | Customer: 'booking_status' (artist responded)
    const bookingNotifType = user.role === 'artist' ? 'new_booking' : 'booking_status';
    const handleNotification = (notif) => {
      if (notif.type === bookingNotifType) {
        // Don't show badge if the user already has the bookings tab open
        if (activeNavRef.current !== 'bookings') {
          setBookingNotifCount((prev) => prev + 1);
        }
      }
    };

    socket.on('receiveMessage', handleNewMsg);
    socket.on('notification', handleNotification);

    return () => {
      socket.off('receiveMessage', handleNewMsg);
      socket.off('notification', handleNotification);
    };
  }, [user]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const results = await Promise.all(
          TALENT_CATEGORIES.map((cat) =>
            getArtistsByTalent(cat.name).then((res) =>
              res.data.map((a) => ({ ...a, talentEmoji: cat.emoji }))
            )
          )
        );
        const flat = results.flat();
        setAllArtists(flat);

        // Fetch avg ratings for all artists in parallel
        const ratingResults = await Promise.all(
          flat.map((artist) => {
            const uid = artist.user?._id || artist.user;
            return getArtistReviews(uid)
              .then((r) => ({ uid, avgRating: r.data.avgRating, total: r.data.total }))
              .catch(() => ({ uid, avgRating: null, total: 0 }));
          })
        );
        const ratingsMap = {};
        ratingResults.forEach(({ uid, avgRating, total }) => {
          if (uid) ratingsMap[uid] = { avgRating, total };
        });
        setArtistRatings(ratingsMap);

        const postResults = await Promise.all(
          flat.map((artist) => {
            const uid = artist.user?._id || artist.user;
            return getArtistPosts(uid)
              .then((r) => r.data.map((p) => ({
                ...p, artistName: artist.fullName, artistId: uid,
                talentCategory: artist.talentCategory,
                artistProfilePicture: artist.profilePicture || null,
              })))
              .catch(() => []);
          })
        );
        setAllPosts(postResults.flat());
      } catch { console.log('Failed to load'); }
      finally { setPostsLoading(false); }
    };
    fetchAll();
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('talentexpo_search_history');
    if (stored) setRecentHistory(JSON.parse(stored));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        homeDropdownRef.current && !homeDropdownRef.current.contains(e.target) &&
        homeSearchRef.current && !homeSearchRef.current.contains(e.target)
      ) setHomeIsFocused(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (homeIsFocused && !homeSearchText) {
      setHomeBounced(-1);
      TALENT_CATEGORIES.forEach((_, i) => setTimeout(() => setHomeBounced(i), i * 80));
      setTimeout(() => setHomeBounced(null), TALENT_CATEGORIES.length * 80 + 500);
    }
  }, [homeIsFocused]);

  // Keep ref in sync so socket handlers always read the latest activeNav
  useEffect(() => {
    activeNavRef.current = activeNav;
  }, [activeNav]);

  useEffect(() => {
    if (activeNav === 'explore') {
      setTimeout(() => exploreInputRef.current?.focus(), 100);
      setExploreBounced(-1);
      TALENT_CATEGORIES.forEach((_, i) => setTimeout(() => setExploreBounced(i), i * 80));
      setTimeout(() => setExploreBounced(null), TALENT_CATEGORIES.length * 80 + 500);
    }
  }, [activeNav]);

  // Messages tab — load deduplicated bookings (one per person, oldest first)
  useEffect(() => {
    if (activeNav === 'messages' && user) {
      setMessagesLoading(true);
      getMyBookings()
        .then(async (res) => {
          const allBookings = res.data;

          // Keep only the FIRST (oldest) booking per unique person
          const seen = new Set();
          const unique = allBookings.filter((booking) => {
            const otherId = String(
              user?.role === 'customer'
                ? (booking.artist?._id || booking.artist)
                : (booking.customer?._id || booking.customer)
            );
            if (seen.has(otherId)) return false;
            seen.add(otherId);
            return true;
          });

          setBookings(unique);

          // Load last message for each unique booking
          const msgMap = {};
          await Promise.all(
            unique.map(async (booking) => {
              try {
                const r = await getMessages(booking._id);
                const msgs = r.data;
                msgMap[booking._id] = msgs[msgs.length - 1] || null;
              } catch {
                msgMap[booking._id] = null;
              }
            })
          );
          setBookingMessages(msgMap);
        })
        .finally(() => setMessagesLoading(false));
    }
  }, [activeNav, user]);

  // Bookings tab — load ALL bookings + check which are already reviewed
  useEffect(() => {
    if (activeNav === 'bookings' && user) {
      setBookingsLoading(true);
      // Clear the green badge — mark all booking notifs as read for this role
      markBookingNotificationsRead().catch(() => {});
      setBookingNotifCount(0);
      getMyBookings()
        .then(async (res) => {
          setMyBookings(res.data);
          // For customers: check which completed bookings already have a review
          if (user.role === 'customer') {
            const completed = res.data.filter((b) => b.status === 'completed');
            const checks = await Promise.all(
              completed.map((b) =>
                checkReviewed(b._id)
                  .then((r) => ({ id: b._id, reviewed: r.data.reviewed }))
                  .catch(() => ({ id: b._id, reviewed: false }))
              )
            );
            setReviewedBookingIds(new Set(checks.filter((c) => c.reviewed).map((c) => c.id)));
          }
        })
        .finally(() => setBookingsLoading(false));
    }
  }, [activeNav, user]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus);
      setMyBookings((prev) => prev.map((b) => b._id === bookingId ? { ...b, status: newStatus } : b));
      // Update pending count for artists
      if (user?.role === 'artist' && newStatus !== 'pending') {
        setPendingBookingsCount((prev) => Math.max(0, prev - 1));
      }
    } catch { alert('Failed to update.'); }
    finally { setUpdatingId(null); }
  };

  const handleReviewSubmitted = (bookingId, _review) => {
    setReviewedBookingIds((prev) => new Set([...prev, bookingId]));
    setReviewModalBooking(null);
  };

  // Load pending bookings count for artists (for sidebar badge)
  useEffect(() => {
    if (user?.role === 'artist') {
      getMyBookings()
        .then((res) => {
          const pendingCount = res.data.filter((b) => b.status === 'pending').length;
          setPendingBookingsCount(pendingCount);
        })
        .catch(() => setPendingBookingsCount(0));
    } else {
      setPendingBookingsCount(0);
    }
  }, [user]);

  // Load unread booking notification count for green badge (both roles)
  // Artist: counts unread 'new_booking' notifs (customer sent booking request)
  // Customer: counts unread 'booking_status' notifs (artist accepted/rejected)
  useEffect(() => {
    if (!user) return;
    getUnreadBookingNotificationCount()
      .then((res) => setBookingNotifCount(res.data.count || 0))
      .catch(() => setBookingNotifCount(0));
  }, [user]);

  const saveToHistory = (term) => {
    const updated = [term, ...recentHistory.filter((h) => h !== term)].slice(0, 5);
    setRecentHistory(updated);
    localStorage.setItem('talentexpo_search_history', JSON.stringify(updated));
  };

  const clearHistory = () => {
    setRecentHistory([]);
    localStorage.removeItem('talentexpo_search_history');
  };

  const handleCategoryClick = async (categoryName) => {
    setHomeSearchText(categoryName);
    setExploreSearchText(categoryName);
    setHomeIsFocused(false);
    setLoading(true);
    setSearched(true);
    saveToHistory(categoryName);
    setActiveNav('home');
    try {
      const res = await getArtistsByTalent(categoryName);
      setArtists(res.data);
    } catch { setArtists([]); }
    finally { setLoading(false); }
  };

  const handleBook = (artistUserId) => {
    if (!user) { navigate('/login'); return; }
    navigate(`/book/${artistUserId}`);
  };

  const handleViewProfile = (artistUserId) => navigate(`/artist/public/${artistUserId}`);
  const handleLogout = () => { logout(); navigate('/'); };
  const handleProfileClick = () => {
    if (user?.role === 'artist') navigate('/artist/view-profile');
    else navigate('/customer/view-profile');
  };

  const homeLiveResults = homeSearchText.trim().length > 0
    ? allArtists.filter((a) =>
        a.fullName?.toLowerCase().includes(homeSearchText.toLowerCase()) ||
        a.talentCategory?.toLowerCase().includes(homeSearchText.toLowerCase())
      ) : [];

  const exploreLiveResults = exploreSearchText.trim().length > 0
    ? allArtists.filter((a) =>
        a.fullName?.toLowerCase().includes(exploreSearchText.toLowerCase()) ||
        a.talentCategory?.toLowerCase().includes(exploreSearchText.toLowerCase())
      ) : [];

  const displayPosts = searched && artists.length > 0
    ? allPosts.filter((p) => artists.some((a) => (a.user?._id || a.user) === p.artistId))
    : allPosts;

  // Total unread messages across ALL chats — shown on sidebar Messages icon
  const totalUnread = Object.values(msgUnreadCounts).reduce((sum, c) => sum + c, 0);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString())
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <style>{`
        @keyframes bounceIn {
          0%   { opacity: 0; transform: scale(0.3) translateY(20px); }
          50%  { opacity: 1; transform: scale(1.15) translateY(-5px); }
          70%  { transform: scale(0.95) translateY(2px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes bounceInModal {
          0%   { opacity: 0; transform: scale(0.5) translateY(40px); }
          60%  { opacity: 1; transform: scale(1.04) translateY(-8px); }
          80%  { transform: scale(0.97) translateY(3px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        @keyframes fadeInBackdrop {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
      `}</style>

      {/* Post Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          allPosts={allPosts}
          onClose={() => setSelectedPost(null)}
          onPostClick={(p) => setSelectedPost(p)}
          onArtistClick={(artistId) => {
            setSelectedPost(null);
            navigate(`/artist/public/${artistId}`);
          }}
        />
      )}

      {/* Review Modal */}
      {reviewModalBooking && (
        <ReviewModal
          booking={reviewModalBooking}
          onClose={() => setReviewModalBooking(null)}
          onSubmitted={handleReviewSubmitted}
        />
      )}

      {/* ── LEFT SIDEBAR ── */}
      <div className="fixed left-0 top-0 h-full w-20 bg-white border-r border-gray-100 shadow-sm flex flex-col items-center py-6 gap-1 z-50">
        <div
          onClick={() => { setActiveNav('home'); setSearched(false); setArtists([]); setHomeSearchText(''); }}
          className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center cursor-pointer mb-4 hover:bg-purple-700 transition-all shadow-md"
        >
          <span className="text-2xl">🎭</span>
        </div>

        {[
          { key: 'home',     icon: '🏠', label: 'Home' },
          { key: 'explore',  icon: '🔍', label: 'Explore' },
          { key: 'messages', icon: '💬', label: 'Messages' },
          { key: 'bookings', icon: '📅', label: 'Bookings' },
        ].map((nav) => (
          <button key={nav.key} onClick={() => setActiveNav(nav.key)} title={nav.label}
            className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all relative ${
              activeNav === nav.key ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
            }`}>
            <span className="text-2xl">{nav.icon}</span>
            <span className="text-xs font-medium">{nav.label}</span>
            {/* Unread badge on Messages icon */}
            {nav.key === 'messages' && totalUnread > 0 && (
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md">
                {totalUnread > 99 ? '99+' : totalUnread}
              </span>
            )}
            {/* Booking notification badge — green dot for BOTH artists and customers.
                Artist sees it when a customer sends a new booking request.
                Customer sees it when an artist accepts or rejects their request.
                Disappears as soon as the Bookings tab is opened. */}
            {nav.key === 'bookings' && bookingNotifCount > 0 && activeNav !== 'bookings' && (
              <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-green-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-md animate-pulse">
                {bookingNotifCount > 99 ? '99+' : bookingNotifCount}
              </span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* 🔔 Notification Bell */}
        {user && (
          <NotificationCenter placement="sidebar" />
        )}

        {user && (
          <>
            <button onClick={handleProfileClick} title="Profile"
              className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 hover:bg-purple-50 transition-all">
              <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow">
                {ownProfilePic
                  ? <img src={resolveUrl(ownProfilePic)} alt={user.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center"><span className="text-white text-sm font-bold">{user.name?.[0]?.toUpperCase()}</span></div>
                }
              </div>
              <span className="text-xs font-medium text-gray-500">Profile</span>
            </button>
            <button onClick={handleLogout} title="Logout"
              className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all">
              <span className="text-2xl">🚪</span>
              <span className="text-xs font-medium">Logout</span>
            </button>
          </>
        )}

        {!user && (
          <button onClick={() => navigate('/login')}
            className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center gap-1 text-gray-400 hover:bg-purple-50 hover:text-purple-700 transition-all">
            <span className="text-2xl">🔑</span>
            <span className="text-xs font-medium">Login</span>
          </button>
        )}
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="ml-20 flex-1 flex flex-col overflow-hidden">

        {/* ════════ HOME TAB ════════ */}
        {activeNav === 'home' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-3">
              <div className="max-w-2xl mx-auto relative" ref={homeSearchRef}>
                <div className="flex gap-3 items-center">
                  <div className="flex-1 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
                    <input type="text" value={homeSearchText}
                      onChange={(e) => setHomeSearchText(e.target.value)}
                      onFocus={() => setHomeIsFocused(true)}
                      placeholder="Search talents, artists..."
                      className="w-full pl-11 pr-10 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition text-gray-700 bg-gray-50 text-sm"
                    />
                    {homeSearchText && (
                      <button onClick={() => { setHomeSearchText(''); setArtists([]); setSearched(false); }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl">×</button>
                    )}
                  </div>
                  <button
                    onClick={() => { if (homeSearchText) { saveToHistory(homeSearchText); handleCategoryClick(homeSearchText); } }}
                    disabled={!homeSearchText || loading}
                    className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-2xl transition-all text-sm"
                  >Search</button>
                </div>

                {homeIsFocused && (
                  <div ref={homeDropdownRef}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
                    {!homeSearchText && recentHistory.length > 0 && (
                      <div className="px-4 pt-4 pb-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">🕐 Recent Searches</p>
                          <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
                        </div>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {recentHistory.map((term, i) => (
                            <button key={i} onClick={() => { saveToHistory(term); handleCategoryClick(term); }}
                              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded-full text-xs text-gray-600 transition-all">
                              🕐 {term}
                            </button>
                          ))}
                        </div>
                        <div className="border-t border-gray-100 mb-2" />
                      </div>
                    )}
                    {!homeSearchText && (
                      <div className="px-4 pb-5">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-4">✨ Browse by Talent</p>
                        <div className="grid grid-cols-5 gap-3">
                          {TALENT_CATEGORIES.map((cat, index) => (
                            <button key={cat.name} onClick={() => handleCategoryClick(cat.name)}
                              style={{
                                animation: homeBounced !== null && index <= homeBounced ? 'bounceIn 0.4s ease forwards' : 'none',
                                opacity: homeBounced !== null && index > homeBounced ? 0 : 1,
                              }}
                              className="flex flex-col items-center gap-2 p-2 rounded-2xl hover:bg-purple-50 transition-all group">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-indigo-100 group-hover:from-purple-200 group-hover:to-indigo-200 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:shadow-md transition-all group-hover:scale-110">
                                {cat.emoji}
                              </div>
                              <span className="text-xs font-semibold text-gray-600 group-hover:text-purple-700 text-center">{cat.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {homeSearchText && (
                      <div className="max-h-64 overflow-y-auto">
                        {homeLiveResults.length === 0 ? (
                          <div className="px-4 py-6 text-center text-gray-400 text-sm">No results for "{homeSearchText}"</div>
                        ) : (
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-2">🎯 Artists</p>
                            {homeLiveResults.map((artist) => {
                              const uid = artist.user?._id || artist.user;
                              return (
                                <button key={artist._id}
                                  onClick={() => { saveToHistory(artist.fullName); setHomeIsFocused(false); handleViewProfile(uid); }}
                                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-all text-left">
                                  <ArtistAvatar profilePicture={artist.profilePicture} name={artist.fullName} size="sm" />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-800 text-sm truncate">{artist.fullName}</p>
                                    <p className="text-xs text-gray-500">{artist.talentEmoji} {artist.talentCategory} · {artist.experience} yrs</p>
                                  </div>
                                  <span className="text-xs text-purple-400">View →</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {loading && (
                <div className="text-center py-12">
                  <div className="inline-block w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-gray-500 mt-4">Finding artists...</p>
                </div>
              )}
              {!loading && searched && artists.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-gray-500">Found <span className="font-bold text-purple-600">{artists.length}</span> artists for "{homeSearchText}"</p>
                    <button onClick={() => { setSearched(false); setArtists([]); setHomeSearchText(''); }}
                      className="text-sm text-purple-600 hover:text-purple-800 font-medium">← Show all</button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                    {artists.map((artist) => {
                      const uid = artist.user?._id || artist.user;
                      return (
                        <div key={artist._id} className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all p-4">
                          <div onClick={() => handleViewProfile(uid)} className="cursor-pointer group">
                            <div className="mb-3 group-hover:scale-105 transition-all inline-block">
                              <ArtistAvatar profilePicture={artist.profilePicture} name={artist.fullName} size="lg" />
                            </div>
                            <h3 className="font-bold text-gray-800 text-sm group-hover:text-purple-600">{artist.fullName}</h3>
                            <span className="bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block">{artist.talentCategory}</span>
                            {artist.description && <p className="text-gray-500 text-xs mt-2 line-clamp-2">{artist.description}</p>}
                            {/* Avg rating */}
                            {artistRatings[uid]?.avgRating && (
                              <div className="flex items-center gap-1 mt-2">
                                <span className="text-yellow-400 text-sm">★</span>
                                <span className="text-xs font-bold text-gray-700">{artistRatings[uid].avgRating}</span>
                                <span className="text-xs text-gray-400">({artistRatings[uid].total})</span>
                              </div>
                            )}
                          </div>
                          <button onClick={() => handleBook(uid)}
                            className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-xl transition-all text-xs">
                            📅 Book Now
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {!loading && searched && artists.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-5xl mb-4">😔</p>
                  <p className="text-gray-500 text-xl">No artists found for "{homeSearchText}"</p>
                </div>
              )}
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                {searched && artists.length > 0 ? `📸 Posts from ${homeSearchText} artists` : '✨ Explore Posts'}
              </h2>
              {postsLoading ? (
                <div className="text-center py-20">
                  <div className="inline-block w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-gray-400 mt-4 text-sm">Loading posts...</p>
                </div>
              ) : displayPosts.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-5xl mb-4">🎭</p>
                  <p className="text-gray-500 text-xl">No posts yet</p>
                </div>
              ) : (
                <MasonryGrid items={displayPosts} onPostClick={setSelectedPost} />
              )}
            </div>
          </div>
        )}

        {/* ════════ EXPLORE TAB ════════ */}
        {activeNav === 'explore' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-8 py-8 bg-white border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">🔍 Explore Talents</h2>
              <p className="text-gray-500 text-sm mb-6">Search for artists, talents and posts</p>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-2xl">🔍</span>
                <input ref={exploreInputRef} type="text" value={exploreSearchText}
                  onChange={(e) => setExploreSearchText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && exploreSearchText) { saveToHistory(exploreSearchText); handleCategoryClick(exploreSearchText); } }}
                  placeholder="Search for Dance, Music, Artist name..."
                  className="w-full pl-16 pr-6 py-5 border-2 border-purple-200 focus:border-purple-500 rounded-3xl focus:outline-none transition text-gray-700 bg-gray-50 text-lg shadow-sm"
                />
                {exploreSearchText && (
                  <button onClick={() => setExploreSearchText('')}
                    className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-2xl">×</button>
                )}
              </div>
              {recentHistory.length > 0 && !exploreSearchText && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">🕐 Recent Searches</p>
                    <button onClick={clearHistory} className="text-xs text-red-400 hover:text-red-600">Clear all</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentHistory.map((term, i) => (
                      <button key={i} onClick={() => { saveToHistory(term); handleCategoryClick(term); }}
                        className="flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-purple-100 hover:text-purple-700 rounded-full text-sm text-gray-600 transition-all">
                        🕐 {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {exploreSearchText && exploreLiveResults.length > 0 && (
                <div className="mt-4 bg-white border border-gray-100 rounded-2xl shadow-lg overflow-hidden">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wide px-4 pt-3 pb-2">🎯 Artists</p>
                  {exploreLiveResults.map((artist) => {
                    const uid = artist.user?._id || artist.user;
                    return (
                      <button key={artist._id} onClick={() => { saveToHistory(artist.fullName); handleViewProfile(uid); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-purple-50 transition-all text-left">
                        <ArtistAvatar profilePicture={artist.profilePicture} name={artist.fullName} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-800 text-sm">{artist.fullName}</p>
                          <p className="text-xs text-gray-500">{artist.talentEmoji} {artist.talentCategory} · {artist.experience} yrs exp</p>
                        </div>
                        <span className="text-xs bg-purple-100 text-purple-600 px-3 py-1 rounded-full font-medium">View →</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            {!exploreSearchText && (
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <p className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-5">✨ Browse by Talent</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {TALENT_CATEGORIES.map((cat, index) => (
                    <button key={cat.name} onClick={() => handleCategoryClick(cat.name)}
                      style={{
                        animation: exploreBounced !== null && index <= exploreBounced ? 'bounceIn 0.4s ease forwards' : 'none',
                        opacity: exploreBounced !== null && index > exploreBounced ? 0 : 1,
                      }}
                      className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl shadow-md hover:shadow-xl hover:scale-105 transition-all group border border-gray-100">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 group-hover:from-purple-200 group-hover:to-indigo-200 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                        {cat.emoji}
                      </div>
                      <span className="text-sm font-bold text-gray-700 group-hover:text-purple-700 transition-colors">{cat.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════ MESSAGES TAB ════════ */}
        {activeNav === 'messages' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-6 py-5 bg-white border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800">💬 Messages</h2>
              <p className="text-gray-500 text-sm mt-1">Your conversations</p>
            </div>
            <div className="flex-1 overflow-y-auto bg-white">
              {messagesLoading ? (
                <div className="text-center py-20">
                  <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-gray-400 mt-4 text-sm">Loading chats...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-5xl mb-4">💬</p>
                  <p className="text-gray-500 text-xl font-semibold">No messages yet</p>
                  <p className="text-gray-400 mt-2 text-sm">Book an artist to start chatting!</p>
                </div>
              ) : (
                // ✅ Already deduplicated in useEffect — one per person
                bookings.map((booking) => {
                  const lastMsg = bookingMessages[booking._id];
                  const otherName = getOtherName(booking);
                  const isMyLastMsg = lastMsg?.sender?.toString() === user?._id?.toString();
                  const unread = msgUnreadCounts[booking._id] || 0;
                  return (
                    <button key={booking._id}
                      onClick={() => {
                        // Clear badge for this chat when opening
                        setMsgUnreadCounts((prev) => ({ ...prev, [booking._id]: 0 }));
                        navigate(`/chat/${booking._id}`);
                      }}
                      className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-all border-b border-gray-100 text-left">
                      <div className="relative flex-shrink-0">
                        <ArtistAvatar
                          profilePicture={user?.role === 'customer' ? booking.artist?.profilePicture : booking.customer?.profilePicture}
                          name={otherName}
                          size="lg"
                        />
                        {/* Per-chat unread dot/badge */}
                        {unread > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow border-2 border-white">
                            {unread > 9 ? '9+' : unread}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className={`text-base truncate ${unread > 0 ? 'font-extrabold text-gray-900' : 'font-bold text-gray-800'}`}>
                            {otherName}
                          </p>
                          {lastMsg?.createdAt && (
                            <span className={`text-xs flex-shrink-0 ml-2 ${unread > 0 ? 'text-red-500 font-bold' : 'text-gray-400'}`}>
                              {formatTime(lastMsg.createdAt)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${unread > 0 ? 'text-gray-800 font-semibold' : 'text-gray-500'}`}>
                            {lastMsg ? `${isMyLastMsg ? 'You: ' : ''}${lastMsg.text}` : 'No messages yet'}
                          </p>
                          {unread > 0 && (
                            <span className="flex-shrink-0 flex items-center gap-1">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                              </span>
                              <span className="text-xs font-bold text-green-600">{unread} new</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ════════ BOOKINGS TAB ════════ */}
        {activeNav === 'bookings' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="px-6 py-5 bg-white border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-800">📅 My Bookings</h2>
              <p className="text-gray-500 text-sm mt-1">Manage your bookings</p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-6">
              {bookingsLoading ? (
                <div className="text-center py-20">
                  <div className="inline-block w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-gray-400 mt-4 text-sm">Loading bookings...</p>
                </div>
              ) : (
                <>
                  {/* Stats Cards */}
                  {/* Stats Cards */}
                  <div className="grid grid-cols-4 gap-4 mb-6 max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl p-5 shadow-md text-center">
                      <p className="text-3xl font-bold text-gray-800">{myBookings.length}</p>
                      <p className="text-gray-500 text-sm mt-1">Total</p>
                    </div>
                    <div className="bg-yellow-50 rounded-2xl p-5 shadow-md text-center">
                      <p className="text-3xl font-bold text-yellow-600">
                        {myBookings.filter((b) => b.status === 'pending').length}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">Pending</p>
                    </div>
                    <div className="bg-green-50 rounded-2xl p-5 shadow-md text-center">
                      <p className="text-3xl font-bold text-green-600">
                        {myBookings.filter((b) => b.status === 'accepted').length}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">Accepted</p>
                    </div>
                    <div className="bg-blue-50 rounded-2xl p-5 shadow-md text-center">
                      <p className="text-3xl font-bold text-blue-600">
                        {myBookings.filter((b) => b.status === 'completed').length}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">Completed</p>
                    </div>
                  </div>

                  {/* ── Sort & Filter Toolbar ── */}
                  {myBookings.length > 0 && (
                    <div className="max-w-3xl mx-auto mb-5 flex flex-wrap items-center gap-3">
                      {/* Sort buttons */}
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Sort</span>
                        <button
                          onClick={() => setBookingSortBy('newest')}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${bookingSortBy === 'newest' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          ↓ Newest
                        </button>
                        <button
                          onClick={() => setBookingSortBy('oldest')}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${bookingSortBy === 'oldest' ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                          ↑ Oldest
                        </button>
                      </div>
                      {/* Filter by status */}
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm flex-wrap">
                        <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">Filter</span>
                        {['all', 'pending', 'accepted', 'rejected', 'completed'].map((s) => (
                          <button
                            key={s}
                            onClick={() => setBookingFilterStatus(s)}
                            className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${bookingFilterStatus === s ? 'bg-purple-600 text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                          >
                            {s === 'all' ? '🗂 All' : s === 'pending' ? '⏳ Pending' : s === 'accepted' ? '✅ Accepted' : s === 'rejected' ? '❌ Rejected' : '🎉 Completed'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {myBookings.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-md max-w-3xl mx-auto">
                      <p className="text-5xl mb-4">🎭</p>
                      <p className="text-gray-500 text-xl">No bookings yet</p>
                    </div>
                  ) : (() => {
                    const filtered = bookingFilterStatus === 'all'
                      ? myBookings
                      : myBookings.filter((b) => b.status === bookingFilterStatus);
                    const sorted = [...filtered].sort((a, b) => {
                      const da = new Date(a.createdAt).getTime();
                      const db = new Date(b.createdAt).getTime();
                      return bookingSortBy === 'newest' ? db - da : da - db;
                    });
                    if (sorted.length === 0) return (
                      <div className="text-center py-16 bg-white rounded-2xl shadow-md max-w-3xl mx-auto">
                        <p className="text-5xl mb-4">🔍</p>
                        <p className="text-gray-500 text-xl">No {bookingFilterStatus} bookings</p>
                        <button onClick={() => setBookingFilterStatus('all')} className="mt-4 text-purple-600 text-sm font-semibold hover:underline">
                          Clear filter
                        </button>
                      </div>
                    );
                    return (
                    <div className="space-y-4 max-w-3xl mx-auto">
                      {sorted.map((booking) => {
                        // ✅ Always route to the FIRST booking's chat for this person
                        const otherId = getOtherId(booking);
                        const firstBooking = myBookings.find((b) => getOtherId(b) === otherId);
                        const chatBookingId = firstBooking?._id || booking._id;

                        return (
                          <div key={booking._id} className="bg-white rounded-2xl shadow-md p-6">
                            <div className="flex items-start justify-between flex-wrap gap-3">
                              <div>
                                <p className="text-sm text-gray-400">
                                  {user?.role === 'customer' ? 'Artist' : 'Customer'}
                                </p>
                                <h3 className="text-lg font-bold text-gray-800">
                                  {user?.role === 'customer' ? booking.artist?.name : booking.customer?.name}
                                </h3>
                                <p className="text-gray-500 text-sm">
                                  {user?.role === 'customer' ? booking.artist?.email : booking.customer?.email}
                                </p>
                              </div>
                              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${STATUS_STYLES[booking.status]}`}>
                                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                              </span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs text-gray-400 uppercase">Event Date</p>
                                <p className="text-gray-700 font-medium mt-0.5">
                                  {new Date(booking.eventDate).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase">Location</p>
                                <p className="text-gray-700 font-medium mt-0.5">{booking.eventLocation}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400 uppercase">Booked On</p>
                                <p className="text-gray-500 text-sm mt-0.5">
                                  {new Date(booking.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                              </div>
                            </div>

                            {booking.message && (
                              <p className="text-gray-600 text-sm mt-3 italic">"{booking.message}"</p>
                            )}

                            {/* Open Chat with unread badge */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <button
                                onClick={() => {
                                  setMsgUnreadCounts((prev) => ({ ...prev, [chatBookingId]: 0 }));
                                  navigate(`/chat/${chatBookingId}`);
                                }}
                                className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 relative"
                              >
                                💬 Open Chat
                                {(msgUnreadCounts[chatBookingId] || 0) > 0 && (
                                  <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                                    <span className="relative flex h-3 w-3">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </span>
                                    <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                                      {msgUnreadCounts[chatBookingId] > 9 ? '9+' : msgUnreadCounts[chatBookingId]} new
                                    </span>
                                  </span>
                                )}
                              </button>
                            </div>

                            {user?.role === 'artist' && String(booking.artist?._id || booking.artist) === String(user._id) && booking.status === 'pending' && (
                              <div className="mt-3 flex gap-3">
                                <button
                                  onClick={() => handleStatusUpdate(booking._id, 'accepted')}
                                  disabled={updatingId === booking._id}
                                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-2.5 rounded-xl transition-all"
                                >
                                  {updatingId === booking._id ? 'Updating...' : '✅ Accept'}
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                                  disabled={updatingId === booking._id}
                                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2.5 rounded-xl transition-all"
                                >
                                  {updatingId === booking._id ? 'Updating...' : '❌ Reject'}
                                </button>
                              </div>
                            )}

                            {user?.role === 'artist' && String(booking.artist?._id || booking.artist) === String(user._id) && booking.status === 'accepted' && (
                              <div className="mt-3">
                                <button
                                  onClick={() => handleStatusUpdate(booking._id, 'completed')}
                                  disabled={updatingId === booking._id}
                                  className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-2.5 rounded-xl transition-all"
                                >
                                  {updatingId === booking._id ? 'Updating...' : '🎉 Mark as Completed'}
                                </button>
                              </div>
                            )}

                            {/* Customer: rate completed bookings (also works when an artist books another artist) */}
                            {String(booking.customer?._id || booking.customer) === String(user._id) && booking.status === 'completed' && (
                              <div className="mt-3">
                                {reviewedBookingIds.has(booking._id) ? (
                                  <div className="w-full flex items-center justify-center gap-2 py-2.5 bg-green-50 text-green-700 font-semibold rounded-xl text-sm">
                                    ✅ Review Submitted
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setReviewModalBooking(booking)}
                                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold py-2.5 rounded-xl transition-all text-sm"
                                  >
                                    ⭐ Leave a Review
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default BrowseArtistsPage;