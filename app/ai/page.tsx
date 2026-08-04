import { AiWorkspace } from "@/components/ai/ai-workspace"
import { DashboardShell } from "@/components/layout/shell"

export default function AiPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1580px]">
        <section className="mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/65">
            LegionHunt AI Center
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-[40px]">
                LEGION Intelligence
              </h1>
              <p className="mt-2 text-sm text-white/32">
                Анализ, поиск и принятие решений в одном рабочем пространстве.
              </p>
            </div>
          </div>
        </section>

        <AiWorkspace />
      </div>
    </DashboardShell>
  )
}
