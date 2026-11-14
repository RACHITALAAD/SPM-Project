import './config/env.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db.js';
import { UPLOADS_DIR } from './config/paths.js';
import { assertCloudinaryConfig } from './config/cloudinary.js';
import { errorHandler } from './middleware/errorHandler.js';
import assignmentRoutes from './routes/assignments.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import submissionRoutes from './routes/submissions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
const port = Number(process.env.PORT) || 5000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
  console.error('Set JWT_SECRET in server/.env to a string of at least 16 characters.');
  process.exit(1);
}

const fileStorage = process.env.FILE_STORAGE || 'local';
if (!['local', 'cloudinary'].includes(fileStorage)) {
  console.error('FILE_STORAGE must be either local or cloudinary.');
  process.exit(1);
}

if (fileStorage === 'cloudinary') {
  try {
    assertCloudinaryConfig();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  if (!process.env.FACULTY_REGISTRATION_CODE) {
    console.error('Set FACULTY_REGISTRATION_CODE when FILE_STORAGE=cloudinary.');
    process.exit(1);
  }
}

const app = express();
app.disable('x-powered-by');
app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'assignment-platform' });
});
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
} else {
  app.get('/', (_req, res) => {
    res.type('html').send(`<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Assignment platform API</title>
<body style="font-family:Georgia,serif;background:#f3efe6;color:#1c1915;padding:48px;line-height:1.5">
<h1>API is running</h1>
<p>Open the web app at <a href="http://localhost:5173">http://localhost:5173</a>.</p>
<p>Health check: <a href="/api/health">/api/health</a></p>
</body></html>`);
  });
}

app.use(errorHandler);

try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  await connectDB();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`API listening on http://localhost:${port}`);
  });
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other process or change PORT in server/.env.`);
    } else {
      console.error(error.message);
    }
    process.exit(1);
  });
} catch (error) {
  console.error('Failed to start.');
  console.error(error.message);
  console.error('Start MongoDB with: docker compose up -d');
  process.exit(1);
}
