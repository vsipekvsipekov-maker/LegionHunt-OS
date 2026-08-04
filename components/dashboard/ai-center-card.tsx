"use client"

import { useState } from "react"
import { ArrowUpRightIcon, BrainIcon, SparklesIcon } from "@/components/icons"

const prompts = ["Кто требует внимания?", "Покажи выплаты", "Что с конверсией?", "Найти статью"]

export function AiCenterCard() {
  const [message, setMessage] = useState("")

  return (
    <section className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/[0.13] via-fuchsia-500/[0.055] to-transparent p-6 shadow-[0_24px_90px_rgba(91,55,160,0.14)]">
      <div className="absolute -right-20 -top-24 size-64 rounded-full bg-violet-400/15 blur-[90px]" />
      <div className="absolute -bottom-24 left-[30%] size-56 rounded-full bg-fuchsia-500/10 blur-[100px]" />

      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between">
          <div className="flex size-11 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200">
            <BrainIcon className="size-5" />
          </div>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2.5 py-1 text-[10px] font-medium text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-300" />
            ONLINE
          </span>
        </div>

        <div className="mt-7">
          <div className="flex items-center gap-2 text-violet-200">
            <SparklesIcon className="size-4" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">LEGION Intelligence</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Чем помочь сегодня?</h2>
          <p className="mt-2 text-sm leading-6 text-white/38">
            AI видит CRM, знания, активность команды и может предложить следующий шаг.
          </p>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setMessage(prompt)}
              className="rounded-lg border border-white/[0.08] bg-white/[0.035] px-3 py-2 text-[11px] text-white/45 transition hover:bg-white/[0.075] hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="mt-auto pt-5">
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.09] bg-black/20 p-2">
            <input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Спросить LEGION AI..."
              className="h-9 min-w-0 flex-1 bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/23"
            />
            <button type="button" className="flex size-9 items-center justify-center rounded-lg bg-white text-black transition hover:bg-white/90">
              <ArrowUpRightIcon className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
