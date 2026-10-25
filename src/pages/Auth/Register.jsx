import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/ui';

const OPTIONS = [
  { to: '/auth/register-student', icon: 'graduation', title: 'Trainee', text: 'Check in to classes, see your attendance and points', group: 'Learner accounts', approval: 'Self-service' },
  { to: '/auth/register-class-rep', icon: 'clipboard', title: 'Class representative', text: 'Run your class QR sessions.', group: 'Learner accounts', approval: 'HOD approval' },
  { to: '/auth/register-teacher', icon: 'pen', title: 'Trainer', text: 'Sign class registers and track absenteeism.', group: 'Campus staff', approval: 'Admin approval' },
  { to: '/auth/register-hod', icon: 'school', title: 'Head of Department (HOD)', text: 'Manage class representatives, timetables and department reports.', group: 'Campus staff', approval: 'Admin approval' },
  { to: '/auth/register-admin', icon: 'settings', title: 'Administrator', text: 'Manage classes and staff accounts.', group: 'Campus staff', approval: 'Approval may be required' },
];

export default function Register() {
  const groups = ['Learner accounts', 'Campus staff'];

  return (
    <div className="w-full space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-950/[0.05] sm:p-7">
      <header className="space-y-1 text-center">
        <h2 className="text-2xl font-extrabold tracking-tight text-blue-800">Create an account</h2>
        <p className="text-sm text-slate-500">Choose the account type that matches your role.</p>
      </header>
      {groups.map((group) => (
        <section key={group} aria-labelledby={`registration-${group.replaceAll(' ', '-').toLowerCase()}`}>
          <h3 id={`registration-${group.replaceAll(' ', '-').toLowerCase()}`} className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{group}</h3>
          <div className="space-y-2">
            {OPTIONS.filter((option) => option.group === group).map((option) => (
              <Link key={option.to} to={option.to} className="group flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-blue-300 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 sm:p-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-800 transition-colors group-hover:bg-blue-100"><Icon name={option.icon} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-slate-900">{option.title}</span>
                  <span className="mt-0.5 block text-xs leading-5 text-slate-500">{option.text}</span>
                  <span className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{option.approval}</span>
                </span>
                <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700">
                  <path d="m7.5 4.5 5.5 5.5-5.5 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <p className="text-center text-sm text-slate-500">Already registered? <Link to="/login" className="font-bold text-blue-800 hover:underline">Sign in</Link></p>
    </div>
  );
}
