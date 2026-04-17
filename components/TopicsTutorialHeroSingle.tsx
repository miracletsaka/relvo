"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Play, X } from "lucide-react";

type Props = {
  heading?: string;
  body?: string;
  youtubeId: string; // e.g. "dQw4w9WgXcQ"
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  tutorialTitle?: string; // shown on the “browser bar”
};

function ytThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
function ytEmbed(id: string) {
  // autoplay in modal
  return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
}

export default function TopicsTutorialHeroSingle({
  heading = "Ready to generate content faster?",
  body =
    "Watch the short tutorial showing the full flow: Topics → Drafts → Media → Approval, inside Relvō Marketing.",
  youtubeId,
  tutorialTitle = "Relvō Marketing — Tutorial",
  primaryCta = { label: "Get Started", href: "/dashboard/create" },
  secondaryCta = { label: "View Scheduled", href: "/dashboard/scheduled" },
}: Props) {
  const [open, setOpen] = useState(false);

  const thumb = useMemo(() => ytThumb(youtubeId), [youtubeId]);
  const embed = useMemo(() => ytEmbed(youtubeId), [youtubeId]);

  return (
    <section className="w-full">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border bg-white shadow-sm">
        {/* subtle pattern background */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12px 12px, rgba(17,24,39,.18) 1.2px, transparent 1.2px)",
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 p-6 sm:p-10">
          {/* LEFT TEXT */}
          <div className="space-y-4 sm:space-y-5">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
              {heading}
            </h2>

            <p className="text-sm sm:text-base font-semibold text-slate-700 leading-relaxed max-w-xl">
              {body}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                href={primaryCta.href}
                className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-blue-700 transition"
              >
                {primaryCta.label}
              </Link>

              <Link
                href={secondaryCta.href}
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow hover:bg-slate-800 transition"
              >
                {secondaryCta.label}
              </Link>
            </div>

            <div className="pt-4 text-[11px] font-bold text-slate-500 uppercase tracking-wide">
              Tip: Click the video to expand full-screen
            </div>
          </div>

          {/* RIGHT VIDEO CARD (like the screenshot) */}
          <div className="relative">
            <div className="relative rounded-3xl bg-slate-50 border shadow-lg overflow-hidden">
              {/* faux browser bar */}
              <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
                </div>
                <div className="text-[11px] font-bold text-slate-500 truncate">
                  {tutorialTitle}
                </div>
                <div className="w-10" />
              </div>

              {/* thumbnail with play overlay */}
              <button
                onClick={() => setOpen(true)}
                className="group relative block w-full"
                aria-label="Play tutorial"
              >
                <div className="aspect-video w-full bg-slate-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumb}
                    alt="Tutorial thumbnail"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur px-4 py-3 shadow-xl group-hover:scale-[1.02] transition">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Play className="h-5 w-5" />
                    </span>
                    <div className="text-left">
                      <div className="text-sm font-extrabold text-slate-900">
                        Play tutorial
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">
                        Expands to full screen
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* small footer */}
              <div className="px-4 py-4 bg-white border-t">
                <div className="text-sm font-extrabold text-slate-900">
                  Content generation walkthrough
                </div>
                <div className="text-xs font-semibold text-slate-600">
                  Topics → Drafts → Media → Approvals
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN EXPANDED PLAYER */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="absolute inset-0 flex items-center justify-center p-3 sm:p-6"
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-full max-w-5xl my-20 overflow-hidden rounded-3xl bg-white shadow-2xl border">
                {/* modal header */}
                <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b">
                  <div className="min-w-0">
                    <div className="text-sm sm:text-base font-extrabold text-slate-900 truncate">
                      {tutorialTitle}
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-600">
                      Tutorial video
                    </div>
                  </div>

                  <button
                    onClick={() => setOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-white hover:bg-slate-50 transition"
                    aria-label="Close"
                  >
                    <X className="h-5 w-5 text-slate-700" />
                  </button>
                </div>

                {/* player */}
                <div className="bg-black">
                  <div className="aspect-video w-full">
                    <iframe width="1047" height="589" src="https://www.youtube.com/embed/kLxNJzGCzt8" title="kuhesmedlab" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                  </div>
                </div>

                {/* footer actions */}
                <div className="p-4 bg-white border-t flex flex-wrap gap-2">
                  <Link
                    href="/dashboard/topics"
                    className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition"
                    onClick={() => setOpen(false)}
                  >
                    Topic Intake
                  </Link>
                  <Link
                    href="/dashboard/approvals"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
                    onClick={() => setOpen(false)}
                  >
                    Approvals
                  </Link>
                  <button
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-900 border hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
