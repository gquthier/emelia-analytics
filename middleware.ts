import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // For client dashboard pages, allow access
  // Authentication will be handled in the page component
  if (pathname.startsWith('/c/')) {
    return NextResponse.next();
  }

  // For all other routes, allow access
  return NextResponse.next();
}

export const config = {
  matcher: ['/c/:path*'],
};