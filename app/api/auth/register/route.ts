import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

type RegisterBody = {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === "string") {
    return error
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>

    if (typeof record.message === "string") {
      return record.message
    }

    if (typeof record.error_description === "string") {
      return record.error_description
    }

    if (typeof record.error === "string") {
      return record.error
    }
  }

  return "Неизвестная ошибка регистрации."
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        { error: "Регистрация временно недоступна." },
        { status: 500 },
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
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Пароль должен содержать минимум 6 символов." },
        { status: 400 },
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
        full_name: `${firstName} ${lastName}`,
      },
    })

    if (error) {
      const message = getErrorMessage(error)
      const duplicate =
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("registered") ||
        message.toLowerCase().includes("exists")

      return NextResponse.json(
        {
          error: duplicate
            ? "Аккаунт с таким email уже существует."
            : message,
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        userId: data.user?.id,
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Registration error:", error)

    return NextResponse.json(
      { error: "Не удалось создать аккаунт." },
      { status: 500 },
    )
  }
}
