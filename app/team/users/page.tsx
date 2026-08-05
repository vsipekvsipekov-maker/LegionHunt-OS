import { redirect } from "next/navigation"

import { DashboardShell } from "@/components/layout/shell"
import { UsersAdminWorkspace } from "@/components/team/users-admin-workspace"
import { createClient } from "@/lib/supabase-server"

export default async function TeamUsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single()

  if (
    !profile ||
    profile.role !== "owner" ||
    profile.is_active === false
  ) {
    redirect("/team")
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1800px]">
        <UsersAdminWorkspace />
      </div>
    </DashboardShell>
  )
}