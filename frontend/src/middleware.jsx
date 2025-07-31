import { clerkClient, clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in',
  '/sign-up',
  '/auth-callback',
]);

const customerRoutes = createRouteMatcher(['/dummy']);
const keeperRoutes = createRouteMatcher(['/dummy2']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const client = await clerkClient();
  const { userId } = await auth();

  if(!userId) Response.redirect(new URL("/sign-in", req.url));

  const user = await client.users.getUser(userId);
  const role = user.publicMetadata.role;

  if (customerRoutes(req)) {
    if (role === "customer") return;
    console.log("Redirecting non-customer");
    return Response.redirect(new URL("/", req.url));
  }

  if (keeperRoutes(req)) {
    if (role === "keeper") return;
    console.log("Redirecting non-keeper");
    return Response.redirect(new URL("/", req.url));
  }

});


export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(api|trpc)(.*)',
    ],
}