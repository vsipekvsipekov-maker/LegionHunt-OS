import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { ensureFinanceSchema } from "@/lib/finance"

function daysValue(value: string | null) {
  const parsed = Number(value ?? 30)
  return [7, 30, 90, 365].includes(parsed) ? parsed : 30
}

export async function GET(request: NextRequest) {
  try {
    await ensureFinanceSchema()
    const params = request.nextUrl.searchParams
    const days = daysValue(params.get("days"))
    const query = (params.get("q") ?? "").trim()
    const type = params.get("type") ?? "all"

    const summary = await db.query(`
      SELECT
        COALESCE(SUM(amount) FILTER (WHERE type='income' AND status='completed' AND transaction_at >= NOW() - ($1 || ' days')::interval),0)::float AS income,
        COALESCE(SUM(amount) FILTER (WHERE type='expense' AND status='completed' AND transaction_at >= NOW() - ($1 || ' days')::interval),0)::float AS expenses,
        COALESCE(SUM(amount) FILTER (WHERE type='income' AND status='pending'),0)::float AS pending_income,
        COUNT(*) FILTER (WHERE transaction_at >= NOW() - ($1 || ' days')::interval)::int AS transaction_count
      FROM legionhunt_finance_transactions
    `, [days])

    const trends = await db.query(`
      SELECT TO_CHAR(day, 'DD Mon') AS label,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type='income' AND t.status='completed'),0)::float AS income,
        COALESCE(SUM(t.amount) FILTER (WHERE t.type='expense' AND t.status='completed'),0)::float AS expenses
      FROM generate_series(
        DATE_TRUNC('day', NOW() - (($1 - 1) || ' days')::interval),
        DATE_TRUNC('day', NOW()), INTERVAL '1 day'
      ) day
      LEFT JOIN legionhunt_finance_transactions t
        ON DATE_TRUNC('day', t.transaction_at)=day
      GROUP BY day ORDER BY day
    `, [days])

    const categoryBreakdown = await db.query(`
      SELECT category, type, COALESCE(SUM(amount),0)::float AS amount
      FROM legionhunt_finance_transactions
      WHERE status='completed' AND transaction_at >= NOW() - ($1 || ' days')::interval
      GROUP BY category,type ORDER BY amount DESC
    `, [days])

    const transactions = await db.query(`
      SELECT id,type,title,category,amount::float,currency,status,counterparty,note,
             transaction_at AS "transactionAt",created_at AS "createdAt"
      FROM legionhunt_finance_transactions
      WHERE ($1='' OR title ILIKE '%' || $1 || '%' OR category ILIKE '%' || $1 || '%' OR counterparty ILIKE '%' || $1 || '%')
        AND ($2='all' OR type=$2)
      ORDER BY transaction_at DESC,id DESC LIMIT 100
    `, [query, type])

    const categories = await db.query(`SELECT id,name,kind,color FROM legionhunt_finance_categories ORDER BY kind DESC,name`)
    const row = summary.rows[0]
    const income = Number(row.income)
    const expenses = Number(row.expenses)
    const profit = income - expenses
    const roi = expenses > 0 ? Math.round((profit / expenses) * 100) : 0

    return NextResponse.json({
      days,
      metrics: { income, expenses, profit, roi, pendingIncome: Number(row.pending_income), transactionCount: Number(row.transaction_count) },
      trends: trends.rows,
      categoryBreakdown: categoryBreakdown.rows,
      transactions: transactions.rows,
      categories: categories.rows,
    })
  } catch (error) {
    console.error("Finance GET error:", error)
    return NextResponse.json({ error: "Не удалось загрузить Finance Center." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureFinanceSchema()
    const body = await request.json() as Record<string, unknown>
    const type = body.type === "expense" ? "expense" : "income"
    const title = String(body.title ?? "").trim()
    const category = String(body.category ?? "Другое").trim()
    const amount = Number(body.amount ?? 0)
    const status = ["completed", "pending", "cancelled"].includes(String(body.status)) ? String(body.status) : "completed"
    const counterparty = String(body.counterparty ?? "").trim()
    const note = String(body.note ?? "").trim()
    const transactionAt = body.transactionAt ? new Date(String(body.transactionAt)) : new Date()

    if (!title || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Укажите название и сумму больше нуля." }, { status: 400 })
    }

    const result = await db.query(`
      INSERT INTO legionhunt_finance_transactions(type,title,category,amount,status,counterparty,note,transaction_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id,type,title,category,amount::float,currency,status,counterparty,note,transaction_at AS "transactionAt"
    `, [type,title,category,amount,status,counterparty,note,transactionAt])
    return NextResponse.json({ ok:true, transaction:result.rows[0] })
  } catch (error) {
    console.error("Finance POST error:", error)
    return NextResponse.json({ error: "Не удалось создать транзакцию." }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await ensureFinanceSchema()
    const id = Number(request.nextUrl.searchParams.get("id"))
    if (!id) return NextResponse.json({ error:"Некорректный ID." }, { status:400 })
    await db.query(`DELETE FROM legionhunt_finance_transactions WHERE id=$1`, [id])
    return NextResponse.json({ ok:true })
  } catch (error) {
    console.error("Finance DELETE error:", error)
    return NextResponse.json({ error:"Не удалось удалить транзакцию." }, { status:500 })
  }
}
