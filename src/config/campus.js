// Single source of truth for values that were previously copy-pasted across files.

const num = (value, fallback) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
};

export const INSTITUTION = 'Mukiria Technical Training Institute (MTTI)';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api';

export const SOCKET_URL = (() => {
  if (import.meta.env.VITE_SOCKET_URL) return import.meta.env.VITE_SOCKET_URL;
  if (/^https?:/i.test(API_BASE_URL)) return API_BASE_URL.replace(/\/api\/?$/, '');
  return typeof window !== 'undefined' ? window.location.origin : '';
})();

// Campus geofence. The SERVER is the authority (backend/src/config/mttiGPS.js); this copy
// only powers the friendly distance hints in the UI. Keep both in sync.
export const CAMPUS = {
  latitude: num(import.meta.env.VITE_CAMPUS_LAT, -1.123),
  longitude: num(import.meta.env.VITE_CAMPUS_LNG, 37.123),
  radiusMeters: num(import.meta.env.VITE_CAMPUS_RADIUS_M, 300),
};

export const STORAGE_KEYS = {
  token: 'mtt_token',
  user: 'mtt_user',
  deviceId: 'mtt_device_id',
};

// Roles exactly as stored in the database (backend/src/models/User.js)
export const ROLES = {
  STUDENT: 'student',
  REP: 'student_rep',
  TEACHER: 'teacher',
  HOD: 'hod',
  ADMIN: 'admin',
};

export const ROLE_HOME = {
  student: '/student/dashboard',
  student_rep: '/rep/dashboard',
  teacher: '/teacher/dashboard',
  hod: '/hod/dashboard',
  admin: '/admin/dashboard',
};

export const roleLabel = (role) =>
  ({ student: 'Student', student_rep: 'Class Rep', teacher: 'Teacher', hod: 'Head of Department', admin: 'Administrator' }[role] || role);

// The backend derives the admission number from the email local-part (see authController.login),
// and the login response doesn't include adm_no, so we use the same convention here.
export const getAdmNo = (user) => user?.adm_no || (user?.email ? user.email.split('@')[0] : '');
