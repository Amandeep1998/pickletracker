require('dotenv').config();
const Sentry = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.2,
  environment: process.env.NODE_ENV || 'development',
});

const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const connectDB = require('./src/config/db');
const socketManager = require('./src/socket/socketManager');
const authRoutes = require('./src/routes/auth.routes');
const tournamentRoutes = require('./src/routes/tournament.routes');
const expenseRoutes = require('./src/routes/expense.routes');
const adminRoutes = require('./src/routes/admin.routes');
const aiRoutes = require('./src/routes/ai.routes');
const documentRoutes = require('./src/routes/document.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes');
const sessionRoutes = require('./src/routes/session.routes');
const exportRoutes = require('./src/routes/export.routes');
const playersRoutes = require('./src/routes/players.routes');
const notificationsRoutes = require('./src/routes/notifications.routes');
const friendshipRoutes = require('./src/routes/friendship.routes');
const pushRoutes = require('./src/routes/push.routes');
const coachingIncomeRoutes = require('./src/routes/coachingIncome.routes');
const coachScheduleRoutes = require('./src/routes/coachSchedule.routes');
const coachOverheadRoutes = require('./src/routes/coachOverhead.routes');
const coachStudentRoutes = require('./src/routes/coachStudent.routes');
const errorHandler = require('./src/middleware/error.middleware');
const { startMorningEmailJobs } = require('./src/jobs/morningEmailJobs');
const { startWeeklySummaryJob } = require('./src/jobs/weeklySummary');
const { startMonthlyPnlJob } = require('./src/jobs/monthlyPnl');
const { startInactiveUserNudgeJob } = require('./src/jobs/inactiveUserNudge');
const { startPushReminderJob } = require('./src/jobs/pushReminder');

const app = express();
const server = http.createServer(app);

// ── Socket.io setup ──────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  transports: ['websocket', 'polling'],
});

socketManager.init(io);

// JWT auth for socket connections
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  socketManager.register(socket.userId, socket.id);
  socket.on('disconnect', () => {
    socketManager.unregister(socket.userId, socket.id);
  });
});

// ── HTTP middleware ──────────────────────────────────────────────────────────
app.use(Sentry.Handlers.requestHandler()); // attaches request context to Sentry events
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '600kb' })); // increased for base64 profile photo uploads
app.use(express.urlencoded({ extended: false })); // needed for Twilio webhook (form-encoded body)

// Lightweight health check — used by uptime pingers to prevent cold starts
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: Date.now() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/document', documentRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/friends', friendshipRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/coaching-income', coachingIncomeRoutes);
app.use('/api/coach-schedule', coachScheduleRoutes);
app.use('/api/coach-overhead', coachOverheadRoutes);
app.use('/api/coach-students', coachStudentRoutes);

app.use(Sentry.Handlers.errorHandler()); // captures unhandled errors and sends to Sentry
app.use(errorHandler);

if (require.main === module) {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    startMorningEmailJobs();
    startWeeklySummaryJob();
    startMonthlyPnlJob();
    startInactiveUserNudgeJob();
    startPushReminderJob();
  });
}

module.exports = app;
