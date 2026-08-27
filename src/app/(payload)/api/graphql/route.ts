import { NextResponse } from 'next/server'

/** GraphQL is disabled in payload.config. Keep the route as a hard 404. */
export function GET() {
  return new NextResponse(null, { status: 404 })
}

export function POST() {
  return new NextResponse(null, { status: 404 })
}
