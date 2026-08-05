import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type RegisterBody = {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        { error: "На сервере не настроена регистрация." },
        { status: 500 }
      )
    }

    const body = (await request.json()) as RegisterBody

    const firstName = body.firstName?.trim() ?? ""
    const lastName = body.lastName?.trim() ?? ""
    const email = body.email?.trim().toLowerCase() ?? ""
    const password = body.password ?? ""

    if (!firstName || !lastName || !email || !password) {
      return NextResponse.json(
        { error: "Заполни все поля." },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов." },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`.trim(),
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      ok: true,
      userId: data.user.id,
    })
  } catch (e) {
    console.error(e)

    return NextResponse.json(
      { error: "Ошибка сервера." },
      { status: 500 }
    )
  }
}