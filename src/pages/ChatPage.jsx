import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { getMessages, markMessagesRead, getBookingById, getArtistProfile, getCustomerProfile, clearChat } from '../api/services';
import { useAuth } from '../context/AuthContext';

const socket = io(import.meta.env.VITE_API_BASE_URL || 'https://talentexpo-production.up.railway.app');
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://talentexpo-production.up.railway.app';

// Smart URL resolver: Cloudinary URLs are already full, local paths need BASE_URL prefix
const resolveUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
};


function ChatPage() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [ownProfilePic, setOwnProfilePic] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const bottomRef = useRef(null);

  // Derive the other person's info from booking
  const otherPerson = booking
    ? user?.role === 'customer' ? booking.artist : booking.customer
    : null;

  const otherName    = otherPerson?.fullName || otherPerson?.name || 'Chat';
  const otherPic     = otherPerson?.profilePicture ? resolveUrl(otherPerson.profilePicture) : null;
  const otherInitial = otherName?.[0]?.toUpperCase() || '?';

  useEffect(() => {
    if (!user) return;
    const fetchOwn = user.role === 'artist' ? getArtistProfile : getCustomerProfile;
    fetchOwn()
      .then((res) => setOwnProfilePic(res.data.profilePicture || null))
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    // Fetch booking to get the other person's profile picture
    getBookingById(bookingId)
      .then((res) => setBooking(res.data))
      .catch(() => {});

    // Load existing messages
    getMessages(bookingId)
      .then((res) => setMessages(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Mark messages as read
    markMessagesRead(bookingId)
      .then(() => socket.emit('readMessages', { bookingId, readBy: user._id }))
      .catch(() => {});

    socket.emit('joinRoom', bookingId);

    socket.on('receiveMessage', (message) => {
      setMessages((prev) => [...prev, message]);
      markMessagesRead(bookingId)
        .then(() => socket.emit('readMessages', { bookingId, readBy: user._id }))
        .catch(() => {});
    });

    socket.on('messagesRead', ({ readBy }) => {
      if (readBy !== user._id) {
        setMessages((prev) =>
          prev.map((m) =>
            m.sender?.toString() === user._id?.toString() ? { ...m, isRead: true } : m
          )
        );
      }
    });

    return () => {
      socket.off('receiveMessage');
      socket.off('messagesRead');
    };
  }, [bookingId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.menu-container')) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    // recipientId = the other person in this booking
    const recipientId = otherPerson?._id;
    socket.emit('sendMessage', {
      bookingId,
      senderId: user._id,
      senderName: user.name,
      text: newMessage.trim(),
      recipientId,
    });
    setNewMessage('');
  };

  const handleClearChat = async () => {
    try {
      await clearChat(bookingId);
      setMessages([]);
      setShowClearConfirm(false);
      setShowMenu(false);
    } catch (error) {
      console.error('Error clearing chat:', error);
      alert('Failed to clear chat. Please try again.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (dateStr) =>
    new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  const ReadReceipt = ({ message }) => {
    const isMyMessage = message.sender?.toString() === user._id?.toString();
    if (!isMyMessage) return null;
    return (
      <span className={`text-xs ml-1 font-bold ${message.isRead ? 'text-blue-400' : 'text-gray-400'}`}>
        {message.isRead ? '✓✓' : '✓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 mt-4">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen bg-gray-100">

      {/* Chat Header - Fixed inside chat page */}
      <div className="absolute top-[72px] left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 shadow-sm z-10">
        <button
          onClick={() => navigate('/browse-messages')}
          className="text-gray-500 hover:text-gray-700 transition-colors text-xl font-bold flex-shrink-0"
        >←</button>

        {/* Other person's avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow">
          {otherPic
            ? <img src={otherPic} alt={otherName} className="w-full h-full object-cover" />
            : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">{otherInitial}</span>
              </div>
          }
        </div>

        <div className="flex-1">
          <h1 className="font-bold text-gray-800 text-base leading-tight">{otherName}</h1>
          <p className="text-xs text-gray-400">{user?.role === 'customer' ? 'Artist' : 'Customer'}</p>
        </div>

        {/* Menu Button */}
        <div className="relative menu-container">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 flex items-center justify-center text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          >
            <span className="text-lg">⋮</span>
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
              <button
                onClick={() => {
                  setShowClearConfirm(true);
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                🗑️ Clear Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="absolute inset-x-0 top-[144px] bottom-[96px] overflow-y-auto px-4 py-4 space-y-2 max-w-3xl w-full mx-auto">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <p className="text-5xl mb-3">👋</p>
            <p className="text-gray-500 font-medium">No messages yet</p>
            <p className="text-gray-400 text-sm mt-1">Say hello to get started!</p>
          </div>
        )}

        {messages.map((msg, index) => {
          const isMe = msg.sender?.toString() === user._id?.toString();
          const showDate = index === 0 ||
            new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();

          return (
            <div key={msg._id}>
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <span className="bg-white text-gray-400 text-xs px-3 py-1 rounded-full shadow-sm border border-gray-100">
                    {new Date(msg.createdAt).toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}

              <div className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>

                {/* Other person avatar — left side */}
                {!isMe && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 shadow mb-1">
                    {otherPic
                      ? <img src={otherPic} alt={otherName} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">{otherInitial}</span>
                        </div>
                    }
                  </div>
                )}

                <div className={`max-w-xs lg:max-w-md flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && (
                    <p className="text-xs text-gray-500 mb-1 ml-1 font-medium">{msg.senderName}</p>
                  )}
                  <div className={`px-4 py-2.5 rounded-2xl shadow-sm ${
                    isMe
                      ? 'bg-purple-600 text-white rounded-br-none'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                  <div className={`flex items-center gap-0.5 mt-1 ${isMe ? 'mr-1' : 'ml-1'}`}>
                    <p className="text-xs text-gray-400">{formatTime(msg.createdAt)}</p>
                    <ReadReceipt message={msg} />
                  </div>
                </div>

                {/* My avatar — right side */}
                {isMe && (
                  <div className="w-7 h-7 rounded-full overflow-hidden flex-shrink-0 shadow mb-1">
                    {ownProfilePic
                      ? <img src={resolveUrl(ownProfilePic)} alt={user?.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                          <span className="text-white text-[10px] font-bold">{user?.name?.[0]?.toUpperCase()}</span>
                        </div>
                    }
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Clear Chat Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Clear Chat</h3>
            <p className="text-gray-600 text-sm mb-6">
              Are you sure you want to clear all messages in this chat? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="absolute left-0 right-0 bottom-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-end gap-3">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition resize-none text-sm bg-gray-50"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="w-12 h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-full flex items-center justify-center transition-all flex-shrink-0 shadow-md"
          >
            <span className="text-lg">➤</span>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2">Press Enter to send · Shift+Enter for new line</p>
      </div>

    </div>
  );
}

export default ChatPage;