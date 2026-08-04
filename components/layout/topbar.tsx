"use client"

import { SearchIcon } from "@/components/icons"
import { NotificationsCenter } from "@/components/notifications/notifications-center"

export function Topbar() {
  function openSearch() {
    window.dispatchEvent(new Event("legionhunt:open-command"))
  }

  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-white/8 bg-black/72 px-4 backdrop-blur-2xl sm:px-7 xl:px-10">
      <button
        type="button"
        onClick={openSearch}
        className="hidden h-12 w-[430px] max-w-[44vw] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 text-left transition hover:border-white/20 hover:bg-white/[0.06] md:flex"
      >
        <SearchIcon className="size-[18px] text-white/38" />
        <span className="flex-1 text-[15px] text-white/35">Поиск по LegionHunt</span>
        <kbd className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] text-white/38">Ctrl K</kbd>
      </button>

      <button type="button" onClick={openSearch} aria-label="Открыть поиск" className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] text-white/55 md:hidden">
        <SearchIcon className="size-[18px]" />
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3.5 py-2 text-[10px] font-semibold tracking-[0.08em] text-white/55 sm:flex">
          <span className="size-1.5 rounded-full bg-white" />
          SYSTEM READY
        </div>
        <NotificationsCenter />
        <button type="button" className="flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-2.5 pr-3.5 transition hover:bg-white/[0.07]">
          <div className="flex size-8 items-center justify-center rounded-xl bg-white text-[10px] font-black text-black">VS</div>
          <div className="hidden text-left sm:block">
            <p className="text-[13px] font-semibold text-white">VSIPEK</p>
            <p className="mt-0.5 text-[10px] text-white/38">Leader</p>
          </div>
        </button>
      </div>
    </header>
  )
}
