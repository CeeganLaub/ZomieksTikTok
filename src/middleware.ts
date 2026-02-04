// Middleware for route protection and session management
import { NextRequest, NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = [
  "/dashboard",
  "/services/new",
  "/services/edit",
  "/projects/new",
  "/projects/edit",
  "/orders",
  "/messages",
  "/settings",
  "/verification",
];

// Routes that require admin access
const adminRoutes = ["/admin"];

// Routes that should redirect authenticated users
const authRoutes = ["/login", "/register", "/forgot-password"];

const SESSION_COOKIE_NAME = "zomieks_session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Check if path matches protected routes
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAdminRoute = adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && sessionToken) {
    // We have a session token, redirect to dashboard
    // Note: Full session validation happens in server components
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users from protected routes
  if ((isProtectedRoute || isAdminRoute) && !sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // For admin routes, we'll do role checking in the page/layout
  // since middleware can't access KV directly in all contexts

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     * - api routes (for webhooks, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|public|api).*)",
  ],
};
