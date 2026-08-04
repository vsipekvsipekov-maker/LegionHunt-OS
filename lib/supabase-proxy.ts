import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const protectedRoutes = [
  "/",
  "/ai",
  "/crm",
  "/wiki",
  "/academy",
  "/analytics",
  "/workflows",
  "/finance",
  "/team",
  "/calendar",
  "/settings",
]

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some((route) => {
    if (route === "/") {
      return pathname === "/"
    }

    return pathname === route || pathname.startsWith(`${route}/`)
  })
}

function copyCookies(source: NextResponse, target: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })

  return target
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Supabase environment variables are missing: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    )

    return response
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: claimsData } = await supabase.auth.getClaims()

  const pathname = request.nextUrl.pathname
  const isAuthenticated = Boolean(claimsData?.claims?.sub)

  if (!isAuthenticated && isProtectedRoute(pathname)) {
    const loginUrl = request.nextUrl.clone()

    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", pathname)

    return copyCookies(
      response,
      NextResponse.redirect(loginUrl),
    )
  }

  if (isAuthenticated && pathname === "/login") {
    const homeUrl = request.nextUrl.clone()

    homeUrl.pathname = "/"
    homeUrl.search = ""

    return copyCookies(
      response,
      NextResponse.redirect(homeUrl),
    )
  }

  return response
}