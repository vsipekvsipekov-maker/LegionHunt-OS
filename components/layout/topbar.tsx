"use client"

import { SearchIcon } from "@/components/icons"
import { NotificationsCenter } from "@/components/notifications/notifications-center"
import type { AppRole } from "@/lib/auth"

type TopbarUser = {
  email: string | null
  fullName: string | null
  role: AppRole
}

type TopbarProps = {
  user: TopbarUser
}

const roleLabels: Record<AppRole, string> = {
  owner: "Owner",
  admin: "Admin",
  mentor: "Mentor",
  recruiter: "Recruiter",
}

function getDisplayName(user: TopbarUser) {
  const fullName = user.fullName?.trim()

  if (fullName) {
    return fullName
  }

  const emailName = user.email?.split("@")[0]?.trim()

  return emailName || "Пользователь"
}

function getInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (!parts.length) {
    return "LH"
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
}

export function Topbar({ user }: TopbarProps) {
  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)
  const roleLabel = roleLabels[user.role] ?? "Recruiter"

  function openSearch() {
    window.dispatchEvent(new Event("legionhunt:open-command"))
  }

  function openMobileMenu() {
    window.dispatchEvent(new Event("legionhunt:open-mobile-menu"))
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-black/72 px-3 backdrop-blur-2xl sm:h-20 sm:px-7 xl:px-10">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openMobileMenu}
          aria-label="Открыть меню"
          className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/60 transition hover:border-white/20 hover:bg-white/[0.07] lg:hidden"
        >
          <span className="flex w-[18px] flex-col gap-[4px]">
            <span className="h-px w-full bg-current" />
            <span className="h-px w-full bg-current" />
            <span className="h-px w-full bg-current" />
          </span>
        </button>

        <button
          type="button"
          onClick={openSearch}
          aria-label="Открыть поиск"
          className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/55 transition hover:border-white/20 hover:bg-white/[0.07] md:hidden"
        >
          <SearchIcon className="size-[18px]" />
        </button>

        <button
          type="button"
          onClick={openSearch}
          className="hidden h-12 w-[430px] max-w-[44vw] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-left transition hover:border-white/20 hover:bg-white/[0.06] md:flex"
        >
          <SearchIcon className="size-[18px] text-white/38" />
          <span className="flex-1 text-[15px] text-white/35">
            Поиск по LegionHunt
          </span>
          <kbd className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/38">
            Ctrl K
          </kbd>
        </button>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-2.5">
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-[10px] font-semibold tracking-[0.08em] text-white/55 sm:flex">
          <span className="size-1.5 rounded-full bg-white" />
          SYSTEM READY
        </div>

        <NotificationsCenter />

        <button
          type="button"
          aria-label={`Профиль: ${displayName}, роль ${roleLabel}`}
          className="flex h-11 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-2 transition hover:bg-white/[0.07] sm:h-12 sm:px-2.5 sm:pr-3.5"
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white text-[10px] font-black text-black">
            {initials}
          </div>

          <div className="hidden min-w-0 max-w-[180px] text-left sm:block">
            <p className="truncate text-[13px] font-semibold text-white">
              {displayName}
            </p>
            <p className="mt-0.5 text-[10px] text-white/38">
              {roleLabel}
            </p>
          </div>
        </button>
      </div>
    </header>
  )
}
