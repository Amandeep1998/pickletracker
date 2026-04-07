require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/auth.routes');
const tournamentRoutes = require('./src/routes/tournament.routes');
const errorHandler = require('./src/middleware/error.middleware');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

app.use('/api/auth', authRoutes);
app.use('/api/tournaments', tournamentRoutes);

app.use(errorHandler);

if (require.main === module) {
  connectDB().then(() => {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  });
}

module.exports = app;
