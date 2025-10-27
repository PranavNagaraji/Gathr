import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in',
  '/sign-up',
  '/auth-callback',
]);

const customerRoutes = createRouteMatcher(['/dummy']);
const keeperRoutes = createRouteMatcher(['/merchant', '/merchant/:path*']);

export default clerkMiddleware(async (auth, req) => {
  const client = await clerkClient();
  const { userId } = await auth();

  // If user is logged in
  if (userId) {
    const user = await client.users.getUser(userId);
    const role = user.publicMetadata.role;

    // Redirect logged-in users away from sign-in/sign-up
    if (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up') {
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (customerRoutes(req)) {
      if (role === 'customer') return;
      return NextResponse.redirect(new URL('/', req.url));
    }

    if (keeperRoutes(req)) {
      if (role === 'merchant') return;
      return NextResponse.redirect(new URL('/', req.url));
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
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}