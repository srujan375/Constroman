/**
 * Tiny arithmetic formula evaluator for calculated form fields.
 *
 * Formulas reference other fields with `{fieldName}` and use the operators
 * + - * / and parentheses, e.g. "{quantityReceived} - {quantityRejected}".
 *
 * This intentionally supports only numeric arithmetic — anything outside the
 * whitelisted character set throws, so we never feed arbitrary input to a
 * dynamic evaluator.
 */
export function evaluateFormula(
  formula: string,
  values: Record<string, unknown>
): number | "" {
  const substituted = formula.replace(/\{(\w+)\}/g, (_, name: string) => {
    const raw = values[name]
    const num = typeof raw === "number" ? raw : parseFloat(String(raw ?? ""))
    return Number.isFinite(num) ? String(num) : "0"
  })

  if (!/^[\d\s+\-*/().]+$/.test(substituted)) {
    throw new Error(`Unsafe formula expression: ${formula} -> ${substituted}`)
  }

  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const result = Function(`"use strict"; return (${substituted});`)()
  if (typeof result !== "number" || !Number.isFinite(result)) return ""
  // Round to 2 decimals to avoid floating point noise.
  return Math.round(result * 100) / 100
}
