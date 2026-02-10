import { NextResponse } from 'next/server';

export function middleware(request) {
    const origin = request.headers.get('origin') || '';

    // Allow requests from Vercel deployments, localhost, and custom origins
    const allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:3001',
    ];

    // Add any custom allowed origin from env (e.g. custom domain)
    if (process.env.ALLOWED_ORIGIN) {
        allowedOrigins.push(process.env.ALLOWED_ORIGIN);
    }

    const isAllowed = allowedOrigins.includes(origin) || origin.endsWith('.vercel.app');

    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': isAllowed ? origin : '',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                'Access-Control-Max-Age': '86400',
            },
        });
    }

    const response = NextResponse.next();

    if (isAllowed) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
