import { WikiWorkspace } from "@/components/wiki/wiki-workspace"
import { DashboardShell } from "@/components/layout/shell"

export default function WikiPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-[1800px]">
        <WikiWorkspace />
      </div>
    </DashboardShell>
  )
}
