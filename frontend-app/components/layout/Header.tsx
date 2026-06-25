'use client'

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Printer, LogOut, ArrowLeft } from "lucide-react"
import { useAuth } from "@/components/auth/AuthProvider"

type HeaderProps = {
  title: string
  subtitle?: string
}

export default function Header({ title, subtitle }: HeaderProps) {
  const { user, logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:block">All Forms</span>
        </Link>
        <div className="border-l border-slate-200 pl-4 min-w-0">
          <h1 className="text-xl font-bold text-slate-800 truncate">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5 truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-slate-500 hidden sm:block">{today}</span>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span className="hidden sm:block">Print</span>
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-medium">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <span className="hidden sm:block text-sm font-medium">{user?.name}</span>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-slate-800 truncate">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                <p className="text-xs text-slate-400 capitalize mt-0.5">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
