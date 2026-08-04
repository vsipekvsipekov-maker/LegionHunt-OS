# LegionHunt OS v1.0

Внутренняя операционная система команды LegionHunt: CRM, Wiki, Academy, Analytics, Automation, Finance, Team, Calendar, Settings и AI Center в едином интерфейсе.

## Возможности

- **Dashboard** — реальные показатели и быстрые действия.
- **AI Center** — Gemini с контекстом CRM, Wiki, Team и Academy.
- **CRM** — кандидаты, стадии, задачи, комментарии и история действий.
- **Wiki** — база знаний, поиск, категории и связанные материалы.
- **Academy** — курсы, прогресс и сертификаты.
- **Analytics** — сводки и динамика по данным системы.
- **Automation** — рабочие процессы и сценарии.
- **Finance** — доходы, расходы, выплаты и отчётность.
- **Team** — участники, роли, KPI и активность.
- **Calendar** — события, встречи и дедлайны.
- **Settings** — профиль, интерфейс, AI, уведомления и состояние системы.

## Требования

- Node.js 20 или новее.
- PostgreSQL.
- API-ключ Google AI Studio для Gemini.

## Первый запуск

```powershell
copy .env.local.example .env.local
npm install
npm run dev
```

Заполни в `.env.local`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
GEMINI_API_KEY="YOUR_GOOGLE_AI_STUDIO_KEY"
GEMINI_MODEL="gemini-3.6-flash"
CRM_AUTO_SEED=false
WIKI_AUTO_SEED=false
```

Открой `http://localhost:3000`.

## Production

```powershell
npm run build
npm start
```

Перед публикацией проверь:

- `.env.local` не попал в архив или Git;
- PostgreSQL доступен с сервера приложения;
- домен работает через HTTPS;
- настроены резервные копии базы;
- API-ключи хранятся только в переменных окружения.

## Данные

Релизная сборка не создаёт демонстрационных кандидатов, участников, финансовых операций или событий календаря. Встроенная очистка затрагивает только точные идентификаторы прежних демо-записей.

## Версия

**LegionHunt OS v1.0.0**
