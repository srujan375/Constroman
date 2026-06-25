import config from "./sheets.config.json"

export type FieldType = "text" | "textarea" | "number" | "date" | "time" | "select" | "calc"

export interface SheetField {
  name: string
  label: string
  type: FieldType
  width?: number
  options?: string[]
  formula?: string
  required?: boolean
}

export type SheetMode = "table" | "document"

export interface SheetDef {
  code: string
  slug: string
  registerSlug: string
  name: string
  title: string
  group: string
  icon: string
  mode: SheetMode
  serial: boolean
  fields: SheetField[]
}

export interface GroupDef {
  key: string
  number: string
  label: string
  icon: string
}

export const SHEETS: SheetDef[] = config.sheets as SheetDef[]
export const GROUPS: GroupDef[] = config.groups as GroupDef[]

export function getSheet(slug: string): SheetDef | undefined {
  return SHEETS.find((s) => s.slug === slug)
}

export function getSheetByRegisterSlug(registerSlug: string): SheetDef | undefined {
  return SHEETS.find((s) => s.registerSlug === registerSlug)
}

/** Sheets grouped by their sidebar group, in group + sheet order. */
export function sheetsByGroup(): { group: GroupDef; sheets: SheetDef[] }[] {
  return GROUPS.map((group) => ({
    group,
    sheets: SHEETS.filter((s) => s.group === group.key),
  })).filter((g) => g.sheets.length > 0)
}
