import { DashboardShell } from "@/components/layout/shell"
import { CalendarWorkspace } from "@/components/calendar/calendar-workspace"

export default function CalendarPage() {
  return <DashboardShell><div className="mx-auto max-w-[1800px]"><CalendarWorkspace /></div></DashboardShell>
}
