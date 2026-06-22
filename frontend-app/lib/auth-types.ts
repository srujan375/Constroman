export type User = {
  id: number
  organization_id: number
  name: string
  email: string
  role: string
  phone: string | null
  avatar_url: string | null
  is_active: boolean
  created_at: string
}

export type LoginRequest = {
  email: string
  password: string
}

export type TokenResponse = {
  access_token: string
  token_type: string
  user: User
}

export type RegisterRequest = {
  organization_slug: string
  name: string
  email: string
  password: string
  phone?: string
}
