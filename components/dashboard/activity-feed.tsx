const events = [
  {
    initials: "AL",
    title: "Алексей добавил нового кандидата",
    meta: "CRM · 4 минуты назад",
    accent: "bg-violet-400",
  },
  {
    initials: "AI",
    title: "LEGION AI закрыл 12 вопросов",
    meta: "AI Center · 18 минут назад",
    accent: "bg-fuchsia-400",
  },
  {
    initials: "MR",
    title: "Мария завершила модуль Academy",
    meta: "Обучение · 32 минуты назад",
    accent: "bg-emerald-400",
  },
  {
    initials: "DK",
    title: "Дмитрий обновил статью «Матрёшка»",
    meta: "Knowledge Base · 1 час назад",
    accent: "bg-blue-400",
  },
]

export function ActivityFeed() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
      <div className="mb-5">
        <h2 className="text-sm font-semibold text-white">Активность команды</h2>
        <p className="mt-1 text-xs text-white/30">Последние действия в LegionHunt</p>
      </div>

      <div className="space-y-1">
        {events.map((event) => (
          <div
            key={event.title}
            className="group flex items-center gap-3 rounded-xl px-2 py-3 transition hover:bg-white/[0.035]"
          >
            <div className="relative flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-[10px] font-semibold text-white/65">
              {event.initials}
              <span
                className={[
                  "absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-[#111318]",
                  event.accent,
                ].join(" ")}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/75">{event.title}</p>
              <p className="mt-1 truncate text-[11px] text-white/25">{event.meta}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
