/**
 * Authentication helpers for Claw Market API routes.
 *
 * - Admin endpoints (resolve, fund wallet) require ADMIN_API_KEY via Authorization header.
 * - Spectator voting requires token balance verification.
 */

const { NextResponse } = require('next/server');

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

/**
 * Verify that the request carries a valid admin API key.
 * Expected header: `Authorization: Bearer <ADMIN_API_KEY>`
 *
 * @param {Request} request
 * @returns {{ authorized: boolean, response?: NextResponse }}
 */
function requireAdmin(request) {
    if (!ADMIN_API_KEY) {
        // If no key is configured, reject all admin requests in production
        if (process.env.NODE_ENV === 'production') {
            return {
                authorized: false,
                response: NextResponse.json(
                    { error: 'Server misconfiguration: ADMIN_API_KEY is not set' },
                    { status: 500 }
                )
            };
        }
        // In development, allow without key but log a warning
        console.warn('[AUTH] ADMIN_API_KEY not set — admin endpoints are unprotected in dev mode');
        return { authorized: true };
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

    if (token !== ADMIN_API_KEY) {
        return {
            authorized: false,
            response: NextResponse.json(
                { error: 'Unauthorized. Provide a valid Authorization: Bearer <ADMIN_API_KEY> header.' },
                { status: 401 }
            )
        };
    }

    return { authorized: true };
}

module.exports = { requireAdmin };
