import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase-server"

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
      console.error("Load users error:", error)

      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      )
    }

    return NextResponse.json({
      users: data ?? [],
    })
  } catch (error) {
    console.error("Admin users GET error:", error)

    return NextResponse.json(
      { error: "Не удалось загрузить пользователей." },
      { status: 500 },
    )
  }
}