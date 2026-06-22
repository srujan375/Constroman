import type { LoginRequest, RegisterRequest, TokenResponse, User } from "./auth-types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

function setAuthCookie(token: string) {
  if (typeof document === "undefined") return
  document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

function clearAuthCookie() {
  if (typeof document === "undefined") return
  document.cookie = "auth_token=; path=/; max-age=0"
}

export function setToken(token: string) {
  localStorage.setItem("access_token", token)
  setAuthCookie(token)
}

export function clearToken() {
  localStorage.removeItem("access_token")
  clearAuthCookie()
}

export function getAuthHeaders(): Record<string, string> {
  const token = getToken()
  if (!token) return {}
  return { Authorization: `Bearer ${token}` }
}

async function authFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`API ${res.status} ${path}: ${body}`)
  }
  return res.json()
}

export async function login(body: LoginRequest): Promise<TokenResponse> {
  const data = await authFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  })
  setToken(data.access_token)
  return data
}

export async function register(body: RegisterRequest): Promise<TokenResponse> {
  const data = await authFetch<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  })
  setToken(data.access_token)
  return data
}

export async function fetchMe(): Promise<User> {
  return authFetch<User>("/auth/me", {
    headers: { ...getAuthHeaders() },
  })
}

export function isAuthenticated(): boolean {
  return !!getToken()
}
