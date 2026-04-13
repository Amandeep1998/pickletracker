require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth.routes');
const tournamentRoutes = require('./src/routes/tournament.routes');
const expenseRoutes = require('./src/routes/expense.routes');
const adminRoutes = require('./src/routes/admin.routes');
const aiRoutes = require('./src/routes/ai.routes');
const documentRoutes = require('./src/routes/document.routes');
const whatsappRoutes = require('./src/routes/whatsapp.routes');
const sessionRoutes = require('./src/routes/session.routes');
const errorHandler = require('./src/middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50kb' }));

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

app.use(errorHandler);

if (require.main === module) {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
}

module.exports = app;
