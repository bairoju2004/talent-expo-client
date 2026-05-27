import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArtistProfile } from '../api/services';

const TALENT_CATEGORIES = ['Dance', 'Music', 'Comedy', 'Magic', 'Acting', 'Singing', 'Photography', 'Painting', 'DJ', 'Other'];

function ArtistProfilePage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ fullName: '', talentCategory: '', experience: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createArtistProfile(formData);
      navigate('/browse');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Set Up Your Artist Profile</h1>
          <p className="text-gray-500 mt-1">Tell customers about your talent</p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} placeholder="e.g. Priya Sharma" required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Talent Category</label>
            <select name="talentCategory" value={formData.talentCategory} onChange={handleChange} required className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition bg-white">
              <option value="">Select your talent...</option>
              {TALENT_CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
            <input type="number" name="experience" value={formData.experience} onChange={handleChange} placeholder="e.g. 5" required min="0" max="50" className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">About You</label>
            <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Describe your talent..." rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 transition resize-none" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold py-3 rounded-xl transition-all text-lg">
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
export default ArtistProfilePage;