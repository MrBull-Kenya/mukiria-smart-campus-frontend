// Integration test: boots the REAL Express app on an in-memory SQLite database (see tests/run.sh)
import path from 'node:path';
process.env.PORT = '5055'; process.env.CAMPUS_LAT = '-1.123'; process.env.CAMPUS_LNG = '37.123';
const log = console.log; console.log = () => {}; // silence server chatter
await import('./src/server.js');
const { default: pool } = await import('./src/config/db.js');
const { generateSecureToken } = await import('./src/utils/qrGenerator.js');
const bcrypt = (await import('bcryptjs')).default;
console.log = log;
const BASE = 'http://localhost:5055/api';
for (let i = 0; i < 50; i++) { try { const [r] = await pool.query("SELECT name FROM sqlite_master WHERE name='fee_accounts'"); if (r.length) break; } catch {} await new Promise(r => setTimeout(r, 100)); }

let adminTok;
let pass = 0, fail = 0; const failures = [];
const ok = (name, cond, extra = '') => { if (cond) pass++; else { fail++; failures.push(`${name} ${extra}`); } };
const api = async (method, path, { token, body, form, raw } = {}) => {
  const headers = {}; if (token) headers.Authorization = `Bearer ${token}`;
  let b; if (form) b = form; else if (body) { headers['Content-Type'] = 'application/json'; b = JSON.stringify(body); }
  const ac = new AbortController(); const to = setTimeout(() => ac.abort(), 8000);
  let res; try { res = await fetch(BASE + path, { method, headers, body: b, signal: ac.signal }); } catch (e) { process.stderr.write(`[fetch fail] ${method} ${path}: ${e.name} ${e.cause?.code || e.message}\n`); throw e; } finally { clearTimeout(to); }
  if (raw) return { status: res.status, res, buf: Buffer.from(await res.arrayBuffer()) };
  let data = null; try { data = await res.json(); } catch {} return { status: res.status, data };
};
const login = async (email, password, device) => { const r = await api('POST', '/auth/login', { body: { email, password, device_id: device } }); return r; };
const health = await api('GET', '/health');
ok('health check is available after database initialization', health.status === 200 && health.data?.status === 'ok');

// ---------- seed ----------
await pool.query("INSERT INTO classes (class_code, course, module) VALUES ('ITECH6','ICT Technician','Module 6'), ('ITECH7','ICT Technician','Module 7')");
const pw = await bcrypt.hash('Passw0rd!', 10);
await pool.query("INSERT INTO users (email, password, name, role, class_code) VALUES ('teacher@mtti.ac.ke', ?, 'Mr Teacher', 'teacher', NULL), ('hod@mtti.ac.ke', ?, 'Dr HOD', 'hod', NULL)", [pw, pw]);

process.stderr.write('[stage] seeded\n');
import fs from 'node:fs';
const URLS = process.env.FIXTURES_OUT ? JSON.parse(fs.readFileSync(process.env.URLS_FILE, 'utf8')) : []; const FIX = {};
const tokenFor = (u) => u.startsWith('/admin') ? adminTok : u.startsWith('/classrep') ? repT : u.startsWith('/teacher') ? teach : u.startsWith('/hod') ? hod : u.startsWith('/classes') ? undefined : s1;
const snap = async () => { for (const u of URLS) { const r = await api('GET', u, { token: tokenFor(u) }); if (r.status === 200) { const n = JSON.stringify(r.data).length; if (!FIX[u] || FIX[u].__status || n > JSON.stringify(FIX[u]).length) FIX[u] = r.data; } else if (!FIX[u]) FIX[u] = { __status: r.status }; } };

const reg = (adm, name, cls = 'ITECH6') => api('POST', '/auth/register-student', { body: { adm_no: adm, name, email: `${adm}@mtti.ac.ke`, parent_email: `p${adm}@mail.com`, class_code: cls, password: 'Passw0rd!' } });
ok('register s1', (await reg('1001', 'Alice')).status === 201);
ok('register s2', (await reg('1002', 'Brian')).status === 201);
ok('register s3', (await reg('1003', 'Carol')).status === 201);
ok('register other-class student', (await reg('2001', 'Dan', 'ITECH7')).status === 201);
ok('duplicate email rejected', (await reg('1001', 'Alice')).status === 409);
ok('duplicate email rejected regardless of letter case', (await api('POST', '/auth/register-student', { body: { adm_no: '1005', name: 'Email Duplicate', email: '1001@MTTI.AC.KE', class_code: 'ITECH6', password: 'Passw0rd!' } })).status === 409);
ok('duplicate admission number rejected regardless of case and surrounding whitespace', (await api('POST', '/auth/register-student', { body: { adm_no: ' 1001 ', name: 'Admission Duplicate', email: 'unique1005@mtti.ac.ke', class_code: 'ITECH6', password: 'Passw0rd!' } })).status === 409);
ok('unknown class rejected', (await reg('9999', 'Zed', 'NOPE')).status === 400);
ok('short password rejected', (await api('POST', '/auth/register-student', { body: { adm_no: '5', name: 'x', email: 'x@y.z', class_code: 'ITECH6', password: '123' } })).status === 400);
const repReg = await api('POST', '/auth/register-rep', { body: { adm_no: '1000', name: 'Rita Rep', email: '1000@mtti.ac.ke', class_code: 'ITECH6', password: 'Passw0rd!' } });
ok('register rep -> pending', repReg.status === 201 && repReg.data.status === 'pending');
ok('pending rep cannot login', (await login('1000@mtti.ac.ke', 'Passw0rd!', 'dev-rep')).status === 403);
ok('wrong password 401', (await login('1001@mtti.ac.ke', 'nope', 'x')).status === 401);

const hodL = await login('hod@mtti.ac.ke', 'Passw0rd!', 'dev-hod'); const hod = hodL.data.token;
ok('hod login', hodL.status === 200 && hodL.data.user.role === 'hod');
const pend = await api('GET', '/hod/pending-reps', { token: hod });
ok('hod sees pending rep', pend.data?.length === 1 && pend.data[0].adm === '1000');
ok('hod approves rep', (await api('POST', `/hod/approve-rep/${pend.data[0].id}`, { token: hod, body: { decision: 'approve' } })).status === 200);

const repL = await login('1000@mtti.ac.ke', 'Passw0rd!', 'dev-rep'); const repT = repL.data.token;
ok('approved rep logs in with adm_no', repL.status === 200 && repL.data.user.adm_no === '1000');
const s1L = await login('1001@mtti.ac.ke', 'Passw0rd!', 'dev-s1'); const s1 = s1L.data.token;
const s2L = await login('1002@mtti.ac.ke', 'Passw0rd!', 'dev-s2'); const s2 = s2L.data.token;
const s3L = await login('1003@mtti.ac.ke', 'Passw0rd!', 'dev-s3'); const s3 = s3L.data.token;
const dL = await login('2001@mtti.ac.ke', 'Passw0rd!', 'dev-d'); const sd = dL.data.token;
ok('student login includes adm_no', s1L.data.user.adm_no === '1001');
ok('device mismatch at login blocked', (await login('1001@mtti.ac.ke', 'Passw0rd!', 'other-phone')).status === 403);
const tL = await login('teacher@mtti.ac.ke', 'Passw0rd!', 'x'); const teach = tL.data.token;
ok('verify-token requires auth', (await api('GET', '/auth/verify-token')).status === 401 && (await api('GET', '/auth/verify-token', { token: s1 })).status === 200);

// ---------- 2. role guards ----------
ok('no token -> 401', (await api('GET', '/student/dashboard')).status === 401);
ok('student blocked from HOD', (await api('GET', '/hod/dashboard', { token: s1 })).status === 403);
ok('student blocked from rep', (await api('POST', '/classrep/sessions', { token: s1, body: {} })).status === 403);
ok('rep blocked from HOD', (await api('GET', '/hod/at-risk', { token: repT })).status === 403);
ok('teacher blocked from student area', (await api('GET', '/student/dashboard', { token: teach })).status === 403);
ok('unknown endpoint is JSON 404', (await api('GET', '/nope/nothing', { token: s1 })).status === 404);
ok('class list is public', (await api('GET', '/classes/list')).status === 200);

ok('student cannot read another student\'s scorecard', (await api('GET', '/gamification/scorecard/1001', { token: s2 })).status === 403);
ok('hod can read any scorecard', (await api('GET', '/gamification/scorecard/1001', { token: hod })).status === 200);
ok('student cannot approve temp ids via legacy route', (await api('PATCH', '/tempid/1/status', { token: s2, body: { status: 'approved' } })).status === 403);
// ---------- 3. session + QR + check-in (the core flow) ----------
ok('rep must give unit+lecturer', (await api('POST', '/classrep/sessions', { token: repT, body: {} })).status === 400);
const lects = await api('GET', '/classrep/lecturers', { token: repT });
ok('lecturer list', lects.data?.some(l => l.name === 'Mr Teacher'));
const sess = await api('POST', '/classrep/sessions', { token: repT, body: { unit_name: 'Networking', lecturer_name: 'Mr Teacher', venue: 'Lab 1' } });
ok('start session', sess.status === 201 && sess.data.id > 0);
const sid = sess.data.id;
ok('manual attendance is restricted to class reps', (await api('GET', '/classrep/manual-attendance', { token: s1 })).status === 403 && (await api('POST', '/classrep/manual-attendance', { token: s1, body: { adm_no: '1003' } })).status === 403);
const manualList = await api('GET', '/classrep/manual-attendance', { token: repT });
const carolBeforeManual = (await pool.query("SELECT points, attendance_pct FROM students WHERE adm_no = '1003'"))[0][0];
const repId = (await pool.query("SELECT id FROM users WHERE email = '1000@mtti.ac.ke'"))[0][0].id;
ok('rep gets only the active class session and its students', manualList.status === 200 && manualList.data.session.id === sid && manualList.data.students.some((student) => student.adm === '1003' && !student.present));
const manualMark = await api('POST', '/classrep/manual-attendance', { token: repT, body: { adm_no: '1003' } });
const manualRow = (await pool.query('SELECT id, session_id, adm_no, is_late, points_earned, record_method, recorded_by FROM attendance_logs WHERE session_id = ? AND adm_no = ?', [sid, '1003']))[0][0];
ok('rep manually marks a present student and records actor/method/points', manualMark.status === 201 && manualRow?.record_method === 'manual' && Number(manualRow.recorded_by) === Number(repId) && Number(manualRow.points_earned) === manualMark.data.points_earned && !manualMark.data.is_late);
ok('manually marked student appears as present in the live roster', (await api('GET', '/classrep/manual-attendance', { token: repT })).data.students.find((student) => student.adm === '1003')?.present === true);
ok('manual check-in cannot be duplicated or applied outside this class', (await api('POST', '/classrep/manual-attendance', { token: repT, body: { adm_no: '1003' } })).status === 409 && (await api('POST', '/classrep/manual-attendance', { token: repT, body: { adm_no: '2001' } })).status === 404);
await pool.query('DELETE FROM attendance_logs WHERE id = ?', [manualRow.id]);
await pool.query("DELETE FROM points_logs WHERE adm_no = '1003' AND activity_type IN ('Manual on-time attendance', 'Manual late attendance')");
await pool.query("DELETE FROM badges WHERE adm_no = '1003' AND badge_name = 'First Check-in'");
await pool.query('UPDATE students SET points = ?, attendance_pct = ? WHERE adm_no = ?', [carolBeforeManual.points, carolBeforeManual.attendance_pct, '1003']);
ok('qr generation requires a valid device location', (await api('POST', '/qr/generate', { token: repT, body: { session_id: sid, venue: 'Lab 1' } })).status === 400);
const remoteQr = await api('POST', '/qr/generate', { token: repT, body: { session_id: sid, venue: 'Lab 1', gps_lat: -1.0, gps_lng: 37.0 } });
ok('rep can generate QR outside the campus geofence', remoteQr.status === 200 && remoteQr.data.payload.qr_lat === -1 && remoteQr.data.payload.qr_lng === 37);
const tokRes = await api('POST', '/qr/generate', { token: repT, body: { session_id: sid, venue: 'Lab 1', gps_lat: -1.123, gps_lng: 37.123 } });
ok('qr signs rep location and returns check-in code', tokRes.status === 200 && tokRes.data.token.includes('.') && /^\d{8}$/.test(tokRes.data.rep_checkin_code) && tokRes.data.payload.qr_lat === -1.123);
const tok = tokRes.data.token;
ok('student cannot generate qr', (await api('POST', '/qr/generate', { token: s1, body: { session_id: sid } })).status === 403);
ok('rep code verification requires authentication and rep role', (await api('POST', '/qr/rep-code/verify', { body: { code: tokRes.data.rep_checkin_code } })).status === 401 && (await api('POST', '/qr/rep-code/verify', { token: s1, body: { code: tokRes.data.rep_checkin_code } })).status === 403);
const wrongRepCode = tokRes.data.rep_checkin_code === '00000000' ? '00000001' : '00000000';
ok('rep code rejects malformed and unknown codes', (await api('POST', '/qr/rep-code/verify', { token: repT, body: { code: '123' } })).status === 400 && (await api('POST', '/qr/rep-code/verify', { token: repT, body: { code: wrongRepCode } })).status === 400);
const repCodeCheck = await api('POST', '/qr/rep-code/verify', { token: repT, body: { code: tokRes.data.rep_checkin_code } });
ok('rep code resolves to a fresh signed token for the active session', repCodeCheck.status === 200 && repCodeCheck.data.token !== tok && repCodeCheck.data.data.session_id === sid && repCodeCheck.data.data.qr_lat === -1.123);
const qrVerified = await api('POST', '/qr/verify', { token: s1, body: { token: tok } });
ok('qr with signed rep location verifies', qrVerified.status === 200 && qrVerified.data.data.qr_lat === -1.123);
const [b, sig] = tok.split('.'); const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(b, 'base64url')), session_id: 99999 })).toString('base64url') + '.' + sig;
ok('forged qr rejected', (await api('POST', '/qr/verify', { token: s1, body: { token: forged } })).status === 400);
ok('garbage qr rejected', (await api('POST', '/qr/verify', { token: s1, body: { token: 'garbage' } })).status === 400);

const photo = () => new Blob([Buffer.from('/9j/4AAQSkZJRg==', 'base64')], { type: 'image/jpeg' });
const scan = (token, fields, qr = tok) => { const f = new FormData(); Object.entries({ session_id: sid, gps_lat: -1.123, gps_lng: 37.123, qr_token: qr, ...fields }).forEach(([k, v]) => f.append(k, String(v))); f.append('photo', photo(), 'selfie.jpg'); return api('POST', '/attendance/scan', { token, form: f }); };

await snap();
const sc1 = await scan(s1, { adm_no: '1001', device_id: 'dev-s1' });
ok('student 1 checks in (multipart + photo)', sc1.status === 201 && sc1.data.points_earned === 15 && sc1.data.is_late === false, JSON.stringify(sc1.data));
ok('duplicate scan blocked (409)', (await scan(s1, { adm_no: '1001', device_id: 'dev-s1' })).status === 409);
ok('outside geofence blocked', (await scan(s2, { adm_no: '1002', device_id: 'dev-s2', gps_lat: 0.0, gps_lng: 37.0 })).status === 403);
ok('wrong device blocked', (await scan(s2, { adm_no: '1002', device_id: 'stolen-phone' })).status === 403);
ok('other student adm_no spoof blocked', (await scan(s2, { adm_no: '1001', device_id: 'dev-s2' })).status === 403);
ok('other class cannot scan this session', (await scan(sd, { adm_no: '2001', device_id: 'dev-d' })).status === 403);
ok('check-in blocked beyond 20 m from rep device', (await scan(s2, { adm_no: '1002', device_id: 'dev-s2', gps_lat: -1.12275, gps_lng: 37.123 })).status === 403);
ok('forged qr cannot check in', (await scan(s2, { adm_no: '1002', device_id: 'dev-s2' }, forged)).status === 400);
const realNow = Date.now; Date.now = () => realNow() - 120000; const stale = generateSecureToken('ITECH6', '1000', 'Lab 1', sid, { latitude: -1.123, longitude: 37.123 }).token; Date.now = realNow;
ok('stale qr rejected online', (await scan(s2, { adm_no: '1002', device_id: 'dev-s2' }, stale)).status === 400);
const off = await scan(s2, { adm_no: '1002', device_id: 'dev-s2', is_offline_synced: true, scanned_at: Date.now() - 60000 }, stale);
ok('offline-queued scan accepted on sync', off.status === 201, JSON.stringify(off.data));
ok('unauthenticated scan rejected', (await api('POST', '/attendance/scan', { form: new FormData() })).status === 401);

// ---------- 4. student area ----------
const dash = await api('GET', '/student/dashboard', { token: s1 });
ok('student dashboard', dash.data?.name === 'Alice' && dash.data.attendancePercentage === 100 && dash.data.streak === 1 && /1 \/ 4/.test(dash.data.rank) && dash.data.points === 15, JSON.stringify(dash.data));
const dash3 = await api('GET', '/student/dashboard', { token: s3 });
ok('absent student pct = 0', dash3.data?.attendancePercentage === 0 && dash3.data.streak === 0, JSON.stringify(dash3.data));
const hist = await api('GET', '/student/history', { token: s3 });
ok('history shows absence', hist.data?.[0]?.status === 'Absent' && hist.data[0].unit === 'Networking');
ok('history shows present', (await api('GET', '/student/history', { token: s1 })).data?.[0]?.status === 'Present');
const elig = await api('GET', '/student/eligibility', { token: s3 });
ok('eligibility: not eligible + reason', elig.data?.isEligible === false && /below 75%/.test(elig.data.reason));
ok('eligibility: eligible', (await api('GET', '/student/eligibility', { token: s1 })).data?.isEligible === true);
const lb = await api('GET', '/student/leaderboard', { token: s2 });
ok('leaderboard ranks by points', lb.data?.top?.[0]?.name === 'Alice' && lb.data.total === 4 && lb.data.myRank === 2, JSON.stringify(lb.data));
const score = await api('GET', '/gamification/scorecard/1001', { token: s1 });
ok('scorecard has points + badge', score.data?.student?.points === 15 && score.data.badges?.some(b => b.badge_name === 'First Check-in'), JSON.stringify(score.data)?.slice(0, 200));
const sentChat = await api('POST', '/student/chat', { token: s1, body: { message: 'Hello class' } });
ok('chat send includes an explicit UTC message timestamp', sentChat.status === 201 && sentChat.data.timestamp?.endsWith('Z'));
await pool.query('UPDATE chat_messages SET created_at = ? WHERE id = ?', ['2026-10-08 08:05:00', sentChat.data.id]);
ok('empty chat rejected', (await api('POST', '/student/chat', { token: s1, body: { message: '  ' } })).status === 400);
const chat = await api('GET', '/student/chat', { token: s2 });
ok('chat timestamp is timezone-explicit for East Africa display', chat.data?.[0]?.timestamp === '2026-10-08T08:05:00.000Z');
ok('chat visible to classmate, not other class', chat.data?.length === 1 && chat.data[0].mine === false && (await api('GET', '/student/chat', { token: sd })).data.length === 0);
ok('class rep can read and post in the shared class chat', (await api('GET', '/classrep/chat', { token: repT })).data?.[0]?.text === 'Hello class' && (await api('POST', '/classrep/chat', { token: repT, body: { message: 'Rep message' } })).status === 201);
ok('temp id needs reason', (await api('POST', '/student/temp-id', { token: s3, body: {} })).status === 400);
ok('temp id request', (await api('POST', '/student/temp-id', { token: s3, body: { reason: 'Lost my ID' } })).status === 201);
ok('duplicate pending temp id blocked', (await api('POST', '/student/temp-id', { token: s3, body: { reason: 'again' } })).status === 409);

await snap();
// ---------- 5. class rep area ----------
const rd = await api('GET', '/classrep/dashboard', { token: repT });
ok('rep dashboard stats', rd.data?.totalStudents === 4 && rd.data.presentToday === 2 && rd.data.absentToday === 2 && rd.data.activeSession?.unit === 'Networking', JSON.stringify(rd.data));
const live = await api('GET', '/classrep/live-logs', { token: repT });
ok('live logs', live.data?.logs?.length === 2 && live.data.session.unit === 'Networking' && live.data.logs.some(l => l.offline), JSON.stringify(live.data));
const mem = await api('GET', '/classrep/members', { token: repT });
ok('members list (class only)', mem.data?.length === 4 && mem.data.every(m => m.adm !== '2001'));
const add = await api('POST', '/classrep/members', { token: repT, body: { adm_no: '1004', name: 'Eve', email: '1004@mtti.ac.ke', password: 'StudentPass1!', parent_email: 'pe@mail.com' } });
ok('rep adds student without returning password', add.status === 201 && !('password' in add.data) && !('tempPassword' in add.data));
ok('new member can log in with the password set by rep', (await login('1004@mtti.ac.ke', 'StudentPass1!', 'dev-e')).status === 200);
ok('short member password rejected', (await api('POST', '/classrep/members', { token: repT, body: { adm_no: '1005', name: 'Short Password', email: '1005@mtti.ac.ke', password: '1234567' } })).status === 400);
ok('duplicate member admission number rejected case-insensitively', (await api('POST', '/classrep/members', { token: repT, body: { adm_no: ' 1004 ', name: 'Eve Duplicate', email: 'e2@mtti.ac.ke', password: 'StudentPass1!' } })).status === 409);
ok('duplicate member email rejected case-insensitively', (await api('POST', '/classrep/members', { token: repT, body: { adm_no: '1005', name: 'Eve Duplicate', email: '1004@MTTI.AC.KE', password: 'StudentPass1!' } })).status === 409);
ok('rep resets device lock', (await api('POST', '/classrep/members/1002/reset-device', { token: repT })).status === 200);
ok('reset blocked for other class', (await api('POST', '/classrep/members/2001/reset-device', { token: repT })).status === 404);
ok('after reset new phone can log in', (await login('1002@mtti.ac.ke', 'Passw0rd!', 'new-phone')).status === 200);
ok('announce', (await api('POST', '/classrep/announcements', { token: repT, body: { message: 'Exam on Monday' } })).status === 201);
const ann = await api('GET', '/classrep/announcements', { token: repT });
ok('announcements list', ann.data?.length === 1 && ann.data[0].text === 'Exam on Monday');
await snap();
const csv = 'day,start,end,unit,venue,lecturer\nMonday,08:00,10:00,Networking,Lab 1,Mr Teacher\nWednesday,10:00,12:00,Databases,Lab 2,Mr Teacher\nbadrow';
const tf = new FormData(); tf.append('file', new Blob([csv], { type: 'text/csv' }), 'tt.csv');
const up = await api('POST', '/classrep/timetable/upload', { token: repT, form: tf });
ok('timetable csv upload', up.status === 201 && up.data.slots === 2 && up.data.skipped === 1, JSON.stringify(up.data));
ok('upload without a file is rejected', (await api('POST', '/classrep/timetable/upload', { token: repT, form: new FormData() })).status === 400);
const tt = await api('GET', '/classrep/timetable', { token: repT });
ok('timetable get (ordered, pending)', tt.data?.version?.status === 'pending' && tt.data.slots[0].day === 'Monday' && tt.data.slots.length === 2, JSON.stringify(tt.data)?.slice(0, 150));
ok('student timetable hides versions until approved', (await api('GET', '/student/timetable', { token: s1 })).data?.version === null);
ok('teacher cannot access the student timetable route', (await api('GET', '/student/timetable', { token: teach })).status === 403);
const tid = await api('GET', '/classrep/temp-ids', { token: repT });
ok('rep sees pending temp id', tid.data?.length === 1 && tid.data[0].name === 'Carol' && tid.data[0].reason === 'Lost my ID');
ok('rep approves temp id', (await api('POST', `/classrep/temp-ids/${tid.data[0].id}/decision`, { token: repT, body: { decision: 'approved' } })).status === 200);
ok('temp id shows approved to student', (await api('GET', '/student/temp-id', { token: s3 })).data?.[0]?.status === 'approved');
const csvR = await api('GET', '/classrep/ministry-export?format=csv', { token: repT, raw: true });
ok('csv export', csvR.status === 200 && /text\/csv/.test(csvR.res.headers.get('content-type')) && csvR.buf.toString().includes('Alice'));
const pdfR = await api('GET', '/classrep/ministry-export?format=pdf', { token: repT, raw: true });
ok('pdf export is a real PDF', pdfR.status === 200 && pdfR.buf.slice(0, 4).toString() === '%PDF', pdfR.buf.slice(0, 20).toString());
const pa = await api('POST', '/classrep/parent-alerts/run', { token: repT });
ok('parent alerts generated for at-risk', pa.status === 200 && pa.data.created >= 1, JSON.stringify(pa.data));
ok('parent alerts not duplicated same day', (await api('POST', '/classrep/parent-alerts/run', { token: repT })).data.created === 0);
const pl = await api('GET', '/classrep/parent-alerts', { token: repT });
ok('parent alerts list', pl.data?.length >= 1 && pl.data[0].parent && pl.data[0].reason.includes('%'));
await snap();
const rst = await api('POST', '/classrep/leaderboard/reset', { token: repT });
ok('leaderboard reset awards badges + zeroes points', rst.status === 200 && rst.data.winners.length === 2 && (await api('GET', '/student/dashboard', { token: s1 })).data.points === 0, JSON.stringify(rst.data));
ok('end session', (await api('POST', '/classrep/sessions/end', { token: repT })).status === 200 && (await api('GET', '/classrep/sessions/current', { token: repT })).data.session === null);
ok('scan after session ended blocked', (await scan(s3, { adm_no: '1003', device_id: 'dev-s3' })).status === 400);

// ---------- 6. teacher ----------
const td = await api('GET', '/teacher/dashboard', { token: teach });
ok('teacher dashboard', td.data?.name === 'Mr Teacher' && td.data.pendingSignoffs === 1 && td.data.totalSessions === 1, JSON.stringify(td.data));
const ts = await api('GET', '/teacher/sessions', { token: teach });
ok('teacher sees own session with counts + rep', ts.data?.[0]?.present === 2 && ts.data[0].total === 5 && ts.data[0].rep === 'Rita Rep' && ts.data[0].signed === false, JSON.stringify(ts.data));
const ab = await api('GET', '/teacher/absenteeism', { token: teach });
ok('absenteeism flags absent students', ab.data?.[0]?.unit === 'Networking' && ab.data[0].flagged === 3 && ab.data[0].atRiskStudents.some(s => s.name === 'Carol'), JSON.stringify(ab.data)?.slice(0, 200));
ok('teacher signs session', (await api('POST', `/teacher/sessions/${sid}/sign`, { token: teach })).status === 200);
ok('cannot sign twice (409)', (await api('POST', `/teacher/sessions/${sid}/sign`, { token: teach })).status === 409);
ok('sign state persisted', (await api('GET', '/teacher/sessions', { token: teach })).data[0].signed === true);

await snap();
// ---------- 7. HOD ----------
const hd = await api('GET', '/hod/dashboard', { token: hod });
ok('hod dashboard', hd.data?.totalClasses === 2 && hd.data.totalStudents === 6 && hd.data.pendingTimetables === 1, JSON.stringify(hd.data));
const hc = await api('GET', '/hod/classes', { token: hod });
ok('hod classes with rep + counts', hc.data?.find(c => c.code === 'ITECH6')?.students === 5 && hc.data.find(c => c.code === 'ITECH6').rep === 'Rita Rep', JSON.stringify(hc.data));
const ar = await api('GET', '/hod/at-risk', { token: hod });
ok('hod at-risk list', ar.data?.students?.some(s => s.adm === '1003' && s.missed === 1), JSON.stringify(ar.data)?.slice(0, 200));
const fr = await api('GET', '/hod/final-reports', { token: hod });
ok('final report numbers add up', fr.data?.totalStudents === fr.data.eligible + fr.data.barred && fr.data.complianceRate >= 0, JSON.stringify(fr.data)?.slice(0, 200));
ok('lost-id logs', (await api('GET', '/hod/lost-id-logs', { token: hod })).data?.[0]?.name === 'Carol');
const tvs = await api('GET', '/hod/timetables', { token: hod });
ok('hod sees pending timetable', tvs.data?.[0]?.status === 'pending' && tvs.data[0].slots === 2);
ok('hod approves timetable', (await api('POST', `/hod/timetables/${tvs.data[0].id}/decision`, { token: hod, body: { decision: 'approved', comment: 'ok' } })).status === 200 && (await api('GET', '/classrep/timetable', { token: repT })).data.version.status === 'approved');
const studentTimetable = await api('GET', '/student/timetable', { token: s1 });
ok('student sees approved timetable and ordered lessons', studentTimetable.data?.version?.status === 'approved' && studentTimetable.data.version.id === tvs.data[0].id && studentTimetable.data.slots[0].day === 'Monday' && studentTimetable.data.slots.length === 2);
ok('student only sees timetable for own class', (await api('GET', '/student/timetable', { token: sd })).data?.version === null);
const mg = await api('POST', '/hod/ministry-audit', { token: hod });
ok('ministry audit generated', mg.status === 201 && mg.data.id > 0 && mg.data.totals.students === 6, JSON.stringify(mg.data));
ok('ministry list', (await api('GET', '/hod/ministry-audit', { token: hod })).data?.[0]?.id === mg.data.id);
const mp = await api('GET', `/hod/ministry-audit/${mg.data.id}/pdf`, { token: hod, raw: true });
ok('ministry pdf', mp.status === 200 && mp.buf.slice(0, 4).toString() === '%PDF');
ok('legacy /ministry/reports now protected', (await api('GET', '/ministry/reports', { token: s1 })).status === 403);
ok('hod resets device', (await api('POST', '/hod/students/1001/reset-device', { token: hod })).status === 200);
ok('hod sets fees', (await api('PUT', '/hod/fees/1001', { token: hod, body: { total_fees: 50000, paid_amount: 30000 } })).status === 200);
ok('fees validation', (await api('PUT', '/hod/fees/1001', { token: hod, body: { total_fees: 'x', paid_amount: 1 } })).status === 400);

await snap();
// ---------- 8. campus ----------
const lib0 = await api('GET', '/campus/library/status', { token: s1 });
ok('library status empty', lib0.data?.currentOccupancy === 0 && lib0.data.checkedIn === false);
ok('library check-out when not in = 409', (await api('POST', '/campus/library/checkout', { token: s1 })).status === 409);
const li = await api('POST', '/campus/library/checkin', { token: s1 });
ok('library check-in', li.status === 201 && li.data.currentOccupancy === 1 && li.data.checkedIn === true);
ok('library double check-in = 409', (await api('POST', '/campus/library/checkin', { token: s1 })).status === 409);
ok('library occupancy counts other students', (await api('POST', '/campus/library/checkin', { token: s2 })).data.currentOccupancy === 2);
ok('library check-out', (await api('POST', '/campus/library/checkout', { token: s1 })).data.currentOccupancy === 1);
ok('teacher cannot check in to library', (await api('POST', '/campus/library/checkin', { token: teach })).status === 403);
ok('games record', (await api('POST', '/campus/games', { token: s1, body: { activity: 'Football' } })).status === 201);
ok('games duplicate today = 409', (await api('POST', '/campus/games', { token: s1, body: { activity: 'Football' } })).status === 409);
ok('games list', (await api('GET', '/campus/games', { token: s1 })).data?.[0]?.activity === 'Football');
const fee = await api('GET', '/campus/fees', { token: s1 });
ok('fees: balance + not cleared', fee.data?.recorded === true && fee.data.balance === 20000 && fee.data.isCleared === false, JSON.stringify(fee.data));
ok('fees: no record message', (await api('GET', '/campus/fees', { token: s2 })).data?.recorded === false);

await snap();

// ---------- 8b. sockets (Socket.IO wire protocol over Node's built-in WebSocket) ----------
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sockOpen = (token) => new Promise((resolve) => {
  const w = new WebSocket('ws://localhost:5055/socket.io/?EIO=4&transport=websocket'); const msgs = [];
  w.onmessage = (e) => { const d = String(e.data); msgs.push(d); if (d[0] === '0') w.send('40' + JSON.stringify(token ? { token } : {})); else if (d === '2') w.send('3'); };
  w.onopen = () => resolve({ w, msgs });
});
const noTok = await sockOpen(undefined); const sA = await sockOpen(s1); const sB = await sockOpen(sd); const sBad = await sockOpen('not.a.jwt');
await wait(500);
ok('socket without token rejected', noTok.msgs.some((m) => m.startsWith('44')) && !noTok.msgs.some((m) => m.startsWith('40{')), JSON.stringify(noTok.msgs));
ok('socket with garbage token rejected', sBad.msgs.some((m) => m.startsWith('44')));
ok('socket with valid token connects', sA.msgs.some((m) => m.startsWith('40{')) && sB.msgs.some((m) => m.startsWith('40{')));
sA.w.send('42' + JSON.stringify(['join_class', 'ITECH6']));
sB.w.send('42' + JSON.stringify(['join_class', 'ITECH6'])); // other-class student tries to eavesdrop: must be ignored
await wait(300);
sA.w.send('42' + JSON.stringify(['send_message', { class_code: 'ITECH6', sender_id: 1, message: 'forged-by-socket' }]));
await api('POST', '/classrep/announcements', { token: repT, body: { message: 'Socket hello' } });
await wait(500);
ok('classmate receives push', sA.msgs.some((m) => m.includes('receive_message') && m.includes('Socket hello')));
ok('other class cannot eavesdrop', !sB.msgs.some((m) => m.includes('Socket hello')));
ok('client-published chat events are ignored', !(await api('GET', '/student/chat', { token: s1 })).data.some((m) => m.text === 'forged-by-socket'));
[noTok, sA, sB, sBad].forEach((x) => x.w.close());

// ---------- 8c. staff CLI ----------
const { createUser } = await import('./scripts/create-user.mjs');
const newId = await createUser({ role: 'teacher', name: 'Ms CLI', email: 'cli@mtti.ac.ke', password: 'Passw0rd!' });
ok('create-user script makes a working teacher', newId > 0 && (await login('cli@mtti.ac.ke', 'Passw0rd!', 'x')).data?.user?.role === 'teacher');
let bad = null; try { await createUser({ role: 'student', name: 'x', email: 'y@z.ke', password: 'Passw0rd!' }); } catch (e) { bad = e.message; }
ok('create-user rejects non-staff roles', /--role must be/.test(bad || ''));
// ---------- 9. password reset (token set directly: SMTP is not available here) ----------
const { createHash: sha256h } = await import('node:crypto');
await pool.query("UPDATE users SET reset_token = ?, reset_expiry = ? WHERE email = '1003@mtti.ac.ke'", [sha256h('sha256').update('tok123').digest('hex'), new Date(Date.now() + 3600000)]);
ok('reset with bad token fails', (await api('POST', '/auth/reset-password/zzz', { body: { email: '1003@mtti.ac.ke', token: 'zzz', newPassword: 'NewPassw0rd!' } })).status === 400);
ok('reset with good token works', (await api('POST', '/auth/reset-password/tok123', { body: { email: '1003@mtti.ac.ke', token: 'tok123', newPassword: 'NewPassw0rd!' } })).status === 200);
ok('login with new password', (await login('1003@mtti.ac.ke', 'NewPassw0rd!', 'dev-s3')).status === 200);
ok('resend-verification message', (await api('POST', '/auth/resend-verification', { body: { email: 'x' } })).status === 200);


// ---------- 10. administrator: bootstrap, staff self-registration, approvals, classes, staff management ----------
const regStaff = (role, name, email) => api('POST', `/auth/register-${role}`, { body: { name, email, password: 'Passw0rd!' } });
const ad1 = await regStaff('admin', 'First Admin', 'admin1@mtti.ac.ke');
ok('first administrator is approved automatically', ad1.status === 201 && ad1.data.status === 'active', JSON.stringify(ad1.data));
const ad1L = await login('admin1@mtti.ac.ke', 'Passw0rd!', 'x'); adminTok = ad1L.data?.token;
ok('first administrator can sign in', ad1L.status === 200 && ad1L.data.user.role === 'admin');
const ad2 = await regStaff('admin', 'Second Admin', 'admin2@mtti.ac.ke');
const tNew = await regStaff('teacher', 'Mr New', 'newteach@mtti.ac.ke');
const hNew = await regStaff('hod', 'Dr New', 'newhod@mtti.ac.ke');
ok('later administrator / teacher / hod registrations are pending', [ad2, tNew, hNew].every((r) => r.status === 201 && r.data.status === 'pending'));
ok('duplicate staff email rejected', (await regStaff('teacher', 'x', 'newteach@mtti.ac.ke')).status === 409);
ok('staff short password rejected', (await api('POST', '/auth/register-teacher', { body: { name: 'x', email: 'q@q.ke', password: '123' } })).status === 400);
ok('staff missing name rejected', (await api('POST', '/auth/register-hod', { body: { email: 'q@q.ke', password: 'Passw0rd!' } })).status === 400);
const pendLogin = await login('newteach@mtti.ac.ke', 'Passw0rd!', 'x');
ok('pending staff cannot sign in (message names the Administrator)', pendLogin.status === 403 && /Administrator approval/.test(pendLogin.data.error), JSON.stringify(pendLogin.data));
await snap(); FIX['/admin/staff#pending'] = FIX['/admin/staff'];

for (const [who, tk] of [['student', s1], ['class rep', repT], ['teacher', teach], ['hod', hod]]) ok(`${who} blocked from admin area`, (await api('GET', '/admin/dashboard', { token: tk })).status === 403);
ok('admin area needs a token', (await api('GET', '/admin/dashboard')).status === 401);

const staffList = await api('GET', '/admin/staff', { token: adminTok });
const byEmail = (e) => staffList.data.find((x) => x.email === e);
ok('staff list: pending first, includes seeded teacher/hod', staffList.data?.[0]?.status === 'pending' && !!byEmail('teacher@mtti.ac.ke') && !!byEmail('hod@mtti.ac.ke') && byEmail('admin1@mtti.ac.ke').isMe === true, JSON.stringify(staffList.data)?.slice(0, 200));
ok('bad decision value rejected', (await api('POST', `/admin/staff/${byEmail('newteach@mtti.ac.ke').id}/decision`, { token: adminTok, body: { decision: 'maybe' } })).status === 400);
ok('admin approves teacher', (await api('POST', `/admin/staff/${byEmail('newteach@mtti.ac.ke').id}/decision`, { token: adminTok, body: { decision: 'approve' } })).status === 200);
ok('admin approves hod', (await api('POST', `/admin/staff/${byEmail('newhod@mtti.ac.ke').id}/decision`, { token: adminTok, body: { decision: 'approve' } })).status === 200);
ok('admin rejects second administrator', (await api('POST', `/admin/staff/${byEmail('admin2@mtti.ac.ke').id}/decision`, { token: adminTok, body: { decision: 'reject' } })).status === 200);
ok('approved teacher + hod can sign in', (await login('newteach@mtti.ac.ke', 'Passw0rd!', 'x')).data?.user?.role === 'teacher' && (await login('newhod@mtti.ac.ke', 'Passw0rd!', 'x')).data?.user?.role === 'hod');
const rejL = await login('admin2@mtti.ac.ke', 'Passw0rd!', 'x');
ok('rejected registration cannot sign in', rejL.status === 403 && /not approved/.test(rejL.data.error));
ok('deciding twice = 404', (await api('POST', `/admin/staff/${byEmail('newteach@mtti.ac.ke').id}/decision`, { token: adminTok, body: { decision: 'approve' } })).status === 404);
ok('newly approved teacher appears in rep lecturer list', (await api('GET', '/classrep/lecturers', { token: repT })).data.some((l) => l.name === 'Mr New'));

const ad = await api('GET', '/admin/dashboard', { token: adminTok });
FIX['/admin/dashboard#noterm'] = ad.data;
ok('admin dashboard counts', ad.data?.classes === 2 && ad.data.students === 5 && ad.data.reps === 1 && ad.data.teachers === 3 && ad.data.hods === 2 && ad.data.admins === 1 && ad.data.pendingStaff === 0, JSON.stringify(ad.data));

// classes
const addCls = (body) => api('POST', '/admin/classes', { token: adminTok, body });
ok('admin adds a class (code with slashes)', (await addCls({ class_code: 'ITECH9/S/26', course: 'Electrical Engineering', module: 'Module 1' })).status === 201);
ok('duplicate class code rejected (case-insensitive)', (await addCls({ class_code: 'itech9/s/26', course: 'x', module: 'y' })).status === 409);
ok('invalid class code rejected', (await addCls({ class_code: '!!', course: 'x', module: 'y' })).status === 400);
ok('missing course rejected', (await addCls({ class_code: 'ABC1', module: 'y' })).status === 400);
const cls = await api('GET', '/admin/classes', { token: adminTok });
ok('class list with member counts + rep', cls.data?.find((c) => c.code === 'ITECH6')?.students === 5 && cls.data.find((c) => c.code === 'ITECH6').rep === 'Rita Rep' && cls.data.find((c) => c.code === 'ITECH9/S/26')?.students === 0, JSON.stringify(cls.data));
const adminMembersPath = `/admin/class-members?code=${encodeURIComponent('ITECH6')}`;
ok('class member list is administrator-only', (await api('GET', adminMembersPath, { token: hod })).status === 403 && (await api('GET', adminMembersPath)).status === 401);
const adminMembers = await api('GET', adminMembersPath, { token: adminTok });
ok('administrator sees class students and rep with account status', adminMembers.status === 200 && adminMembers.data.length === 5 && adminMembers.data.some((m) => m.role === 'student_rep' && m.status === 'active') && adminMembers.data.every((m) => Number.isInteger(m.id)), JSON.stringify(adminMembers.data));
const updateTarget = adminMembers.data.find((m) => m.adm_no === '1002');
ok('only administrator may edit class-member details', (await api('PUT', '/admin/class-members', { token: hod, body: { code: 'ITECH6', user_id: updateTarget.id, name: 'Blocked', email: 'blocked@mtti.ac.ke' } })).status === 403);
ok('member update rejects invalid email', (await api('PUT', '/admin/class-members', { token: adminTok, body: { code: 'ITECH6', user_id: updateTarget.id, name: 'Brian', email: 'invalid' } })).status === 400);
ok('member update rejects duplicate email', (await api('PUT', '/admin/class-members', { token: adminTok, body: { code: 'ITECH6', user_id: updateTarget.id, name: 'Brian', email: '1001@mtti.ac.ke' } })).status === 409);
const memberUpdate = await api('PUT', '/admin/class-members', { token: adminTok, body: { code: 'ITECH6', user_id: updateTarget.id, name: 'Brian Updated', email: 'brian.updated@mtti.ac.ke', parent_email: 'parent.updated@example.com', parent_phone: '+254700123456' } });
const updatedMembers = await api('GET', adminMembersPath, { token: adminTok });
ok('administrator updates student and parent contact details', memberUpdate.status === 200 && updatedMembers.data.find((m) => m.id === updateTarget.id)?.name === 'Brian Updated' && updatedMembers.data.find((m) => m.id === updateTarget.id)?.email === 'brian.updated@mtti.ac.ke' && updatedMembers.data.find((m) => m.id === updateTarget.id)?.parent_email === 'parent.updated@example.com' && updatedMembers.data.find((m) => m.id === updateTarget.id)?.parent_phone === '+254700123456');
await api('PUT', '/admin/class-members', { token: adminTok, body: { code: 'ITECH6', user_id: updateTarget.id, name: 'Brian', email: '1002@mtti.ac.ke', parent_email: 'p1002@mail.com', parent_phone: '' } });
ok('new class is on the public register list', (await api('GET', '/classes/list')).data.some((c) => c.class_code === 'ITECH9/S/26'));
ok('student can register into the admin-created class', (await reg('9001', 'Zed', 'ITECH9/S/26')).status === 201);
ok('class with members cannot be deleted', (await api('DELETE', `/admin/classes?code=${encodeURIComponent('ITECH9/S/26')}`, { token: adminTok })).status === 409);
const deletedStudentReg = await reg('9002', 'Member To Delete', 'ITECH6');
const deletedStudent = (await api('GET', adminMembersPath, { token: adminTok })).data.find((m) => m.adm_no === '9002');
const privatePhoto = path.join(process.cwd(), 'uploads', 'member-delete-test.jpg');
await fs.promises.mkdir(path.dirname(privatePhoto), { recursive: true });
await fs.promises.writeFile(privatePhoto, 'test photo');
await pool.query('INSERT INTO attendance_logs (session_id, adm_no, photo_url) VALUES (?, ?, ?)', [sid, '9002', privatePhoto]);
await pool.query('INSERT INTO device_locks (adm_no, device_fingerprint) VALUES (?, ?)', ['9002', 'delete-test-device']);
await pool.query('INSERT INTO parent_alerts (adm_no, parent_email, alert_reason) VALUES (?, ?, ?)', ['9002', 'parent@example.com', 'test']);
await pool.query('INSERT INTO points_logs (adm_no, points, activity_type) VALUES (?, ?, ?)', ['9002', 5, 'test']);
await pool.query('INSERT INTO badges (adm_no, badge_name) VALUES (?, ?)', ['9002', 'test']);
await pool.query('INSERT INTO temp_id_requests (adm_no, face_score, expires_at) VALUES (?, ?, ?)', ['9002', 0, '2030-01-01 00:00:00']);
await pool.query('INSERT INTO campus_checkins (adm_no, service_type) VALUES (?, ?)', ['9002', 'library']);
ok('class member test student registered', deletedStudentReg.status === 201 && deletedStudent?.id > 0);
ok('invalid member deletion request rejected', (await api('DELETE', adminMembersPath, { token: adminTok })).status === 400);
ok('cannot delete a member outside the selected class', (await api('DELETE', `/admin/class-members?code=ITECH7&user_id=${deletedStudent.id}`, { token: adminTok })).status === 404);
const deletedMemberResponse = await api('DELETE', `/admin/class-members?code=ITECH6&user_id=${deletedStudent.id}`, { token: adminTok });
ok('administrator permanently deletes selected class member', deletedMemberResponse.status === 200 && (await pool.query('SELECT id FROM users WHERE id = ?', [deletedStudent.id]))[0].length === 0);
ok('member deletion removes student and attendance records', (await pool.query("SELECT adm_no FROM students WHERE adm_no = '9002'"))[0].length === 0 && (await pool.query("SELECT id FROM attendance_logs WHERE adm_no = '9002'"))[0].length === 0);
ok('member deletion removes dependent records and photo', (await pool.query("SELECT adm_no FROM device_locks WHERE adm_no = '9002'"))[0].length === 0 && (await pool.query("SELECT adm_no FROM parent_alerts WHERE adm_no = '9002'"))[0].length === 0 && (await pool.query("SELECT adm_no FROM points_logs WHERE adm_no = '9002'"))[0].length === 0 && (await pool.query("SELECT adm_no FROM badges WHERE adm_no = '9002'"))[0].length === 0 && (await pool.query("SELECT adm_no FROM temp_id_requests WHERE adm_no = '9002'"))[0].length === 0 && (await pool.query("SELECT adm_no FROM campus_checkins WHERE adm_no = '9002'"))[0].length === 0 && !fs.existsSync(privatePhoto));
ok('deleted member no longer appears in the class list', !(await api('GET', adminMembersPath, { token: adminTok })).data.some((m) => m.adm_no === '9002'));
await api('POST', '/auth/register-rep', { body: { adm_no: '9003', name: 'Rep To Delete', email: '9003@mtti.ac.ke', class_code: 'ITECH7', password: 'Passw0rd!' } });
const repToDelete = (await api('GET', '/admin/class-members?code=ITECH7', { token: adminTok })).data.find((m) => m.adm_no === '9003');
await pool.query('UPDATE classes SET rep_id = ? WHERE class_code = ?', [repToDelete.id, 'ITECH7']);
const deletedRep = await api('DELETE', `/admin/class-members?code=ITECH7&user_id=${repToDelete.id}`, { token: adminTok });
ok('deleting a class rep also clears its assigned-rep pointer', deletedRep.status === 200 && (await pool.query("SELECT rep_id FROM classes WHERE class_code = 'ITECH7'"))[0][0].rep_id === null);
await addCls({ class_code: 'TEMP1', course: 'Temp', module: 'M1' });
ok('empty class can be deleted', (await api('DELETE', '/admin/classes?code=TEMP1', { token: adminTok })).status === 200);
ok('deleting unknown class = 404', (await api('DELETE', '/admin/classes?code=TEMP1', { token: adminTok })).status === 404);
ok('class with sessions/members protected', (await api('DELETE', '/admin/classes?code=ITECH6', { token: adminTok })).status === 409);
for (const [who, tk] of [['student', s1], ['rep', repT], ['hod', hod]]) ok(`legacy create-class route blocked for ${who}`, (await api('POST', '/classes/request', { token: tk, body: { class_code: 'HACK1', course: 'x', module: 'y' } })).status === 403);

// staff management
const direct = await api('POST', '/admin/staff', { token: adminTok, body: { role: 'hod', name: 'Dr Direct', email: 'direct@mtti.ac.ke', password: 'Passw0rd!' } });
ok('admin adds staff directly (active immediately)', direct.status === 201 && (await login('direct@mtti.ac.ke', 'Passw0rd!', 'x')).data?.user?.role === 'hod');
ok('cannot add a student through the staff form', (await api('POST', '/admin/staff', { token: adminTok, body: { role: 'student', name: 'x', email: 'x@x.ke', password: 'Passw0rd!' } })).status === 400);
ok('staff form validates password + duplicate email', (await api('POST', '/admin/staff', { token: adminTok, body: { role: 'teacher', name: 'x', email: 'y@x.ke', password: '1' } })).status === 400 && (await api('POST', '/admin/staff', { token: adminTok, body: { role: 'teacher', name: 'x', email: 'direct@mtti.ac.ke', password: 'Passw0rd!' } })).status === 409);
const teachNew = (await api('GET', '/admin/staff', { token: adminTok })).data.find((x) => x.email === 'newteach@mtti.ac.ke');
const tNewTok = (await login('newteach@mtti.ac.ke', 'Passw0rd!', 'x')).data.token;
ok('teacher token works before deactivation', (await api('GET', '/teacher/dashboard', { token: tNewTok })).status === 200);
ok('admin deactivates teacher', (await api('POST', `/admin/staff/${teachNew.id}/status`, { token: adminTok, body: { status: 'inactive' } })).status === 200);
ok('deactivated user\'s EXISTING token stops working immediately', (await api('GET', '/teacher/dashboard', { token: tNewTok })).status === 401);
const deact = await login('newteach@mtti.ac.ke', 'Passw0rd!', 'x');
ok('deactivated user cannot sign in', deact.status === 403 && /deactivated/.test(deact.data.error));
ok('deactivated teacher disappears from lecturer list', !(await api('GET', '/classrep/lecturers', { token: repT })).data.some((l) => l.name === 'Mr New'));
ok('admin reactivates teacher', (await api('POST', `/admin/staff/${teachNew.id}/status`, { token: adminTok, body: { status: 'active' } })).status === 200 && (await login('newteach@mtti.ac.ke', 'Passw0rd!', 'x')).status === 200);
ok('admin cannot deactivate themselves', (await api('POST', `/admin/staff/${byEmail('admin1@mtti.ac.ke').id}/status`, { token: adminTok, body: { status: 'inactive' } })).status === 400);

ok('admin sets a staff password', (await api('POST', `/admin/staff/${teachNew.id}/password`, { token: adminTok, body: { password: 'BrandNew123!' } })).status === 200 && (await login('newteach@mtti.ac.ke', 'BrandNew123!', 'x')).status === 200 && (await login('newteach@mtti.ac.ke', 'Passw0rd!', 'x')).status === 401);
ok('short staff password rejected', (await api('POST', `/admin/staff/${teachNew.id}/password`, { token: adminTok, body: { password: '123' } })).status === 400);
await snap();


// ---------- 11. timetable files: ANY type, stored privately, served safely ----------
const fsx = await import('node:fs'); const pathx = await import('node:path');
const STORE = pathx.resolve(process.cwd(), 'storage/timetables');
const upFile = (name, bytes, type, tk = repT) => { const f = new FormData(); f.append('file', new Blob([bytes], { type }), name); return api('POST', '/classrep/timetable/upload', { token: tk, form: f }); };
const getFile = (id, q = '', tk = repT, base = '/classrep/timetable') => api('GET', `${base}/${id}/file${q}`, { token: tk, raw: true });
const hdr = (r, h) => r.res.headers.get(h) || '';
const isoShift = (days) => { const d = new Date(Date.now() + days * 86400000); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

const pdfBytes = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.from('timetable body')]);
const pdf = await upFile('Term 3 timetable.pdf', pdfBytes, 'application/pdf');
ok('rep uploads a PDF timetable', pdf.status === 201 && pdf.data.slots === 0 && pdf.data.file.name === 'Term 3 timetable.pdf' && pdf.data.file.previewable === true, JSON.stringify(pdf.data));
const pdfId = pdf.data.version_id;
const tPdf = await api('GET', '/classrep/timetable', { token: repT }); FIX['/classrep/timetable#pdf'] = tPdf.data;
ok('timetable page shows the file-only version', tPdf.data.version.id === pdfId && tPdf.data.version.file?.type === 'application/pdf' && tPdf.data.slots.length === 0 && tPdf.data.version.status === 'pending');
ok('new pending upload does not replace the student-visible approved timetable', (await api('GET', '/student/timetable', { token: s1 })).data?.version?.id === tvs.data[0].id);
ok('student cannot fetch an unapproved timetable file', (await getFile(pdfId, '', s1, '/student/timetable')).status === 403);
const g1 = await getFile(pdfId);
ok('PDF opens inline, byte-for-byte, with safe headers', g1.status === 200 && /application\/pdf/.test(hdr(g1, 'content-type')) && /^inline/.test(hdr(g1, 'content-disposition')) && hdr(g1, 'x-content-type-options') === 'nosniff' && g1.buf.equals(pdfBytes));
const g2 = await getFile(pdfId, '?download=1');
ok('?download=1 forces an attachment', g2.status === 200 && /^attachment/.test(hdr(g2, 'content-disposition')) && /octet-stream/.test(hdr(g2, 'content-type')));

const png = await upFile('ratiba.png', Buffer.from('89504e470d0a1a0a0000000d', 'hex'), 'image/png');
const jpeg = await upFile('PHOTO.JPG', Buffer.from('ffd8ffe000104a464946', 'hex'), 'image/jpeg');
ok('PNG and JPEG (any case) uploads are previewable images', png.status === 201 && png.data.file.previewable && jpeg.status === 201 && jpeg.data.file.previewable && jpeg.data.file.type === 'image/jpeg');
ok('image served inline as image/*', /image\/png/.test(hdr(await getFile(png.data.version_id), 'content-type')) && /image\/jpeg/.test(hdr(await getFile(jpeg.data.version_id), 'content-type')));

const html = await upFile('evil.html', '<script>alert(document.cookie)</script>', 'text/html');
const svg = await upFile('drawing.svg', '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>', 'image/svg+xml');
ok('HTML and SVG are accepted but NOT previewable', html.status === 201 && !html.data.file.previewable && svg.status === 201 && !svg.data.file.previewable);
const gh = await getFile(html.data.version_id), gs = await getFile(svg.data.version_id);
ok('HTML/SVG are forced to download (cannot run in the app)', [gh, gs].every((r) => r.status === 200 && /^attachment/.test(hdr(r, 'content-disposition')) && /octet-stream/.test(hdr(r, 'content-type')) && hdr(r, 'x-content-type-options') === 'nosniff'));

const others = await Promise.all([['plan.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], ['sheet.xlsx', 'application/octet-stream'], ['all.zip', 'application/zip'], ['setup.exe', 'application/x-msdownload'], ['noextension', 'application/octet-stream']].map(([n, ty]) => upFile(n, Buffer.from('data'), ty)));
ok('docx / xlsx / zip / exe / no-extension files are all accepted as downloads', others.every((r) => r.status === 201 && r.data.file.previewable === false));

const trav = await upFile('../../evil.sh', 'echo hi', 'text/x-sh');
ok('path traversal in the filename is neutralised', trav.status === 201 && trav.data.file.name === 'evil.sh');
const uni = await upFile('Ratiba ya masomo \u2013 Term 3.pdf', pdfBytes, 'application/pdf');
ok('non-ASCII filenames survive', uni.data?.file?.name === 'Ratiba ya masomo \u2013 Term 3.pdf' && /filename\*=UTF-8/.test(hdr(await getFile(uni.data.version_id), 'content-disposition')));
ok('stored names are server-generated (nothing user-controlled on disk)', fsx.readdirSync(STORE).every((n) => /^[0-9a-f-]{36}(\.[a-z0-9]+)?$/.test(n)), fsx.readdirSync(STORE).join(','));

const txt = await upFile('notes.txt', 'nonsense, not a timetable', 'text/plain');
ok('a text file that is not in lesson format is still accepted (as a file, no lessons)', txt.status === 201 && txt.data.slots === 0 && txt.data.file.name === 'notes.txt');
const csvUp = await upFile('lessons.csv', 'day,start,end,unit,venue,lecturer\nFriday,09:00,11:00,Electronics,Lab 3,Mr Teacher\nbad row', 'text/csv');
ok('CSV still becomes a lesson table AND keeps the original file', csvUp.status === 201 && csvUp.data.slots === 1 && csvUp.data.skipped === 1 && csvUp.data.file.name === 'lessons.csv');
const tCsv = await api('GET', '/classrep/timetable', { token: repT });
ok('timetable page: lessons + file for a CSV upload', tCsv.data.version.id === csvUp.data.version_id && tCsv.data.slots[0].unit === 'Electronics' && tCsv.data.version.file.name === 'lessons.csv');

const big = await upFile('huge.pdf', new Uint8Array(11 * 1024 * 1024), 'application/pdf');
ok('files over 10 MB are rejected with a clear message', big.status === 413 && /10 MB/.test(big.data.error), JSON.stringify(big.data));
ok('no file at all = 400', (await api('POST', '/classrep/timetable/upload', { token: repT, form: new FormData() })).status === 400);

// who may fetch the files
ok('file route needs a token', (await api('GET', `/classrep/timetable/${pdfId}/file`, { raw: true })).status === 401);
ok('student and teacher cannot use the rep file route', (await getFile(pdfId, '', s1)).status === 403 && (await getFile(pdfId, '', teach)).status === 403);
ok('unknown timetable id = 404', (await getFile(999999)).status === 404);
ok('HOD can approve a timetable file', (await api('POST', `/hod/timetables/${pdfId}/decision`, { token: hod, body: { decision: 'approved' } })).status === 200);
const studentFile = await getFile(pdfId, '', s1, '/student/timetable');
ok('student can open an approved timetable file for own class', studentFile.status === 200 && studentFile.buf.equals(pdfBytes));
ok('student cannot open another class timetable file', (await getFile(pdfId, '', sd, '/student/timetable')).status === 403);
ok('student timetable now shows the newly approved file', (await api('GET', '/student/timetable', { token: s1 })).data?.version?.id === pdfId);
const hodGet = await getFile(pdfId, '', hod, '/hod/timetables');
ok('HOD can open any class\'s timetable file', hodGet.status === 200 && hodGet.buf.equals(pdfBytes));
const hodList = await api('GET', '/hod/timetables', { token: hod });
ok('HOD list shows the attached file', hodList.data.find((x) => x.id === pdfId)?.file?.name === 'Term 3 timetable.pdf' && hodList.data.find((x) => x.id === pdfId).file.previewable === true);
ok('teacher cannot use the HOD file route', (await getFile(pdfId, '', teach, '/hod/timetables')).status === 403);

// another class's rep must not see this class's file
await api('POST', '/auth/register-rep', { body: { adm_no: '2000', name: 'Other Rep', email: '2000@mtti.ac.ke', class_code: 'ITECH7', password: 'Passw0rd!' } });
const pr = (await api('GET', '/hod/pending-reps', { token: hod })).data.find((r) => r.adm === '2000');
await api('POST', `/hod/approve-rep/${pr.id}`, { token: hod, body: { decision: 'approve' } });
const otherRep = (await login('2000@mtti.ac.ke', 'Passw0rd!', 'dev-other')).data.token;
ok('a rep from another class cannot open this class\'s file', (await getFile(pdfId, '', otherRep)).status === 403);
ok('...and sees none of its timetables', (await api('GET', '/classrep/timetable', { token: otherRep })).data.version === null);

// no orphan files: every file on disk belongs to a database row (failed/oversized uploads are cleaned up)
const rowsWithFile = (await pool.query('SELECT COUNT(*) AS n FROM timetable_versions WHERE file_path IS NOT NULL'))[0][0].n;
ok('no orphan files on disk after failed uploads', fsx.readdirSync(STORE).length === rowsWithFile, `${fsx.readdirSync(STORE).length} files vs ${rowsWithFile} rows`);
await snap();


// ---------- 12. weekly attendance sheet (Friday printout) ----------
const stamp = (d) => { const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`; };
const sess2 = await api('POST', '/classrep/sessions', { token: repT, body: { unit_name: 'Databases', lecturer_name: 'Mr Teacher', venue: 'Lab 2', late_threshold_mins: 1 } });
await pool.query('UPDATE sessions SET start_time = ? WHERE id = ?', [stamp(new Date(Date.now() - 5 * 60000)), sess2.data.id]); // began 5 min ago, "late" after 1 min
const qr2 = (await api('POST', '/qr/generate', { token: repT, body: { session_id: sess2.data.id, gps_lat: -1.123, gps_lng: 37.123 } })).data.token;
const lateScan = await scan(s1, { adm_no: '1001', device_id: 'dev-s1', session_id: sess2.data.id }, qr2);
ok('student scanning 5 min after start is marked late', lateScan.status === 201 && lateScan.data.is_late === true && lateScan.data.points_earned === 5, JSON.stringify(lateScan.data));

const wk = await api('GET', '/classrep/weekly-sheet', { token: repT });
const colOf = (unit) => wk.data.sessions.findIndex((s) => s.unit === unit);
const rowOf = (name) => wk.data.students.find((s) => s.name === name);
ok('weekly sheet lists both lessons of this week for the rep\'s class', wk.status === 200 && wk.data.classCode === 'ITECH6' && wk.data.sessions.length === 2 && colOf('Networking') >= 0 && colOf('Databases') >= 0, JSON.stringify(wk.data).slice(0, 200));
ok('week runs Monday to Sunday', new Date(wk.data.weekStart + 'T00:00:00').getDay() === 1 && (new Date(wk.data.weekEnd + 'T00:00:00') - new Date(wk.data.weekStart + 'T00:00:00')) / 86400000 === 6);
ok('Alice: present at Networking, LATE at Databases', rowOf('Alice').marks[colOf('Networking')] === 'P' && rowOf('Alice').marks[colOf('Databases')] === 'L' && rowOf('Alice').present === 2 && rowOf('Alice').late === 1 && rowOf('Alice').absent === 0 && rowOf('Alice').pct === 100, JSON.stringify(rowOf('Alice')));
ok('Brian: present at Networking, absent at Databases', rowOf('Brian').marks[colOf('Networking')] === 'P' && rowOf('Brian').marks[colOf('Databases')] === 'A' && rowOf('Brian').pct === 50);
ok('Carol (never checked in) is absent for both', rowOf('Carol').absent === 2 && rowOf('Carol').present === 0 && rowOf('Carol').pct === 0);
ok('totals: 2 of 5 students were present this week', wk.data.totals.students === 5 && wk.data.totals.sessions === 2 && wk.data.totals.presentStudents === 2 && wk.data.totals.perfect === 1, JSON.stringify(wk.data.totals));
ok('sheet shows which lessons the lecturer has signed', wk.data.sessions[colOf('Networking')].signed === true && wk.data.sessions[colOf('Databases')].signed === false);
ok('students are sorted by name', wk.data.students.map((s) => s.name).join() === [...wk.data.students.map((s) => s.name)].sort().join());
await snap();

const prevWeek = isoShift(-7);
const prev = await api('GET', `/classrep/weekly-sheet?week=${prevWeek}`, { token: repT });
ok('last week had no lessons (all-empty rows)', prev.status === 200 && prev.data.sessions.length === 0 && prev.data.students.every((s) => s.marks.length === 0) && prev.data.totals.presentStudents === 0);
ok('any day in the week selects that week', (await api('GET', `/classrep/weekly-sheet?week=${wk.data.weekEnd}`, { token: repT })).data.weekStart === wk.data.weekStart);
ok('bad week / bad format rejected', (await api('GET', '/classrep/weekly-sheet?week=abc', { token: repT })).status === 400 && (await api('GET', '/classrep/weekly-sheet?week=2026-13-45', { token: repT })).status === 400 && (await api('GET', '/classrep/weekly-sheet?format=xls', { token: repT })).status === 400);

const wPdf = await api('GET', '/classrep/weekly-sheet?format=pdf', { token: repT, raw: true });
ok('weekly PDF is a real PDF with a sensible filename', wPdf.status === 200 && wPdf.buf.slice(0, 4).toString() === '%PDF' && /application\/pdf/.test(hdr(wPdf, 'content-type')) && hdr(wPdf, 'content-disposition').includes(`weekly-attendance-ITECH6-${wk.data.weekStart}.pdf`) && wPdf.buf.length > 1500, `${wPdf.buf.length} bytes`);
if (process.env.SAVE_SAMPLES) fsx.writeFileSync(process.env.SAVE_SAMPLES + '/weekly.pdf', wPdf.buf);
const wCsv = await api('GET', '/classrep/weekly-sheet?format=csv', { token: repT, raw: true });
const csvLines = wCsv.buf.toString().split('\n');
ok('weekly CSV: header, one row per student, marks present', wCsv.status === 200 && /text\/csv/.test(hdr(wCsv, 'content-type')) && csvLines.length === 6 && csvLines[0].includes('Adm No') && csvLines[0].includes('Databases') && /Alice.*"L"/.test(wCsv.buf.toString()));

// permissions
ok('weekly sheet: student / teacher blocked, token required', (await api('GET', '/classrep/weekly-sheet', { token: s1 })).status === 403 && (await api('GET', '/classrep/weekly-sheet', { token: teach })).status === 403 && (await api('GET', '/classrep/weekly-sheet')).status === 401);
const otherSheet = await api('GET', '/classrep/weekly-sheet?class_code=ITECH6', { token: otherRep });
ok('a rep only ever gets their OWN class (the class_code param is ignored)', otherSheet.data.classCode === 'ITECH7' && !otherSheet.data.students.some((s) => s.name === 'Alice'));
ok('HOD needs class_code; unknown class = 404', (await api('GET', '/hod/weekly-sheet', { token: hod })).status === 400 && (await api('GET', '/hod/weekly-sheet?class_code=NOPE', { token: hod })).status === 404);
const hodSheet = await api('GET', '/hod/weekly-sheet?class_code=ITECH6', { token: hod });
ok('HOD gets the same sheet for any class', hodSheet.status === 200 && JSON.stringify(hodSheet.data.students) === JSON.stringify(wk.data.students));
ok('administrator can use the HOD route; teacher and rep cannot', (await api('GET', '/hod/weekly-sheet?class_code=ITECH6', { token: adminTok })).status === 200 && (await api('GET', '/hod/weekly-sheet?class_code=ITECH6', { token: teach })).status === 403 && (await api('GET', '/hod/weekly-sheet?class_code=ITECH6', { token: repT })).status === 403);
ok('administrator can fetch a class through the rep route with class_code', (await api('GET', '/classrep/weekly-sheet?class_code=ITECH6', { token: adminTok })).data.classCode === 'ITECH6');

// awkward inputs
const slashPdf = await api('GET', `/hod/weekly-sheet?class_code=${encodeURIComponent('ITECH9/S/26')}&format=pdf`, { token: hod, raw: true });
ok('class code with slashes + a class with no lessons still prints', slashPdf.status === 200 && slashPdf.buf.slice(0, 4).toString() === '%PDF' && hdr(slashPdf, 'content-disposition').includes('ITECH9_S_26'));
for (let i = 1; i <= 22; i++) await api('POST', '/classrep/sessions', { token: otherRep, body: { unit_name: `Bulk ${i}`, lecturer_name: 'Mr Teacher' } });
const manyPdf = await api('GET', '/classrep/weekly-sheet?format=pdf', { token: otherRep, raw: true });
if (process.env.SAVE_SAMPLES) fsx.writeFileSync(process.env.SAVE_SAMPLES + '/many.pdf', manyPdf.buf);
const manyJson = await api('GET', '/classrep/weekly-sheet', { token: otherRep });
ok('a week with 22 lessons (more than fit on the page) still produces a PDF; JSON/CSV keep all of them', manyPdf.status === 200 && manyPdf.buf.slice(0, 4).toString() === '%PDF' && manyJson.data.sessions.length === 22 && (await api('GET', '/classrep/weekly-sheet?format=csv', { token: otherRep, raw: true })).buf.toString().split('\n')[0].includes('Bulk 22'));

// even a long class is kept on one register page
for (let i = 1; i <= 40; i++) await reg(String(7000 + i), `Student ${String(i).padStart(2, '0')}`, 'ITECH9/S/26');
const longPdf = await api('GET', `/hod/weekly-sheet?class_code=${encodeURIComponent('ITECH9/S/26')}&format=pdf`, { token: hod, raw: true });
const pageCount = (longPdf.buf.toString('latin1').match(/\/Type \/Page\b/g) || []).length;
ok('a 41-student class prints on exactly one page', longPdf.status === 200 && pageCount === 1, `pages=${pageCount}`);
if (process.env.SAVE_SAMPLES) fsx.writeFileSync(process.env.SAVE_SAMPLES + '/long.pdf', longPdf.buf);
const longSheet = (await api('GET', `/hod/weekly-sheet?class_code=${encodeURIComponent('ITECH9/S/26')}`, { token: hod })).data;
ok('all 41 students are in the JSON and single-page register rows', longSheet.students.length === 41 && longSheet.classRegister.rows.length === 41);


// ---------- 12c. the official register (form MTTI/REG/CUR/01): slots, ticks/crosses, header fields ----------
{ // own block scope so these names can never clash with earlier sections
const { spawnSync } = await import('node:child_process');
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return isoShift(Math.round((d - new Date(new Date().toDateString())) / 86400000)); };
const mkStudent = async (adm, name, cls) => { const u = await pool.query("INSERT INTO users (email, password, name, role, class_code, status) VALUES (?, ?, ?, 'student', ?, 'active')", [`${adm}@mtti.ac.ke`, pw, name, cls]); await pool.query('INSERT INTO students (user_id, adm_no, parent_email, parent_phone) VALUES (?, ?, ?, ?)', [u[0].insertId, adm, '', '']); };
const mkSession = async (cls, unit, lect, start, o = {}) => (await pool.query('INSERT INTO sessions (class_code, unit_name, lecturer_name, start_time, end_time, late_threshold_mins, is_active, ended_at, signed_at) VALUES (?, ?, ?, ?, ?, 15, 0, ?, ?)', [cls, unit, lect, start, start, o.end || null, o.signed || null]))[0].insertId;
const mkLog = (sid, adm, when, late = 0) => pool.query('INSERT INTO attendance_logs (session_id, adm_no, photo_url, gps_lat, gps_lng, is_late, is_offline_synced, device_id, points_earned, timestamp) VALUES (?, ?, ?, 0, 0, ?, 0, ?, 15, ?)', [sid, adm, 'x.jpg', late, 'dev', when]);

const MON = wk.data.weekStart; // Monday of the current week (any weekday this test runs on)
const at = (day, hm) => stamp(new Date(`${addDays(MON, day)}T${hm}:00`));
const teacherId = (await pool.query("SELECT id FROM users WHERE email = 'teacher@mtti.ac.ke'"))[0][0].id;
await pool.query("INSERT INTO classes (class_code, course, module, department) VALUES ('REG1/S/26', 'ICT Technician', 'Module 1', 'Computing & Informatics')");
ok('class teacher can be assigned on class creation', (await api('PUT', '/admin/classes', { token: adminTok, body: { class_code: 'REG1/S/26', course: 'ICT Technician', module: 'Module 1', department: 'Computing & Informatics', class_teacher_id: teacherId } })).status === 200);
await mkStudent('3001', 'Rosa One', 'REG1/S/26'); await mkStudent('3002', 'Sam Two', 'REG1/S/26'); await mkStudent('3003', 'Tina Three', 'REG1/S/26');
const DM = ['Discrete Mathematics', 'Madam Lucy Kabura'], NW = ['Networking', 'Mr Teacher'];
const A1 = await mkSession('REG1/S/26', ...DM, at(0, '08:05'), { end: at(0, '09:58') });        // Mon, slot 1
const A4 = await mkSession('REG1/S/26', ...DM, at(0, '08:20'), { end: at(0, '10:02') });        // Mon, SAME slot (must merge)
const A2 = await mkSession('REG1/S/26', ...DM, at(0, '10:40'));                                 // Mon, slot 2
const A3 = await mkSession('REG1/S/26', ...DM, at(4, '15:40'), { signed: at(4, '17:40') });     // Fri, slot 4
await mkSession('REG1/S/26', ...DM, at(5, '09:00'));                                            // SATURDAY: no column on the register
const B1 = await mkSession('REG1/S/26', ...NW, at(1, '13:35'), { signed: at(1, '15:40') });     // Tue, slot 3
const B2 = await mkSession('REG1/S/26', ...NW, at(2, '07:00'));                                 // Wed, before 7:30 -> slot 1
for (const [sid, adm, when, late] of [[A1, '3001', at(0, '08:06')], [A2, '3001', at(0, '10:41')], [A3, '3001', at(4, '15:41')], [B1, '3001', at(1, '13:36')], [A1, '3002', at(0, '08:30'), 1], [A4, '3003', at(0, '08:21')], [B2, '3003', at(2, '07:01')]]) await mkLog(sid, adm, when, late || 0);

const regSheet = await api('GET', '/hod/weekly-sheet?class_code=REG1%2FS%2F26', { token: hod });
const dm = regSheet.data.subjects?.find((s) => s.unit === 'Discrete Mathematics'), nw = regSheet.data.subjects?.find((s) => s.unit === 'Networking');
const rowOfS = (subj, name) => subj.rows.find((r) => r.name === name).marks;
ok('register detail groups lessons by subject and carries lecturers through', regSheet.status === 200 && regSheet.data.subjects.length === 2 && dm.lecturer === 'Madam Lucy Kabura' && nw.lecturer === 'Mr Teacher', JSON.stringify(regSheet.data.subjects?.map((s) => s.unit)));
ok('register: lessons land in the right day + slot (early lesson -> first slot; same-slot lessons merge)', JSON.stringify(dm.cells.map((c) => [c.day, c.slot])) === '[[0,0],[0,1],[4,3]]' && JSON.stringify(nw.cells.map((c) => [c.day, c.slot])) === '[[1,2],[2,0]]', JSON.stringify([dm.cells, nw.cells]));
ok('register: TIME IN = earliest start, TIME OUT = latest recorded end of the merged cell', dm.cells[0].timeIn === '08:05:00' && dm.cells[0].timeOut === '10:02:00' && dm.cells[1].timeIn === '10:40:00' && dm.cells[1].timeOut === null && nw.cells[1].timeIn === '07:00:00', JSON.stringify(dm.cells));
ok('register: subject row maps the correct unit into each weekday/time slot', regSheet.data.subjectsBySlot.find((entry) => entry.slot === 0)?.units === 'Discrete Mathematics' && regSheet.data.subjectsBySlot.find((entry) => entry.slot === 6)?.units === 'Networking' && regSheet.data.subjectsBySlot.find((entry) => entry.slot === 8)?.units === 'Networking', JSON.stringify(regSheet.data.subjectsBySlot));
ok('register: "signed" only when every lesson in the cell is signed', dm.cells[0].signed === false && dm.cells[2].signed === true && nw.cells[0].signed === true && nw.cells[1].signed === false);
const first = (m) => m.map((v, i) => [i, v]).filter(([, v]) => v);
ok('register: Rosa has a tick wherever she attended, a cross where she missed, blank where no lesson', JSON.stringify(first(rowOfS(dm, 'Rosa One'))) === '[[0,"P"],[1,"P"],[19,"P"]]' && JSON.stringify(first(rowOfS(nw, 'Rosa One'))) === '[[6,"P"],[8,"A"]]');
ok('register: a LATE arrival still gets a tick; absent gets a cross', rowOfS(dm, 'Sam Two')[0] === 'P' && rowOfS(dm, 'Sam Two')[1] === 'A' && rowOfS(dm, 'Sam Two')[19] === 'A');
ok('register: attending either of two same-slot lessons counts for the slot', rowOfS(dm, 'Tina Three')[0] === 'P' && rowOfS(nw, 'Tina Three')[8] === 'P' && rowOfS(nw, 'Tina Three')[6] === 'A');
ok('register: slots with no lesson are blank (null), exactly 20 per student', dm.rows.every((r) => r.marks.length === 20) && rowOfS(dm, 'Tina Three')[2] === null && rowOfS(nw, 'Rosa One')[0] === null);
ok('class register combines subject attendance into one set of weekday/time-slot marks', regSheet.data.classRegister.rows.find((r) => r.name === 'Rosa One').marks[0] === 'P' && regSheet.data.classRegister.rows.find((r) => r.name === 'Sam Two').marks[0] === 'P' && regSheet.data.classRegister.rows.find((r) => r.name === 'Tina Three').marks[0] === 'P');
ok('register: Saturday lessons are reported as not shown', regSheet.data.weekendSkipped === 1);
ok('register header data: department, year, Mon-Fri dates, no week number until a term start is set', regSheet.data.department === 'Computing & Informatics' && regSheet.data.year === new Date(`${MON}T00:00:00`).getFullYear() && regSheet.data.weekNumber === null && /^\d{1,2} [A-Z][a-z]{2}$/.test(regSheet.data.dateFrom) && /^\d{1,2} [A-Z][a-z]{2}$/.test(regSheet.data.dateTo), JSON.stringify([regSheet.data.department, regSheet.data.year, regSheet.data.weekNumber, regSheet.data.dateFrom, regSheet.data.dateTo]));

// term start -> week number
FIX['/admin/settings#noterm'] = (await api('GET', '/admin/settings', { token: adminTok })).data;
ok('only the Administrator can read/set the term start', (await api('GET', '/admin/settings', { token: hod })).status === 403 && (await api('PUT', '/admin/settings', { token: hod, body: { term_start: MON } })).status === 403);
ok('term start must be a real date', (await api('PUT', '/admin/settings', { token: adminTok, body: { term_start: 'nope' } })).status === 400 && (await api('PUT', '/admin/settings', { token: adminTok, body: { term_start: '2026-13-40' } })).status === 400);
ok('admin sets the term start (35 days before this week -> week 6)', (await api('PUT', '/admin/settings', { token: adminTok, body: { term_start: addDays(MON, -35) } })).status === 200);
ok('week number is computed from the term start', (await api('GET', '/hod/weekly-sheet?class_code=REG1%2FS%2F26', { token: hod })).data.weekNumber === 6 && (await api('GET', `/hod/weekly-sheet?class_code=REG1%2FS%2F26&week=${addDays(MON, -35)}`, { token: hod })).data.weekNumber === 1 && (await api('GET', `/hod/weekly-sheet?class_code=REG1%2FS%2F26&week=${addDays(MON, -42)}`, { token: hod })).data.weekNumber === null);
ok('settings read-back + dashboard shows the term start', (await api('GET', '/admin/settings', { token: adminTok })).data.termStart === addDays(MON, -35) && (await api('GET', '/admin/dashboard', { token: adminTok })).data.termStart === addDays(MON, -35));

// department editing
ok('admin assigns the active teacher as class teacher', (await api('PUT', '/admin/classes', { token: adminTok, body: { class_code: 'ITECH6', course: 'ICT Technician', module: 'Module 6', department: 'Computing & Informatics', class_teacher_id: teacherId } })).status === 200 && (await api('GET', '/admin/classes', { token: adminTok })).data.find((c) => c.code === 'ITECH6').classTeacher === 'Mr Teacher' && (await api('GET', '/hod/weekly-sheet?class_code=ITECH6', { token: hod })).data.classTeacher === 'Mr Teacher');
ok('class teacher assignment rejects a non-teacher', (await api('PUT', '/admin/classes', { token: adminTok, body: { class_code: 'ITECH6', course: 'ICT Technician', module: 'Module 6', class_teacher_id: 999999 } })).status === 400);
ok('admin edits a class without changing its teacher assignment', (await api('PUT', '/admin/classes', { token: adminTok, body: { class_code: 'ITECH6', course: 'ICT Technician', module: 'Module 6', department: 'Computing & Informatics' } })).status === 200 && (await api('GET', '/admin/classes', { token: adminTok })).data.find((c) => c.code === 'ITECH6').classTeacher === 'Mr Teacher' && (await api('GET', '/hod/weekly-sheet?class_code=ITECH6', { token: hod })).data.department === 'Computing & Informatics');
ok('class edit validation', (await api('PUT', '/admin/classes', { token: adminTok, body: { class_code: 'NOPE', course: 'x', module: 'y' } })).status === 404 && (await api('PUT', '/admin/classes', { token: adminTok, body: { class_code: 'ITECH6', module: 'y' } })).status === 400 && (await api('PUT', '/admin/classes', { token: adminTok, body: { class_code: 'ITECH6', course: 'x', module: 'y', department: 'd'.repeat(101) } })).status === 400 && (await api('PUT', '/admin/classes', { token: hod, body: { class_code: 'ITECH6', course: 'x', module: 'y' } })).status === 403);
ok('a new class can be created with a department', (await addCls({ class_code: 'DEP1', course: 'Power', module: 'M1', department: 'Engineering' })).status === 201 && (await api('GET', '/admin/classes', { token: adminTok })).data.find((c) => c.code === 'DEP1').department === 'Engineering');
await api('DELETE', '/admin/classes?code=DEP1', { token: adminTok });

// time out is recorded when a session is ended, replaced, or signed
const autoClosed = await api('POST', '/classrep/sessions', { token: repT, body: { unit_name: 'Auto close check', lecturer_name: 'Mr Teacher' } });
const autoReplacement = await api('POST', '/classrep/sessions', { token: repT, body: { unit_name: 'Replacement check', lecturer_name: 'Mr Teacher' } });
const replacedRow = (await pool.query('SELECT ended_at, is_active FROM sessions WHERE id = ?', [autoClosed.data.id]))[0][0];
ok('starting a replacement session records the previous session stop time', replacedRow.ended_at && replacedRow.is_active === 0);
const live = autoReplacement;
await api('POST', '/classrep/sessions/end', { token: repT });
const endedRow = (await pool.query('SELECT ended_at, is_active FROM sessions WHERE id = ?', [live.data.id]))[0][0];
ok('ending a session records the time out', endedRow.ended_at && endedRow.is_active === 0, JSON.stringify(endedRow));
const live2 = await api('POST', '/classrep/sessions', { token: repT, body: { unit_name: 'Sign check', lecturer_name: 'Mr Teacher' } });
await api('POST', `/teacher/sessions/${live2.data.id}/sign`, { token: teach });
ok('signing a lesson also records the time out', (await pool.query('SELECT ended_at FROM sessions WHERE id = ?', [live2.data.id]))[0][0].ended_at);

// the PDF itself
const regPdf = await api('GET', '/hod/weekly-sheet?class_code=REG1%2FS%2F26&format=pdf', { token: hod, raw: true });
ok('register PDF is a landscape PDF with the logo image embedded', regPdf.status === 200 && regPdf.buf.slice(0, 4).toString() === '%PDF' && /\/Subtype \/Image/.test(regPdf.buf.toString('latin1')) && /MediaBox \[0 0 841\.89 595\.28\]/.test(regPdf.buf.toString('latin1')));
const pt = spawnSync('pdftotext', ['-layout', '-', '-'], { input: regPdf.buf, encoding: 'utf8' });
if (pt.status === 0) {
  const txt = pt.stdout;
  for (const want of ['MUKIRIA TECHNICAL TRAINING INSTITUTE', 'STUDENTS ATTENDANCE REGISTER', 'MTTI/REG/CUR/01', 'WEEK:', 'DATE FROM:', 'CLASS:', 'DEPARTMENT:', 'Computing & Informatics', 'YEAR:', 'CLASS TEACHER', 'Mr Teacher', 'SUBJECT', 'Discrete Mathematics', 'Networking', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'TIME IN', 'TIME OUT', 'ADM NO', 'NAME', 'ROSA ONE', 'SAM TWO', 'TINA THREE', '08:05:00', '10:02:00', '15:40:00', "TEACHER'S SIGN", "H.O.D'S COMMENTS", 'signed', 'REG1/S/26', '3001', 'Generated', 'EAT'])
    ok(`register PDF text contains "${want}"`, txt.includes(want));
  ok('PDF includes the precise generation timestamp', /Generated\s+\d{2}\s+[A-Za-z]{3}\s+\d{4},?\s+\d{2}:\d{2}:\d{2}/.test(txt), txt.slice(-300));
  ok('register PDF has exactly one page for the class and shows WEEK 6', (txt.match(/MUKIRIA TECHNICAL TRAINING INSTITUTE/g) || []).length === 1 && /WEEK:\s*6/.test(txt));
  ok('PDF places the assigned class teacher in the header', /CLASS TEACHER\s*:?\s*Mr Teacher/.test(txt));
} else console.log('(pdftotext not installed: PDF text checks skipped)');
{ const bad = await pool.query('INSERT INTO sessions (class_code, unit_name, lecturer_name, start_time, end_time, late_threshold_mins, is_active, ended_at) VALUES (?, ?, ?, ?, ?, 15, 0, ?)', ['REG1/S/26', 'Garbled', 'Mr Teacher', at(3, '08:00'), at(3, '10:00'), 'NaN-NaN-NaN NaN:NaN:NaN']);
  const g = (await api('GET', '/hod/weekly-sheet?class_code=REG1%2FS%2F26', { token: hod })).data.subjects.find((s) => s.unit === 'Garbled');
  ok('a garbled end time prints blank, never "NaN:NaN"', g.cells[0].timeIn === '08:00:00' && g.cells[0].timeOut === null, JSON.stringify(g.cells));
  const gp = spawnSync('pdftotext', ['-layout', '-', '-'], { input: (await api('GET', '/hod/weekly-sheet?class_code=REG1%2FS%2F26&format=pdf', { token: hod, raw: true })).buf, encoding: 'utf8' });
  if (gp.status === 0) ok('no "NaN" anywhere in the printed register', !/NaN|undefined|null/.test(gp.stdout), (gp.stdout.match(/.{0,30}(NaN|undefined|null).{0,20}/) || [''])[0]);
  await pool.query('DELETE FROM sessions WHERE id = ?', [bad[0].insertId]); }
ok('weekly CSV stays a flat data export of all lessons (including the Saturday one)', (await api('GET', '/hod/weekly-sheet?class_code=REG1%2FS%2F26&format=csv', { token: hod, raw: true })).buf.toString().split('\n')[0].split(',').length >= 7 + 4);

if (process.env.SAVE_SAMPLES) { // a realistic register for eyeballing the layout: 22 students, one subject, Mon 2026-08-31 .. Fri 2026-09-04
  fsx.writeFileSync(process.env.SAVE_SAMPLES + '/register-reg1.pdf', regPdf.buf);
  const SC = 'ITECH6/S/24/J/M/25';
  await pool.query("INSERT INTO classes (class_code, course, module, department) VALUES (?, 'ICT Technician', 'Module 6', 'Computing & Informatics')", [SC]);
  const FIRST = ['Amani', 'Brenda', 'Caleb', 'Dorcas', 'Elias', 'Faith', 'Gideon', 'Hannah', 'Isaac', 'Joy', 'Kelvin', 'Lydia', 'Moses', 'Naomi', 'Oscar', 'Purity', 'Quincy', 'Ruth', 'Samson', 'Teresia', 'Uriel', 'Vivian'];
  const LAST = ['Mwangi', 'Otieno', 'Kamau', 'Wanjiru', 'Njeru', 'Kariuki', 'Mutua', 'Achieng', 'Kimani', 'Chebet', 'Mugambi', 'Nyaga', 'Baraza', 'Wafula', 'Murithi', 'Gitonga', 'Karimi', 'Muriuki', 'Kinyua', 'Kiplagat', 'Ouma', 'Mbogo'];
  const adms = FIRST.map((_, i) => String(12000 + i * 37));
  for (let i = 0; i < 22; i++) await mkStudent(adms[i], `${FIRST[i]} ${LAST[i]}`, SC);
  const slots = [[0, '08:02'], [0, '10:34'], [0, '13:32'], [1, '10:31'], [1, '13:33'], [2, '08:05'], [2, '10:30'], [3, '08:01'], [3, '10:36'], [4, '08:10'], [4, '10:32'], [4, '13:31']];
  const w0 = '2026-08-31', atW = (d, hm) => stamp(new Date(`${addDays(w0, d)}T${hm}:00`));
  for (const [j, [d, hm]] of slots.entries()) {
    const startAt = new Date(`${addDays(w0, d)}T${hm}:00`);
    const sid = await mkSession(SC, 'Discrete Mathematics', 'Madam Lucy Kabura', stamp(startAt), { end: j % 3 === 2 ? null : stamp(new Date(startAt.getTime() + 115 * 60000)), signed: d <= 2 ? atW(d, '17:40') : null });
    for (let i = 0; i < 22; i++) if ((i * 7 + j * 3) % 11 !== 0 && !(i === 4 && j > 3) && !(i === 9 && j % 2)) await mkLog(sid, adms[i], atW(d, hm));
  }
  await pool.query("DELETE FROM app_settings WHERE setting_key = 'term_start'"); await pool.query("INSERT INTO app_settings (setting_key, setting_value) VALUES ('term_start', ?)", [w0]);
  const sample = await api('GET', `/hod/weekly-sheet?class_code=${encodeURIComponent(SC)}&week=${w0}&format=pdf`, { token: hod, raw: true });
  fsx.writeFileSync(process.env.SAVE_SAMPLES + '/register-sample.pdf', sample.buf);
}
}
await snap();


// ---------- 13. HOD "Device locks" page: fixing "Device mismatch" without touching the database ----------
{
  await reg('8001', 'Lock Test', 'ITECH6');
  const email = '8001@mtti.ac.ke';
  ok('first sign-in registers phone A', (await login(email, 'Passw0rd!', 'phone-A')).status === 200);
  const blocked = await login(email, 'Passw0rd!', 'phone-B');
  ok('signing in from another device is blocked with the "Device mismatch" message', blocked.status === 403 && /Device mismatch/.test(blocked.data.error) && /HOD/.test(blocked.data.error), JSON.stringify(blocked.data));

  const find = (qs, tk = hod) => api('GET', `/hod/devices${qs}`, { token: tk });
  const byName = await find('?search=lock%20test');
  const me8001 = byName.data?.students?.[0];
  ok('HOD finds the locked-out student by name', byName.status === 200 && byName.data.students.length === 1 && me8001.adm === '8001' && me8001.classCode === 'ITECH6' && me8001.registered === true && /\d{4}/.test(me8001.since || ''), JSON.stringify(byName.data));
  ok('...also by admission number, by email, case-insensitively', (await find('?search=8001')).data.students[0]?.name === 'Lock Test' && (await find('?search=8001%40MTTI')).data.students[0]?.adm === '8001' && (await find('?search=LOCK')).data.students.some((s) => s.adm === '8001'));
  ok('class filter narrows the list; unknown search is empty', (await find('?class_code=ITECH6')).data.students.every((s) => s.classCode === 'ITECH6') && !(await find('?class_code=ITECH7')).data.students.some((s) => s.adm === '8001') && (await find('?search=zzzznope')).data.students.length === 0);
  ok('the device fingerprint itself is never sent to the browser', !JSON.stringify(byName.data).includes('phone-A'));
  const all = await find('');
  ok('the full list shows registered and not-yet-registered students', all.data.students.some((s) => s.registered) && all.data.students.some((s) => !s.registered) && all.data.truncated === false);
  ok('only HOD / Administrator may use it', (await find('', s1)).status === 403 && (await find('', repT)).status === 403 && (await find('', teach)).status === 403 && (await find('', adminTok)).status === 200 && (await api('GET', '/hod/devices')).status === 401);

  ok('resetting an unknown admission number = 404', (await api('POST', '/hod/students/NOPE999/reset-device', { token: hod })).status === 404);
  const rs = await api('POST', '/hod/students/8001/reset-device', { token: hod });
  ok('HOD resets the device (message names the student)', rs.status === 200 && /Lock Test/.test(rs.data.message) && /cleared/.test(rs.data.message), JSON.stringify(rs.data));
  ok('list now shows no registered device', (await find('?search=8001')).data.students[0].registered === false);
  ok('the student can now sign in from the NEW device (phone B)', (await login(email, 'Passw0rd!', 'phone-B')).status === 200);
  ok('...and phone B is now the registered one (phone A is blocked)', (await login(email, 'Passw0rd!', 'phone-A')).status === 403 && (await find('?search=8001')).data.students[0].registered === true);
  await api('POST', '/hod/students/8001/reset-device', { token: hod });
  ok('resetting when nothing is registered is harmless and says so', /nothing to clear/.test((await api('POST', '/hod/students/8001/reset-device', { token: hod })).data.message));
  ok('a class rep can still reset their own classmates, but not other classes', (await api('POST', '/classrep/members/8001/reset-device', { token: repT })).status === 200 && (await api('POST', '/classrep/members/2001/reset-device', { token: repT })).status === 404);
}
await snap();


// ---------- 14. forgot-password EMAIL: real nodemailer -> a fake SMTP server speaking the real protocol ----------
{
  const { createHash } = await import('node:crypto'); const net = await import('node:net');
  const sha = (x) => createHash('sha256').update(x).digest('hex');
  process.env.RESET_IP_LIMIT = '1000'; // generous for the many requests below; the IP limit gets its own test
  const forgot = (email) => api('POST', '/auth/forgot-password-email', { body: { email } });

  // ----- A. email NOT configured yet -----
  const unconfKnown = await forgot('1001@mtti.ac.ke'), unconfUnknown = await forgot('nobody@example.com');
  ok('without email settings the form says so (503), identically for known and unknown addresses', unconfKnown.status === 503 && unconfUnknown.status === 503 && unconfKnown.data.error === unconfUnknown.data.error && /not set up/.test(unconfKnown.data.error), JSON.stringify(unconfKnown.data));
  ok('invalid email addresses are rejected', (await forgot('not-an-email')).status === 400 && (await forgot('')).status === 400);
  const st0 = await api('GET', '/admin/email', { token: adminTok });
  FIX['/admin/email#unconfigured'] = st0.data;
  ok('admin sees that email is not configured and exactly what is missing', st0.status === 200 && st0.data.configured === false && ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS'].every((k) => st0.data.missing.includes(k)), JSON.stringify(st0.data));
  ok('test email refused while unconfigured', (await api('POST', '/admin/email/test', { token: adminTok, body: { to: 'a@b.co' } })).status === 400);
  ok('only the Administrator can see or test email settings', (await api('GET', '/admin/email', { token: hod })).status === 403 && (await api('POST', '/admin/email/test', { token: s1, body: {} })).status === 403);

  // ----- B. a fake SMTP server (AUTH PLAIN) that records every message -----
  const mails = [];
  const smtp = net.createServer((sock) => {
    let buf = '', inData = false, cur = { from: '', to: [], data: '' };
    const send = (l) => sock.write(l + '\r\n');
    send('220 fake.smtp ESMTP ready');
    sock.on('data', (chunk) => {
      buf += chunk.toString('latin1');
      for (;;) {
        if (inData) { const end = buf.indexOf('\r\n.\r\n'); if (end === -1) return; cur.data = buf.slice(0, end); buf = buf.slice(end + 5); inData = false; mails.push(cur); cur = { from: '', to: [], data: '' }; send('250 OK queued'); continue; }
        const nl = buf.indexOf('\r\n'); if (nl === -1) return;
        const line = buf.slice(0, nl); buf = buf.slice(nl + 2); const cmd = line.toUpperCase();
        if (cmd.startsWith('EHLO') || cmd.startsWith('HELO')) sock.write('250-fake.smtp\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n');
        else if (cmd.startsWith('AUTH PLAIN')) { const c = Buffer.from(line.split(' ')[2] || '', 'base64').toString().split('\0'); send(c[1] === 'mailer@mtti.test' && c[2] === 'smtp-pass' ? '235 2.7.0 Authentication successful' : '535 5.7.8 Username and Password not accepted'); }
        else if (cmd.startsWith('MAIL FROM')) { cur.from = line; send('250 OK'); }
        else if (cmd.startsWith('RCPT TO')) { cur.to.push(line); send('250 OK'); }
        else if (cmd === 'DATA') { inData = true; send('354 End data with <CR><LF>.<CR><LF>'); }
        else if (cmd === 'QUIT') { send('221 Bye'); sock.end(); }
        else send('250 OK');
      }
    });
    sock.on('error', () => {});
  });
  await new Promise((r) => smtp.listen(0, '127.0.0.1', r));
  const smtpPort = smtp.address().port;
  Object.assign(process.env, { EMAIL_HOST: '127.0.0.1', EMAIL_PORT: String(smtpPort), EMAIL_USER: 'mailer@mtti.test', EMAIL_PASS: 'smtp-pass', FRONTEND_URL: 'http://192.168.7.5:5173' });

  const qp = (x) => x.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  const decodeMail = (raw) => raw.split(/\r?\n--[^\r\n]+/).map((p) => { const [h, ...rest] = p.split(/\r?\n\r?\n/); const body = rest.join('\n\n'); return /quoted-printable/i.test(h) ? qp(body) : /base64/i.test(h) ? Buffer.from(body.replace(/\s+/g, ''), 'base64').toString() : p; }).join('\n');
  const last = () => mails[mails.length - 1];
  const rcpt = (m) => m.to.join(' ').toLowerCase();
  const subject = (m) => (m.data.match(/^Subject: (.*)$/mi) || [])[1] || '';
  const body = (m) => decodeMail(m.data);
  const htmlOf = (m) => { const p = m.data.split(/\r?\n--[^\r\n]+/).find((x) => /Content-Type: text\/html/i.test(x)) || ''; const [h, ...rest] = p.split(/\r?\n\r?\n/); const b = rest.join('\n\n'); return /quoted-printable/i.test(h) ? qp(b) : /base64/i.test(h) ? Buffer.from(b.replace(/\s+/g, ''), 'base64').toString() : b; };
  const linkOf = (m) => { const x = body(m).match(/reset-password\?email=([^&\s"]+)&(?:amp;)?token=([0-9a-f]{64})/); return x ? { email: decodeURIComponent(x[1]), token: x[2] } : null; };
  const mailAfter = async (n0, ms = 4000) => { const t0 = Date.now(); while (mails.length <= n0 && Date.now() - t0 < ms) await wait(40); return mails.length > n0; };
  const resetWith = (email, token, newPassword, viaPath = true) => api('POST', `/auth/reset-password/${viaPath ? token : 'x'}`, { body: { email, token, newPassword } });

  // ----- C. admin tools: status + test email -----
  const st1 = await api('GET', '/admin/email', { token: adminTok });
  FIX['/admin/email'] = st1.data;
  ok('admin sees email configured; the password is never exposed', st1.data.configured === true && st1.data.host === '127.0.0.1' && st1.data.user === 'ma***@mtti.test' && st1.data.frontendUrl === 'http://192.168.7.5:5173' && st1.data.missing.length === 0 && !JSON.stringify(st1.data).includes('smtp-pass'), JSON.stringify(st1.data));
  let n = mails.length;
  const te = await api('POST', '/admin/email/test', { token: adminTok, body: { to: 'tester@example.com' } });
  ok('test email is really delivered over SMTP (right recipient, sender = the login account)', te.status === 200 && mails.length === n + 1 && rcpt(last()).includes('tester@example.com') && /test/i.test(subject(last())) && /mailer@mtti\.test/.test(last().from), JSON.stringify(te.data));
  n = mails.length; await api('POST', '/admin/email/test', { token: adminTok, body: {} });
  ok('test email with no address goes to the administrator\'s own email', mails.length === n + 1 && rcpt(last()).includes('admin1@mtti.ac.ke'));
  ok('test email validates the address', (await api('POST', '/admin/email/test', { token: adminTok, body: { to: 'nope' } })).status === 400);
  process.env.EMAIL_PASS = 'wrong';
  const badAuth = await api('POST', '/admin/email/test', { token: adminTok, body: { to: 'tester@example.com' } });
  process.env.EMAIL_PASS = 'smtp-pass';
  ok('wrong SMTP password gives a clear message (mentions App Password)', badAuth.status === 502 && /username or password/.test(badAuth.data.error) && /App Password/i.test(badAuth.data.error), JSON.stringify(badAuth.data));
  process.env.EMAIL_PORT = '1';
  const noServer = await api('POST', '/admin/email/test', { token: adminTok, body: { to: 'tester@example.com' } });
  process.env.EMAIL_PORT = String(smtpPort);
  ok('unreachable mail server gives a clear message naming host:port', noServer.status === 502 && /Cannot reach the mail server 127\.0\.0\.1:1/.test(noServer.data.error), JSON.stringify(noServer.data));

  // ----- D. forgot-password email for EVERY kind of user -----
  const roles = [['student', '1001@mtti.ac.ke'], ['class rep', '1000@mtti.ac.ke'], ['teacher', 'teacher@mtti.ac.ke'], ['HOD', 'hod@mtti.ac.ke'], ['administrator', 'admin1@mtti.ac.ke']];
  for (const [who, em] of roles) {
    const n0 = mails.length; const r = await forgot(em); const got = await mailAfter(n0); const m = last(); const lk = got && linkOf(m);
    ok(`reset email reaches a ${who}, with a working link to the app`, r.status === 200 && got && rcpt(m).includes(em) && /Reset your/.test(subject(m)) && /mailer@mtti\.test/.test(m.from) && !!lk && lk.email === em && body(m).includes('http://192.168.7.5:5173/auth/reset-password?email='), `${r.status} ${got} ${rcpt(m)} ${subject(m)}`);
  }
  let n1 = mails.length; const known = await forgot('1003@mtti.ac.ke'); await mailAfter(n1); n1 = mails.length;
  const unknown = await forgot('ghost@example.com'); await wait(600);
  ok('the answer is identical for known and unknown addresses (nobody can probe who has an account)', known.status === 200 && unknown.status === 200 && JSON.stringify(known.data) === JSON.stringify(unknown.data), JSON.stringify([known.data, unknown.data]));
  ok('...and nothing is sent to an unknown address', mails.length === n1);
  await api('POST', '/auth/register-rep', { body: { adm_no: '8200', name: 'Pending Rep', email: 'pendrep@mtti.ac.ke', class_code: 'ITECH7', password: 'Passw0rd!' } });
  await pool.query("UPDATE users SET status = 'inactive' WHERE email = 'cli@mtti.ac.ke'");
  n1 = mails.length;
  const nots = await Promise.all([forgot('pendrep@mtti.ac.ke'), forgot('admin2@mtti.ac.ke'), forgot('cli@mtti.ac.ke')]); await wait(700);
  ok('pending, rejected and deactivated accounts get the same answer but NO email', nots.every((r) => r.status === 200) && mails.length === n1);
  n1 = mails.length; await forgot('1000@MTTI.AC.KE'); ok('the address is matched case-insensitively', await mailAfter(n1));

  // ----- E. the reset itself (fresh student) -----
  await reg('8101', 'Reset Tester', 'ITECH6');
  const rtEmail = '8101@mtti.ac.ke';
  const rt1 = (await login(rtEmail, 'Passw0rd!', 'dev-rt')).data.token;
  ok('before the reset the old session works', (await api('GET', '/student/dashboard', { token: rt1 })).status === 200);
  let nm = mails.length; await forgot(rtEmail); await mailAfter(nm);
  const mail1 = last(), lk1 = linkOf(mail1);
  const stored = (await pool.query('SELECT reset_token FROM users WHERE email = ?', [rtEmail]))[0][0].reset_token;
  ok('only a HASH of the reset code is stored (a database leak gives no working links)', stored === sha(lk1.token) && stored !== lk1.token && stored.length === 64);
  ok('wrong code, someone else\'s email and a too-short password are all refused', (await resetWith(rtEmail, 'f'.repeat(64), 'GoodPass123')).status === 400 && (await resetWith('1001@mtti.ac.ke', lk1.token, 'GoodPass123')).status === 400 && (await resetWith(rtEmail, lk1.token, 'short')).status === 400);
  nm = mails.length;
  const done = await resetWith(rtEmail, lk1.token, 'BrandNewPass1');
  ok('the emailed link\'s code resets the password', done.status === 200 && /successfully/.test(done.data.message), JSON.stringify(done.data));
  ok('the new password works; the old one does not', (await login(rtEmail, 'BrandNewPass1', 'dev-rt')).status === 200 && (await login(rtEmail, 'Passw0rd!', 'dev-rt')).status === 401);
  ok('a code works only ONCE', (await resetWith(rtEmail, lk1.token, 'AnotherPass123')).status === 400);
  ok('every session from before the reset is signed out', (await api('GET', '/student/dashboard', { token: rt1 })).status === 401);
  ok('a "your password was changed" email is sent', await mailAfter(nm) && /changed/.test(subject(last())) && rcpt(last()).includes(rtEmail));
  const rt2 = (await login(rtEmail, 'BrandNewPass1', 'dev-rt')).data.token;
  ok('a session started AFTER the reset works', (await api('GET', '/student/dashboard', { token: rt2 })).status === 200);

  // expiry + "newest request wins"
  nm = mails.length; await forgot(rtEmail); await mailAfter(nm); const lkOld = linkOf(last());
  nm = mails.length; await forgot(rtEmail); await mailAfter(nm); const lkNew = linkOf(last());
  ok('asking again replaces the earlier code (the old email link stops working)', (await resetWith(rtEmail, lkOld.token, 'ReplacedPass123')).status === 400);
  await pool.query('UPDATE users SET reset_expiry = ? WHERE email = ?', [new Date(Date.now() - 1000), rtEmail]);
  ok('an EXPIRED code is refused', (await resetWith(rtEmail, lkNew.token, 'ExpiredPass123')).status === 400);

  // ----- F. abuse + edge cases -----
  const bomb = []; for (let i = 0; i < 6; i++) bomb.push((await forgot('bomb@example.com')).status);
  ok('the 6th reset request for one address within 15 minutes is blocked (429)', JSON.stringify(bomb) === '[200,200,200,200,200,429]', JSON.stringify(bomb));
  process.env.RESET_IP_LIMIT = '1';
  ok('a per-IP limit also applies', (await forgot('other@example.com')).status === 429);
  process.env.RESET_IP_LIMIT = '1000';
  delete process.env.FRONTEND_URL; nm = mails.length; await forgot('hod@mtti.ac.ke'); await mailAfter(nm);
  ok('without FRONTEND_URL the email carries a code instead of a link (links are never built from the request)', /[0-9a-f]{64}/.test(body(last())) && !/reset-password\?email=/.test(body(last())) && /code/i.test(body(last())));
  process.env.FRONTEND_URL = 'http://192.168.7.5:5173';
  await api('POST', '/admin/staff', { token: adminTok, body: { role: 'teacher', name: '<b>Evil</b> & "Co"', email: 'evil@mtti.ac.ke', password: 'Passw0rd!' } });
  nm = mails.length; await forgot('evil@mtti.ac.ke'); await mailAfter(nm);
  ok('names are HTML-escaped inside the email\'s HTML (no injected markup)', htmlOf(last()).includes('&lt;b&gt;Evil&lt;/b&gt; &amp; &quot;Co&quot;') && !htmlOf(last()).includes('<b>Evil</b>') && htmlOf(last()).length > 200);
  // administrator-set passwords also sign the person out
  const staffRow = (await api('GET', '/admin/staff', { token: adminTok })).data.find((x) => x.email === 'evil@mtti.ac.ke');
  const evilTok = (await login('evil@mtti.ac.ke', 'Passw0rd!', 'x')).data.token;
  ok('staff session works before the administrator changes their password', (await api('GET', '/teacher/dashboard', { token: evilTok })).status === 200);
  await api('POST', `/admin/staff/${staffRow.id}/password`, { token: adminTok, body: { password: 'ChangedByAdmin1' } });
  ok('...and is signed out immediately afterwards', (await api('GET', '/teacher/dashboard', { token: evilTok })).status === 401);
  ok('...but the new password works', (await login('evil@mtti.ac.ke', 'ChangedByAdmin1', 'x')).status === 200);

  smtp.close();
  for (const k of ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'FRONTEND_URL']) delete process.env[k];
}
await snap();


// ---------- 15. notification bell: role-specific, live, and it changes with the real situation ----------
{
  const notes = async (tk) => (await api('GET', '/notifications', { token: tk })).data?.items || [];
  const has = (items, prefix) => items.find((i) => i.id.startsWith(prefix));
  ok('notifications need a sign-in', (await api('GET', '/notifications')).status === 401);

  // student with low attendance (Carol: never checked in; her old token was invalidated by her password reset in section 9)
  const carolTok = (await login('1003@mtti.ac.ke', 'NewPassw0rd!', 'dev-s3')).data.token;
  const live = await api('POST', '/classrep/sessions', { token: repT, body: { unit_name: 'Open Now', lecturer_name: 'Mr Teacher' } });
  const c1 = await notes(carolTok);
  ok('student: "attendance is open" while a session is running and they have not checked in', has(c1, `open-${live.data.id}`)?.link === '/scan' && has(c1, 'open-').kind === 'warn' && /Open Now/.test(has(c1, 'open-').title));
  ok('student: low-attendance warning links to exam eligibility', has(c1, 'low-')?.kind === 'warn' && has(c1, 'low-').link === '/student/exam-eligibility' && /below|need at least 75/.test(has(c1, 'low-').text + has(c1, 'low-').title) || /75/.test(has(c1, 'low-')?.text));
  ok('student: class announcements and the temp-ID decision show up', c1.some((i) => i.id.startsWith('ann-') && /Exam on Monday/.test(i.text) && i.link === '/student/chat' && i.when) && has(c1, 'tid-')?.id.endsWith('-approved') && has(c1, 'tid-').kind === 'ok');
  await api('POST', '/classrep/sessions/end', { token: repT });
  ok('...and "attendance is open" disappears once the session ends', !has(await notes(carolTok), 'open-'));
  ok('student sees nothing meant for staff', c1.every((i) => !/^\/(hod|admin|teacher|rep)\//.test(i.link)));

  // a student in a class with no lessons yet: empty list
  await reg('8301', 'Fresh Student', 'ITECH9/S/26');
  ok('student with nothing to report gets an empty list', (await notes((await login('8301@mtti.ac.ke', 'Passw0rd!', 'dev-f')).data.token)).length === 0);

  // class rep: waiting temp-ID requests + weekend reminder
  const rtTok = (await login('8101@mtti.ac.ke', 'BrandNewPass1', 'dev-rt')).data.token;
  await api('POST', '/student/temp-id', { token: rtTok, body: { reason: 'Lost it' } });
  const r1 = await notes(repT);
  ok('class rep: "temporary ID request waiting" with a link to approve it', has(r1, 'rep-tid-1')?.link === '/rep/temp-ids' && has(r1, 'rep-tid-1').kind === 'warn', JSON.stringify(r1.map((i) => i.id)));
  const dow = new Date().getDay();
  ok('class rep: the "print this week\'s register" reminder appears Friday to Sunday only', !!has(r1, 'weekly-') === (dow === 5 || dow === 6 || dow === 0));
  const pend = (await api('GET', '/classrep/temp-ids', { token: repT })).data[0];
  await api('POST', `/classrep/temp-ids/${pend.id}/decision`, { token: repT, body: { decision: 'approved' } });
  ok('...it disappears when the rep approves, and the student is told', !has(await notes(repT), 'rep-tid-') && /approved/.test(has(await notes(rtTok), 'tid-')?.title || ''));

  // teacher / HOD / administrator
  const tn = await notes(teach);
  ok('teacher: lessons waiting for their signature', has(tn, 'sign-')?.link === '/teacher/sign-attendance' && /waiting for your signature/.test(has(tn, 'sign-').title));
  const hn = await notes(hod);
  ok('HOD: reps awaiting approval, timetables awaiting approval, students at risk', has(hn, 'reps-')?.link === '/hod/approve-rep' && has(hn, 'tts-')?.link === '/hod/timetables' && has(hn, 'risk-')?.kind === 'info');
  const an = await notes(adminTok);
  ok('administrator: "email is not set up" warning (email is unconfigured at this point)', has(an, 'email-unset')?.link === '/admin/settings' && has(an, 'email-unset').kind === 'warn');
  ok('administrator: no term-start nag while one is set, then it appears when cleared', !has(an, 'term-unset') && (await api('PUT', '/admin/settings', { token: adminTok, body: { term_start: '' } })).status === 200 && !!has(await notes(adminTok), 'term-unset'));
  await api('PUT', '/admin/settings', { token: adminTok, body: { term_start: isoShift(-35) } });
  await api('POST', '/auth/register-teacher', { body: { name: 'Pending Staff', email: 'pendstaff@mtti.ac.ke', password: 'Passw0rd!' } });
  const sa = has(await notes(adminTok), 'staff-');
  ok('administrator: staff registrations awaiting approval', sa?.link === '/admin/staff' && /awaiting approval/.test(sa.title));
  ok('HOD does not get administrator items and vice versa', !has(hn, 'email-unset') && !has(hn, 'staff-') && !has(await notes(adminTok), 'reps-'));

  // shape + stability
  const a1 = await notes(adminTok), a2 = await notes(adminTok), all = [...c1, ...hn, ...tn, ...a1];
  ok('every notification is well-formed', all.every((i) => i.id && ['warn', 'ok', 'info'].includes(i.kind) && i.icon && i.title && i.text && String(i.link).startsWith('/')));
  ok('ids are unique within a list and stable between calls (so "unread" works)', new Set(a1.map((i) => i.id)).size === a1.length && JSON.stringify(a1.map((i) => i.id)) === JSON.stringify(a2.map((i) => i.id)));
  ok('warnings are listed before information', (() => { const k = a1.map((i) => i.kind); return k.join() === [...k].sort((x, y) => ({ warn: 0, ok: 1, info: 2 }[x] - { warn: 0, ok: 1, info: 2 }[y])).join(); })());
}
await snap();


// ---------- 15. the notification bell ----------
{
  const nf = (tk) => api('GET', '/notifications', { token: tk });
  const ids = (r) => r.data.items.map((i) => i.id);
  const has = (r, prefix) => r.data.items.some((i) => i.id.startsWith(prefix));
  const within = (r, prefixes) => r.data.items.every((i) => prefixes.some((p) => i.link.startsWith(p)));
  ok('notifications need a token', (await api('GET', '/notifications')).status === 401);

  // a student who is behind: Carol (0% attendance, approved temp ID, class announcements)
  const carolTok = (await login('1003@mtti.ac.ke', 'NewPassw0rd!', 'dev-s3')).data.token;
  const open = await api('POST', '/classrep/sessions', { token: repT, body: { unit_name: 'Open Check', lecturer_name: 'Mr Teacher' } });
  const c1 = await nf(carolTok), c2 = await nf(carolTok);
  ok('student: "attendance is open" while a lesson is running and she has not checked in', has(c1, `open-${open.data.id}`) && c1.data.items.find((i) => i.id === `open-${open.data.id}`).link === '/scan' && /Open Check/.test(c1.data.items.find((i) => i.id === `open-${open.data.id}`).title), JSON.stringify(ids(c1)));
  ok('student: low-attendance warning, class announcements and her temp-ID decision', has(c1, 'low-') && ids(c1).filter((i) => i.startsWith('ann-')).length >= 2 && has(c1, 'tid-') && c1.data.items.some((i) => /Exam on Monday/.test(i.text)));
  ok('every item has an id, title, text, link, icon and a kind; ids are unique', c1.data.items.every((i) => i.id && i.title && i.text && i.link && i.icon && ['warn', 'ok', 'info'].includes(i.kind)) && new Set(ids(c1)).size === ids(c1).length);
  ok('warnings are listed first', c1.data.items[0].kind === 'warn' && c1.data.items.findIndex((i) => i.kind === 'info') > c1.data.items.map((i) => i.kind).lastIndexOf('warn'));
  ok('ids are stable between calls (that is how the browser knows what is new)', JSON.stringify(ids(c1)) === JSON.stringify(ids(c2)));
  ok('a student only gets links to student pages', within(c1, ['/scan', '/student/']));
  const dan = await nf(sd); // Dan is in ANOTHER class
  ok('another class never sees this class\'s announcements', !dan.data.items.some((i) => /Exam on Monday|Socket hello/.test(i.text)) && !has(dan, 'ann-'));
  await api('POST', '/classrep/sessions/end', { token: repT });
  ok('"attendance is open" disappears when the lesson ends', !has(await nf(carolTok), 'open-'));

  // class rep: waiting temp IDs, timetable decision, Friday-Sunday print reminder
  const rtTok = (await login('8101@mtti.ac.ke', 'BrandNewPass1', 'dev-rt')).data.token;
  await api('POST', '/student/temp-id', { token: rtTok, body: { reason: 'Left it at home' } });
  const r1 = await nf(repT);
  ok('class rep: sees temp-ID requests waiting for them and their timetable decision', has(r1, 'rep-tid-1') && has(r1, 'tt-') && r1.data.items.find((i) => i.id.startsWith('tt-')).title.includes('approved'), JSON.stringify(ids(r1)));
  const dow = new Date().getDay();
  ok('class rep: the "print the weekly register" reminder shows only Friday to Sunday', has(r1, 'weekly-') === (dow === 5 || dow === 6 || dow === 0));
  ok('a class rep only gets student + rep links', within(r1, ['/scan', '/student/', '/rep/']));
  await api('POST', `/classrep/temp-ids/${(await api('GET', '/classrep/temp-ids', { token: repT })).data[0].id}/decision`, { token: repT, body: { decision: 'approved' } });
  ok('...and the item goes away once they approve', !has(await nf(repT), 'rep-tid-'));
  ok('the student is told the decision', ids(await nf(rtTok)).some((i) => /^tid-\d+-approved$/.test(i)));

  // teacher / HOD
  const tn = await nf(teach);
  ok('teacher: lessons waiting for their signature (links only to teacher pages)', has(tn, 'sign-') && /waiting for your signature/.test(tn.data.items.find((i) => i.id.startsWith('sign-')).title) && within(tn, ['/teacher/']), JSON.stringify(ids(tn)));
  const hn = await nf(hod);
  ok('HOD: reps awaiting approval, timetables awaiting approval, students at risk', has(hn, 'reps-') && has(hn, 'tts-') && has(hn, 'risk-') && within(hn, ['/hod/']), JSON.stringify(ids(hn)));
  ok('HOD does not get the administrator\'s items', !has(hn, 'email-unset') && !has(hn, 'staff-'));

  // administrator
  await api('POST', '/auth/register-teacher', { body: { name: 'Pending Teacher', email: 'pendteach@mtti.ac.ke', password: 'Passw0rd!' } });
  const pendingNow = (await api('GET', '/admin/staff', { token: adminTok })).data.filter((s) => s.status === 'pending').length;
  const an = await nf(adminTok);
  ok('administrator: staff awaiting approval + "email isn\'t set up"; links only to admin pages', pendingNow >= 1 && has(an, `staff-${pendingNow}`) && has(an, 'email-unset') && within(an, ['/admin/']) && !has(an, 'term-unset'), JSON.stringify(ids(an)));
  const termBefore = (await api('GET', '/admin/settings', { token: adminTok })).data.termStart;
  await api('PUT', '/admin/settings', { token: adminTok, body: { term_start: '' } });
  ok('administrator: "term start not set" appears when it is cleared', has(await nf(adminTok), 'term-unset'));
  await api('PUT', '/admin/settings', { token: adminTok, body: { term_start: termBefore } });
  ok('...and goes away when it is set again', !has(await nf(adminTok), 'term-unset'));
  const pend = (await api('GET', '/admin/staff', { token: adminTok })).data.find((x) => x.email === 'pendteach@mtti.ac.ke');
  await api('POST', `/admin/staff/${pend.id}/decision`, { token: adminTok, body: { decision: 'approve' } });
  const afterOne = await nf(adminTok);
  ok('...and the count drops (or the item clears) as they are approved', pendingNow === 1 ? !has(afterOne, 'staff-') : has(afterOne, `staff-${pendingNow - 1}`) && !has(afterOne, `staff-${pendingNow}`));
  FIX['/notifications'] = c1.data; FIX['/notifications#hod'] = hn.data; FIX['/notifications#empty'] = { items: [] };
}
await snap();

await snap();
const repCheckinSession = await api('POST', '/classrep/sessions', { token: repT, body: { unit_name: 'Rep self check-in', lecturer_name: 'Mr Teacher', venue: 'Lab 1' } });
const qrGeneratedAt = Date.now;
Date.now = () => qrGeneratedAt() - 35_000;
let repQr;
try {
  repQr = await api('POST', '/qr/generate', { token: repT, body: { session_id: repCheckinSession.data.id, venue: 'Lab 1', gps_lat: -1.123, gps_lng: 37.123 } });
} finally {
  Date.now = qrGeneratedAt;
}
const resolvedRepCode = await api('POST', '/qr/rep-code/verify', { token: repT, body: { code: repQr.data.rep_checkin_code } });
const repCheckin = await scan(repT, { session_id: repCheckinSession.data.id, adm_no: '1000', device_id: 'dev-rep' }, resolvedRepCode.data.token);
ok('class rep code refreshes an almost-expired QR for selfie check-in', repCheckinSession.status === 201 && repQr.status === 200 && resolvedRepCode.status === 200 && resolvedRepCode.data.token !== repQr.data.token && resolvedRepCode.data.data.timestamp > repQr.data.payload.timestamp + 30_000 && qrGeneratedAt() - resolvedRepCode.data.data.timestamp < 5_000 && repCheckin.status === 201 && repCheckin.data.points_earned > 0);
if (process.env.FIXTURES_OUT) fs.writeFileSync(process.env.FIXTURES_OUT, JSON.stringify(FIX));
console.log(JSON.stringify({ pass, fail, failures }, null, 1));
process.exit(fail ? 1 : 0);
