import express from 'express';
import { student, rep, teacher, hod, campus, admin, timetableUpload, sendTimetableFile, MAX_TIMETABLE_BYTES, weeklySheetRep, weeklySheetHod } from '../controllers/appController.js';

// Accepts one file of ANY type (see appController). Upload problems come back as JSON, not an HTML error page.
const MAX_MB = MAX_TIMETABLE_BYTES / 1024 / 1024;
const timetableFile = (req, res, next) => timetableUpload.single('file')(req, res, (err) => {
  if (!err) return next();
  const tooBig = err.code === 'LIMIT_FILE_SIZE';
  res.status(tooBig ? 413 : 400).json({ error: tooBig ? `That file is larger than ${MAX_MB} MB. Upload a smaller file (for a photo, use a lower resolution).` : `Upload failed: ${err.message}` });
});

// Mounted in server.js behind verifyToken + requireRole(...)
export const studentRouter = express.Router();
studentRouter.get('/dashboard', student.dashboard);
studentRouter.get('/timetable', student.timetable);
studentRouter.get('/timetable/:id/file', sendTimetableFile);
studentRouter.get('/history', student.history);
studentRouter.get('/eligibility', student.eligibility);
studentRouter.get('/leaderboard', student.leaderboard);
studentRouter.get('/chat', student.chatList);
studentRouter.post('/chat', student.chatSend);
studentRouter.get('/temp-id', student.tempIdList);
studentRouter.post('/temp-id', student.tempIdRequest);

export const classrepRouter = express.Router();
classrepRouter.get('/lecturers', rep.lecturers);
classrepRouter.post('/sessions', rep.sessionStart);
classrepRouter.get('/sessions/current', rep.sessionCurrent);
classrepRouter.get('/manual-attendance', rep.manualAttendanceList);
classrepRouter.post('/manual-attendance', rep.manualAttendanceMark);
classrepRouter.post('/sessions/end', rep.sessionEnd);
classrepRouter.get('/dashboard', rep.dashboard);
classrepRouter.get('/live-logs', rep.liveLogs);
classrepRouter.get('/members', rep.members);
classrepRouter.post('/members', rep.memberAdd);
classrepRouter.post('/members/:adm/reset-device', rep.memberResetDevice);
classrepRouter.get('/announcements', rep.announcements);
classrepRouter.post('/announcements', rep.announce);
classrepRouter.get('/chat', rep.chatList);
classrepRouter.post('/chat', rep.chatSend);
classrepRouter.get('/timetable', rep.timetable);
classrepRouter.post('/timetable/upload', timetableFile, rep.timetableUpload);
classrepRouter.get('/timetable/:id/file', sendTimetableFile);
classrepRouter.get('/leaderboard', rep.leaderboard);
classrepRouter.post('/leaderboard/reset', rep.leaderboardReset);
classrepRouter.get('/ministry-export', rep.ministryExport);
classrepRouter.get('/weekly-sheet', weeklySheetRep);
classrepRouter.get('/temp-ids', rep.tempIds);
classrepRouter.post('/temp-ids/:id/decision', rep.tempIdDecision);
classrepRouter.get('/parent-alerts', rep.parentAlerts);
classrepRouter.post('/parent-alerts/run', rep.parentAlertsRun);

export const teacherRouter = express.Router();
teacherRouter.get('/dashboard', teacher.dashboard);
teacherRouter.get('/sessions', teacher.sessions);
teacherRouter.post('/sessions/:id/sign', teacher.sign);
teacherRouter.get('/absenteeism', teacher.absenteeism);

export const hodRouter = express.Router();
hodRouter.get('/dashboard', hod.dashboard);
hodRouter.get('/classes', hod.classes);
hodRouter.get('/pending-reps', hod.pendingReps);
hodRouter.post('/approve-rep/:id', hod.approveRep);
hodRouter.get('/at-risk', hod.atRisk);
hodRouter.get('/final-reports', hod.finalReports);
hodRouter.get('/lost-id-logs', hod.lostIdLogs);
hodRouter.get('/timetables', hod.timetables);
hodRouter.post('/timetables/:id/decision', hod.timetableDecision);
hodRouter.get('/timetables/:id/file', sendTimetableFile);
hodRouter.post('/ministry-audit', hod.ministryGenerate);
hodRouter.get('/ministry-audit', hod.ministryList);
hodRouter.get('/weekly-sheet', weeklySheetHod);
hodRouter.get('/ministry-audit/:id/pdf', hod.ministryPdf);
hodRouter.get('/devices', hod.devices);
hodRouter.post('/students/:adm/reset-device', hod.resetDevice);
hodRouter.put('/fees/:adm', hod.setFees);

export const campusRouter = express.Router();
campusRouter.get('/library/status', campus.libraryStatus);
campusRouter.post('/library/checkin', campus.libraryCheck('in'));
campusRouter.post('/library/checkout', campus.libraryCheck('out'));
campusRouter.get('/games', campus.gamesList);
campusRouter.post('/games', campus.gamesRecord);
campusRouter.get('/fees', campus.fees);

export const adminRouter = express.Router();
adminRouter.get('/dashboard', admin.dashboard);
adminRouter.get('/classes', admin.classes);
adminRouter.post('/classes', admin.classAdd);
adminRouter.put('/classes', admin.classUpdate);
adminRouter.delete('/classes', admin.classDelete); // ?code=... (class codes can contain "/", so they travel in the query string)
adminRouter.get('/class-members', admin.classMembers); // ?code=...
adminRouter.put('/class-members', admin.classMemberUpdate);
adminRouter.delete('/class-members', admin.classMemberDelete); // ?code=...&user_id=...
adminRouter.get('/settings', admin.settings);
adminRouter.put('/settings', admin.settingsSave);
adminRouter.get('/email', admin.emailStatus);
adminRouter.post('/email/test', admin.emailTest);
adminRouter.get('/staff', admin.staff);
adminRouter.post('/staff', admin.staffAdd);
adminRouter.post('/staff/:id/decision', admin.staffDecision);
adminRouter.post('/staff/:id/status', admin.staffStatus);
adminRouter.post('/staff/:id/password', admin.staffPassword);
