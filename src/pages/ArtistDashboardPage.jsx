import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getMyBookings, updateBookingStatus, getUnreadCount } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-800',
  accepted:  'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

function ArtistDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  // Unread message counts per booking
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    getMyBookings()
      .then(async (res) => {
        setBookings(res.data);

        // Fetch initial unread counts for each booking
        const counts = {};
        await Promise.all(
          res.data.map(async (b) => {
            try {
              const r = await getUnreadCount(b._id);
              counts[b._id] = r.data.count;
            } catch { counts[b._id] = 0; }
          })
        );
        setUnreadCounts(counts);

        // Join all booking rooms to receive real-time messages
        res.data.forEach((b) => socket.emit('joinRoom', b._id));
      })
      .finally(() => setLoading(false));

    // Listen for new messages — increment badge if message is from the other person
    socket.on('receiveMessage', (message) => {
      if (message.sender?.toString() !== user?._id?.toString()) {
        setUnreadCounts((prev) => ({
          ...prev,
          [message.bookingId]: (prev[message.bookingId] || 0) + 1,
        }));
      }
    });

    return () => socket.off('receiveMessage');
  }, []);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    setUpdatingId(bookingId);
    try {
      await updateBookingStatus(bookingId, newStatus);
      setBookings((prev) =>
        prev.map((b) => b._id === bookingId ? { ...b, status: newStatus } : b)
      );
    } catch { alert('Failed to update.'); }
    finally { setUpdatingId(null); }
  };

  const handleOpenChat = (bookingId) => {
    // Clear badge when opening chat
    setUnreadCounts((prev) => ({ ...prev, [bookingId]: 0 }));
    navigate(`/chat/${bookingId}`);
  };

  const stats = {
    total:     bookings.length,
    pending:   bookings.filter((b) => b.status === 'pending').length,
    accepted:  bookings.filter((b) => b.status === 'accepted').length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="inline-block w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-500 mt-1">Manage your bookings</p>
          </div>
          <button
            onClick={() => navigate('/artist/view-profile')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl transition-all"
          >
            👤 View Profile
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-md text-center">
            <p className="text-3xl font-bold text-gray-800">{stats.total}</p>
            <p className="text-gray-500 text-sm mt-1">Total</p>
          </div>
          <div className="bg-yellow-50 rounded-2xl p-5 shadow-md text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
            <p className="text-gray-500 text-sm mt-1">Pending</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-5 shadow-md text-center">
            <p className="text-3xl font-bold text-green-600">{stats.accepted}</p>
            <p className="text-gray-500 text-sm mt-1">Accepted</p>
          </div>
          <div className="bg-blue-50 rounded-2xl p-5 shadow-md text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.completed}</p>
            <p className="text-gray-500 text-sm mt-1">Completed</p>
          </div>
        </div>

        {/* Bookings */}
        {bookings.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-md">
            <p className="text-5xl mb-4">🎭</p>
            <p className="text-gray-500 text-xl">No bookings yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const unread = unreadCounts[booking._id] || 0;
              return (
                <div key={booking._id} className="bg-white rounded-2xl shadow-md p-6">

                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <p className="text-sm text-gray-400">Customer</p>
                      <h3 className="text-lg font-bold text-gray-800">{booking.customer?.name}</h3>
                      <p className="text-gray-500 text-sm">{booking.customer?.email}</p>
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
                  </div>

                  {booking.message && (
                    <p className="text-gray-600 text-sm mt-3 italic">"{booking.message}"</p>
                  )}

                  {/* Open Chat button with unread badge */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenChat(booking._id)}
                      className="w-full bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 relative"
                    >
                      💬 Open Chat

                      {/* Pulsing new message notification */}
                      {unread > 0 && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                          </span>
                          <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                            {unread > 9 ? '9+' : unread} new
                          </span>
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Accept / Reject for pending bookings */}
                  {booking.status === 'pending' && (
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

                  {/* Mark as Completed for accepted bookings */}
                  {booking.status === 'accepted' && (
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

                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}

export default ArtistDashboardPage;