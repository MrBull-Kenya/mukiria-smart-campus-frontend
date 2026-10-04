import React, { useRef, useState } from 'react';
import api, { getErrorMessage } from '../../services/api';
import { useFetch } from '../../hooks/useFetch';
import FileActions, { fmtSize } from '../../components/FileActions';
import { Page, Async, Table, Badge, Btn, Card, Notice, statusTone } from '../../components/ui';

const MAX_BYTES = 10 * 1024 * 1024; // keep in step with the server limit

export default function TimetableManager() {
  const state = useFetch('/classrep/timetable');
  const fileRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  const onPick = (e) => {
    const f = e.target.files?.[0] || null;
    setPicked(f); setMsg(null);
    if (f && f.size > MAX_BYTES) setMsg({ kind: 'error', text: `That file is ${fmtSize(f.size)}. The limit is 10 MB.` });
  };

  const upload = async (e) => {
    e.preventDefault();
    if (!picked) return setMsg({ kind: 'warn', text: 'Choose a file first.' });
    if (picked.size > MAX_BYTES) return setMsg({ kind: 'error', text: `That file is ${fmtSize(picked.size)}. The limit is 10 MB.` });
    setBusy(true); setMsg(null);
    try {
      const fd = new FormData(); fd.append('file', picked);
      const res = await api.post('/classrep/timetable/upload', fd);
      setMsg({ kind: 'ok', text: res.data.message + (res.data.skipped ? ` (${res.data.skipped} CSV row(s) didn't match the lesson format and were skipped.)` : '') });
      setPicked(null); if (fileRef.current) fileRef.current.value = '';
      state.reload(true);
    } catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
    setBusy(false);
  };

  const notify = async () => {
    try { await api.post('/classrep/announcements', { message: '🗓️ The class timetable has been updated. Please check it.' }); setMsg({ kind: 'ok', text: 'Class notified.' }); }
    catch (err) { setMsg({ kind: 'error', text: getErrorMessage(err) }); }
  };

  return (
    <Page title="Timetable" subtitle="Upload your timetable in any format; the HOD approves it before it is final">
      <Card className="max-w-xl space-y-3">
        <form onSubmit={upload} className="space-y-3">
          <p className="text-xs text-gray-600">
            Upload <strong>any file</strong>: a PDF, a photo or screenshot (PNG, JPEG), Word or Excel, CSV, or anything else (up to 10 MB).
            A CSV with columns <code className="bg-gray-100 px-1 rounded">day, start, end, unit, venue, lecturer</code> is also turned into a lesson table below.
          </p>
          <input ref={fileRef} type="file" onChange={onPick} className="text-xs block w-full" />
          {picked && <p className="text-[11px] text-gray-500">Selected: <strong>{picked.name}</strong> ({fmtSize(picked.size)})</p>}
          <div className="flex gap-2"><Btn type="submit" disabled={busy || !picked}>{busy ? 'Uploading…' : 'Upload for approval'}</Btn><Btn type="button" variant="ghost" onClick={notify}>Notify class of update</Btn></div>
        </form>
        {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}
      </Card>

      <Async state={state}>
        {(d) => !d.version ? <Notice kind="info">No timetable uploaded yet.</Notice> : (
          <>
            <Card className="space-y-2">
              <p className="text-sm text-gray-700">
                Latest upload ({d.version.uploaded}): <strong>{d.version.term}</strong> <Badge tone={statusTone(d.version.status)}>{d.version.status}</Badge>
                {d.version.comment ? <span className="text-xs text-gray-500"> · HOD: {d.version.comment}</span> : null}
              </p>
              {d.version.file && (
                <p className="text-sm text-gray-700 flex flex-wrap items-center gap-3">
                  <span>📎 <strong>{d.version.file.name}</strong> <span className="text-xs text-gray-400">({fmtSize(d.version.file.size)})</span></span>
                  <FileActions url={`/classrep/timetable/${d.version.id}/file`} file={d.version.file} />
                </p>
              )}
            </Card>
            {d.slots.length > 0
              ? <Table rows={d.slots} columns={[{ key: 'day', label: 'Day' }, { key: 'time', label: 'Time' }, { key: 'unit', label: 'Unit' }, { key: 'venue', label: 'Venue' }, { key: 'lecturer', label: 'Lecturer' }]} />
              : <Notice kind="info">This timetable was uploaded as a file, so there is no lesson table. Use View or Download above to open it.</Notice>}
          </>
        )}
      </Async>
    </Page>
  );
}
