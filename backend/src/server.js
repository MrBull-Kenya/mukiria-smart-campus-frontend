import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

import { testConnection } from './config/db.js';
import { UPLOAD_DIR } from './config/storage.js';
import { initializeFileLogging } from './config/logger.js';
import { initializeDatabaseTables } from './db/init.js';
import { verifyToken, requireRole } from './middleware/authMiddleware.js';

// Import Routes
import authRoutes from './routes/authRoutes.js';
import classRoutes from './routes/classRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import gamificationRoutes from './routes/gamificationRoutes.js';
import tempIDRoutes from './routes/tempIDRoutes.js';
import ministryRoutes from './routes/ministryRoutes.js';
import qrRoutes from './routes/qrRoutes.js';
import { studentRouter, classrepRouter, teacherRouter, hodRouter, campusRouter, adminRouter } from './routes/appRoutes.js';
import { notifications } from './controllers/appController.js';


dotenv.config();

try {
  const logDir = await initializeFileLogging();
  console.info(`File logging enabled at ${logDir}`);
} catch (err) {
  console.error('Could not initialize file logging; continuing with console output only:', err);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    const route = req.route ? `${req.baseUrl}${req.route.path}` : '(unmatched route)';
    console.info(`[http] ${req.method} ${route} ${res.statusCode} ${Date.now() - startedAt}ms`);
  });
  next();
});

// API Routes Mapping
app.set('io', io);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Public: login / registration / password reset (verify-token guards itself) and the class list used by the register forms
app.use('/api/auth', authRoutes);
// (the register forms need the list before login; creating classes is Administrator-only, see /api/admin/classes)
app.use('/api/classes', (req, res, next) => (req.method === 'GET' && req.path === '/list' ? next() : verifyToken(req, res, () => requireRole('admin')(req, res, next))), classRoutes);

// Everything below requires a valid token; most also require a specific role
app.use('/api/attendance', verifyToken, requireRole('student', 'student_rep'), attendanceRoutes);
// Students may only read their OWN scorecard
const ownScorecardOnly = (req, res, next) => {
  const m = req.path.match(/^\/scorecard\/([^/]+)/);
  if (m && ['student', 'student_rep'].includes(req.user.role) && req.user.adm_no !== decodeURIComponent(m[1])) {
    return res.status(403).json({ error: 'You can only view your own scorecard.' });
  }
  next();
};
app.use('/api/gamification', verifyToken, ownScorecardOnly, gamificationRoutes);
// Legacy temp-ID routes: only reps / HOD / admin may approve or reject (the app itself uses /api/student/temp-id and /api/classrep/temp-ids)
app.use('/api/tempid', verifyToken, (req, res, next) => (req.method === 'PATCH' ? requireRole('student_rep', 'hod', 'admin')(req, res, next) : next()), tempIDRoutes);
app.use('/api/ministry', verifyToken, requireRole('hod', 'admin'), ministryRoutes);
app.use('/api/qr', verifyToken, qrRoutes);

app.use('/api/student', verifyToken, requireRole('student', 'student_rep', 'admin'), studentRouter);
app.use('/api/classrep', verifyToken, requireRole('student_rep', 'admin'), classrepRouter);
app.use('/api/teacher', verifyToken, requireRole('teacher', 'admin'), teacherRouter);
app.use('/api/hod', verifyToken, requireRole('hod', 'admin'), hodRouter);
app.use('/api/admin', verifyToken, requireRole('admin'), adminRouter);
app.use('/api/campus', verifyToken, campusRouter);
app.get('/api/notifications', verifyToken, notifications); // the bell: any signed-in user, content depends on the role

// Unknown API route: JSON (not Express's HTML page) so clients can show a real message
app.use('/api', (req, res) => res.status(404).json({ error: `No such endpoint: ${req.method} ${req.originalUrl}` }));

// Socket.io: real-time pushes (chat messages, live attendance counter).
// Sockets must present the same JWT as the REST API and may only join THEIR OWN class room.
// Clients cannot publish events: chat is posted through POST /api/student|classrep/chat and
// attendance updates are emitted by the server after a verified scan, so neither can be spoofed.
io.use((socket, next) => {
  try {
    socket.user = jwt.verify(socket.handshake.auth?.token || '', process.env.JWT_SECRET || 'supersecretmtti2026');
    next();
  } catch {
    next(new Error('Unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.on('join_class', (classCode) => {
    if (socket.user.role === 'admin' || (classCode && socket.user.class_code === classCode)) socket.join(classCode);
  });
});

const PORT = process.env.PORT || 5000;

try {
  await testConnection();
  await initializeDatabaseTables();
  console.log('All database tables verified/initialized successfully.');
  server.listen(PORT, () => {
    console.log(`MTTI Backend server running on port ${PORT}`);
  });
} catch (err) {
  console.error('Database connection or initialization failed; server will not start:', err);
  process.exitCode = 1;
}