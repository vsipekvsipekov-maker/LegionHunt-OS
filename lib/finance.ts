import { db } from "@/lib/db"

declare global {
  // eslint-disable-next-line no-var
  var legionHuntFinanceSchemaPromise: Promise<void> | undefined
}

async function initializeFinanceSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS legionhunt_finance_categories (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      kind VARCHAR(20) NOT NULL CHECK (kind IN ('income','expense')),
      color VARCHAR(30) NOT NULL DEFAULT 'violet',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS legionhunt_finance_transactions (
      id BIGSERIAL PRIMARY KEY,
      type VARCHAR(20) NOT NULL CHECK (type IN ('income','expense')),
      title VARCHAR(220) NOT NULL,
      category VARCHAR(120) NOT NULL DEFAULT 'Другое',
      amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
      currency VARCHAR(8) NOT NULL DEFAULT 'USD',
      status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','pending','cancelled')),
      counterparty VARCHAR(180) NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      transaction_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_finance_transactions_date_idx
      ON legionhunt_finance_transactions(transaction_at DESC);
    CREATE INDEX IF NOT EXISTS legionhunt_finance_transactions_type_idx
      ON legionhunt_finance_transactions(type, status);
    CREATE INDEX IF NOT EXISTS legionhunt_finance_transactions_category_idx
      ON legionhunt_finance_transactions(category);

    INSERT INTO legionhunt_finance_categories(name,kind,color) VALUES
      ('Выручка','income','emerald'),
      ('Комиссии','income','violet'),
      ('Бонусы','income','blue'),
      ('Реклама','expense','rose'),
      ('Выплаты','expense','amber'),
      ('Сервисы','expense','cyan'),
      ('Прокси и VPN','expense','fuchsia')
    ON CONFLICT (name) DO NOTHING;
  `)

  await db.query(`
    DELETE FROM legionhunt_finance_transactions
    WHERE (title, counterparty) IN (
      ('Основная выручка','LegionHunt Operations'),
      ('Партнёрская комиссия','Partner Network'),
      ('Выплаты команде','Team Payroll'),
      ('Рекламный бюджет','Advertising'),
      ('Подписки и сервисы','SaaS Stack'),
      ('Performance bonus','Operations')
    );
  `)


}

export function ensureFinanceSchema() {
  if (!global.legionHuntFinanceSchemaPromise) {
    global.legionHuntFinanceSchemaPromise = initializeFinanceSchema().catch((error) => {
      global.legionHuntFinanceSchemaPromise = undefined
      throw error
    })
  }
  return global.legionHuntFinanceSchemaPromise
}
