import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings, getUnreadCount } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  accepted:  'bg-green-100 text-green-800 border-green-200',
  rejected:  'bg-red-100 text-red-800 border-red-200',
  completed: 'bg-blue-100 text-blue-800 border-blue-200',
};

function MyBookingsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyBookings()
      .then(async (res) => {
        setBookings(res.data);

        // Fetch unread count for each booking
        const counts = {};
        await Promise.all(
          res.data.map(async (booking) => {
            try {
              const r = await getUnreadCount(booking._id);
              counts[booking._id] = r.data.count;
            } catch {
              counts[booking._id] = 0;
            }
          })
        );
        setUnreadCounts(counts);

        // Join all booking rooms to listen for new messages
        res.data.forEach((booking) => {
          socket.emit('joinRoom', booking._id);
        });
      })
      .catch(() => setError('Failed to load bookings.'))
      .finally(() => setLoading(false));

    // Listen for new messages on any booking
    socket.on('receiveMessage', (message) => {
      // Only increment if the message is NOT from me
      if (message.sender?.toString() !== user._id?.toString()) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.bookingId]: (prev[message.bookingId] || 0) + 1,
        }));
      }
    });

    return () => {
      socket.off('receiveMessage');
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 mt-4">Loading bookings...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">My Bookings</h1>
          <p className="text-gray-500 mt-1">Track all your booking requests</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-md">
            <p className="text-5xl mb-4">📋</p>
            <p className="text-gray-500 text-xl">No bookings yet</p>
            <p className="text-gray-400 mt-2">Browse artists and make your first booking!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking._id} className="bg-white rounded-2xl shadow-md p-6">

                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-400 mb-0.5">
                      {user?.role === 'customer' ? 'Artist' : 'Customer'}
                    </p>
                    <h3 className="text-lg font-bold text-gray-800">
                      {user?.role === 'customer' ? booking.artist?.name : booking.customer?.name}
                    </h3>
                    <p className="text-gray-500 text-sm">
                      {user?.role === 'customer' ? booking.artist?.email : booking.customer?.email}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full border ${STATUS_STYLES[booking.status]}`}>
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
                </div>

                {booking.message && (
                  <p className="text-gray-600 text-sm mt-3 italic">"{booking.message}"</p>
                )}

                {/* Chat Button with new message popup */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => {
                      // Clear unread count when opening chat
                      setUnreadCounts((prev) => ({ ...prev, [booking._id]: 0 }));
                      navigate(`/chat/${booking._id}`);
                    }}
                    className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 relative"
                  >
                    💬 Open Chat

                    {/* Pulsing new message notification */}
                    {unreadCounts[booking._id] > 0 && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        {/* Pulsing dot */}
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        {/* Count badge */}
                        <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCounts[booking._id] > 9 ? '9+' : unreadCounts[booking._id]} new
                        </span>
                      </span>
                    )}
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBookingsPage;