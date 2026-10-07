import { ROLES } from './campus';

const { STUDENT, REP, TEACHER, HOD, ADMIN } = ROLES;

// Which roles may open which areas. Used by the router (guards) and the top navigation.
export const ACCESS = {
  student: [STUDENT, REP, ADMIN],
  rep: [REP, ADMIN],
  teacher: [TEACHER, ADMIN],
  hod: [HOD, ADMIN],
  admin: [ADMIN],
  campus: [STUDENT, REP, TEACHER, HOD, ADMIN],
};

const studentLinks = [
  { to: '/student/dashboard', label: 'Home' },
  { to: '/scan', label: 'Scan' },
  { to: '/student/rank', label: 'My Rank' },
  { to: '/student/digital-id', label: 'Digital ID' },
  { to: '/student/chat', label: 'Class Chat' },
];
const campusLinks = [
  { to: '/campus/library', label: 'Library' },
  { to: '/campus/games', label: 'Games' },
  { to: '/campus/fees', label: 'Fees' },
];

export const NAV_BY_ROLE = {
  [STUDENT]: [...studentLinks, ...campusLinks],
  [REP]: [
    { to: '/rep/dashboard', label: 'Rep Home' },
    { to: '/rep/generate-qr', label: 'Show QR' },
    { to: '/rep/live-attendance', label: 'Live' },
    { to: '/rep/members', label: 'Members' },
    { to: '/rep/timetable', label: 'Timetable' },
    { to: '/rep/temp-ids', label: 'Temp IDs' },
    { to: '/rep/parent-alerts', label: 'Parent Alerts' },
    { to: '/rep/chat', label: 'Announce' },
    { to: '/rep/weekly-sheet', label: 'Weekly Sheet' },
    { to: '/rep/ministry-export', label: 'Export' },
    ...studentLinks.slice(1, 3),
    ...campusLinks,
  ],
  [TEACHER]: [
    { to: '/teacher/dashboard', label: 'Home' },
    { to: '/teacher/sign-attendance', label: 'Sign Attendance' },
    { to: '/teacher/absenteeism', label: 'Absenteeism' },
    ...campusLinks,
  ],
  [HOD]: [
    { to: '/hod/dashboard', label: 'Home' },
    { to: '/hod/classes', label: 'Classes' },
    { to: '/hod/approve-rep', label: 'Approve Reps' },
    { to: '/hod/timetables', label: 'Timetables' },
    { to: '/hod/weekly-sheets', label: 'Weekly Sheets' },
    { to: '/hod/devices', label: 'Device Locks' },
    { to: '/hod/at-risk', label: 'At-Risk' },
    { to: '/hod/exam-block-list', label: 'Exam Block' },
    { to: '/hod/lost-id-logs', label: 'Lost IDs' },
    { to: '/hod/ministry-reports', label: 'Ministry' },
    ...campusLinks,
  ],
};
// Administrators get their own pages first, then the department/HOD views
NAV_BY_ROLE[ADMIN] = [
  { to: '/admin/dashboard', label: 'Admin Home' },
  { to: '/admin/classes', label: 'Classes' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/settings', label: 'Settings' },
  ...NAV_BY_ROLE[HOD].slice(1),
];
