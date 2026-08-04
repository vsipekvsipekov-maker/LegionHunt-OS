import type { SVGProps } from "react"

export type IconProps = SVGProps<SVGSVGElement>

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function GridIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>
}
export function BrainIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M9.5 4.5A3 3 0 0 0 4 6v1.2A3.2 3.2 0 0 0 3 13a3.5 3.5 0 0 0 4.2 5.4A3 3 0 0 0 12 17V7.5a3 3 0 0 0-2.5-3Z"/><path d="M14.5 4.5A3 3 0 0 1 20 6v1.2a3.2 3.2 0 0 1 1 5.8 3.5 3.5 0 0 1-4.2 5.4A3 3 0 0 1 12 17V7.5a3 3 0 0 1 2.5-3Z"/><path d="M8 9.5c1.2 0 2 .7 2 1.8M16 9.5c-1.2 0-2 .7-2 1.8"/></svg>
}
export function UsersIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
}
export function BookIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>
}
export function GraduationIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m2 10 10-5 10 5-10 5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/><path d="M22 10v6"/></svg>
}
export function ChartIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></svg>
}
export function WalletIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M20 7V5a2 2 0 0 0-2-2H5a3 3 0 0 0 0 6h15v12H5a3 3 0 0 1-3-3V6"/><path d="M16 13h2"/></svg>
}
export function SettingsIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>
}
export function SearchIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>
}
export function BellIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>
}
export function SparklesIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4Z"/><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8Z"/></svg>
}
export function ArrowUpRightIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M7 17 17 7M7 7h10v10"/></svg>
}
export function CalendarIcon(props: IconProps) {
  return <svg {...base} {...props}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>
}
export function TeamIcon(props: IconProps) {
  return <svg {...base} {...props}><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
}
export function CommandIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M18 9a3 3 0 1 0 0-6 3 3 0 0 0-3 3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3Z"/></svg>
}

export function AutomationIcon(props: IconProps) {
  return <svg {...base} {...props}><path d="M4 6h10a3 3 0 0 1 3 3v1"/><path d="m14 7 3 3 3-3"/><path d="M20 18H10a3 3 0 0 1-3-3v-1"/><path d="m10 17-3-3-3 3"/></svg>
}
