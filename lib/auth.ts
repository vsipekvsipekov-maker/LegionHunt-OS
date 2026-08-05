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

function normalizeRole(value: unknown): AppRole {
  if (
    value === "owner" ||
    value === "admin" ||
    value === "mentor" ||
    value === "recruiter"
  ) {
    return value
  }

  return "recruiter"
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

  const metadataFullName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : ""

  const firstName =
    typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name.trim()
      : ""

  const lastName =
    typeof user.user_metadata?.last_name === "string"
      ? user.user_metadata.last_name.trim()
      : ""

  const metadataName =
    metadataFullName ||
    [firstName, lastName].filter(Boolean).join(" ")

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name?.trim() || metadataName || null,
    role: normalizeRole(profile?.role),
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
