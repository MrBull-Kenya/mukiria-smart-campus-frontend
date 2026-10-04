import api from './api';

export const authService = {
  async login(email, password) {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },

  async forgotPassword(email) {
    // Matches backend route: /auth/forgot-password-email (or /forgot-password-email depending on your router prefix)
    const response = await api.post('/auth/forgot-password-email', { email });
    return response.data;
  },

  async resetPassword(token, newPassword) {
    // Matches backend route: /auth/reset-password/:token
    const response = await api.post(`/auth/reset-password/${token}`, { password: newPassword });
    return response.data;
  }
};