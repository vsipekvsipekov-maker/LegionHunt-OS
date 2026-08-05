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

    try {
      const serialized = JSON.stringify(error)

      if (serialized && serialized !== "{}") {
        return serialized
      }
    } catch {
      // Игнорируем ошибку сериализации.
    }
  }

  return "Неизвестная ошибка регистрации."
}

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()

    const secretKey =
      process.env.SUPABASE_SECRET_KEY?.trim()

    if (!supabaseUrl || !secretKey) {
      console.error("Register API: missing environment variables", {
        hasSupabaseUrl: Boolean(supabaseUrl),
        hasSecretKey: Boolean(secretKey),
      })

      return NextResponse.json(
        {
          error:
            "На сервере не настроены NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SECRET_KEY.",
        },
        { status: 500 },
      )
    }

    let body: RegisterBody

    try {
      body = (await request.json()) as RegisterBody
    } catch {
      return NextResponse.json(
        { error: "Некорректное тело запроса." },
        { status: 400 },
      )
    }

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

    if (!email.includes("@")) {
      return NextResponse.json(
        { error: "Укажи корректный email." },
        { status: 400 },
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "Пароль должен содержать минимум 6 символов.",
        },
        { status: 400 },
      )
    }

    const supabaseAdmin = createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    )

    const { data, error } =
      await supabaseAdmin.auth.admin.createUser({
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
      const errorMessage = getErrorMessage(error)

      console.error("Supabase createUser error:", {
        message: errorMessage,
        status: error.status,
        code: error.code,
        name: error.name,
      })

      const userAlreadyExists =
        errorMessage.toLowerCase().includes("already") ||
        errorMessage.toLowerCase().includes("registered") ||
        errorMessage.toLowerCase().includes("exists")

      return NextResponse.json(
        {
          error: userAlreadyExists
            ? "Пользователь с таким email уже существует."
            : errorMessage,
        },
        { status: 400 },
      )
    }

    if (!data.user) {
      return NextResponse.json(
        {
          error:
            "Supabase не вернул созданного пользователя.",
        },
        { status: 502 },
      )
    }

    return NextResponse.json(
      {
        ok: true,
        userId: data.user.id,
      },
      { status: 201 },
    )
  } catch (error) {
    const errorMessage = getErrorMessage(error)

    console.error("Register API unexpected error:", error)

    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 },
    )
  }
}