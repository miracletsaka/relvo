"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { verifyEmail } from "@/lib/api";

function VerifyContent() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") || "";

  const [msg, setMsg] = useState<string>("Verifying...");
  const [err, setErr] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  useEffect(() => {
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;
    let countdownInterval: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const res = await verifyEmail(token);
        setMsg(res?.message || "Email verified successfully. Redirecting to login...");

        countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              if (countdownInterval) clearInterval(countdownInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        redirectTimer = setTimeout(() => {
          router.replace("/auth/login");
        }, 3000);
      } catch (e: any) {
        setErr(e.message || "Verification failed.");
        setMsg("Verification failed.");
      }
    })();

    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [token, router]);

  return (
    <div className="max-w-md mx-auto p-6 space-y-3">
      <h1 className="text-xl font-bold">Email verification</h1>
      <p className="text-sm">{msg}</p>

      {!err && countdown > 0 && (
        <p className="text-sm text-gray-600">
          Redirecting to login in {countdown}...
        </p>
      )}

      {err && <p className="text-red-700 text-sm">{err}</p>}

      {err && (
        <a
          href="/auth/login"
          className="inline-block text-sm font-medium text-violet-700 underline"
        >
          Go to login
        </a>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-md mx-auto p-6 space-y-2">
          <h1 className="text-xl font-bold">Email verification</h1>
          <p className="text-sm">Loading...</p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}