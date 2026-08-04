"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

type Metrics = { income:number; expenses:number; profit:number; roi:number; pendingIncome:number; transactionCount:number }
type Trend = { label:string; income:number; expenses:number }
type Transaction = { id:string; type:"income"|"expense"; title:string; category:string; amount:number; currency:string; status:"completed"|"pending"|"cancelled"; counterparty:string; note:string; transactionAt:string }
type Category = { id:string; name:string; kind:"income"|"expense"; color:string }
type Breakdown = { category:string; type:"income"|"expense"; amount:number }

type FinanceResponse = { metrics:Metrics; trends:Trend[]; transactions:Transaction[]; categories:Category[]; categoryBreakdown:Breakdown[] }

function money(value:number) {
  return new Intl.NumberFormat("ru-RU", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(value)
}

function MetricCard({label,value,note,tone}:{label:string;value:string;note:string;tone:string}) {
  return <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5">
    <span className={`absolute inset-x-0 top-0 h-px ${tone}`} />
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">{label}</p>
    <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">{value}</p>
    <p className="mt-2 text-xs text-white/28">{note}</p>
  </div>
}

function FinanceChart({points}:{points:Trend[]}) {
  const width=800, height=240, pad=20
  const max=Math.max(...points.flatMap(p=>[Number(p.income),Number(p.expenses)]),1)
  const den=Math.max(points.length-1,1)
  const coords=(key:"income"|"expenses")=>points.map((p,i)=>({x:pad+(i/den)*(width-pad*2),y:height-pad-(Number(p[key])/max)*(height-pad*2),label:p.label,value:Number(p[key])}))
  const income=coords("income"), expenses=coords("expenses")
  const line=(arr:ReturnType<typeof coords>)=>arr.map(p=>`${p.x},${p.y}`).join(" ")
  return <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.05] bg-black/10 p-3">
    <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full" role="img" aria-label="График доходов и расходов">
      <defs>
        <linearGradient id="finance-income" x1="0" x2="1"><stop stopColor="rgb(52 211 153)"/><stop offset="1" stopColor="rgb(34 197 94)"/></linearGradient>
        <linearGradient id="finance-expense" x1="0" x2="1"><stop stopColor="rgb(251 113 133)"/><stop offset="1" stopColor="rgb(244 63 94)"/></linearGradient>
      </defs>
      {[.25,.5,.75].map(r=><line key={r} x1={pad} x2={width-pad} y1={height*r} y2={height*r} stroke="rgba(255,255,255,.05)" />)}
      <polyline points={line(income)} fill="none" stroke="url(#finance-income)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={line(expenses)} fill="none" stroke="url(#finance-expense)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {income.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="3.5" fill="rgb(110 231 183)"/>{(i===0||i===income.length-1||i%Math.ceil(points.length/7)===0)&&<text x={p.x} y={height-2} textAnchor="middle" fill="rgba(255,255,255,.25)" fontSize="10">{p.label}</text>}</g>)}
    </svg>
  </div>
}

export function FinanceWorkspace() {
  const [data,setData]=useState<FinanceResponse|null>(null)
  const [loading,setLoading]=useState(true)
  const [days,setDays]=useState(30)
  const [type,setType]=useState("all")
  const [query,setQuery]=useState("")
  const [showForm,setShowForm]=useState(false)
  const [saving,setSaving]=useState(false)
  const [error,setError]=useState("")
  const [form,setForm]=useState({type:"income",title:"",category:"Выручка",amount:"",status:"completed",counterparty:"",note:"",transactionAt:new Date().toISOString().slice(0,10)})

  const load=useCallback(async()=>{
    setLoading(true);setError("")
    try {
      const response=await fetch(`/api/finance?days=${days}&type=${type}&q=${encodeURIComponent(query)}`,{cache:"no-store"})
      const payload=await response.json()
      if(!response.ok) throw new Error(payload.error||"Ошибка Finance")
      setData(payload)
    } catch(e) { setError(e instanceof Error?e.message:"Ошибка Finance") }
    finally { setLoading(false) }
  },[days,type,query])

  useEffect(()=>{ const timer=window.setTimeout(()=>void load(),0); return ()=>window.clearTimeout(timer) },[load])

  const categories=useMemo(()=>data?.categories.filter(c=>c.kind===form.type)??[],[data,form.type])
  const maxCategory=useMemo(()=>Math.max(...(data?.categoryBreakdown.map(c=>Number(c.amount))??[]),1),[data])

  async function createTransaction(e:React.FormEvent) {
    e.preventDefault();setSaving(true);setError("")
    try {
      const response=await fetch("/api/finance",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)})
      const payload=await response.json();if(!response.ok) throw new Error(payload.error||"Ошибка сохранения")
      setShowForm(false);setForm({...form,title:"",amount:"",counterparty:"",note:""});await load()
    } catch(e) { setError(e instanceof Error?e.message:"Ошибка сохранения") }
    finally { setSaving(false) }
  }

  async function remove(id:string) {
    if(!window.confirm("Удалить транзакцию?")) return
    const response=await fetch(`/api/finance?id=${id}`,{method:"DELETE"})
    if(response.ok) await load()
  }

  if(loading&&!data) return <div className="p-10 text-sm text-white/40">Загрузка Finance Center...</div>

  const metrics=data?.metrics??{income:0,expenses:0,profit:0,roi:0,pendingIncome:0,transactionCount:0}
  const insights=[
    metrics.profit>=0?`Чистая прибыль за период составляет ${money(metrics.profit)}.`:`Расходы превышают доходы на ${money(Math.abs(metrics.profit))}.`,
    metrics.roi>100?`ROI ${metrics.roi}% — финансовая эффективность выше целевого уровня.`:`ROI ${metrics.roi}% — стоит проверить самые крупные категории расходов.`,
    metrics.pendingIncome>0?`Ожидается подтверждение доходов на ${money(metrics.pendingIncome)}.`:"Все доходные операции подтверждены.",
  ]

  return <div className="min-h-[calc(100vh-80px)] px-5 py-7 md:px-8">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div className="flex items-center gap-3"><div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-xl shadow-[0_0_35px_rgba(16,185,129,.22)]">$</div><div><h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">Finance Center</h1><p className="mt-1 text-sm text-white/35">Доходы, расходы, прибыль и финансовые решения команды</p></div></div>
      <div className="flex flex-wrap gap-2"><select value={days} onChange={e=>setDays(Number(e.target.value))} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-4 py-2.5 text-sm text-white/60 outline-none"><option value={7}>7 дней</option><option value={30}>30 дней</option><option value={90}>90 дней</option><option value={365}>Год</option></select><button onClick={()=>setShowForm(v=>!v)} className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90">+ Транзакция</button></div>
    </div>

    {error&&<div className="mt-5 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">{error}</div>}

    {showForm&&<form onSubmit={createTransaction} className="mt-6 grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 md:grid-cols-2 xl:grid-cols-4">
      <select value={form.type} onChange={e=>{const next=e.target.value;const list=data?.categories.filter(c=>c.kind===next)??[];setForm({...form,type:next,category:list[0]?.name??"Другое"})}} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-3 text-sm text-white"><option value="income">Доход</option><option value="expense">Расход</option></select>
      <input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Название" className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-3 text-sm text-white outline-none" />
      <select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-3 text-sm text-white">{categories.map(c=><option key={c.id}>{c.name}</option>)}</select>
      <input required min="0.01" step="0.01" type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="Сумма" className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-3 text-sm text-white outline-none" />
      <input value={form.counterparty} onChange={e=>setForm({...form,counterparty:e.target.value})} placeholder="Контрагент" className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-3 text-sm text-white outline-none" />
      <input type="date" value={form.transactionAt} onChange={e=>setForm({...form,transactionAt:e.target.value})} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-3 text-sm text-white outline-none" />
      <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-3 text-sm text-white"><option value="completed">Проведено</option><option value="pending">Ожидается</option><option value="cancelled">Отменено</option></select>
      <button disabled={saving} className="rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black disabled:opacity-50">{saving?"Сохранение...":"Сохранить"}</button>
    </form>}

    <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Доход" value={money(metrics.income)} note={`за ${days} дней`} tone="bg-emerald-400" />
      <MetricCard label="Расходы" value={money(metrics.expenses)} note="подтверждённые операции" tone="bg-rose-400" />
      <MetricCard label="Чистая прибыль" value={money(metrics.profit)} note="доход минус расходы" tone="bg-violet-400" />
      <MetricCard label="ROI" value={`${metrics.roi}%`} note="эффективность расходов" tone="bg-cyan-400" />
      <MetricCard label="Ожидается" value={money(metrics.pendingIncome)} note={`${metrics.transactionCount} операций за период`} tone="bg-amber-400" />
    </div>

    <div className="mt-7 grid gap-5 xl:grid-cols-[1.65fr_.85fr]">
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.022] p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">Динамика финансов</h2><p className="mt-1 text-xs text-white/30">Доходы и расходы по дням</p></div><div className="flex gap-4 text-[10px]"><span className="text-emerald-300">● Доход</span><span className="text-rose-300">● Расход</span></div></div><FinanceChart points={data?.trends??[]} /></section>
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.022] p-5"><h2 className="font-semibold text-white">AI Finance Insights</h2><p className="mt-1 text-xs text-white/30">Автоматический обзор периода</p><div className="mt-5 space-y-3">{insights.map((item,i)=><div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-4 text-sm leading-6 text-white/55"><span className="mr-2 text-violet-300">✦</span>{item}</div>)}</div></section>
    </div>

    <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.7fr]">
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.022] p-5"><h2 className="font-semibold text-white">Категории</h2><div className="mt-5 space-y-4">{(data?.categoryBreakdown??[]).map(item=><div key={`${item.type}-${item.category}`}><div className="flex justify-between text-xs"><span className="text-white/45">{item.category}</span><span className={item.type==="income"?"text-emerald-300":"text-rose-300"}>{money(item.amount)}</span></div><div className="mt-2 h-1.5 rounded-full bg-white/[0.05]"><div className={`h-full rounded-full ${item.type==="income"?"bg-emerald-400":"bg-rose-400"}`} style={{width:`${Math.max(5,(item.amount/maxCategory)*100)}%`}} /></div></div>)}</div></section>
      <section className="rounded-2xl border border-white/[0.07] bg-white/[0.022] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-white">Транзакции</h2><p className="mt-1 text-xs text-white/30">Последние финансовые операции</p></div><div className="flex gap-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск..." className="w-40 rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2 text-xs text-white outline-none"/><select value={type} onChange={e=>setType(e.target.value)} className="rounded-xl border border-white/[0.08] bg-[#11151d] px-3 py-2 text-xs text-white"><option value="all">Все</option><option value="income">Доходы</option><option value="expense">Расходы</option></select></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-white/[0.06] text-[9px] uppercase tracking-[0.15em] text-white/22"><th className="py-3">Операция</th><th>Категория</th><th>Дата</th><th>Статус</th><th className="text-right">Сумма</th><th /></tr></thead><tbody>{(data?.transactions??[]).map(t=><tr key={t.id} className="border-b border-white/[0.045] text-sm"><td className="py-4"><p className="text-white/75">{t.title}</p><p className="mt-1 text-[10px] text-white/25">{t.counterparty||"Без контрагента"}</p></td><td className="text-white/38">{t.category}</td><td className="text-white/38">{new Date(t.transactionAt).toLocaleDateString("ru-RU")}</td><td><span className={`rounded-md px-2 py-1 text-[9px] ${t.status==="completed"?"bg-emerald-400/10 text-emerald-300":t.status==="pending"?"bg-amber-400/10 text-amber-300":"bg-white/[0.05] text-white/35"}`}>{t.status==="completed"?"Проведено":t.status==="pending"?"Ожидается":"Отменено"}</span></td><td className={`text-right font-semibold ${t.type==="income"?"text-emerald-300":"text-rose-300"}`}>{t.type==="income"?"+":"−"}{money(t.amount)}</td><td className="text-right"><button onClick={()=>remove(t.id)} className="text-xs text-white/20 hover:text-rose-300">Удалить</button></td></tr>)}</tbody></table>{!data?.transactions.length&&<div className="py-12 text-center text-sm text-white/30">Транзакции не найдены</div>}</div></section>
    </div>
  </div>
}
