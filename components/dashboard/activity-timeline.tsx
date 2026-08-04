const events = [
  { time: "16:01", title: "AI обработал 12 новых вопросов", tag: "AI Center", color: "bg-violet-400" },
  { time: "15:35", title: "Создано 4 записи кандидатов", tag: "CRM", color: "bg-emerald-400" },
  { time: "15:21", title: "Обновлена статья «Матрёшка»", tag: "Wiki", color: "bg-blue-400" },
  { time: "14:48", title: "Подтверждена выплата наставнику", tag: "Finance", color: "bg-amber-400" },
]

export function ActivityTimeline() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.028] p-5 backdrop-blur-xl">
      <div>
        <p className="text-sm font-semibold text-white">Live Activity</p>
        <p className="mt-1 text-xs text-white/28">События рабочего пространства</p>
      </div>

      <div className="mt-5">
        {events.map((event, index) => (
          <div key={event.title} className="relative flex gap-3 pb-5 last:pb-0">
            {index !== events.length - 1 && <span className="absolute left-[53px] top-5 h-[calc(100%-8px)] w-px bg-white/[0.06]" />}
            <span className="w-10 shrink-0 pt-0.5 text-[10px] text-white/22">{event.time}</span>
            <span className={["relative mt-1.5 size-2 shrink-0 rounded-full shadow-[0_0_10px_currentColor]", event.color].join(" ")} />
            <div className="min-w-0">
              <p className="truncate text-xs text-white/70">{event.title}</p>
              <p className="mt-1 text-[10px] text-white/22">{event.tag}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
