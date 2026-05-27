import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axiosInstance';
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

const TYPE_ICON = {
  new_booking:    '📅',
  booking_status: '📅',  //🔔
  new_message:    '💬',
};

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)   return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationCenter({ placement = 'default' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef(null);

  // Fetch notifications from server
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.get('/notifications');
      setNotifications(res.data);
      setUnread(res.data.filter((n) => !n.isRead).length);
    } catch { /* silent */ }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Join personal socket room and listen for real-time notifications
  useEffect(() => {
    if (!user) return;
    socket.emit('joinUserRoom', user._id);

    socket.on('notification', (notif) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 30));
      setUnread((prev) => prev + 1);
    });

    return () => socket.off('notification');
  }, [user]);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await axiosInstance.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* silent */ }
  };

  const deleteNotification = async (notificationId) => {
    try {
      console.log('Deleting notification:', notificationId);
      const response = await axiosInstance.delete(`/notifications/${notificationId}`);
      console.log('Delete response:', response);
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
      setUnread((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error deleting notification:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const clearAllNotifications = async () => {
    try {
      console.log('Clearing all notifications');
      const response = await axiosInstance.delete('/notifications/clear-all');
      console.log('Clear all response:', response);
      setNotifications([]);
      setUnread(0);
    } catch (error) {
      console.error('Error clearing all notifications:', error);
      console.error('Error details:', error.response?.data);
    }
  };

  const handleNotificationClick = async (notif) => {
    // Mark as read
    if (!notif.isRead) {
      try {
        await axiosInstance.put(`/notifications/${notif._id}/read`);
        setNotifications((prev) =>
          prev.map((n) => n._id === notif._id ? { ...n, isRead: true } : n)
        );
        setUnread((prev) => Math.max(0, prev - 1));
      } catch { /* silent */ }
    }
    setOpen(false);

    // Navigate to relevant page
    if (notif.type === 'new_message' && notif.bookingId) {
      navigate(`/chat/${notif.bookingId}`);
    } else if (notif.type === 'new_booking' || notif.type === 'booking_status') {
      navigate('/browse', { state: { activeNav: 'bookings' }, replace: true });
    } else if (notif.bookingId) {
      navigate('/browse', { state: { activeNav: 'bookings' }, replace: true });
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-full hover:bg-purple-50 transition-colors text-2xl"
        title="Notifications"
      >
        🔔

        {/* Unread badge */}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className={`absolute w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden max-h-[70vh] flex flex-col transition-all duration-200 ease-out ${
          placement === 'sidebar'
            ? 'bottom-full mb-2 left-full ml-2'
            : 'bottom-full mb-2 right-0'
        }`}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-purple-600 hover:text-purple-800 font-medium transition-colors"
                >
                  Mark all as read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
                title="Close"
              >
                <span className="text-sm font-bold">×</span>
              </button>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50 min-h-0 notification-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-3xl mb-2">🔔</p>
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`relative group px-4 py-3 flex items-start gap-3 hover:bg-purple-50 transition-colors ${
                    !n.isRead ? 'bg-purple-50/60' : 'bg-white'
                  }`}
                >
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className="flex-1 text-left flex items-start gap-3"
                  >
                    {/* Icon */}
                    <span className="text-xl flex-shrink-0 mt-0.5">{TYPE_ICON[n.type] || '🔔'}</span>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold text-gray-800 leading-tight ${!n.isRead ? 'text-purple-800' : ''}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug line-clamp-2">{n.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>

                    {/* Unread dot */}
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-1.5" />
                    )}
                  </button>

                  {/* Delete button - visible on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n._id);
                    }}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 flex-shrink-0"
                    title="Delete notification"
                  >
                    <span className="text-xs font-bold">×</span>
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Showing last 30 notifications</p>
                <button
                  onClick={clearAllNotifications}
                  className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
                  title="Clear all notifications"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}