require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const creditsRoutes = require('./routes/credits');
const askRoutes = require('./routes/ask');
const paymentRoutes = require('./routes/payment');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration to allow Electron app + website origins
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Crack It API is running' });
});

// Mount routes
app.use('/auth', authRoutes);
app.use('/credits', creditsRoutes);
app.use('/ask', askRoutes);
app.use('/payment', paymentRoutes);
app.use('/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
