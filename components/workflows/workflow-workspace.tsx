"use client"
import { useEffect, useState } from "react"

type Step={id:number;title:string;status:string;detail:string}
type Run={id:number;status:string;summary:string;startedAt:string;steps:Step[]}

export function WorkflowWorkspace(){
 const [runs,setRuns]=useState<Run[]>([]); const [loading,setLoading]=useState(true); const [busy,setBusy]=useState(false)
 const load=()=>fetch('/api/workflows',{cache:'no-store'}).then(r=>r.json()).then(d=>setRuns(d.runs||[])).finally(()=>setLoading(false))
 const scan=async()=>{setBusy(true);await fetch('/api/workflows',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scan:true})});await load();setBusy(false)}
 useEffect(()=>{load()},[])
 return <div className="space-y-7">
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
   <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-violet-300">LegionHunt Automation</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">Workflow Center</h1><p className="mt-2 text-sm text-white/38">CRM → Team → Academy → Notifications → Analytics</p></div>
   <div className="flex gap-2"><button onClick={scan} disabled={busy} className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50">{busy?"Запуск…":"Обработать активных"}</button><button onClick={load} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/70 hover:bg-white/[0.07]">Обновить</button></div>
  </div>
  <div className="grid gap-4 md:grid-cols-4">
   {[['Триггер','Кандидат → Активные'],['Team','Создание профиля'],['Academy','Назначение курса'],['Контроль','Журнал и уведомления']].map(([a,b],i)=><div key={a} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"><div className="text-xs text-white/28">0{i+1}</div><div className="mt-3 font-medium">{a}</div><div className="mt-1 text-sm text-white/38">{b}</div></div>)}
  </div>
  <section className="rounded-3xl border border-white/[0.08] bg-[#0b0e14]/80 p-5 sm:p-7">
   <div className="flex items-center justify-between"><h2 className="text-xl font-semibold">История запусков</h2><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">AUTO</span></div>
   <div className="mt-5 space-y-3">{loading?<p className="text-white/35">Загрузка…</p>:runs.length===0?<div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-white/35">Переведи кандидата CRM в статус «Активные» — здесь появится первый запуск.</div>:runs.map(run=><div key={run.id} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5"><div className="flex items-center justify-between gap-4"><div><div className="font-medium">Активация кандидата #{run.id}</div><div className="mt-1 text-sm text-white/38">{run.summary||'Выполняется…'}</div></div><span className={run.status==='completed'?'text-emerald-300':'text-amber-300'}>{run.status}</span></div><div className="mt-4 grid gap-2 md:grid-cols-3">{run.steps.map(step=><div key={step.id} className="rounded-xl bg-black/20 p-3"><div className="text-sm text-white/75">✓ {step.title}</div><div className="mt-1 text-xs text-white/30">{step.detail}</div></div>)}</div><div className="mt-3 text-xs text-white/22">{new Date(run.startedAt).toLocaleString('ru-RU')}</div></div>)}</div>
  </section>
 </div>
}
