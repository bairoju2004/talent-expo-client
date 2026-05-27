import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getArtistProfile, getCustomerProfile } from '../api/services';

const BASE_URL = 'http://localhost:5000';

// Smart URL resolver: Cloudinary URLs are already full, local paths need BASE_URL prefix
const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
};


function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [profilePic, setProfilePic] = useState(null);

  useEffect(() => {
    if (!user) { setProfilePic(null); return; }
    const fetchProfile = user.role === 'artist' ? getArtistProfile : getCustomerProfile;
    fetchProfile()
      .then((res) => setProfilePic(res.data.profilePicture || null))
      .catch(() => setProfilePic(null));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const profileRoutes = ['/artist/view-profile', '/customer/view-profile'];
    if (profileRoutes.includes(location.pathname)) {
      const fetchProfile = user.role === 'artist' ? getArtistProfile : getCustomerProfile;
      fetchProfile()
        .then((res) => setProfilePic(res.data.profilePicture || null))
        .catch(() => {});
    }
  }, [location.pathname, user]);

  const handleLogout = () => { logout(); navigate('/'); };

  const handleProfileClick = () => {
    if (user?.role === 'artist') navigate('/artist/view-profile');
    else navigate('/customer/view-profile');
  };

  const handleDashboardClick = () => {
    if (!user) navigate('/login');
    else navigate('/browse');
  };

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">

        <Link to="/" className="flex items-center gap-2">
          <span className="text-2xl">🎭</span>
          <span className="text-xl font-extrabold text-purple-700">TalentExpo</span>
        </Link>

        <div className="flex items-center gap-4">
          <button
            onClick={handleDashboardClick}
            className="text-gray-600 hover:text-purple-600 font-medium text-sm transition-colors cursor-pointer"
          >
            Dashboard
          </button>

          {!user && (
            <>
              <Link to="/login" className="text-gray-600 hover:text-purple-600 font-medium text-sm transition-colors">
                Sign In
              </Link>
              <Link to="/register" className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-sm transition-all">
                Get Started
              </Link>
            </>
          )}

          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleProfileClick}
                  className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow hover:ring-2 hover:ring-purple-400 transition-all"
                  title="View Profile"
                >
                  {profilePic
                    ? <img src={resolveUrl(profilePic)} alt={user.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-purple-100 hover:bg-purple-200 flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-700">{user.name?.[0]?.toUpperCase()}</span>
                      </div>
                  }
                </button>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-700">{user.name}</p>
                  <p className="text-xs text-purple-600 capitalize">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;