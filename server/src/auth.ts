import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type JwtPayload = { sub: number; login: string };

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is not set');
  return secret;
}

export function issueToken(user: { id: number; login: string }): string {
  const secret = getJwtSecret();
  const token = jwt.sign({ sub: user.id, login: user.login } as JwtPayload, secret, {
    expiresIn: '7d',
  });
  return token;
}

export async function loginHandler(req: Request, res: Response) {
  const { login, password } = req.body ?? {};
  if (!login || !password) return res.status(400).json({ error: 'login and password are required' });

  const admin = await prisma.admin.findUnique({ where: { login } });
  if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

  const token = issueToken({ id: admin.id, login: admin.login });
  return res.json({ token });
}

export async function changePasswordHandler(req: Request, res: Response) {
  const user = req.user as { id: number; login: string } | undefined;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const { oldPassword, newPassword } = req.body ?? {};
  if (!oldPassword || !newPassword) return res.status(400).json({ error: 'oldPassword and newPassword are required' });

  const admin = await prisma.admin.findUnique({ where: { id: user.id } });
  if (!admin) return res.status(404).json({ error: 'User not found' });

  const ok = await bcrypt.compare(oldPassword, admin.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Old password incorrect' });

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash } });
  return res.json({ ok: true });
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = header.substring('Bearer '.length);
  try {
    const payload = jwt.verify(token, getJwtSecret()) as any;
    (req as any).user = { id: Number(payload.sub), login: String(payload.login) };
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: number; login: string };
    }
  }
}


