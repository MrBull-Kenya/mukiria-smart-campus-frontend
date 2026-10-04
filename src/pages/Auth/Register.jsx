import React from 'react';
import { Link } from 'react-router-dom';

const OPTIONS = [
  { to: '/auth/register-student', icon: '🎓', title: 'Student', text: 'Check in to classes, see your attendance and points' },
  { to: '/auth/register-class-rep', icon: '📋', title: 'Class representative', text: 'Run your class QR sessions. Needs HOD approval.' },
  { to: '/auth/register-teacher', icon: '👩‍🏫', title: 'Teacher', text: 'Sign class registers and track absenteeism. Needs Administrator approval.' },
  { to: '/auth/register-hod', icon: '🏫', title: 'Head of Department (HOD)', text: 'Approve reps and timetables, reports and exam eligibility. Needs Administrator approval.' },
  { to: '/auth/register-admin', icon: '🛡️', title: 'Administrator', text: 'Manage classes and staff accounts. The first Administrator is approved automatically.' },
];

export default function Register() {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full space-y-4">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-extrabold text-gray-900">Create an account</h2>
        <p className="text-xs text-gray-500">Who are you registering as?</p>
      </div>
      {OPTIONS.map((o) => (
        <Link key={o.to} to={o.to} className="flex gap-3 items-start border border-gray-200 rounded-xl p-4 hover:border-blue-400 transition">
          <span className="text-2xl">{o.icon}</span>
          <span><span className="block font-bold text-gray-900">{o.title}</span><span className="block text-xs text-gray-500">{o.text}</span></span>
        </Link>
      ))}
      <p className="text-center text-xs text-gray-500">Already registered? <Link to="/login" className="text-blue-600 font-bold hover:underline">Sign in</Link></p>
    </div>
  );
}
