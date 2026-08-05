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
    } catch {}

    return Object.prototype.toString.call(error)
  }

  return "Неизвестная ошибка регистрации."
}

export async function POST(request: NextRequest) {
  console.log("========== REGISTER START ==========")

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
    const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()

    console.log("ENV:", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSecretKey: !!secretKey,
      secretPrefix: secretKey?.substring(0, 12),
    })

    if (!supabaseUrl || !secretKey) {
      return NextResponse.json(
        {
          error:
            "На сервере отсутствуют NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SECRET_KEY.",
        },
        { status: 500 },
      )
    }

    const body = (await request.json()) as RegisterBody

    console.log("BODY:", body)

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

    const supabaseAdmin = createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    console.log("Creating user:", email)

    const result = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        full_name: `${firstName} ${lastName}`,
      },
    })

    console.log(
      "CREATE USER RESULT:",
      JSON.stringify(result, null, 2)
    )

    const { data, error } = result

    if (error) {
      console.error("SUPABASE ERROR:")
      console.error(error)
      console.error(JSON.stringify(error, null, 2))

      return NextResponse.json(
        {
          error: getErrorMessage(error),
        },
        { status: 400 }
      )
    }

    console.log("USER CREATED:", data.user?.id)

    return NextResponse.json(
      {
        ok: true,
        userId: data.user?.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("UNEXPECTED ERROR:")
    console.error(error)

    try {
      console.error(JSON.stringify(error, null, 2))
    } catch {}

    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status: 500 }
    )
  }
}