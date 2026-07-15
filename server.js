require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { connectDB } = require('./config/db');
const contactRoutes = require('./routes/contactRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { ok: false, error: 'Too many requests, please try again later.' },
});

app.use('/api', limiter);
app.use('/api', contactRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admins', adminRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Serve minimal frontend from index.html
app.get('/', (req, res) => {
  res.sendFile(require('path').join(__dirname, 'index.html'));
});

app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

start();
