import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getArtistPosts, getArtistReviews } from '../api/services';
import axiosInstance from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';

const BASE_URL = 'http://localhost:5000';

// Smart URL resolver: Cloudinary URLs are already full, local paths need BASE_URL prefix
const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
};

function StarDisplay({ value, size = 'sm' }) {
  const sizes = { sm: 'text-sm', md: 'text-lg', lg: 'text-2xl' };
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`${sizes[size]} ${s <= value ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
    </div>
  );
}

function RatingBar({ star, count, total }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-4 text-right">{star}</span>
      <span className="text-yellow-400 text-xs">★</span>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-yellow-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-6">{count}</span>
    </div>
  );
}

function ArtistPublicProfilePage() {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('posts');
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [reviewStats, setReviewStats] = useState({ avgRating: null, total: 0, distribution: {} });
  const [reviewsLoading, setReviewsLoading] = useState(false);

  useEffect(() => {
    axiosInstance.get(`/artist/public/${artistId}`)
      .then((res) => setProfile(res.data))
      .catch(() => setProfileError('Failed to load profile'));
    getArtistPosts(artistId)
      .then((res) => setPosts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [artistId]);

  useEffect(() => {
    if (activeTab !== 'reviews') return;
    setReviewsLoading(true);
    getArtistReviews(artistId)
      .then((res) => {
        setReviews(res.data.reviews);
        setReviewStats({ avgRating: res.data.avgRating, total: res.data.total, distribution: res.data.distribution });
      })
      .catch(() => {})
      .finally(() => setReviewsLoading(false));
  }, [activeTab, artistId]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="inline-block w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
    </div>
  );

  const avatarLetter = profile?.fullName?.[0]?.toUpperCase() || profile?.user?.name?.[0]?.toUpperCase() || '?';
  const displayName = profile?.fullName || profile?.user?.name || 'Artist';
  const avatarSrc = profile?.profilePicture ? resolveUrl(profile.profilePicture) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-purple-600 to-indigo-600 pt-10 pb-0 px-4">
        <div className="max-w-4xl mx-auto">
          <button onClick={() => navigate(-1)} className="text-white/70 hover:text-white text-sm mb-4 flex items-center gap-1 transition-colors">
            ← Back
          </button>

          <div className="flex items-end gap-5">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/40 flex-shrink-0 mb-4 shadow-lg bg-white/20">
              {avatarSrc
                ? <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center"><span className="text-4xl font-bold text-white">{avatarLetter}</span></div>
              }
            </div>
            <div className="text-white pb-4">
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {profile?.talentCategory && (
                  <span className="px-3 py-0.5 bg-white/20 rounded-full text-xs font-semibold">🎨 {profile.talentCategory}</span>
                )}
                {profile?.experience && (
                  <span className="px-3 py-0.5 bg-white/20 rounded-full text-xs font-semibold">✨ {profile.experience} yrs exp</span>
                )}
              </div>
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
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === tab.key ? 'text-white border-b-2 border-white' : 'text-purple-300 hover:text-white'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">

        {/* POSTS TAB */}
        {activeTab === 'posts' && (
          <div>
            {posts.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-2xl shadow-md">
                <p className="text-5xl mb-4">🎭</p>
                <p className="text-gray-500 text-xl">No posts yet</p>
                <p className="text-gray-400 mt-2">This artist hasn't uploaded anything yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {posts.map((post) => {
                  const cover = post.files?.[0] || { url: post.fileUrl, fileType: post.fileType };
                  const isCarousel = post.files?.length > 1;
                  return (
                    <div key={post._id} className="relative group rounded-2xl overflow-hidden shadow-md bg-black aspect-square cursor-pointer">
                      {cover.fileType === 'video'
                        ? <video src={resolveUrl(cover.url)} className="w-full h-full object-contain" controls />
                        : <img src={resolveUrl(cover.url)} alt={post.caption} className="w-full h-full object-cover" />
                      }
                      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm rounded-full pl-0.5 pr-2 py-0.5">
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 shadow">
                          {avatarSrc
                            ? <img src={avatarSrc} alt={displayName} className="w-full h-full object-cover" />
                            : <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center"><span className="text-white text-[9px] font-bold">{avatarLetter}</span></div>
                          }
                        </div>
                        <span className="text-white text-[10px] font-semibold truncate max-w-[70px]">{displayName}</span>
                      </div>
                      {isCarousel && <span className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">⧉ {post.files.length}</span>}
                      {cover.fileType === 'video' && <span className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">🎥 Video</span>}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-2 p-3">
                        {post.caption && <p className="text-white text-xs text-center line-clamp-3">{post.caption}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* REVIEWS TAB */}
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
                <p className="text-gray-400 mt-2 text-sm">Be the first to review after booking!</p>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className="bg-white rounded-2xl shadow-md p-6">
                  <h2 className="text-lg font-bold text-gray-800 mb-5">Rating Summary</h2>
                  <div className="flex gap-8 items-start">
                    <div className="text-center flex-shrink-0">
                      <p className="text-6xl font-extrabold text-gray-800 leading-none">{reviewStats.avgRating}</p>
                      <div className="flex justify-center mt-2">
                        <StarDisplay value={Math.round(reviewStats.avgRating)} size="md" />
                      </div>
                      <p className="text-sm text-gray-400 mt-1">{reviewStats.total} review{reviewStats.total !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      {[5, 4, 3, 2, 1].map((star) => (
                        <RatingBar key={star} star={star} count={reviewStats.distribution[star] || 0} total={reviewStats.total} />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Review cards */}
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
                          <div className="mt-1"><StarDisplay value={review.rating} size="sm" /></div>
                          {review.comment && <p className="text-gray-600 text-sm mt-3 leading-relaxed">{review.comment}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-2xl shadow-md p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">About the Artist</h2>
            {profileError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">{profileError}</div>}
            <div className="space-y-4">
              {[
                { icon: '👤', label: 'Artist Name', value: profile?.fullName },
                { icon: '🎨', label: 'Talent',       value: profile?.talentCategory },
                { icon: '✨', label: 'Experience',   value: profile?.experience ? `${profile.experience} years` : null },
                { icon: '📝', label: 'About',        value: profile?.description },
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
            {user && user._id?.toString() !== artistId?.toString() && (
              <button onClick={() => navigate(`/book/${artistId}`)} className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all">
                📅 Book This Artist
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

export default ArtistPublicProfilePage;