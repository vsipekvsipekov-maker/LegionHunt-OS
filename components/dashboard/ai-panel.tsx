import { ArrowUpRightIcon, BrainIcon, SparklesIcon } from "@/components/icons"

export function AiPanel() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.12] via-fuchsia-500/[0.06] to-transparent p-6 shadow-[0_20px_80px_rgba(92,54,170,0.14)]">
      <div className="absolute -right-16 -top-20 size-52 rounded-full bg-violet-400/15 blur-[70px]" />
      <div className="absolute bottom-0 left-1/3 h-px w-1/2 bg-gradient-to-r from-transparent via-violet-300/30 to-transparent" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200 shadow-[0_0_28px_rgba(139,92,246,0.18)]">
            <BrainIcon className="size-5" />
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-medium text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.9)]" />
            AI ONLINE
          </span>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 text-violet-200">
            <SparklesIcon className="size-4" />
            <span className="text-xs font-medium uppercase tracking-[0.16em]">LEGION Intelligence</span>
          </div>
          <h2 className="mt-3 max-w-md text-2xl font-semibold tracking-[-0.035em] text-white">
            AI уже проанализировал активность команды
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/45">
            Конверсия выросла на 12%. Три кандидата требуют повторного контакта,
            а двум агентам стоит назначить созвон с наставником.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-xs font-semibold text-black transition hover:bg-white/90"
          >
            Открыть рекомендации
            <ArrowUpRightIcon className="size-3.5" />
          </button>
          <button
            type="button"
            className="h-10 rounded-xl border border-white/[0.09] bg-white/[0.04] px-4 text-xs font-medium text-white/60 transition hover:bg-white/[0.08] hover:text-white"
          >
            Задать вопрос AI
          </button>
        </div>
      </div>
    </section>
  )
}
