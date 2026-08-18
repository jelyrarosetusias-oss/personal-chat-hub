import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Simple rate limiter tracking failed attempts per IP
const attemptTracker = new Map<string, { count: number; lockUntil: number }>()

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1'
    const now = Date.now()

    // Check rate limit status
    const record = attemptTracker.get(ip)
    if (record && record.lockUntil > now) {
      const waitMins = Math.ceil((record.lockUntil - now) / 60000)
      return NextResponse.json(
        { success: false, error: `Too many failed attempts. Locked out for ${waitMins} minute(s).` },
        { status: 429 }
      )
    }

    const { pin } = await req.json()

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ success: false, error: 'PIN is required.' }, { status: 400 })
    }

    // Configured Owner PIN on server env (Defaults to '1234' for local demo)
    const expectedPin = process.env.OWNER_PIN || process.env.OWNER_SECRET_PIN || '1234'

    if (pin.trim() !== expectedPin.trim()) {
      // Increment failed attempt count
      const currentCount = (record?.count || 0) + 1
      if (currentCount >= 5) {
        attemptTracker.set(ip, { count: 0, lockUntil: now + 15 * 60 * 1000 }) // Lock for 15 minutes
        return NextResponse.json(
          { success: false, error: 'Too many incorrect attempts. Locked out for 15 minutes.' },
          { status: 429 }
        )
      } else {
        attemptTracker.set(ip, { count: currentCount, lockUntil: 0 })
        return NextResponse.json(
          { success: false, error: `Incorrect Owner PIN. (${5 - currentCount} attempts remaining)` },
          { status: 401 }
        )
      }
    }

    // Success! Clear attempt record for IP
    attemptTracker.delete(ip)

    // Set secure HttpOnly cookie for Owner Session
    const response = NextResponse.json({ success: true, isOwner: true })
    
    // Cookie expires in 7 days
    response.cookies.set({
      name: 'owner_session_token',
      value: `owner-authenticated-${Date.now()}`,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    })

    return response
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error.' }, { status: 500 })
  }
}
