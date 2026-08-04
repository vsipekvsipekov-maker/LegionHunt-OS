"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase-client"

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError("Неверный email или пароль.")
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111111] p-8 shadow-2xl">
        <div className="mb-8">
          <p className="mb-2 text-sm uppercase tracking-[0.3em] text-white/40">
            LegionHunt OS
          </p>

          <h1 className="text-3xl font-semibold">
            Вход в систему
          </h1>

          <p className="mt-3 text-base text-white/55">
            Используй рабочий email и пароль.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
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
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-white/10 bg-black px-4 text-base text-white outline-none transition focus:border-white/40"
              placeholder="Введите пароль"
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
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>
      </div>
    </main>
  )
}