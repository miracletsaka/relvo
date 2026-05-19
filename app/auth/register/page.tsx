"use client"

import { useState } from "react"
import { ArrowRight, AlertCircle, CheckCircle2, Check } from "lucide-react"

const API = (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "")

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")

  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [success, setSuccess] = useState(false)
  const [submittedEmail, setSubmittedEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setErr(null)

    if (!firstName.trim()) {
      return setErr("First name is required")
    }

    if (!lastName.trim()) {
      return setErr("Last name is required")
    }

    if (!email.includes("@")) {
      return setErr("Enter a valid email address")
    }

    setLoading(true)

    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(
          json.detail || json.message || "Registration failed",
        )
      }

      setSubmittedEmail(email.trim().toLowerCase())
      setSuccess(true)
    } catch (e: any) {
      setErr(e.message || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5f7fb] px-5 py-10 font-[Inter] text-[#111827]">
      {/* BACKGROUND */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.14)_0%,transparent_72%)] blur-2xl" />

      <div className="pointer-events-none absolute -bottom-40 -right-40 h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.10)_0%,transparent_72%)] blur-2xl" />

      <div className="relative z-10 flex min-h-[calc(100vh-80px)] items-center justify-center">
        <div
          className="
            w-full max-w-[470px]
            rounded-[30px]
            border border-white/80
           
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

          {!success ? (
            <>
              {/* HEADER */}
              <div className="mb-7">
                <h1 className="text-[28px] font-extrabold leading-[1.05] tracking-[-0.04em] text-[#111827]">
                  Create your account
                </h1>

                <p className="mt-2 text-[13px] leading-6 text-black/55">
                  Start your free workspace. No credit card required.
                </p>
              </div>

              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5"
              >
                {/* NAME ROW */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {/* FIRST */}
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                      First Name
                    </label>

                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Alex"
                      autoComplete="given-name"
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

                  {/* LAST */}
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                      Last Name
                    </label>

                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Johnson"
                      autoComplete="family-name"
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
                </div>

                {/* EMAIL */}
                <div>
                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-black/40">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@company.com"
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
                      Creating your account...
                    </>
                  ) : (
                    <>
                      Get started free
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-[11px] leading-6 text-black/40">
                  We'll send a verification email and a temporary password
                  after signup.
                </p>
              </form>

              {/* PERKS */}
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                {[
                  "No credit card",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-1.5 text-[11px] text-black/40"
                  >
                    <Check className="h-3 w-3 text-emerald-500" />
                    {item}
                  </div>
                ))}
              </div>

              {/* DIVIDER */}
              <div className="my-7 flex items-center gap-3">
                <div className="h-px flex-1 bg-black/[0.06]" />

                <span className="text-[11px] font-medium text-black/35">
                  already have an account?
                </span>

                <div className="h-px flex-1 bg-black/[0.06]" />
              </div>

              {/* LOGIN */}
              <a
                href="/auth/login"
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
                Sign in instead
              </a>
            </>
          ) : (
            /* SUCCESS */
            <div
              className="
                rounded-[28px]
                border border-emerald-200/70
                bg-emerald-50/70
                p-6
                shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
              "
            >
              <div
                className="
                  mb-4 flex h-12 w-12
                  items-center justify-center
                  rounded-2xl
                  border border-emerald-200
                  bg-emerald-100/70
                "
              >
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              </div>

              <h2 className="text-[24px] font-extrabold tracking-[-0.03em] text-[#111827]">
                Check your email
              </h2>

              <p className="mt-3 text-[14px] leading-7 text-black/55">
                We've sent a verification email to:
              </p>

              <div
                className="
                  my-4 rounded-2xl
                  border border-black/[0.06]
                  bg-white/80
                  px-4 py-3
                  text-[14px] font-bold text-[#111827]
                  shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                  break-all
                "
              >
                {submittedEmail}
              </div>

              <p className="text-[13px] leading-7 text-black/50">
                We also sent your temporary password in that same email.
              </p>

              <p className="mt-2 text-[12px] leading-6 text-black/38">
                Verify your email first, then sign in and change your
                password in settings.
              </p>

              <div className="mt-6 flex flex-col gap-3">
                <a
                  href="/auth/login"
                  className="
                    flex h-[52px] w-full
                    items-center justify-center gap-2
                    rounded-2xl
                    bg-gradient-to-br from-violet-600 to-indigo-600
                    text-[13px] font-bold text-white
                    shadow-[0_10px_28px_rgba(124,58,237,0.25)]
                    transition-all
                    hover:opacity-95
                  "
                >
                  Go to sign in
                </a>

                <button
                  type="button"
                  onClick={() => {
                    setSuccess(false)
                    setErr(null)
                  }}
                  className="
                    flex h-[50px] w-full
                    items-center justify-center
                    rounded-2xl
                    border border-black/[0.08]
                    bg-white/70
                    text-[13px] font-semibold text-black/60
                    shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]
                    transition-all
                    hover:bg-white
                    hover:text-[#111827]
                  "
                >
                  Register another email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}