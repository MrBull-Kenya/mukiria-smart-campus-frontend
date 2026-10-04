import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const APPROVER = { student_rep: 'the HOD', teacher: 'an Administrator', hod: 'an Administrator', admin: 'an existing Administrator' };

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const pending = params.get('status') === 'pending';
  const approver = APPROVER[params.get('role')] || 'the HOD'; // class reps (no role param) are approved by the HOD
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 w-full space-y-5 text-center">
      <div className="text-4xl">{pending ? '⏳' : '✅'}</div>
      <h2 className="text-2xl font-extrabold text-gray-900">{pending ? 'Waiting for approval' : 'Account created'}</h2>
      <p className="text-sm text-gray-600">
        {pending
          ? <>Your account for <strong>{params.get('email')}</strong> must be approved by <strong>{approver}</strong> before you can sign in.</>
          : <>You can now sign in with <strong>{params.get('email')}</strong>.</>}
      </p>
      <Link to="/login" className="block w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition">Go to sign in</Link>
    </div>
  );
}
