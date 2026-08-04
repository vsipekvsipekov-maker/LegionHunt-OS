const members = [
  { name: "Алексей Морозов", reason: "Нет активности 3 дня", score: 82, initials: "АМ" },
  { name: "Мария Литвин", reason: "Нужен повторный контакт", score: 74, initials: "МЛ" },
  { name: "Денис Ковалёв", reason: "Близок к выполнению плана", score: 91, initials: "ДК" },
]

export function AttentionList() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.028] p-5 backdrop-blur-xl">
      <div>
        <p className="text-sm font-semibold text-white">Требуют внимания</p>
        <p className="mt-1 text-xs text-white/28">Рекомендации LEGION AI</p>
      </div>

      <div className="mt-4 space-y-2">
        {members.map((member) => (
          <button key={member.name} type="button" className="flex w-full items-center gap-3 rounded-xl border border-transparent px-2.5 py-3 text-left transition hover:border-white/[0.06] hover:bg-white/[0.035]">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.04] text-[10px] font-semibold text-white/65">{member.initials}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-white/75">{member.name}</p>
              <p className="mt-1 truncate text-[11px] text-white/25">{member.reason}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-violet-300">{member.score}%</p>
              <p className="mt-1 text-[9px] text-white/20">priority</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  )
}
