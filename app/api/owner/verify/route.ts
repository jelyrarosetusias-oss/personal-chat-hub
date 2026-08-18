import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('owner_session_token')

    if (token && token.value.startsWith('owner-authenticated-')) {
      return NextResponse.json({ isOwner: true })
    }

    return NextResponse.json({ isOwner: false })
  } catch {
    return NextResponse.json({ isOwner: false })
  }
}

export async function DELETE() {
  const response = NextResponse.json({ isOwner: false })
  response.cookies.delete('owner_session_token')
  return response
}
