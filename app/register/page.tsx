"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase-client"

type RegisterResponse = {
  ok?: boolean
  userId?: string
  error?: string
}

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setError("")

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedFirstName = firstName.trim()
    const normalizedLastName = lastName.trim()

    if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) {
      setError("Заполни все поля.")
      return
    }

    if (password !== confirmPassword) {
      setError("Пароли не совпадают.")
      return
    }

    if (password.length < 6) {
      setError("Пароль должен содержать минимум 6 символов.")
      return
    }

    setLoading(true)

    try {
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

      const registerData =
        (await registerResponse.json()) as RegisterResponse

      if (!registerResponse.ok || !registerData.ok) {
        throw new Error(
          registerData.error || "Не удалось создать аккаунт.",
        )
      }

      const { error: signInError } =
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

      if (signInError) {
        throw new Error(
          "Аккаунт создан, но автоматический вход не выполнен. Перейди на страницу входа.",
        )
      }

      router.push("/")
      router.refresh()
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Не удалось создать аккаунт.",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] p-8 shadow-2xl">
        <div className="mb-8">
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-white/40">
            LegionHunt OS
          </p>

          <h1 className="text-3xl font-semibold">
            Создание аккаунта
          </h1>

          <p className="mt-3 text-base text-white/55">
            Зарегистрируй новый профиль LegionHunt.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="firstName"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Имя
              </label>

              <input
                id="firstName"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base text-white outline-none transition focus:border-white/40"
                placeholder="Сергей"
              />
            </div>

            <div>
              <label
                htmlFor="lastName"
                className="mb-2 block text-sm font-medium text-white/70"
              >
                Фамилия
              </label>

              <input
                id="lastName"
                type="text"
                autoComplete="family-name"
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base text-white outline-none transition focus:border-white/40"
                placeholder="Немцев"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base text-white outline-none transition focus:border-white/40"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Пароль
            </label>

            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base text-white outline-none transition focus:border-white/40"
              placeholder="Минимум 6 символов"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Повтори пароль
            </label>

            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base text-white outline-none transition focus:border-white/40"
              placeholder="Повтори пароль"
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-xl bg-white px-5 text-base font-semibold text-black transition hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/45">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="font-medium text-white hover:text-white/75"
          >
            Войти
          </Link>
        </p>
      </div>
    </main>
  )
}