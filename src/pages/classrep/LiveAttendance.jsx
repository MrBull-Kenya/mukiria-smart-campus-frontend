import React, { useEffect } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import { Page, Async, Table, Badge, Stat, statusTone, Notice } from '../../components/ui';

export default function LiveAttendance() {
  const { user } = useAuth();
  const state = useFetch('/classrep/live-logs', { pollMs: 8000 });

  useEffect(() => {
    if (!user.class_code) return undefined;
    const socket = getSocket();
    socket.emit('join_class', user.class_code);
    const bump = () => state.reload(true);
    socket.on('attendance_update', bump);
    return () => socket.off('attendance_update', bump);
  }, [user.class_code]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Page title="Live attendance" subtitle="Updates as students check in">
      <Async state={state}>
        {(d) => !d.session ? <Notice kind="info">No session has been held yet. Start one from the Attendance QR page.</Notice> : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Session" value={d.session.unit} hint={`${d.session.active ? 'In progress' : 'Ended'} · started ${d.session.startedAt}`} />
              <Stat label="Checked in" value={d.logs.length} tone="green" />
              <Stat label="Still missing" value={Math.max(0, d.total - d.logs.length)} tone="red" />
            </div>
            <Table rows={d.logs} empty="Nobody has checked in yet." columns={[
              { key: 'time', label: 'Time' }, { key: 'name', label: 'Student' }, { key: 'adm', label: 'Adm no' },
              { key: 'status', label: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{r.status}</Badge> },
              { key: 'offline', label: 'Via', render: (r) => (r.method === 'manual' ? `Marked by rep${r.recordedBy ? ` · ${r.recordedBy}` : ''}` : r.offline ? 'Offline sync' : 'Live') },
            ]} />
          </>
        )}
      </Async>
    </Page>
  );
}
