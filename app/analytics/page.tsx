import { DashboardShell } from "@/components/layout/shell"
import { AnalyticsWorkspace } from "@/components/analytics/analytics-workspace"

export default function AnalyticsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1800px]">
        <AnalyticsWorkspace />
      </div>
    </DashboardShell>
  )
}
