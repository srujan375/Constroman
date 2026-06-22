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
