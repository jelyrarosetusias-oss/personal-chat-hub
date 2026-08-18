import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { UserProfile } from './types'

const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || process.env.OWNER_SESSION_SECRET || 'personal-chat-hub-secret-key-at-least-32-chars!'
)

const COOKIE_NAME = 'chat_session_token'

export function generateShortId(): string {
  // 6 character alphanumeric code, easy to read and type
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function createSessionToken(payload: { userId: string; username: string; shortId: string; isAdmin: boolean }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

export async function verifySessionToken(token: string): Promise<{ userId: string; username: string; shortId: string; isAdmin: boolean } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as { userId: string; username: string; shortId: string; isAdmin: boolean }
  } catch {
    return null
  }
}

export async function getSessionUser(): Promise<{ userId: string; username: string; shortId: string; isAdmin: boolean } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export { COOKIE_NAME }
