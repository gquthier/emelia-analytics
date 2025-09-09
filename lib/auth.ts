import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SIGNING_KEY || 'fallback-secret-key';
const ADMIN_SESSION_COOKIE = 'admin_session';

export interface JWTPayload {
  type: 'admin' | 'viewer';
  clientId?: string;
  iat?: number;
  exp?: number;
}

export function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function createAdminSession(): Promise<void> {
  const token = signJWT({ type: 'admin' });
  const cookieStore = await cookies();
  
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function getAdminSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE);
  
  if (!token) return null;
  
  const payload = verifyJWT(token.value);
  return payload && payload.type === 'admin' ? payload : null;
}

export async function clearAdminSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_SESSION_COOKIE);
}

export function validateAdminCode(accessCode: string): boolean {
  const adminCode = process.env.ADMIN_ACCESS_CODE;
  return adminCode ? accessCode === adminCode : false;
}

export function createShareLink(clientId: string, expiresIn?: string): string {
  const token = signJWT({ type: 'viewer', clientId }, expiresIn || '30d');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.BASE_URL;
  return `${baseUrl}/c/${clientId}?token=${token}`;
}

export function verifyShareToken(token: string, clientId: string): boolean {
  const payload = verifyJWT(token);
  return payload?.type === 'viewer' && payload?.clientId === clientId;
}