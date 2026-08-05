"use client"

import { useEffect, useMemo, useState } from "react"

type UserRole = "owner" | "admin" | "mentor" | "manager" | "user"

type UserProfile = {
  id: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role: UserRole
  is_active: boolean
  department: string
  job_title: string
  created_at: string
}

type UsersResponse = {
  users?: UserProfile[]
  error?: string
}

type UpdateUserResponse = {
  ok?: boolean
  user?: UserProfile
  error?: string
}

function getDisplayName(user: UserProfile) {
  return (
    user.full_name.trim() ||
    `${user.first_name} ${user.last_name}`.trim() ||
    user.email
  )
}

function getInitials(user: UserProfile) {
  const name = getDisplayName(user)

  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "LH"
  )
}

export function UsersAdminWorkspace() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [savingId, setSavingId] = useState<string | null>(null)

  async function loadUsers() {
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/admin/users", {
        cache: "no-store",
      })

      const data = (await response.json()) as UsersResponse

      if (!response.ok) {
        throw new Error(
          data.error || "Не удалось загрузить пользователей.",
        )
      }

      setUsers(data.users ?? [])
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Не удалось загрузить пользователей.",
      )
    } finally {
      setLoading(false)
    }
  }

  async function updateUser(
    userId: string,
    patch: {
      role?: UserRole
      isActive?: boolean
    },
  ) {
    setSavingId(userId)
    setError("")

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      })

      const data = (await response.json()) as UpdateUserResponse

      if (!response.ok || !data.user) {
        throw new Error(
          data.error || "Не удалось обновить пользователя.",
        )
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? data.user! : user,
        ),
      )
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Не удалось обновить пользователя.",
      )

      await loadUsers()
    } finally {
      setSavingId(null)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    if (!normalizedQuery) {
      return users
    }

    return users.filter((user) => {
      const searchValue = [
        user.email,
        user.first_name,
        user.last_name,
        user.full_name,
        user.role,
        user.department,
        user.job_title,
      ]
        .join(" ")
        .toLowerCase()

      return searchValue.includes(normalizedQuery)
    })
  }, [query, users])

  const activeCount = users.filter(
    (user) => user.is_active,
  ).length

  const adminCount = users.filter((user) =>
    ["owner", "admin"].includes(user.role),
  ).length

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] px-5 py-7 md:px-8">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-8 text-sm text-white/45">
          Загрузка пользователей...
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] px-5 py-7 md:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/60">
            LegionHunt Access Control
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
            Управление пользователями
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/35">
            Аккаунты, роли и состояние доступа к LegionHunt OS.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadUsers()}
          className="self-start rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-sm text-white/65 transition hover:bg-white/[0.07] xl:self-auto"
        >
          Обновить
        </button>
      </div>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Аккаунтов
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {users.length}
          </p>

          <p className="mt-2 text-xs text-white/30">
            зарегистрировано
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Активных
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-emerald-300">
            {activeCount}
          </p>

          <p className="mt-2 text-xs text-white/30">
            имеют доступ
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-white/28">
            Администраторов
          </p>

          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-violet-300">
            {adminCount}
          </p>

          <p className="mt-2 text-xs text-white/30">
            owner и admin
          </p>
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0b0e14]/90">
        <div className="border-b border-white/[0.065] p-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по имени, email, роли или отделу..."
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/20 focus:border-violet-400/45"
          />
        </div>

        {error ? (
          <div className="border-b border-rose-400/20 bg-rose-400/[0.06] px-5 py-4 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead className="border-b border-white/[0.055] text-[10px] uppercase tracking-[0.16em] text-white/24">
              <tr>
                <th className="px-5 py-4 font-medium">
                  Пользователь
                </th>

                <th className="px-4 py-4 font-medium">
                  Роль
                </th>

                <th className="px-4 py-4 font-medium">
                  Должность
                </th>

                <th className="px-4 py-4 font-medium">
                  Доступ
                </th>

                <th className="px-5 py-4 font-medium">
                  Создан
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.map((user) => {
                const isSaving = savingId === user.id

                return (
                  <tr
                    key={user.id}
                    className="border-b border-white/[0.045] transition hover:bg-white/[0.025]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/35 to-fuchsia-500/20 text-xs font-semibold text-violet-100">
                          {getInitials(user)}
                        </div>

                        <div>
                          <p className="text-sm font-medium text-white/88">
                            {getDisplayName(user)}
                          </p>

                          <p className="mt-0.5 text-xs text-white/28">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <select
                        value={user.role}
                        disabled={isSaving}
                        onChange={(event) =>
                          void updateUser(user.id, {
                            role: event.target.value as UserRole,
                          })
                        }
                        className="min-w-36 rounded-lg border border-white/[0.08] bg-[#11151d] px-2.5 py-2 text-xs text-white/70 outline-none transition focus:border-violet-400/45 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="user">
                          Пользователь
                        </option>

                        <option value="mentor">
                          Наставник
                        </option>

                        <option value="manager">
                          Менеджер
                        </option>

                        <option value="admin">
                          Администратор
                        </option>

                        <option value="owner">
                          Владелец
                        </option>
                      </select>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-sm text-white/65">
                        {user.job_title || "Не указана"}
                      </p>

                      <p className="mt-1 text-xs text-white/28">
                        {user.department || "Без отдела"}
                      </p>
                    </td>

                    <td className="px-4 py-4">
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() =>
                          void updateUser(user.id, {
                            isActive: !user.is_active,
                          })
                        }
                        className={[
                          "min-w-32 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
                          user.is_active
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/15"
                            : "border-rose-400/20 bg-rose-400/10 text-rose-200 hover:bg-rose-400/15",
                        ].join(" ")}
                      >
                        {isSaving
                          ? "Сохраняем..."
                          : user.is_active
                            ? "Активен"
                            : "Заблокирован"}
                      </button>
                    </td>

                    <td className="px-5 py-4 text-sm text-white/38">
                      {new Date(
                        user.created_at,
                      ).toLocaleDateString("ru-RU")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {!filteredUsers.length ? (
          <div className="px-5 py-12 text-center text-sm text-white/30">
            Пользователи не найдены.
          </div>
        ) : null}
      </section>
    </div>
  )
}