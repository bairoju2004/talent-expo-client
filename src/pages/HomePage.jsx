import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // All protected actions redirect to login if not logged in
  const handleProtectedClick = (destination, options) => {
    if (!user) {
      navigate('/login');
    } else {
      navigate(destination, options);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-600">

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 py-24 text-center text-white">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
          Discover & Book<br />
          <span className="text-yellow-300">Amazing Talent</span>
        </h1>
        <p className="text-xl text-purple-200 mb-10 max-w-2xl mx-auto">
          TalentExpo connects event organizers with incredible artists —
          dancers, musicians, comedians, and more.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {/* Browse Artists — requires login */}
          <button
            onClick={() => handleProtectedClick('/browse')}
            className="px-8 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-2xl text-lg transition-all shadow-lg cursor-pointer"
          >
            🔍 Browse Artists
          </button>

          {!user && (
            <Link
              to="/register"
              className="px-8 py-4 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl text-lg transition-all border border-white/30"
            >
              Join as Artist
            </Link>
          )}

          {user && (
            <button
              onClick={() => handleProtectedClick(user.role === 'artist' ? '/artist/dashboard' : '/browse', user.role !== 'artist' ? { state: { activeNav: 'bookings' } } : undefined)}
              className="px-8 py-4 bg-white/20 hover:bg-white/30 text-white font-bold rounded-2xl text-lg transition-all border border-white/30 cursor-pointer"
            >
              My Dashboard →
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="bg-white py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-12">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '🔍', title: 'Discover', desc: 'Browse talented artists filtered by category and experience.' },
              { icon: '📅', title: 'Book', desc: 'Send a booking request directly to your chosen artist.' },
              { icon: '🎉', title: 'Celebrate', desc: 'Your confirmed artist performs at your event. Simple!' },
            ].map((item) => (
              <div key={item.title} className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-purple-50 transition-colors">
                <div className="text-5xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      {!user && (
        <div className="bg-purple-900 text-white py-16 px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Are you a talented artist?</h2>
          <p className="text-purple-300 mb-8 text-lg">Join thousands of artists getting booked through TalentExpo</p>
          <Link to="/register" className="px-10 py-4 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-2xl text-lg transition-all">
            Sign Up as Artist — It's Free
          </Link>
        </div>
      )}
    </div>
  );
}

export default HomePage;