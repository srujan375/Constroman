'use client'

import * as Icons from "lucide-react"
import type { LucideProps } from "lucide-react"

type IconProps = LucideProps & { name: string }

/**
 * Resolves a lucide icon by name at runtime. Falls back to a neutral icon
 * if the name doesn't exist in the installed lucide-react version, so a
 * stray icon name in the sheet config can never break the build.
 */
export default function Icon({ name, ...props }: IconProps) {
  const registry = Icons as unknown as Record<string, React.ComponentType<LucideProps>>
  const Cmp = registry[name] ?? registry.Square ?? registry.FileText
  return <Cmp {...props} />
}
