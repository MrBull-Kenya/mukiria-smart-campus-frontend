import api from './api';

// Download a file the server generates (PDF/CSV) through the authenticated client.
export async function downloadFile(url, filename) {
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const href = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = href; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    return { ok: true };
  } catch (err) {
    let message = 'Download failed.';
    try { message = JSON.parse(await err.response.data.text()).error || message; } catch { /* keep default */ }
    return { ok: false, message };
  }
}

// Open a PDF/image in a new tab. Only call this for types the server marks `previewable`.
// The tab is opened synchronously (inside the click) so popup blockers allow it, then pointed at the file.
export async function previewFile(url) {
  const win = window.open('', '_blank');
  try {
    const res = await api.get(url, { responseType: 'blob' });
    const href = URL.createObjectURL(res.data);
    if (win) win.location.href = href;
    else { // popup blocked: fall back to a normal download
      const a = document.createElement('a'); a.href = href; a.download = 'timetable'; document.body.appendChild(a); a.click(); a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(href), 60000);
    return { ok: true };
  } catch (err) {
    if (win) win.close();
    let message = 'Could not open the file.';
    try { message = JSON.parse(await err.response.data.text()).error || message; } catch { /* keep default */ }
    return { ok: false, message };
  }
}
