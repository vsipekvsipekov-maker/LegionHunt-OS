import { NextResponse } from "next/server"

type TelegramGetMeResponse = {
  ok: boolean
  description?: string
  result?: {
    id: number
    is_bot: boolean
    first_name: string
    username?: string
    can_join_groups?: boolean
    can_read_all_group_messages?: boolean
    supports_inline_queries?: boolean
  }
}

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()

  if (!token) {
    return NextResponse.json(
      {
        connected: false,
        error: "TELEGRAM_BOT_TOKEN не настроен.",
      },
      { status: 503 },
    )
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getMe`,
      {
        method: "GET",
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    )

    const payload = (await response.json()) as TelegramGetMeResponse

    if (!response.ok || !payload.ok || !payload.result) {
      return NextResponse.json(
        {
          connected: false,
          error:
            payload.description ||
            `Telegram API вернул HTTP ${response.status}.`,
        },
        { status: 502 },
      )
    }

    return NextResponse.json({
      connected: true,
      bot: {
        id: payload.result.id,
        name: payload.result.first_name,
        username: payload.result.username ?? "",
        canJoinGroups: payload.result.can_join_groups ?? false,
        canReadAllGroupMessages:
          payload.result.can_read_all_group_messages ?? false,
        supportsInlineQueries:
          payload.result.supports_inline_queries ?? false,
      },
    })
  } catch (error) {
    console.error("Telegram status error:", error)

    return NextResponse.json(
      {
        connected: false,
        error:
          error instanceof Error && error.name === "TimeoutError"
            ? "Telegram API не ответил вовремя."
            : "Не удалось подключиться к Telegram API.",
      },
      { status: 500 },
    )
  }
}