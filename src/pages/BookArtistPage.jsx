import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createBooking } from '../api/services';

function BookArtistPage() {
  const { artistId } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ eventDate: '', eventLocation: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createBooking({ ...formData, artistId });
      setSuccess(true);
      setTimeout(() => navigate('/browse', { state: { activeNav: 'bookings' } }), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Booking failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-10 text-center max-w-md">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-800">Booking Sent!</h2>
          <p className="text-gray-500 mt-2">The artist will review your request soon.</p>
          <p className="text-purple-600 text-sm mt-4">Redirecting to Bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700 mb-6 flex items-center gap-1 text-sm">← Back</button>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Book This Artist</h1>
          <p className="text-gray-500 mt-1">Fill in your event details</p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
            <input type="date" name="eventDate" value={formData.eventDate} onChange={handleChange} required
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Event Location</label>
            <input type="text" name="eventLocation" value={formData.eventLocation} onChange={handleChange}
              placeholder="e.g. Taj Hotel, Mumbai" required
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message to Artist (optional)</label>
            <textarea name="message" value={formData.message} onChange={handleChange}
              placeholder="Tell the artist about your event..." rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-all text-lg">
            {loading ? 'Sending...' : 'Send Booking Request'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default BookArtistPage;