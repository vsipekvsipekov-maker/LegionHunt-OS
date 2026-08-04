import { CrmBoard } from "@/components/crm/crm-board"
import { DashboardShell } from "@/components/layout/shell"

export default function CrmPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1700px]">
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-violet-300/65">
              LegionHunt CRM
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-[40px]">
              Кандидаты и воронка
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/32">
              Управляй кандидатами, следующими действиями и приоритетами команды
              в одном рабочем пространстве.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-xl border border-emerald-400/12 bg-emerald-400/[0.05] px-3 py-2 text-[10px] font-medium text-emerald-300 sm:self-auto">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            CRM ONLINE
          </div>
        </section>

        <CrmBoard />
      </div>
    </DashboardShell>
  )
}
