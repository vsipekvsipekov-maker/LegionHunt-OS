import { AiForecast } from "@/components/finance/ai-forecast"
import { FinanceWorkspace } from "@/components/finance/finance-workspace"
import { DashboardShell } from "@/components/layout/shell"

export default function FinancePage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1800px] space-y-5">
        <FinanceWorkspace />
        <AiForecast />
      </div>
    </DashboardShell>
  )
}