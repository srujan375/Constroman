const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const token = localStorage.getItem("access_token")
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...getAuthHeaders(), ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`API ${res.status} ${path}: ${body}`)
  }
  return res.json()
}

export interface ApiProject {
  id: number
  name: string
  location: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
}

export interface ApiReport {
  id: number
  project_id: number
  report_date: string
  title: string | null
  status: string | null
  created_at: string
}

export function mapProject(p: ApiProject): import("./types").Project {
  return {
    id: slugify(p.name),
    name: p.name,
    location: p.location || "",
    startDate: p.start_date || "",
    status: (p.status as "active" | "completed" | "on-hold") || "active",
  }
}

export async function fetchProjects(): Promise<import("./types").Project[]> {
  const data = await apiFetch<ApiProject[]>("/projects")
  return data.map(mapProject)
}

export async function fetchProjectBySlug(slug: string): Promise<import("./types").Project | null> {
  const projects = await fetchProjects()
  return projects.find((p) => p.id === slug) || null
}

export async function fetchReports(projectId?: number): Promise<ApiReport[]> {
  const qs = projectId ? `?project_id=${projectId}` : ""
  return apiFetch<ApiReport[]>(`/reports${qs}`)
}

export async function createReport(data: {
  project_id: number
  report_date: string
  title?: string
  status?: string
}): Promise<ApiReport> {
  return apiFetch<ApiReport>("/reports", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export async function getSlugToBackendId(): Promise<Record<string, number>> {
  const data = await apiFetch<ApiProject[]>("/projects")
  const map: Record<string, number> = {}
  for (const p of data) {
    map[slugify(p.name)] = p.id
  }
  return map
}

export async function resolveProjectId(slug: string): Promise<number | null> {
  const map = await getSlugToBackendId()
  return map[slug] ?? null
}

// ---------------------------------------------------------------------------
// Registers, templates, submissions
// ---------------------------------------------------------------------------

export interface ApiRegister {
  id: number
  organization_id: number
  name: string
  slug: string
  sort_order: number
  scope: string
  config: Record<string, unknown>
  is_active: boolean
}

export interface ApiTemplate {
  id: number
  register_id: number
  name: string
  version: number
  schema_json: Record<string, unknown>
  is_active: boolean
  is_published: boolean
}

export interface ApiSubmission {
  id: number
  organization_id: number
  project_id: number | null
  register_id: number
  template_id: number
  submission_date: string
  title: string | null
  status: string
  form_data: Record<string, unknown>
  serial_no: number | null
  submitted_by_id: number | null
  created_at: string
  updated_at: string | null
}

let registersCache: ApiRegister[] | null = null

export async function fetchRegisters(force = false): Promise<ApiRegister[]> {
  if (!registersCache || force) {
    registersCache = await apiFetch<ApiRegister[]>("/registers")
  }
  return registersCache
}

/** Map a sheet's register slug to its backend register id + active template id. */
export async function resolveRegister(
  registerSlug: string
): Promise<{ registerId: number; templateId: number } | null> {
  const registers = await fetchRegisters()
  const register = registers.find((r) => r.slug === registerSlug)
  if (!register) return null

  const templates = await apiFetch<ApiTemplate[]>(`/templates/${register.id}`)
  const published = templates
    .filter((t) => t.is_published && t.is_active)
    .sort((a, b) => b.version - a.version)
  const template = published[0] ?? templates[0]
  if (!template) return null

  return { registerId: register.id, templateId: template.id }
}

export async function fetchSubmissions(params: {
  organizationId: number
  registerId: number
  projectId?: number | null
  status?: string
  pageSize?: number
}): Promise<ApiSubmission[]> {
  const qs = new URLSearchParams({
    organization_id: String(params.organizationId),
    register_id: String(params.registerId),
    page_size: String(params.pageSize ?? 200),
    sort_by: "submission_date",
    sort_order: "desc",
  })
  if (params.projectId != null) qs.set("project_id", String(params.projectId))
  if (params.status) qs.set("status", params.status)
  const res = await apiFetch<{ items: ApiSubmission[] }>(`/submissions?${qs.toString()}`)
  return res.items
}

/** Recent submissions across all registers for the activity feed. */
export async function fetchRecentSubmissions(
  organizationId: number,
  limit = 8
): Promise<ApiSubmission[]> {
  const qs = new URLSearchParams({
    organization_id: String(organizationId),
    page_size: String(limit),
    sort_by: "created_at",
    sort_order: "desc",
  })
  const res = await apiFetch<{ items: ApiSubmission[] }>(`/submissions?${qs.toString()}`)
  return res.items
}

export interface SubmissionPayload {
  organization_id: number
  project_id: number | null
  register_id: number
  template_id: number
  submission_date: string
  title?: string | null
  status?: string
  form_data: Record<string, unknown>
  submitted_by_id?: number | null
}

export async function createSubmission(payload: SubmissionPayload): Promise<ApiSubmission> {
  return apiFetch<ApiSubmission>("/submissions", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export async function updateSubmission(
  id: number,
  payload: Partial<SubmissionPayload>
): Promise<ApiSubmission> {
  return apiFetch<ApiSubmission>(`/submissions/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export async function deleteSubmission(id: number, userId?: number | null): Promise<void> {
  const qs = userId != null ? `?user_id=${userId}` : ""
  const res = await fetch(`${API_BASE}/submissions/${id}${qs}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  })
  if (!res.ok && res.status !== 204) {
    const body = await res.text().catch(() => "")
    throw new Error(`API ${res.status} DELETE /submissions/${id}: ${body}`)
  }
}
