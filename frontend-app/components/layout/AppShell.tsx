'use client'

export default function AppShell({ children }: { children: React.ReactNode }) {
  // Each page renders its own top bar / header. The shell just provides a
  // full-height scroll container so the site stays clean and simple.
  return <main className="h-screen overflow-y-auto">{children}</main>
}
