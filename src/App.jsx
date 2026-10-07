import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, PublicOnly, HomeRedirect } from './components/routing/ProtectedRoute';
import AuthLayout from './components/layout/AuthLayout';
import AppLayout from './components/layout/AppLayout';
import { ACCESS } from './config/navigation';
import { ROLE_HOME } from './config/campus';

// Pages are code-split so a student on a weak connection doesn't download the HOD screens.
const page = (loader) => lazy(loader);

// Auth
const Login = page(() => import('./pages/Auth/Login'));
const Register = page(() => import('./pages/Auth/Register'));
const RegisterStudent = page(() => import('./pages/Auth/RegisterStudent'));
const RegisterClassRep = page(() => import('./pages/Auth/RegisterClassRep'));
const VerifyEmail = page(() => import('./pages/Auth/VerifyEmail'));
const ForgotPassword = page(() => import('./pages/Auth/ForgotPassword'));
const ResetPassword = page(() => import('./pages/Auth/ResetPassword'));
const RegisterTeacher = page(() => import('./pages/Auth/RegisterTeacher'));
const RegisterHod = page(() => import('./pages/Auth/RegisterHod'));
const RegisterAdmin = page(() => import('./pages/Auth/RegisterAdmin'));
// Student
const StudentDashboard = page(() => import('./pages/student/Dashboard'));
const ScanAttendance = page(() => import('./pages/student/ScanAttendance'));
const MyRank = page(() => import('./pages/student/MyRank'));
const MyHistory = page(() => import('./pages/student/MyHistory'));
const DigitalID = page(() => import('./pages/student/DigitalID'));
const ExamEligibility = page(() => import('./pages/student/ExamEligibility'));
const RequestTempID = page(() => import('./pages/student/RequestTempID'));
const StudentChat = page(() => import('./pages/student/ClassChat'));
// Class rep
const RepDashboard = page(() => import('./pages/classrep/Dashboard'));
const GenerateQR = page(() => import('./pages/classrep/GenerateQR'));
const LiveAttendance = page(() => import('./pages/classrep/LiveAttendance'));
const MyClassMembers = page(() => import('./pages/classrep/MyClassMembers'));
const TimetableManager = page(() => import('./pages/classrep/TimetableManager'));
const ApproveTempID = page(() => import('./pages/classrep/ApproveTempID'));
const MinistryExport = page(() => import('./pages/classrep/MinistryExport'));
const ClassChatAdmin = page(() => import('./pages/classrep/ClassChatAdmin'));
const LeaderboardManager = page(() => import('./pages/classrep/LeaderboardManager'));
const OfflineSync = page(() => import('./pages/classrep/OfflineSync'));
const RepWeeklySheet = page(() => import('./pages/classrep/WeeklySheet'));
const ParentAlerts = page(() => import('./pages/classrep/ParentAlerts'));
// Teacher
const TeacherDashboard = page(() => import('./pages/teacher/Dashboard'));
const SignAttendance = page(() => import('./pages/teacher/SignAttendance'));
const MySubjectsAbsenteeism = page(() => import('./pages/teacher/MySubjectsAbsenteeism'));
// HOD
const HodDashboard = page(() => import('./pages/hod/Dashboard'));
const AllClasses = page(() => import('./pages/hod/AllClasses'));
const ApproveClassRep = page(() => import('./pages/hod/ApproveClassRep'));
const AtRiskStudents = page(() => import('./pages/hod/AtRiskStudents'));
const ExamBlockList = page(() => import('./pages/hod/ExamBlockList'));
const FinalReports = page(() => import('./pages/hod/FinalReports'));
const LostIDLogs = page(() => import('./pages/hod/LostIDLogs'));
const MinistryReports = page(() => import('./pages/hod/MinistryReports'));
const TimetableApprovals = page(() => import('./pages/hod/TimetableApprovals'));
const HodWeeklySheets = page(() => import('./pages/hod/WeeklySheets'));
const HodDevices = page(() => import('./pages/hod/Devices'));
// Administrator
const AdminDashboard = page(() => import('./pages/admin/Dashboard'));
const AdminClasses = page(() => import('./pages/admin/Classes'));
const AdminStaff = page(() => import('./pages/admin/Staff'));
const AdminSettings = page(() => import('./pages/admin/Settings'));
// Campus (all roles)
const LibraryCheckin = page(() => import('./pages/campus/LibraryCheckin'));
const GamesAttendance = page(() => import('./pages/campus/GamesAttendance'));
const FeesClearance = page(() => import('./pages/campus/FeesClearance'));

const Fallback = () => (
  <div className="flex items-center justify-center p-16">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

function Unauthorized() {
  const { user } = useAuth();
  return (
    <div className="max-w-md mx-auto p-10 text-center space-y-3">
      <h1 className="text-xl font-black text-rose-600">Access denied</h1>
      <p className="text-sm text-gray-600">Your account doesn't have permission to open that page.</p>
      <Link to={ROLE_HOME[user?.role] || '/login'} className="inline-block text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg">Go to my dashboard</Link>
    </div>
  );
}

const NotFound = () => (
  <div className="max-w-md mx-auto p-10 text-center space-y-3">
    <h1 className="text-xl font-black text-gray-900">Page not found</h1>
    <Link to="/" className="inline-block text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-lg">Back to home</Link>
  </div>
);

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />

            {/* Public (redirects to your dashboard when already signed in) */}
            <Route element={<PublicOnly />}>
              <Route element={<AuthLayout />}>
                <Route path="/login" element={<Login />} />
                <Route path="/auth/login" element={<Navigate to="/login" replace />} />
                <Route path="/auth/register" element={<Register />} />
                <Route path="/auth/register-student" element={<RegisterStudent />} />
                <Route path="/auth/register-class-rep" element={<RegisterClassRep />} />
                <Route path="/auth/register-teacher" element={<RegisterTeacher />} />
                <Route path="/auth/register-hod" element={<RegisterHod />} />
                <Route path="/auth/register-admin" element={<RegisterAdmin />} />
                <Route path="/auth/verify-email" element={<VerifyEmail />} />
                <Route path="/auth/forgot-password" element={<ForgotPassword />} />
                <Route path="/auth/reset-password" element={<ResetPassword />} />
              </Route>
            </Route>

            {/* Signed-in area */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/unauthorized" element={<Unauthorized />} />

                <Route element={<ProtectedRoute roles={ACCESS.campus} />}>
                  <Route path="/campus/library" element={<LibraryCheckin />} />
                  <Route path="/campus/games" element={<GamesAttendance />} />
                  <Route path="/campus/fees" element={<FeesClearance />} />
                </Route>

                <Route element={<ProtectedRoute roles={ACCESS.student} />}>
                  <Route path="/scan" element={<ScanAttendance />} />
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/rank" element={<MyRank />} />
                  <Route path="/student/history" element={<MyHistory />} />
                  <Route path="/student/digital-id" element={<DigitalID />} />
                  <Route path="/student/exam-eligibility" element={<ExamEligibility />} />
                  <Route path="/student/request-temp-id" element={<RequestTempID />} />
                  <Route path="/student/chat" element={<StudentChat />} />
                </Route>

                <Route element={<ProtectedRoute roles={ACCESS.rep} />}>
                  <Route path="/rep/dashboard" element={<RepDashboard />} />
                  <Route path="/rep/generate-qr" element={<GenerateQR />} />
                  <Route path="/rep/live-attendance" element={<LiveAttendance />} />
                  <Route path="/rep/members" element={<MyClassMembers />} />
                  <Route path="/rep/timetable" element={<TimetableManager />} />
                  <Route path="/rep/temp-ids" element={<ApproveTempID />} />
                  <Route path="/rep/ministry-export" element={<MinistryExport />} />
                  <Route path="/rep/weekly-sheet" element={<RepWeeklySheet />} />
                  <Route path="/rep/chat" element={<ClassChatAdmin />} />
                  <Route path="/rep/leaderboard" element={<LeaderboardManager />} />
                  <Route path="/rep/offline-sync" element={<OfflineSync />} />
                  <Route path="/rep/parent-alerts" element={<ParentAlerts />} />
                </Route>

                <Route element={<ProtectedRoute roles={ACCESS.teacher} />}>
                  <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                  <Route path="/teacher/sign-attendance" element={<SignAttendance />} />
                  <Route path="/teacher/absenteeism" element={<MySubjectsAbsenteeism />} />
                </Route>

                <Route element={<ProtectedRoute roles={ACCESS.admin} />}>
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/classes" element={<AdminClasses />} />
                  <Route path="/admin/staff" element={<AdminStaff />} />
                  <Route path="/admin/settings" element={<AdminSettings />} />
                </Route>

                <Route element={<ProtectedRoute roles={ACCESS.hod} />}>
                  <Route path="/hod/dashboard" element={<HodDashboard />} />
                  <Route path="/hod/classes" element={<AllClasses />} />
                  <Route path="/hod/approve-rep" element={<ApproveClassRep />} />
                  <Route path="/hod/at-risk" element={<AtRiskStudents />} />
                  <Route path="/hod/exam-block-list" element={<ExamBlockList />} />
                  <Route path="/hod/final-reports" element={<FinalReports />} />
                  <Route path="/hod/lost-id-logs" element={<LostIDLogs />} />
                  <Route path="/hod/ministry-reports" element={<MinistryReports />} />
                  <Route path="/hod/timetables" element={<TimetableApprovals />} />
                  <Route path="/hod/weekly-sheets" element={<HodWeeklySheets />} />
                  <Route path="/hod/devices" element={<HodDevices />} />
                </Route>
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
