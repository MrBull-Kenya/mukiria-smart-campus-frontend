import React, { useState } from 'react';
import { downloadFile, previewFile } from '../services/download';

export const fmtSize = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

// "View" (PDF and images only) and "Download" for a file the server holds. `url` is the authenticated file endpoint.
export default function FileActions({ url, file }) {
  const [error, setError] = useState('');
  if (!file) return <span className="text-xs text-gray-400">No file</span>;
  const view = async () => { setError(''); const r = await previewFile(url); if (!r.ok) setError(r.message); };
  const download = async () => { setError(''); const r = await downloadFile(`${url}?download=1`, file.name); if (!r.ok) setError(r.message); };
  return (
    <span className="inline-flex flex-col gap-1">
      <span className="inline-flex gap-3 text-[11px] font-bold">
        {file.previewable && <button type="button" onClick={view} className="text-blue-600 underline">View</button>}
        <button type="button" onClick={download} className="text-gray-700 underline">Download</button>
      </span>
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </span>
  );
}
