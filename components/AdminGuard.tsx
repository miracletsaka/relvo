"use client"
 
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
 
const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "")
 
const ADMIN_EMAILS = new Set([
  "neuroflowaimalawi@gmail.com",
  "tsakamiracle@gmail.com",
])
 
type User = { email: string }
 
interface AdminGuardProps {
  children: React.ReactNode
  /** Redirect destination if not authorised. Default: /dashboard */
  redirectTo?: string
}
 
export function AdminGuard({ children, redirectTo = "/dashboard" }: AdminGuardProps) {
  const router  = useRouter()
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading")
 
  useEffect(() => {
    let cancelled = false
 
    const check = async () => {
      try {
        const res = await fetch(`${API}/auth/me`, {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        })
        if (!res.ok) throw new Error("unauth")
        const user: User = await res.json()
        if (cancelled) return
        if (ADMIN_EMAILS.has(user.email)) {
          setStatus("allowed")
        } else {
          setStatus("denied")
          router.replace(redirectTo)
        }
      } catch {
        if (!cancelled) {
          setStatus("denied")
          router.replace("/auth/login")
        }
      }
    }
 
    check()
    return () => { cancelled = true }
  }, [router, redirectTo])
 
  if (status === "loading") {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0e0e12",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "DM Mono, monospace",
        fontSize: 12,
        color: "rgba(255,255,255,0.25)",
        letterSpacing: "0.1em",
      }}>
        Checking access…
      </div>
    )
  }
 
  if (status === "denied") {
    // Router redirect already fired — render nothing while navigating
    return null
  }
 
  return <>{children}</>
}