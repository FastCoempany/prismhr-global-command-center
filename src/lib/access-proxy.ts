import { NextResponse, type NextRequest } from "next/server";

const ACCESS_COOKIE_NAME = "field_signal_access";
const protectedRoutes = ["/", "/prospect-field"];
const authRoutes = ["/login"];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isAuthRoute(pathname: string) {
  return authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function loginRedirect(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export function updateSession(request: NextRequest) {
  const hasAccess = Boolean(request.cookies.get(ACCESS_COOKIE_NAME)?.value);

  if (isProtectedRoute(request.nextUrl.pathname) && !hasAccess) {
    return loginRedirect(request);
  }

  if (isAuthRoute(request.nextUrl.pathname) && hasAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({
    request,
  });
}
