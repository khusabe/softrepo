import { Request, Response, NextFunction } from 'express';

export function ipAllowlistMiddleware(req: Request, res: Response, next: NextFunction) {
  const allowlist = (process.env.ALLOWLIST_IPS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (allowlist.length === 0) return next();

  const ip = (req.ip || '').replace('::ffff:', '');
  if (allowlist.includes(ip)) return next();
  return res.status(403).json({ error: 'Forbidden by IP allowlist' });
}


