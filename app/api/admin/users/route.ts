import { NextResponse } from "next/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase-server"

type Profile = {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: string
  is_active: boolean
  department: string
  job_title: string
  created_at: string
}

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json(
        { error: "Необходима авторизация." },
        { status: 401 },
      )
    }

    const { data: currentProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single()

    if (
      profileError ||
      !currentProfile ||
      currentProfile.role !== "owner" ||
      currentProfile.is_active === false
    ) {
      return NextResponse.json(
        { error: "Доступ разрешён только владельцу." },
        { status: 403 },
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        {
          error:
            "На сервере не настроен административный доступ Supabase.",
        },
        { status: 500 },
      )
    }

    const admin = createAdminClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data: profiles, error } = await admin
      .from("profiles")
      .select(
        "id, email, first_name, last_name, full_name, role, is_active, department, job_title, created_at",
      )
      .order("created_at", { ascending: false })
      .returns<Profile[]>()

    if (error) {
      console.error("Admin users profiles error:", error)

      return NextResponse.json(
        { error: error.message },
        { status: 500 },
      )
    }

    return NextResponse.json({
      users: profiles ?? [],
    })
  } catch (error) {
    console.error("Admin users API error:", error)

    return NextResponse.json(
      { error: "Не удалось загрузить пользователей." },
      { status: 500 },
    )
  }
}