import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { router } from './routes';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 300 });
app.use(limiter);

const uploadsDir = process.env.UPLOADS_DIR || 'uploads/software';
app.use('/uploads', express.static(path.resolve(uploadsDir)));

// Quiet down common browser probes
app.get('/favicon.ico', (_req, res) => res.status(204).end());
// Express 5 (path-to-regexp v8): без регэкспа, префикс через app.use
app.use('/.well-known', (_req, res) => res.status(204).end());

app.use('/api', router);

app.get('/health', (_req, res) => res.json({ ok: true }));

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});


