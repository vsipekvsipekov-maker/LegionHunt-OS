import { DashboardShell } from "@/components/layout/shell"
import { SettingsWorkspace } from "@/components/settings/settings-workspace"

export default function SettingsPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1600px]">
        <SettingsWorkspace />
      </div>
    </DashboardShell>
  )
}
