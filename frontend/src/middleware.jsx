import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in',
  '/sign-up',
  '/auth-callback',
  '/payment-success',
  '/payment-cancelled',
  '/admin/:path',
  '/admin',
  '/about',
  '/contact',
]);

const customerRoutes = createRouteMatcher(['/customer', '/customer/:path*']);
const merchantRoutes = createRouteMatcher(['/merchant', '/merchant/:path*']);
const carrierRoutes = createRouteMatcher(['/carrier', '/carrier/:path*']);

export default clerkMiddleware(async (auth, req) => {
  const client = await clerkClient();
  const { userId } = await auth();

  // If user is logged in
  if (userId) {
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata.role;

    // Redirect logged-in users away from sign-in/sign-up
    if (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up') {
      const dest = role === 'merchant' ? '/merchant/dashboard' : role === 'customer' ? '/customer/dashboard' : role === 'carrier' ? '/carrier/dashboard' : '/';
      return NextResponse.redirect(new URL(dest, req.url));
    }

    // Send logged-in users hitting root to their dashboards
    if (req.nextUrl.pathname === '/') {
      const dest = role === 'merchant' ? '/merchant/dashboard' : role === 'customer' ? '/customer/dashboard' : role === 'carrier' ? '/carrier/dashboard' : '/';
      return NextResponse.redirect(new URL(dest, req.url));
    }

    // Protect role areas
    if (customerRoutes(req)) {
      if (role === 'customer') return;
      const dest = role === 'merchant' ? '/merchant/dashboard' : role === 'carrier' ? '/carrier/dashboard' : '/';
      return NextResponse.redirect(new URL(dest, req.url));
    }

    if (merchantRoutes(req)) {
      if (role === 'merchant') return;
      const dest = role === 'customer' ? '/customer/dashboard' : role === 'carrier' ? '/carrier/dashboard' : '/';
      return NextResponse.redirect(new URL(dest, req.url));
    }

    if (carrierRoutes(req)) {
      if (role === 'carrier') return;
      const dest = role === 'merchant' ? '/merchant/dashboard' : role === 'customer' ? '/customer/dashboard' : '/';
      return NextResponse.redirect(new URL(dest, req.url));
    }

    return; // logged-in user allowed
  }

  // If user is NOT logged in
  if (isPublicRoute(req)) return; // public routes allowed

  // Otherwise redirect to sign-in
  return NextResponse.redirect(new URL('/sign-in', req.url));
});


export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}