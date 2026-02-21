// lib/safety/apiResponse.ts
// Feature 4: Safe, structured API response helpers

import { NextResponse } from 'next/server';

/**
 * Standard success response.
 * Shape: { success: true, data: {...} }
 */
export function successResponse(data: unknown, status = 200): NextResponse {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Standard error response.
 * Shape: { success: false, error: "Human readable message" }
 */
export function errorResponse(message: string, status = 400): NextResponse {
  return NextResponse.json({ success: false, error: message }, { status });
}

/**
 * Feature 4 — Safe error handler for catch blocks.
 *
 * - Logs the full error server-side (including stack trace).
 * - Returns a generic, safe 500 message to the client.
 * - Never exposes internal error details or stack traces externally.
 */
export function handleApiError(err: unknown): NextResponse {
  console.error('[API Error]', err);
  return NextResponse.json(
    {
      success: false,
      error: 'Something went wrong. Please try again later.',
    },
    { status: 500 }
  );
}
