import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    message: 'Invite codes are disabled. Personal direct messaging is active.'
  })
}
