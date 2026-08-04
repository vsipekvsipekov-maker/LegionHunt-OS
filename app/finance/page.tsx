import { DashboardShell } from "@/components/layout/shell"
import { FinanceWorkspace } from "@/components/finance/finance-workspace"

export default function FinancePage() {
  return <DashboardShell><div className="mx-auto max-w-[1800px]"><FinanceWorkspace /></div></DashboardShell>
}
