import React, { useState } from 'react';
import { downloadFile } from '../../services/download';
import { useAuth } from '../../context/AuthContext';
import { Page, Card, Btn, Notice } from '../../components/ui';

export default function MinistryExport() {
  const { user } = useAuth();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null);
  const get = async (format) => {
    setBusy(format); setMsg(null);
    const r = await downloadFile(`/classrep/ministry-export?format=${format}`, `attendance-${user.class_code}.${format}`);
    setMsg(r.ok ? { kind: 'ok', text: `${format.toUpperCase()} downloaded.` } : { kind: 'error', text: r.message });
    setBusy('');
  };
  return (
    <Page title="Attendance report export" subtitle={`Class ${user.class_code || ''}: every student's attendance and exam status`}>
      <Card className="max-w-md space-y-3">
        <p className="text-sm text-gray-600">Generates the current attendance figures for your whole class. Students under 75% are marked <strong>Barred</strong>.</p>
        <div className="flex gap-2"><Btn onClick={() => get('pdf')} disabled={!!busy}>{busy === 'pdf' ? 'Preparing…' : '⬇ PDF'}</Btn><Btn variant="ghost" onClick={() => get('csv')} disabled={!!busy}>{busy === 'csv' ? 'Preparing…' : '⬇ CSV (Excel)'}</Btn></div>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </Card>
    </Page>
  );
}
