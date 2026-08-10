import { NextResponse } from 'next/server'

export function GET() {
  return NextResponse.json({
    ok: true,
    gemini: Boolean(process.env.GEMINI_API_KEY),
    database: Boolean(process.env.DATABASE_URL),
    payload: Boolean(process.env.PAYLOAD_SECRET),
  })
}
