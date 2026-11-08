import { NextResponse } from 'next/server';

// Lightweight readiness probe (used by Playwright's webServer and dev scripts).
export function GET() {
  return NextResponse.json({ ok: true });
}
