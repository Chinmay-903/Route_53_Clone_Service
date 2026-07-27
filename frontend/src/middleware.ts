import { NextResponse, type NextRequest } from 'next/server';

/**
 * Security headers and a convenience redirect for signed-out visitors.
 *
 * The redirect is user experience only. Authorization is enforced by the API on
 * every request and again in every database query — never here alone. Next.js
 * middleware has been bypassable before (CVE-2025-29927, fixed in 15.2.3, which
 * package.json pins past), so treating it as an access control would be a
 * single point of failure by design.
 */

const SESSION_COOKIE = 'r53_session';
const PUBLIC_PATHS = ['/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const nonce = createNonce();

  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!isPublic && !hasSession) {
    const target = request.nextUrl.clone();
    target.pathname = '/login';
    // Preserves the requested page so login can return the user to it.
    target.searchParams.set('next', pathname);
    return applySecurityHeaders(NextResponse.redirect(target), nonce);
  }

  if (isPublic && hasSession) {
    const target = request.nextUrl.clone();
    target.pathname = '/hosted-zones';
    target.search = '';
    return applySecurityHeaders(NextResponse.redirect(target), nonce);
  }

  // Next.js reads the nonce back off the request headers and stamps it onto
  // every script tag it emits. Without this the CSP below would block the
  // framework's own bootstrap and the page would never hydrate.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', buildCsp(nonce));

  return applySecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    nonce,
  );
}

/** Returns a fresh base64 nonce for this response's inline scripts. */
function createNonce(): string {
  return btoa(crypto.randomUUID());
}

function buildCsp(nonce: string): string {
  // Empty in production, where the API is proxied through this origin and
  // 'self' already covers it. Local development points at the API's own port.
  const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
  const isDevelopment = process.env.NODE_ENV === 'development';

  return [
    "default-src 'self'",
    // Framer Motion writes animated values to inline `style` attributes on
    // every frame, and `style-src` governs those as well as <style> blocks —
    // so a strict policy here would freeze every transition in the console.
    // Scripts stay nonce-restricted, which is where the XSS risk actually
    // lives; an injected style cannot execute.
    "style-src 'self' 'unsafe-inline'",
    // 'strict-dynamic' lets the nonced bootstrap load the chunks it needs
    // without listing each one. Dev additionally needs eval for hot reloading,
    // which is why it is scoped to development only.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self'${apiOrigin ? ` ${apiOrigin}` : ''}${isDevelopment ? ' ws: wss:' : ''}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
}

function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', buildCsp(nonce));
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  );
  return response;
}

export const config = {
  // Excludes static assets, Next's internals, and — importantly — `/api`.
  //
  // `/api` is the rewrite that proxies the backend. Without this exclusion the
  // auth redirect below catches the proxied calls themselves and answers every
  // one of them with a 307 to /login, so the console can never sign in.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)'],
};
