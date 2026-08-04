import { ArrowUpRightIcon, BookIcon, BrainIcon, GraduationIcon, UsersIcon } from "@/components/icons"

const actions = [
  {
    title: "Добавить кандидата",
    description: "Создать запись в CRM",
    icon: UsersIcon,
    className: "from-violet-500/20 to-violet-500/[0.03]",
  },
  {
    title: "Спросить LEGION AI",
    description: "Получить точный ответ",
    icon: BrainIcon,
    className: "from-fuchsia-500/20 to-fuchsia-500/[0.03]",
  },
  {
    title: "Новая статья",
    description: "Пополнить базу знаний",
    icon: BookIcon,
    className: "from-blue-500/20 to-blue-500/[0.03]",
  },
  {
    title: "Продолжить обучение",
    description: "Следующий урок Academy",
    icon: GraduationIcon,
    className: "from-emerald-500/20 to-emerald-500/[0.03]",
  },
]

export function QuickActions() {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 backdrop-blur-xl">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Быстрые действия</h2>
          <p className="mt-1 text-xs text-white/30">Самые частые задачи команды</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => {
          const Icon = action.icon

          return (
            <button
              key={action.title}
              type="button"
              className={[
                "group flex min-h-24 items-center gap-4 rounded-xl border border-white/[0.06] bg-gradient-to-br p-4 text-left transition duration-300",
                "hover:-translate-y-0.5 hover:border-white/[0.11]",
                action.className,
              ].join(" ")}
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-black/20 text-white/70">
                <Icon className="size-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{action.title}</p>
                <p className="mt-1 truncate text-xs text-white/35">{action.description}</p>
              </div>
              <ArrowUpRightIcon className="size-4 text-white/20 transition group-hover:text-white/60" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
