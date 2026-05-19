"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Eye, EyeOff, ArrowRight, AlertCircle } from "lucide-react"
import { loginUser } from "@/lib/api"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e?: React.FormEvent) {
    e?.preventDefault()

    setErr(null)

    if (!email.trim()) {
      return setErr("Email is required")
    }

    if (!email.includes("@")) {
      return setErr("Enter a valid email address")
    }

    if (!password.trim()) {
      return setErr("Password is required")
    }

    setLoading(true)

    try {
      await loginUser({
        email: email.trim().toLowerCase(),
        password,
      })

      window.location.href = next
    } catch (e: any) {
      setErr(e?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-5 py-10 font-[Inter] text-[#111827]">
      {/* BACKGROUND ORBS */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.14)_0%,transparent_72%)] blur-2xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.10)_0%,transparent_72%)] blur-2xl" />

      <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center">
        <div
          className="
            w-full max-w-[440px]
          "
        >
          {/* LOGO */}
          <div className="mb-8 flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Relvo"
              className="h-10 w-auto object-contain"
            />

            <div>
              <p className="text-[18px] font-extrabold tracking-[-0.03em] text-[#111827]">
                Relvo
              </p>
            </div>
          </div>

          {/* HEADING */}
          <div className="mb-7">
            <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#111827]">
              Sign in to your account
            </h1>

            <p className="mt-2 text-[13px] leading-6 text-black/55">
              Access your workspace and continue where you left off.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="flex flex-col gap-5"
          >
            {/* EMAIL */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="
                  h-[52px] w-full
                  rounded-2xl
                  border border-black/[0.08]
                  bg-white/85
                  px-4
                  text-[14px] font-medium text-[#111827]
                  outline-none
                  placeholder:text-black/30
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                  transition-all
                  focus:border-violet-400/40
                  focus:bg-white
                  focus:ring-4 focus:ring-violet-500/10
                "
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="
                    h-[52px] w-full
                    rounded-2xl
                    border border-black/[0.08]
                    bg-white/85
                    px-4 pr-12
                    text-[14px] font-medium text-[#111827]
                    outline-none
                    placeholder:text-black/30
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                    transition-all
                    focus:border-violet-400/40
                    focus:bg-white
                    focus:ring-4 focus:ring-violet-500/10
                  "
                />

                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="
                    absolute right-3 top-1/2
                    flex h-8 w-8 -translate-y-1/2
                    items-center justify-center
                    rounded-xl
                    text-black/35
                    transition-all
                    hover:bg-black/[0.04]
                    hover:text-black/60
                  "
                >
                  {showPw ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* FORGOT */}
            <div className="-mt-1 flex justify-end">
              <a
                href="/auth/forgot-password"
                className="
                  text-[12px] font-semibold
                  text-violet-600/80
                  transition-colors
                  hover:text-violet-700
                "
              >
                Forgot your password?
              </a>
            </div>

            {/* ERROR */}
            {err && (
              <div
                className="
                  flex items-start gap-2
                  rounded-2xl
                  border border-red-200
                  bg-red-50/90
                  px-4 py-3
                  text-[12px] font-medium text-red-600
                "
              >
                <AlertCircle className="mt-[1px] h-4 w-4 flex-shrink-0" />
                <span>{err}</span>
              </div>
            )}

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="
                mt-1
                flex h-[54px] w-full
                items-center justify-center gap-2
                rounded-2xl
                bg-gradient-to-br from-violet-600 to-indigo-600
                text-[14px] font-bold text-white
                shadow-[0_12px_30px_rgba(124,58,237,0.28)]
                transition-all
                hover:scale-[0.99]
                hover:shadow-[0_14px_38px_rgba(124,58,237,0.36)]
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Signing you in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            <p className="text-center text-[11px] leading-6 text-black/40">
              Use the email you registered with and the password you were sent
              or later changed.
            </p>
          </form>

          {/* DIVIDER */}
          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-black/[0.06]" />

            <span className="text-[11px] font-medium text-black/35">
              new here?
            </span>

            <div className="h-px flex-1 bg-black/[0.06]" />
          </div>

          {/* REGISTER */}
          <a
            href="/auth/register"
            className="
              flex h-[52px] w-full
              items-center justify-center
              rounded-2xl
              border border-black/[0.08]
              bg-white/70
              text-[13px] font-semibold text-black/65
              shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
              transition-all
              hover:bg-white
              hover:text-[#111827]
              hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)]
            "
          >
            Create an account
          </a>
        </div>
      </div>
    </div>
  )
}