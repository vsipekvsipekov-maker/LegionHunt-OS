"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase-client"

type AuthMode = "login" | "register"

type RegisterResponse = {
  ok?: boolean
  userId?: string
  error?: string
}

type AuthPanelProps = {
  initialMode?: AuthMode
}

export function AuthPanel({ initialMode = "login" }: AuthPanelProps) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  function switchMode(nextMode: AuthMode) {
    if (loading || nextMode === mode) {
      return
    }

    setMode(nextMode)
    setError("")
    setPassword("")
    setConfirmPassword("")
    window.history.replaceState(
      null,
      "",
      nextMode === "register" ? "/register" : "/login",
    )
  }

  async function handleLogin() {
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      throw new Error("Введи email и пароль.")
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInError) {
      throw new Error("Неверный email или пароль.")
    }
  }

  async function handleRegister() {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) {
      throw new Error("Заполни все поля.")
    }

    if (password.length < 6) {
      throw new Error("Пароль должен содержать минимум 6 символов.")
    }

    if (password !== confirmPassword) {
      throw new Error("Пароли не совпадают.")
    }

    const registerResponse = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        email: normalizedEmail,
        password,
      }),
    })

    const registerData = (await registerResponse.json()) as RegisterResponse

    if (!registerResponse.ok || !registerData.ok) {
      throw new Error(registerData.error || "Не удалось создать аккаунт.")
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (signInError) {
      throw new Error(
        "Аккаунт создан. Выполни вход с указанными email и паролем.",
      )
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (mode === "register") {
        await handleRegister()
      } else {
        await handleLogin()
      }

      router.push("/")
      router.refresh()
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Не удалось выполнить операцию.",
      )
    } finally {
      setLoading(false)
    }
  }

  const isRegister = mode === "register"

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_34%),linear-gradient(rgba(255,255,255,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.018)_1px,transparent_1px)] bg-[size:auto,48px_48px,48px_48px]" />

      <section className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-[#111111]/95 p-5 shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:p-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
            LegionHunt OS
          </p>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {isRegister ? "Создание аккаунта" : "Вход в систему"}
          </h1>

          <p className="mt-3 text-sm leading-6 text-white/50">
            {isRegister
              ? "Создай профиль и сразу перейди в рабочее пространство."
              : "Используй рабочий email и пароль."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/40 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={[
              "h-11 rounded-xl text-sm font-medium transition",
              mode === "login"
                ? "bg-white text-black"
                : "text-white/45 hover:text-white",
            ].join(" ")}
          >
            Вход
          </button>

          <button
            type="button"
            onClick={() => switchMode("register")}
            className={[
              "h-11 rounded-xl text-sm font-medium transition",
              mode === "register"
                ? "bg-white text-black"
                : "text-white/45 hover:text-white",
            ].join(" ")}
          >
            Регистрация
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div className="grid gap-4 sm:grid-cols-2">
              <AuthField
                id="firstName"
                label="Имя"
                autoComplete="given-name"
                value={firstName}
                onChange={setFirstName}
                placeholder="Сергей"
              />

              <AuthField
                id="lastName"
                label="Фамилия"
                autoComplete="family-name"
                value={lastName}
                onChange={setLastName}
                placeholder="Немцев"
              />
            </div>
          )}

          <AuthField
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
          />

          <AuthField
            id="password"
            label="Пароль"
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={setPassword}
            placeholder={isRegister ? "Минимум 6 символов" : "Введите пароль"}
          />

          {isRegister && (
            <AuthField
              id="confirmPassword"
              label="Повтори пароль"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Повтори пароль"
            />
          )}

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-rose-400/25 bg-rose-400/10 px-4 py-3 text-sm leading-5 text-rose-200"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-white px-5 text-base font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading
              ? isRegister
                ? "Создаём аккаунт..."
                : "Входим..."
              : isRegister
                ? "Создать аккаунт"
                : "Войти"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs leading-5 text-white/35">
          {isRegister ? (
            <>
              Уже есть аккаунт?{" "}
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="font-medium text-white transition hover:text-white/70"
              >
                Войти
              </button>
            </>
          ) : (
            <>
              Впервые в LegionHunt?{" "}
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="font-medium text-white transition hover:text-white/70"
              >
                Создать аккаунт
              </button>
            </>
          )}
        </p>

        <Link
          href="/"
          className="mt-4 block text-center text-[11px] text-white/20 transition hover:text-white/45"
        >
          LegionHunt Operating System
        </Link>
      </section>
    </main>
  )
}

type AuthFieldProps = {
  id: string
  label: string
  type?: "text" | "email" | "password"
  autoComplete: string
  value: string
  onChange: (value: string) => void
  placeholder: string
}

function AuthField({
  id,
  label,
  type = "text",
  autoComplete,
  value,
  onChange,
  placeholder,
}: AuthFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === "password"
  const resolvedType = isPassword && passwordVisible ? "text" : type

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-white/65">
        {label}
      </span>

      <span className="relative block">
        <input
          id={id}
          name={id}
          type={resolvedType}
          autoComplete={autoComplete}
          required
          minLength={isPassword ? 6 : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={[
            "h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base text-white outline-none transition placeholder:text-white/22 focus:border-white/35 focus:ring-2 focus:ring-white/5",
            isPassword ? "pr-20" : "",
          ].join(" ")}
          placeholder={placeholder}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setPasswordVisible((current) => !current)}
            aria-label={passwordVisible ? "Скрыть пароль" : "Показать пароль"}
            className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-lg px-3 text-xs font-medium text-white/45 transition hover:bg-white/[0.06] hover:text-white"
          >
            {passwordVisible ? "Скрыть" : "Показать"}
          </button>
        )}
      </span>
    </label>
  )
}
