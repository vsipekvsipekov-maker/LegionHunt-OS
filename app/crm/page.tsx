import { redirect } from "next/navigation"

import { CrmBoard } from "@/components/crm/crm-board"
import { DashboardShell } from "@/components/layout/shell"
import { createClient } from "@/lib/supabase-server"

export default async function CrmPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1700px]">
        <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/35">
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

          <div className="flex items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-[10px] font-medium text-white/55 sm:self-auto">
            <span className="size-1.5 rounded-full bg-white" />
            CRM ONLINE
          </div>
        </section>

        <CrmBoard />
      </div>
    </DashboardShell>
  )
}