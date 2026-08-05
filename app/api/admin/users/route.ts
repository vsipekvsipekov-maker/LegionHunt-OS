import { NextRequest, NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase-server"

type UpdateUserBody = {
  role?: "owner" | "admin" | "mentor" | "recruiter"
  isActive?: boolean
}

async function requireOwner() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      error: NextResponse.json(
        { error: "Необходима авторизация." },
        { status: 401 },
      ),
    }
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
    return {
      error: NextResponse.json(
        { error: "Доступ разрешён только владельцу." },
        { status: 403 },
      ),
    }
  }

  return {
    user,
  }
}

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()

  if (!supabaseUrl || !secretKey) {
    return null
  }

  return createAdminClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function GET() {
  try {
    const authorization = await requireOwner()

    if ("error" in authorization) {
      return authorization.error
    }

    const admin = getAdminClient()

    if (!admin) {
      return NextResponse.json(
        { error: "Не настроен административный доступ Supabase." },
        { status: 500 },
      )
    }

    const { data, error } = await admin
      .from("profiles")
      .select(
        "id, email, first_name, last_name, full_name, role, is_active, department, job_title, created_at",
      )
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      )
    }

    return NextResponse.json({
      users: data ?? [],
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      { error: "Не удалось загрузить пользователей." },
      { status: 500 },
    )
  }
}export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const authorization = await requireOwner()

    if ("error" in authorization) {
      return authorization.error
    }

    const { id } = await context.params
    const body = (await request.json()) as UpdateUserBody

    const allowedRoles = new Set(["owner", "admin", "mentor", "recruiter"])

    if (body.role !== undefined && !allowedRoles.has(body.role)) {
      return NextResponse.json(
        { error: "Недопустимая роль пользователя." },
        { status: 400 },
      )
    }

    if (id === authorization.user.id && body.isActive === false) {
      return NextResponse.json(
        { error: "Нельзя заблокировать собственный аккаунт." },
        { status: 400 },
      )
    }

    if (id === authorization.user.id && body.role !== undefined) {
      return NextResponse.json(
        { error: "Нельзя изменить собственную роль." },
        { status: 400 },
      )
    }

    const updateData: {
      role?: UpdateUserBody["role"]
      is_active?: boolean
      updated_at: string
    } = {
      updated_at: new Date().toISOString(),
    }

    if (body.role !== undefined) {
      updateData.role = body.role
    }

    if (body.isActive !== undefined) {
      updateData.is_active = body.isActive
    }

    const admin = getAdminClient()

    if (!admin) {
      return NextResponse.json(
        { error: "Не настроен административный доступ Supabase." },
        { status: 500 },
      )
    }

    const { data, error } = await admin
      .from("profiles")
      .update(updateData)
      .eq("id", id)
      .select(
        "id, email, first_name, last_name, full_name, role, is_active, department, job_title, created_at",
      )
      .single()

    if (error) {
      console.error("Update user error:", error)

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      )
    }

    return NextResponse.json({
      ok: true,
      user: data,
    })
  } catch (error) {
    console.error("Admin user PATCH error:", error)

    return NextResponse.json(
      { error: "Не удалось обновить пользователя." },
      { status: 500 },
    )
  }
}