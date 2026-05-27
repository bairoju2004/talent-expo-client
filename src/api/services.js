import axiosInstance from './axiosInstance';

export const registerUser = (data) => axiosInstance.post('/auth/register', data);
export const loginUser = (data) => axiosInstance.post('/auth/login', data);
export const logoutUser = () => axiosInstance.post('/auth/logout');

// ── Email Verification ──────────────────────────────────────────────────────
export const verifyEmail = (token) => axiosInstance.get(`/auth/verify-email?token=${token}`);
export const resendVerificationEmail = (email) => axiosInstance.post('/auth/resend-verification', { email });

// ── Password Reset ──────────────────────────────────────────────────────────
export const forgotPassword = (email) => axiosInstance.post('/auth/forgot-password', { email });
export const resetPassword = (token, password) => axiosInstance.post('/auth/reset-password', { token, password });

export const createArtistProfile = (data) => axiosInstance.post('/artist/profile', data);
export const getArtistsByTalent = (talent) => axiosInstance.get(`/artist?talent=${talent}`);
export const createCustomerProfile = (data) => axiosInstance.post('/customer/profile', data);
export const getBookingById = (bookingId) => axiosInstance.get(`/bookings/${bookingId}`);
export const createBooking = (data) => axiosInstance.post('/bookings', data);
export const getMyBookings = () => axiosInstance.get('/bookings/my-bookings');
export const getMessages = (bookingId) => axiosInstance.get(`/messages/${bookingId}`);
export const markMessagesRead = (bookingId) => axiosInstance.put(`/messages/${bookingId}/read`);
export const getUnreadCount = (bookingId) => axiosInstance.get(`/messages/${bookingId}/unread`);
export const clearChat = (bookingId) => axiosInstance.delete(`/messages/${bookingId}/clear`);
export const updateBookingStatus = (bookingId, status) => axiosInstance.put(`/bookings/${bookingId}`, { status });

// Customer Profile
export const getCustomerProfile = () => axiosInstance.get('/customer/profile');
export const updateCustomerProfile = (data) => axiosInstance.put('/customer/profile', data);
export const uploadCustomerProfilePicture = (formData) =>
  axiosInstance.put('/customer/profile/picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Artist Profile
export const getArtistProfile = () => axiosInstance.get('/artist/profile');
export const updateArtistProfile = (data) => axiosInstance.put('/artist/profile', data);
export const uploadArtistProfilePicture = (formData) =>
  axiosInstance.put('/artist/profile/picture', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteArtistProfilePicture = () => axiosInstance.delete('/artist/profile/picture');
export const deleteCustomerProfilePicture = () => axiosInstance.delete('/customer/profile/picture');

// Posts
export const uploadPost = (formData) => axiosInstance.post('/posts', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getArtistPosts = (artistId) => axiosInstance.get(`/posts/${artistId}`);
export const deletePost = (postId) => axiosInstance.delete(`/posts/${postId}`);

// Reviews
export const submitReview = (data) => axiosInstance.post('/reviews', data);
export const getArtistReviews = (artistId) => axiosInstance.get(`/reviews/artist/${artistId}`);
export const checkReviewed = (bookingId) => axiosInstance.get(`/reviews/check/${bookingId}`);

// Notifications
export const getNotifications = () => axiosInstance.get('/notifications');
export const getUnreadNotificationCount = () => axiosInstance.get('/notifications/unread-count');
export const markNotificationRead = (id) => axiosInstance.put(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => axiosInstance.put('/notifications/read-all');
export const getUnreadBookingNotificationCount = () => axiosInstance.get('/notifications/unread-booking-count');
export const markBookingNotificationsRead = () => axiosInstance.put('/notifications/read-booking');
