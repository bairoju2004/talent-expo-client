import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';

import ArtistPublicProfilePage from './pages/ArtistPublicProfilePage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ArtistProfilePage from './pages/ArtistProfilePage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import BrowseArtistsPage from './pages/BrowseArtistsPage';
import BookArtistPage from './pages/BookArtistPage';
import ArtistDashboardPage from './pages/ArtistDashboardPage';
import Navbar from './components/Navbar';
import ChatPage from './pages/ChatPage';
import CustomerProfileViewPage from './pages/CustomerProfileViewPage';
import ArtistProfileViewPage from './pages/ArtistProfileViewPage';
import AdminDashboardPage from './pages/AdminDashboardPage';

// ── New auth pages ──────────────────────────────────────────────────────────
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import GoogleAuthCallbackPage from './pages/GoogleAuthCallbackPage';

function AppContent() {
  const location = useLocation();

  const hideNavbar = ['/browse', '/admin'].some(p => location.pathname.startsWith(p));

  return (
    <>
      {!hideNavbar && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/browse" element={<BrowseArtistsPage />} />
        <Route path="/browse-messages" element={<BrowseArtistsPage />} />
        <Route path="/artist/public/:artistId" element={<ArtistPublicProfilePage />} />

        {/* Auth flows */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/auth/google/callback" element={<GoogleAuthCallbackPage />} />

        {/* Artist only */}
        <Route path="/artist/profile" element={
          <ProtectedRoute allowedRoles={['artist']}>
            <ArtistProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/artist/dashboard" element={
          <ProtectedRoute allowedRoles={['artist']}>
            <ArtistDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/artist/view-profile" element={
          <ProtectedRoute allowedRoles={['artist']}>
            <ArtistProfileViewPage />
          </ProtectedRoute>
        } />

        {/* Customer only */}
        <Route path="/customer/profile" element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/customer/view-profile" element={
          <ProtectedRoute allowedRoles={['customer']}>
            <CustomerProfileViewPage />
          </ProtectedRoute>
        } />
        <Route path="/book/:artistId" element={
          <ProtectedRoute allowedRoles={['customer', 'artist']}>
            <BookArtistPage />
          </ProtectedRoute>
        } />

        {/* Both roles */}
        <Route path="/chat/:bookingId" element={
          <ProtectedRoute allowedRoles={['customer', 'artist']}>
            <ChatPage />
          </ProtectedRoute>
        } />

        {/* Admin only */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        } />
      </Routes>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
