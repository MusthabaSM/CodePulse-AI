import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Create matchers for protected routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/repositories(.*)',
  '/settings(.*)',
  '/reports(.*)',
  '/compare(.*)',
  '/api(.*)'
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    // await auth.protect();
  }
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
