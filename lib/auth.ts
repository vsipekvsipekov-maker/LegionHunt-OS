import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase-server"

export type AppRole =
  | "owner"
  | "admin"
  | "mentor"
  | "recruiter"

export type CurrentUser = {
  id: string
  email: string | null
  fullName: string | null
  role: AppRole
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle()

  const role = profile?.role as AppRole | undefined

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    role: role ?? "recruiter",
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect("/login")
  }

  return user
}

export async function requireRole(
  allowedRoles: AppRole[],
): Promise<CurrentUser> {
  const user = await requireUser()

  if (!allowedRoles.includes(user.role)) {
    redirect("/")
  }

  return user
}