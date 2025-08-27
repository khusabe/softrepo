import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { router } from './routes';
import fs from 'fs';
import cron from 'node-cron';
import unzipper from 'unzipper';
import { authMiddleware } from './auth';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({ windowMs: 60 * 1000, limit: 300 });
app.use(limiter);

const uploadsDir = process.env.UPLOADS_DIR || 'uploads/software';
app.use('/uploads', express.static(path.resolve(uploadsDir)));
// Serve AV updates
const avRoot = path.resolve('av-updates');
fs.mkdirSync(avRoot, { recursive: true });
app.use('/av-updates', express.static(avRoot));

// Quiet down common browser probes
app.get('/favicon.ico', (_req, res) => res.status(204).end());
// Express 5 (path-to-regexp v8): без регэкспа, префикс через app.use
app.use('/.well-known', (_req, res) => res.status(204).end());

app.use('/api', router);

app.get('/health', (_req, res) => res.json({ ok: true }));

// Daily antivirus update downloader (02:00 every day)
const avConfigPath = path.join(avRoot, 'config.json');
let avUrl: string = (process.env.AV_URL as string) || 'https://uzsmart.ru/yangiliklar/offline_update_eav.zip';
try {
  if (fs.existsSync(avConfigPath)) {
    const raw = fs.readFileSync(avConfigPath, 'utf-8');
    const j = JSON.parse(raw);
    if (j && typeof j.url === 'string' && j.url) avUrl = j.url;
  }
} catch {}
const AV_ZIP = path.join(avRoot, 'offline_update_eav.zip');
const AV_DIR = path.join(avRoot, 'extracted');
let avLastUpdated: string | null = null;

async function downloadAndExtractAV(): Promise<void> {
  try {
    fs.mkdirSync(avRoot, { recursive: true });
    const res = await fetch(avUrl);
    if (!res.ok || !res.body) throw new Error(`Fetch failed: ${res.status}`);
    await new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(AV_ZIP);
      (res.body as any).pipe(file);
      file.on('finish', resolve);
      file.on('error', reject);
    });
    // extract
    fs.rmSync(AV_DIR, { recursive: true, force: true });
    fs.mkdirSync(AV_DIR, { recursive: true });
    await fs.createReadStream(AV_ZIP).pipe(unzipper.Extract({ path: AV_DIR })).promise();
    avLastUpdated = new Date().toISOString();
    console.log('AV updated at', avLastUpdated);
  } catch (e) {
    console.error('AV update failed', e);
  }
}

// schedule at 02:00
cron.schedule('0 2 * * *', () => downloadAndExtractAV());

app.get('/api/av/latest', (_req, res) => {
  res.json({ updatedAt: avLastUpdated, zip: '/av-updates/offline_update_eav.zip', directory: '/av-updates/extracted' });
});

app.post('/api/av/refresh', authMiddleware, async (_req, res) => {
  await downloadAndExtractAV();
  res.json({ ok: true, updatedAt: avLastUpdated });
});

app.get('/api/av/config', authMiddleware, (_req, res) => {
  res.json({ url: avUrl });
});

app.post('/api/av/config', authMiddleware, express.json(), (req, res) => {
  const { url } = req.body || {};
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url is required' });
  avUrl = url.trim();
  try {
    fs.mkdirSync(avRoot, { recursive: true });
    fs.writeFileSync(avConfigPath, JSON.stringify({ url: avUrl }, null, 2));
  } catch {}
  res.json({ ok: true, url: avUrl });
});

const port = Number(process.env.PORT || 4000);
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});


