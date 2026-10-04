import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { getAdmNo, INSTITUTION, roleLabel } from '../../config/campus';
import { Page } from '../../components/ui';

export default function DigitalID() {
  const { user } = useAuth();
  const adm = getAdmNo(user);
  return (
    <Page title="Digital student ID">
      <div className="max-w-sm mx-auto bg-gradient-to-br from-blue-700 to-indigo-800 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-80">{INSTITUTION}</p>
        <div>
          <p className="text-2xl font-black leading-tight">{user.name}</p>
          <p className="text-sm opacity-90">{roleLabel(user.role)}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><p className="opacity-70">Admission no.</p><p className="font-bold text-sm">{adm || '—'}</p></div>
          <div><p className="opacity-70">Class</p><p className="font-bold text-sm">{user.class_code || '—'}</p></div>
        </div>
        <div className="bg-white rounded-2xl p-3 flex justify-center">
          <QRCodeSVG value={`MTTI:${adm}:${user.class_code || ''}`} size={140} />
        </div>
        <p className="text-[10px] opacity-70 text-center">Show this at the gate or library. Lost your ID? Request a temporary one from the dashboard.</p>
      </div>
    </Page>
  );
}
