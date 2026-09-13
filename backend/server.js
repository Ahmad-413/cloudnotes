require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const notesRouter = require('./routes/notes');

const app = express();
const PORT = process.env.PORT || 8080;

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic structured request logging (captured by CloudWatch when running on EC2/ECS
// with the CloudWatch agent, or automatically on App Runner / Elastic Beanstalk).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(
      JSON.stringify({
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - start,
        timestamp: new Date().toISOString(),
      })
    );
  });
  next();
});

// --- Health check (used by load balancer / App Runner health checks) ---
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- API routes ---
app.use('/api/notes', notesRouter);

// --- Serve static frontend ---
app.use(express.static(path.join(__dirname, '..', 'frontend')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// --- Centralized error handler ---
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] CloudNotes API listening on port ${PORT}`);
});
