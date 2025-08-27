import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

const prisma = new PrismaClient();

const uploadsDir = process.env.UPLOADS_DIR || 'uploads/software';
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}__${safe}`);
  },
});

export const upload = multer({ storage });

function serializeSoftware<T extends any>(item: T): any {
  if (!item || typeof item !== 'object') return item;
  const copy: any = Array.isArray(item) ? [] : {};
  for (const [k, v] of Object.entries(item as any)) {
    if (typeof v === 'bigint') {
      copy[k] = Number(v);
    } else if (v && typeof v === 'object') {
      copy[k] = serializeSoftware(v);
    } else {
      copy[k] = v;
    }
  }
  return copy;
}

// Auth
export async function meHandler(_req: Request, res: Response) {
  return res.json({ ok: true });
}

// Categories CRUD
export async function listCategories(_req: Request, res: Response) {
  const list = await prisma.category.findMany({ orderBy: { name: 'asc' } });
  res.json(list);
}

export async function createCategory(req: Request, res: Response) {
  const { name, description } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'name is required' });
  const created = await prisma.category.create({ data: { name, description } });
  res.status(201).json(created);
}

export async function updateCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { name, description } = req.body ?? {};
  const updated = await prisma.category.update({ where: { id }, data: { name, description } });
  res.json(updated);
}

export async function deleteCategory(req: Request, res: Response) {
  const id = Number(req.params.id);
  // Удалим связанные файлы с диска, затем саму категорию (строки ПО удалятся каскадом)
  const related = await prisma.software.findMany({ where: { categoryId: id } });
  for (const s of related) {
    try { fs.unlinkSync(s.filePath); } catch {}
  }
  await prisma.category.delete({ where: { id } });
  res.json({ ok: true });
}

// Software CRUD + search/sort
function buildSoftwareWhere(q?: string, categoryId?: number): any {
  const where: any = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { version: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { category: { name: { contains: q, mode: 'insensitive' } } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  return where;
}

export async function listSoftware(req: Request, res: Response) {
  const { q, sort = 'date', order = 'desc', categoryId, skip = '0', take = '20' } = req.query as any;
  const sortMap: any = {
    date: { uploadDate: order === 'asc' ? 'asc' : 'desc' },
    downloads: { downloadsCount: order === 'asc' ? 'asc' : 'desc' },
    title: { title: order === 'asc' ? 'asc' : 'desc' },
  };
  const where = buildSoftwareWhere(q, categoryId ? Number(categoryId) : undefined);
  const [items, total] = await Promise.all([
    prisma.software.findMany({
      where,
      orderBy: sortMap[sort] || sortMap.date,
      skip: Number(skip),
      take: Number(take),
      include: { category: true },
    }),
    prisma.software.count({ where }),
  ]);
  res.json({ items: serializeSoftware(items), total });
}

export async function getSoftware(req: Request, res: Response) {
  const id = Number(req.params.id);
  const item = await prisma.software.findUnique({ where: { id }, include: { category: true } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  await prisma.software.update({ where: { id }, data: { viewsCount: { increment: 1 } } });
  res.json(serializeSoftware(item));
}

export async function createSoftware(req: Request, res: Response) {
  const { title, version, description, categoryId } = req.body ?? {};
  const file = (req as any).file as Express.Multer.File | undefined;
  if (!title || !version || !categoryId || !file) return res.status(400).json({ error: 'title, version, categoryId and file are required' });
  const stat = fs.statSync(path.join(uploadsDir, path.basename(file.filename)));
  const created = await prisma.software.create({
    data: {
      title,
      version,
      description,
      categoryId: Number(categoryId),
      filePath: path.join(uploadsDir, path.basename(file.filename)).replace(/\\/g, '/'),
      size: BigInt(stat.size),
    },
  });
  res.status(201).json(serializeSoftware(created));
}

export async function updateSoftware(req: Request, res: Response) {
  const id = Number(req.params.id);
  const { title, version, description, categoryId } = req.body ?? {};
  const file = (req as any).file as Express.Multer.File | undefined;
  let data = { title, version, description, categoryId: categoryId ? Number(categoryId) : undefined } as any;
  if (file) {
    const stat = fs.statSync(path.join(uploadsDir, path.basename(file.filename)));
    data.filePath = path.join(uploadsDir, path.basename(file.filename)).replace(/\\/g, '/');
    (data as any).size = BigInt(stat.size);
  }
  const updated = await prisma.software.update({ where: { id }, data });
  res.json(serializeSoftware(updated));
}

export async function deleteSoftware(req: Request, res: Response) {
  const id = Number(req.params.id);
  const found = await prisma.software.findUnique({ where: { id } });
  if (found) {
    try { fs.unlinkSync(found.filePath); } catch {}
  }
  await prisma.software.delete({ where: { id } });
  res.json({ ok: true });
}

export async function downloadSoftware(req: Request, res: Response) {
  const id = Number(req.params.id);
  const item = await prisma.software.findUnique({ where: { id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  const abs = path.resolve(item.filePath);
  if (!fs.existsSync(abs)) return res.status(404).json({ error: 'File missing' });
  await prisma.software.update({ where: { id }, data: { downloadsCount: { increment: 1 } } });
  res.download(abs, path.basename(abs));
}

export async function statsOverall(_req: Request, res: Response) {
  const categories = await prisma.category.findMany({ include: { _count: { select: { software: true } } } });
  const totals = await prisma.software.aggregate({ _sum: { downloadsCount: true, viewsCount: true }, _count: true });
  res.json({ categories, totals });
}

// Speed test endpoint: streams N megabytes of data
export async function speedTest(req: Request, res: Response) {
  const sizeMb = Math.min(Math.max(Number((req.query.sizeMb as string) || '5'), 1), 50); // 1..50 MB
  const totalBytes = sizeMb * 1024 * 1024;
  const chunkSize = 64 * 1024; // 64KB
  const chunk = Buffer.alloc(chunkSize);
  let sent = 0;

  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', String(totalBytes));
  res.setHeader('Cache-Control', 'no-store');

  function writeChunk() {
    while (sent < totalBytes) {
      const remaining = totalBytes - sent;
      const toSend = remaining >= chunkSize ? chunk : chunk.subarray(0, remaining);
      const ok = res.write(toSend);
      sent += toSend.length;
      if (!ok) {
        res.once('drain', writeChunk);
        return;
      }
    }
    res.end();
  }

  writeChunk();
}

export async function ping(req: Request, res: Response) {
  res.json({ t: Date.now() });
}

export async function uploadTest(req: Request, res: Response) {
  // Read and discard request body to measure client upload throughput
  let received = 0;
  req.on('data', (chunk) => {
    received += (chunk as Buffer).length;
  });
  req.on('end', () => {
    res.json({ received });
  });
  req.on('error', () => {
    res.status(500).end();
  });
}

export async function clientIp(req: Request, res: Response) {
  const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
  let ip = xff || req.ip || '';
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  res.json({ ip });
}


