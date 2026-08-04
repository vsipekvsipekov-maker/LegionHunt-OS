"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { BookIcon, SearchIcon, SparklesIcon } from "@/components/icons"

type Article = {
  id: number
  title: string
  slug: string
  category: string
  content: string
  excerpt: string
  isFavorite: boolean
  author: string
  createdAt: string
  updatedAt: string
}

type GlobalSearchResult = {
  id: number
  kind: "article" | "case" | "regulation" | "tool"
  title: string
  category: string
  snippet: string
  tags: string[]
  updatedAt: string
  score: number
}

type WikiTool = {
  id: number
  name: string
  slug: string
  icon: string
  category: string
  status: "active" | "beta" | "archived"
  description: string
  instructions: string
  launchUrl: string
  owner: string
  version: string
  tags: string[]
  requirements: string[]
  relatedArticleIds: number[]
  relatedCaseIds: number[]
  relatedRegulationIds: number[]
  createdAt: string
  updatedAt: string
  isFavorite: boolean
  views: number
}

type WikiRegulation = {
  id: number
  title: string
  category: string
  status: "draft" | "active" | "archived"
  owner: string
  summary: string
  content: string
  steps: Array<{ title: string; description: string }>
  versionNumber: number
  tags: string[]
  createdAt: string
  updatedAt: string
}

type WikiCase = {
  id: number
  title: string
  category: string
  status: "success" | "in_progress" | "failed" | "archived"
  situation: string
  problem: string
  solution: string
  result: string
  lessons: string
  owner: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

type AiMessage = {
  id: number
  role: "user" | "assistant"
  content: string
  createdAt: string
}

type VersionItem = {
  id: number
  versionNumber: number
  title: string
  category: string
  excerpt: string
  content: string
  author: string
  changeNote: string
  createdAt: string
}

type CommentItem = {
  id: number
  author: string
  body: string
  createdAt: string
}

type TocItem = {
  id: string
  label: string
  level: number
}

const categoryOrder = [
  "Старт",
  "FAQ",
  "CRM",
  "Продажи",
  "Матрёшка",
  "Обучение",
  "Наставничество",
  "Регламенты",
  "Общее",
]

export function WikiWorkspace() {
  const [articles, setArticles] = useState<Article[]>([])
  const [selected, setSelected] = useState<Article | null>(null)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Article | null>(null)
  const [showImport, setShowImport] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [favorites, setFavorites] = useState<Article[]>([])
  const [recent, setRecent] = useState<Article[]>([])
  const [navigationMode, setNavigationMode] = useState<
    "tree" | "favorites" | "recent"
  >("tree")
  const [portalSection, setPortalSection] = useState<
    "home" | "articles" | "cases" | "wiki" | "regulations" | "tools" | "aiKnowledge"
  >("home")
  const [showGlobalSearch, setShowGlobalSearch] = useState(false)

  async function loadArticles() {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())

      const response = await fetch(`/api/wiki/articles?${params.toString()}`, {
        cache: "no-store",
      })
      const payload = await response.json()

      if (!response.ok || !payload.articles) {
        throw new Error(payload.error || "Не удалось загрузить Wiki.")
      }

      setArticles(payload.articles)
      setSelected((current) => {
        if (!current) return payload.articles[0] ?? null
        return (
          payload.articles.find(
            (article: Article) => article.id === current.id,
          ) ??
          payload.articles[0] ??
          null
        )
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка загрузки Wiki.",
      )
    } finally {
      setLoading(false)
    }
  }

  async function loadNavigation() {
    try {
      const response = await fetch("/api/wiki/navigation?user=VSIPEK", {
        cache: "no-store",
      })
      const contentType = response.headers.get("content-type") ?? ""

      if (!contentType.includes("application/json")) return

      const payload = await response.json()

      if (response.ok) {
        setFavorites(payload.favorites ?? [])
        setRecent(payload.recent ?? [])
      }
    } catch (navigationError) {
      console.error("Wiki navigation error:", navigationError)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadArticles()
    }, 180)

    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    void loadNavigation()
  }, [])

  useEffect(() => {
    setDraft(selected)
    setEditing(false)

    if (selected) {
      void fetch(`/api/wiki/articles/${selected.id}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewer: "VSIPEK" }),
      })

      void fetch(`/api/wiki/articles/${selected.id}/recent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: "VSIPEK" }),
      }).then(() => loadNavigation())
    }
  }, [selected?.id])

  const grouped = useMemo(() => {
    const result = new Map<string, Article[]>()

    for (const category of categoryOrder) {
      result.set(category, [])
    }

    for (const article of articles) {
      if (!result.has(article.category)) result.set(article.category, [])
      result.get(article.category)?.push(article)
    }

    return Array.from(result.entries()).filter(
      ([, categoryArticles]) => categoryArticles.length > 0,
    )
  }, [articles])

  const currentIndex = selected
    ? articles.findIndex((article) => article.id === selected.id)
    : -1
  const previous = currentIndex > 0 ? articles[currentIndex - 1] : null
  const next =
    currentIndex >= 0 && currentIndex < articles.length - 1
      ? articles[currentIndex + 1]
      : null

  async function saveArticle() {
    if (!draft) return

    const response = await fetch(`/api/wiki/articles/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        category: draft.category,
        excerpt: draft.excerpt,
        content: draft.content,
        changeNote: "Редактирование статьи в Wiki 4.0",
      }),
    })
    const payload = await response.json()

    if (!response.ok || !payload.article) {
      setError(payload.error || "Не удалось сохранить статью.")
      return
    }

    setArticles((current) =>
      current.map((article) =>
        article.id === payload.article.id ? payload.article : article,
      ),
    )
    setSelected(payload.article)
    setDraft(payload.article)
    setEditing(false)
  }

  async function toggleFavorite(article: Article) {
    const currentlyFavorite = favorites.some((item) => item.id === article.id)

    const response = await fetch(
      `/api/wiki/articles/${article.id}/favorite`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user: "VSIPEK",
          favorite: !currentlyFavorite,
        }),
      },
    )

    if (response.ok) {
      await loadNavigation()
    }
  }

  async function createArticle(formData: FormData) {
    const response = await fetch("/api/wiki/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        category: String(formData.get("category") ?? "Общее"),
        excerpt: String(formData.get("excerpt") ?? ""),
      }),
    })
    const payload = await response.json()

    if (!response.ok || !payload.article) {
      throw new Error(payload.error || "Не удалось создать статью.")
    }

    setArticles((current) => [payload.article, ...current])
    setSelected(payload.article)
    setShowCreate(false)
    setEditing(true)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#08090c] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
      <header className="flex h-[58px] items-center border-b border-white/[0.07] bg-[#0a0b0e] px-4">
        <div className="flex min-w-[210px] items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[10px] font-black text-white">
            LH
          </div>
          <div>
            <p className="text-[11px] font-bold tracking-[0.12em] text-white">
              LEGIONHUNT
            </p>
            <p className="text-[8px] uppercase tracking-[0.18em] text-white/25">
              База знаний
            </p>
          </div>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          {[
            ["home", "Главная"],
            ["articles", "Статьи"],
            ["cases", "Кейсы"],
            ["wiki", "Wiki"],
            ["regulations", "Регламент"],
            ["tools", "Инструменты"],
            ["aiKnowledge", "AI Knowledge"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setPortalSection(
                  key as
                    | "home"
                    | "articles"
                    | "cases"
                    | "wiki"
                    | "regulations"
                    | "tools"
                    | "aiKnowledge",
                )
              }
              className={[
                "h-9 rounded-lg px-3 text-[10px] font-medium transition",
                portalSection === key
                  ? "border border-violet-400/20 bg-violet-400/[0.08] text-violet-200"
                  : "text-white/35 hover:bg-white/[0.04] hover:text-white/70",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGlobalSearch(true)}
            className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[10px] text-white/35 transition hover:bg-white/[0.05] hover:text-white/65 md:flex"
          >
            <SearchIcon className="size-3.5" />
            Поиск
            <span className="rounded-md border border-white/[0.07] bg-black/20 px-1.5 py-0.5 text-[8px] text-white/22">
              Ctrl K
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="hidden h-9 rounded-lg border border-violet-400/18 bg-violet-400/[0.06] px-3 text-[10px] font-medium text-violet-200 sm:block"
          >
            AI импорт
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="h-9 rounded-lg bg-white px-3 text-[10px] font-semibold text-black"
          >
            + Статья
          </button>
        </div>
      </header>

      {portalSection === "home" && (
        <PortalHome
          articles={articles}
          favorites={favorites}
          recent={recent}
          onOpenArticle={(article) => {
            setSelected(article)
            setPortalSection("wiki")
          }}
          onCreate={() => setShowCreate(true)}
          onImport={() => setShowImport(true)}
        />
      )}

      {portalSection === "articles" && (
        <PortalArticleCatalog
          articles={articles}
          onOpenArticle={(article) => {
            setSelected(article)
            setPortalSection("wiki")
          }}
        />
      )}

      {portalSection === "cases" && <CasesCenter />}

      {portalSection === "regulations" && <RegulationsCenter />}

      {portalSection === "tools" && <ToolsCenter />}

      {portalSection === "aiKnowledge" && (
        <AiKnowledgeCenter
          onOpenSource={(source) => {
            if (source.kind === "article") {
              const article = articles.find((item) => item.id === source.id)
              if (article) {
                setSelected(article)
                setPortalSection("wiki")
              } else {
                setPortalSection("articles")
              }
              return
            }
            if (source.kind === "case") {
              setPortalSection("cases")
              return
            }
            if (source.kind === "regulation") {
              setPortalSection("regulations")
              return
            }
            setPortalSection("tools")
          }}
        />
      )}

      {portalSection === "wiki" && (
      <div className="grid min-h-[calc(100vh-205px)] xl:grid-cols-[270px_minmax(0,1fr)_250px]">
        <aside className="border-r border-white/[0.07] bg-[#090a0d]">
          <div className="border-b border-white/[0.06] p-3">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-white/25" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по вики..."
                className="h-9 w-full rounded-lg border border-white/[0.07] bg-black/20 pl-9 pr-3 text-[11px] text-white outline-none placeholder:text-white/20 focus:border-violet-400/25"
              />
            </div>
          </div>

          <div className="h-[calc(100vh-265px)] overflow-y-auto px-2 py-3">
            {loading && (
              <p className="px-3 py-2 text-[10px] text-white/22">
                Загрузка материалов...
              </p>
            )}

            {error && (
              <div className="mx-1 mb-3 rounded-lg border border-rose-400/15 bg-rose-400/[0.06] p-2.5 text-[10px] leading-4 text-rose-200">
                {error}
              </div>
            )}

            <div className="mb-3 grid grid-cols-3 gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
              {[
                ["tree", "Все"],
                ["favorites", "Избранное"],
                ["recent", "Недавние"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setNavigationMode(
                      key as "tree" | "favorites" | "recent",
                    )
                  }
                  className={[
                    "h-7 rounded-md text-[8px] transition",
                    navigationMode === key
                      ? "bg-white/[0.07] text-white"
                      : "text-white/24 hover:text-white/55",
                  ].join(" ")}
                >
                  {label}
                </button>
              ))}
            </div>

            {navigationMode === "favorites" && (
              <SimpleArticleList
                articles={favorites}
                selectedId={selected?.id ?? null}
                emptyText="Избранных статей пока нет"
                onSelect={setSelected}
              />
            )}

            {navigationMode === "recent" && (
              <SimpleArticleList
                articles={recent}
                selectedId={selected?.id ?? null}
                emptyText="Недавних статей пока нет"
                onSelect={setSelected}
              />
            )}

            {navigationMode === "tree" && (
              <>
                <p className="mb-2 px-3 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/20">
                  Все разделы
                </p>

                <div className="space-y-3">
                  {grouped.map(([category, categoryArticles]) => {
                const isCollapsed = collapsed[category] ?? false

                return (
                  <section key={category}>
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsed((current) => ({
                          ...current,
                          [category]: !isCollapsed,
                        }))
                      }
                      className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[10px] font-semibold uppercase tracking-[0.08em] text-white/35 transition hover:bg-white/[0.035] hover:text-white/65"
                    >
                      <span className="text-[8px] text-white/20">
                        {isCollapsed ? "▶" : "▼"}
                      </span>
                      <BookIcon className="size-3.5" />
                      <span className="min-w-0 flex-1 truncate">{category}</span>
                    </button>

                    {!isCollapsed && (
                      <div className="mt-1 space-y-0.5 border-l border-white/[0.06] pl-2">
                        {categoryArticles.map((article, index) => (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() => setSelected(article)}
                            className={[
                              "relative flex min-h-9 w-full items-start gap-2 rounded-r-lg px-2.5 py-2 text-left transition",
                              selected?.id === article.id
                                ? "bg-violet-500/12 text-white"
                                : "text-white/35 hover:bg-white/[0.035] hover:text-white/65",
                            ].join(" ")}
                          >
                            {selected?.id === article.id && (
                              <span className="absolute -left-[9px] inset-y-0 w-0.5 rounded-full bg-violet-400 shadow-[0_0_12px_rgba(167,139,250,0.8)]" />
                            )}
                            <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded bg-white/[0.04] text-[8px] text-white/25">
                              {index + 1}
                            </span>
                            <span className="line-clamp-2 text-[10px] leading-4">
                              {article.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </section>
                )
                  })}
                </div>
              </>
            )}
          </div>
        </aside>

        <main className="min-w-0 bg-[#0b0c0f]">
          {selected && draft ? (
            <div className="flex min-h-full flex-col">
              <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-white/[0.06] bg-[#0b0c0f]/90 px-5 backdrop-blur-xl">
                <div className="min-w-0">
                  <p className="truncate text-[11px] text-white/60">
                    {selected.category} / {selected.title}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(selected)}
                    className={[
                      "flex size-8 items-center justify-center rounded-lg border text-sm transition",
                      favorites.some((item) => item.id === selected.id)
                        ? "border-amber-300/20 bg-amber-300/[0.08] text-amber-300"
                        : "border-white/[0.07] bg-white/[0.03] text-white/25 hover:text-amber-300",
                    ].join(" ")}
                    title="Добавить в избранное"
                  >
                    ★
                  </button>
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft(selected)
                          setEditing(false)
                        }}
                        className="h-8 rounded-lg border border-white/[0.07] px-3 text-[9px] text-white/35"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveArticle()}
                        className="h-8 rounded-lg bg-white px-3 text-[9px] font-semibold text-black"
                      >
                        Сохранить
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 text-[9px] text-white/45 hover:bg-white/[0.06] hover:text-white"
                    >
                      Редактировать
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 px-5 py-8 md:px-10 xl:px-14">
                <div className="mx-auto max-w-[780px]">
                  {editing ? (
                    <Editor
                      draft={draft}
                      setDraft={setDraft}
                      categories={grouped.map(([category]) => category)}
                    />
                  ) : (
                    <ArticleDocument article={selected} />
                  )}

                  {!editing && (
                    <div className="mt-12 grid gap-4 border-t border-white/[0.06] pt-6 sm:grid-cols-2">
                      <NavigationCard
                        label="Предыдущая"
                        article={previous}
                        onClick={() => previous && setSelected(previous)}
                      />
                      <NavigationCard
                        label="Следующая"
                        article={next}
                        alignRight
                        onClick={() => next && setSelected(next)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <footer className="flex min-h-14 items-center justify-between border-t border-white/[0.06] px-5 text-[9px] text-white/20">
                <span>© 2026 LEGIONHUNT · WIKI v3.0</span>
                <span>{formatDate(selected.updatedAt)}</span>
              </footer>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-white/25">
              Выбери статью
            </div>
          )}
        </main>

        <aside className="hidden border-l border-white/[0.07] bg-[#090a0d] xl:block">
          {selected && (
            <RightRail
              article={selected}
              articles={articles}
              onSelect={setSelected}
            />
          )}
        </aside>
      </div>
      )}

      {showGlobalSearch && (
        <GlobalSearchOverlay
          articles={articles}
          onClose={() => setShowGlobalSearch(false)}
          onSelect={(result) => {
            setShowGlobalSearch(false)

            if (result.kind === "article") {
              const article = articles.find((item) => item.id === result.id)
              if (article) {
                setSelected(article)
                setPortalSection("wiki")
                return
              }

              setPortalSection("articles")
              return
            }

            if (result.kind === "case") {
              setPortalSection("cases")
              return
            }

            if (result.kind === "regulation") {
              setPortalSection("regulations")
              return
            }

            setPortalSection("tools")
          }}
        />
      )}

      {showCreate && (
        <CreateArticleModal
          categories={grouped.map(([category]) => category)}
          onClose={() => setShowCreate(false)}
          onSubmit={createArticle}
          onError={setError}
        />
      )}

      {showImport && (
        <ImportDocument
          onClose={() => setShowImport(false)}
          onDone={async () => {
            setShowImport(false)
            await loadArticles()
          }}
        />
      )}
    </div>
  )
}

function AiKnowledgeCenter({
  onOpenSource,
}: {
  onOpenSource: (source: {
    id: number
    kind: "article" | "case" | "regulation" | "tool"
  }) => void
}) {
  type Source = {
    id: number
    kind: "article" | "case" | "regulation" | "tool"
    title: string
    category: string
    excerpt: string
    score: number
  }

  type Message = {
    id: number | string
    role: "user" | "assistant"
    content: string
    sources: Source[]
    createdAt: string
  }

  type Session = {
    id: number
    title: string
    updatedAt: string
    messageCount: number
  }

  type LearningItem = {
    id: number
    question: string
    status: "pending" | "learned" | "ignored"
    occurrences: number
    updatedAt: string
  }

  const [sessions, setSessions] = useState<Session[]>([])
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [learningItems, setLearningItems] = useState<LearningItem[]>([])
  const [learningPending, setLearningPending] = useState(0)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const suggestions = [
    "Как работать с возражением по доходу?",
    "Какие регламенты относятся к обучению?",
    "Как импортировать PDF в Wiki?",
    "Какой инструмент использовать для работы с кандидатами?",
  ]

  async function json(response: Response) {
    const contentType = response.headers.get("content-type") ?? ""
    if (!contentType.includes("application/json")) {
      throw new Error(`AI Knowledge API вернул HTTP ${response.status}`)
    }
    const payload = await response.json()
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`)
    return payload
  }

  async function loadSessions() {
    try {
      const response = await fetch("/api/wiki/ai/history?user=VSIPEK", {
        cache: "no-store",
      })
      const payload = await json(response)
      setSessions(payload.sessions ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка истории.")
    }
  }

  async function loadLearningQueue() {
    try {
      const response = await fetch("/api/wiki/ai/learning?status=pending", { cache: "no-store" })
      const payload = await json(response)
      setLearningItems(payload.items ?? [])
      setLearningPending(payload.stats?.pending ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка очереди обучения.")
    }
  }

  async function teach(item: LearningItem) {
    const answer = window.prompt(`Ответ для базы знаний:

${item.question}`)?.trim()
    if (!answer) return
    try {
      const response = await fetch(`/api/wiki/ai/learning/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "learn", answer, user: "VSIPEK" }),
      })
      await json(response)
      await loadLearningQueue()
      setError("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка обучения AI.")
    }
  }

  useEffect(() => {
    void loadSessions()
    void loadLearningQueue()
  }, [])

  async function openSession(id: number) {
    setSessionId(id)
    setLoading(true)
    try {
      const response = await fetch(
        `/api/wiki/ai/history?user=VSIPEK&sessionId=${id}`,
        { cache: "no-store" },
      )
      const payload = await json(response)
      setMessages(payload.messages ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка диалога.")
    } finally {
      setLoading(false)
    }
  }

  async function send(value?: string) {
    const finalQuestion = (value ?? question).trim()
    if (!finalQuestion || loading) return

    setMessages((current) => [
      ...current,
      {
        id: `u-${Date.now()}`,
        role: "user",
        content: finalQuestion,
        sources: [],
        createdAt: new Date().toISOString(),
      },
    ])
    setQuestion("")
    setLoading(true)
    setError("")

    try {
      const response = await fetch("/api/wiki/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: finalQuestion,
          sessionId,
          user: "VSIPEK",
        }),
      })
      const payload = await json(response)
      setSessionId(payload.sessionId)
      setMessages((current) => [
        ...current,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: payload.answer,
          sources: payload.sources ?? [],
          createdAt: new Date().toISOString(),
        },
      ])
      await loadSessions()
      await loadLearningQueue()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка AI.")
    } finally {
      setLoading(false)
      window.setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  const config = {
    article: ["📄", "Статья"],
    case: ["💼", "Кейс"],
    regulation: ["📋", "Регламент"],
    tool: ["🛠️", "Инструмент"],
  } as const

  return (
    <div className="grid min-h-[calc(100vh-205px)] bg-[#0b0c0f] xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-r border-white/[0.06] bg-black/10 p-4">
        <button
          type="button"
          onClick={() => {
            setSessionId(null)
            setMessages([])
            setQuestion("")
          }}
          className="h-10 w-full rounded-xl bg-white text-[10px] font-semibold text-black"
        >
          + Новый диалог
        </button>
        <p className="mt-5 px-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-white/20">
          История
        </p>
        <div className="mt-3 space-y-1.5">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => void openSession(session.id)}
              className={[
                "w-full rounded-xl border p-3 text-left",
                sessionId === session.id
                  ? "border-violet-400/16 bg-violet-400/[0.06]"
                  : "border-transparent hover:bg-white/[0.025]",
              ].join(" ")}
            >
              <p className="line-clamp-2 text-[10px] leading-4 text-white/48">
                {session.title}
              </p>
              <p className="mt-2 text-[8px] text-white/15">
                {session.messageCount} сообщений
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 border-t border-white/[0.06] pt-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-white/20">
              Обучение AI
            </p>
            <span className="rounded-full bg-amber-300/10 px-2 py-1 text-[8px] text-amber-200/60">
              {learningPending}
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {learningItems.slice(0, 6).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => void teach(item)}
                className="w-full rounded-xl border border-amber-300/[0.08] bg-amber-300/[0.025] p-3 text-left hover:bg-amber-300/[0.05]"
              >
                <p className="line-clamp-3 text-[9px] leading-4 text-white/40">{item.question}</p>
                <p className="mt-2 text-[8px] text-amber-200/30">
                  Ответить · запросов: {item.occurrences}
                </p>
              </button>
            ))}
            {!learningItems.length && (
              <p className="rounded-xl border border-white/[0.04] p-3 text-[8px] text-white/18">
                Новых вопросов нет
              </p>
            )}
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 flex-col">
        <header className="border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-violet-400/[0.06]">
              <SparklesIcon className="size-4 text-violet-200" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">LEGION AI Knowledge</p>
              <p className="mt-1 text-[9px] text-white/22">
                Ответы по статьям, кейсам, регламентам и инструментам
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 md:px-8">
          {!messages.length ? (
            <div className="mx-auto flex min-h-[520px] max-w-3xl flex-col items-center justify-center text-center">
              <SparklesIcon className="size-8 text-violet-200" />
              <h2 className="mt-5 text-2xl font-semibold text-white">
                Спроси базу знаний
              </h2>
              <p className="mt-3 text-sm text-white/30">
                AI найдёт материалы, сформирует ответ и покажет источники.
              </p>
              <div className="mt-7 grid w-full gap-2 md:grid-cols-2">
                {suggestions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => void send(item)}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.018] p-4 text-left text-[10px] leading-5 text-white/36"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-4xl space-y-5">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div className={[
                    "max-w-[85%] rounded-2xl border p-4",
                    message.role === "user"
                      ? "border-violet-400/15 bg-violet-400/[0.07]"
                      : "border-white/[0.07] bg-white/[0.022]",
                  ].join(" ")}>
                    <p className="whitespace-pre-wrap text-sm leading-7 text-white/55">
                      {message.content}
                    </p>
                    {message.sources.length > 0 && (
                      <div className="mt-5 border-t border-white/[0.06] pt-4">
                        <p className="text-[8px] uppercase tracking-[0.16em] text-white/20">
                          Источники
                        </p>
                        <div className="mt-3 space-y-2">
                          {message.sources.map((source) => (
                            <button
                              key={`${source.kind}-${source.id}`}
                              type="button"
                              onClick={() => onOpenSource(source)}
                              className="flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-black/10 p-3 text-left"
                            >
                              <span>{config[source.kind][0]}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[10px] text-white/50">
                                  {source.title}
                                </span>
                                <span className="mt-1 block text-[8px] text-white/18">
                                  {config[source.kind][1]} · {source.category}
                                </span>
                              </span>
                              <span className="text-white/14">↗</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <p className="text-[10px] text-white/28">
                  LEGION AI анализирует базу знаний...
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] p-4 md:px-8">
          <div className="mx-auto max-w-4xl">
            {error && (
              <div className="mb-3 rounded-xl bg-rose-400/[0.06] p-3 text-xs text-rose-200">
                {error}
              </div>
            )}
            <div className="flex items-end gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-2">
              <textarea
                ref={inputRef}
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                rows={2}
                placeholder="Задайте вопрос по базе знаний..."
                className="min-h-[48px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-white outline-none"
              />
              <button
                type="button"
                disabled={loading || !question.trim()}
                onClick={() => void send()}
                className="h-11 rounded-xl bg-white px-4 text-[10px] font-semibold text-black disabled:opacity-35"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function GlobalSearchOverlay({
  articles,
  onClose,
  onSelect,
}: {
  articles: Article[]
  onClose: () => void
  onSelect: (result: GlobalSearchResult) => void
}) {
  const [query, setQuery] = useState("")
  const [type, setType] = useState<
    "all" | "article" | "case" | "regulation" | "tool"
  >("all")
  const [results, setResults] = useState<GlobalSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    const normalized = query.trim()

    if (normalized.length < 2) {
      setResults([])
      setError("")
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError("")

      try {
        const params = new URLSearchParams({
          q: normalized,
          type,
          limit: "40",
        })
        const response = await fetch(`/api/wiki/search?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        })
        const contentType = response.headers.get("content-type") ?? ""
        const payload = contentType.includes("application/json")
          ? await response.json()
          : { error: `Search API вернул HTTP ${response.status}` }

        if (!response.ok || !payload.results) {
          throw new Error(payload.error || "Ошибка глобального поиска.")
        }

        setResults(payload.results)
        setActiveIndex(0)
      } catch (requestError) {
        if (requestError instanceof DOMException && requestError.name === "AbortError") {
          return
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Не удалось выполнить поиск.",
        )
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [query, type])

  const kindConfig = {
    article: { label: "Статья", icon: "📄", section: "Wiki" },
    case: { label: "Кейс", icon: "💼", section: "Кейсы" },
    regulation: { label: "Регламент", icon: "📋", section: "Регламент" },
    tool: { label: "Инструмент", icon: "🛠️", section: "Инструменты" },
  }

  function choose(result: GlobalSearchResult) {
    onSelect(result)
  }

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[150] flex items-start justify-center bg-black/75 p-4 pt-[8vh] backdrop-blur-md"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/[0.1] bg-[#0d0f13] shadow-[0_40px_120px_rgba(0,0,0,.65)]"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-5 py-4">
          <SearchIcon className="size-5 shrink-0 text-violet-300/70" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault()
                setActiveIndex((index) =>
                  Math.min(index + 1, Math.max(results.length - 1, 0)),
                )
              }

              if (event.key === "ArrowUp") {
                event.preventDefault()
                setActiveIndex((index) => Math.max(index - 1, 0))
              }

              if (event.key === "Enter" && results[activeIndex]) {
                event.preventDefault()
                choose(results[activeIndex])
              }

              if (event.key === "Escape") {
                event.preventDefault()
                onClose()
              }
            }}
            placeholder="Поиск по всей базе знаний..."
            className="h-11 min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-white/20"
          />
          {loading && (
            <span className="text-[9px] text-violet-200/45">Поиск...</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-2 py-1 text-[9px] text-white/28"
          >
            Esc
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-white/[0.06] px-4 py-3">
          {[
            ["all", "Все"],
            ["article", "Статьи"],
            ["case", "Кейсы"],
            ["regulation", "Регламенты"],
            ["tool", "Инструменты"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() =>
                setType(
                  key as
                    | "all"
                    | "article"
                    | "case"
                    | "regulation"
                    | "tool",
                )
              }
              className={[
                "h-8 shrink-0 rounded-lg px-3 text-[9px] transition",
                type === key
                  ? "border border-violet-400/18 bg-violet-400/[0.08] text-violet-200"
                  : "text-white/25 hover:bg-white/[0.035] hover:text-white/55",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="max-h-[62vh] overflow-y-auto p-3">
          {error && (
            <div className="rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-xs text-rose-200">
              {error}
            </div>
          )}

          {!error && query.trim().length < 2 && (
            <div className="py-16 text-center">
              <p className="text-sm text-white/32">
                Начни вводить запрос
              </p>
              <p className="mt-2 text-[10px] text-white/16">
                Поиск работает по заголовкам, содержимому, категориям и тегам
              </p>
              <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-2">
                {["CRM", "возражения", "обучение", "выплаты", "PDF"].map(
                  (suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setQuery(suggestion)}
                      className="rounded-lg border border-white/[0.06] bg-white/[0.025] px-3 py-2 text-[9px] text-white/30 hover:text-white/55"
                    >
                      {suggestion}
                    </button>
                  ),
                )}
              </div>
            </div>
          )}

          {!error &&
            query.trim().length >= 2 &&
            !loading &&
            !results.length && (
              <div className="py-16 text-center">
                <p className="text-sm text-white/30">Ничего не найдено</p>
                <p className="mt-2 text-[10px] text-white/16">
                  Попробуй изменить запрос или выбрать «Все»
                </p>
              </div>
            )}

          <div className="space-y-1.5">
            {results.map((result, index) => {
              const config = kindConfig[result.kind]

              return (
                <button
                  key={`${result.kind}-${result.id}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => choose(result)}
                  className={[
                    "flex w-full gap-3 rounded-xl border p-3 text-left transition",
                    activeIndex === index
                      ? "border-violet-400/18 bg-violet-400/[0.06]"
                      : "border-transparent hover:bg-white/[0.025]",
                  ].join(" ")}
                >
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-lg">
                    {config.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-xs font-semibold text-white/68">
                        {result.title}
                      </p>
                      <span className="shrink-0 rounded-md bg-white/[0.035] px-1.5 py-0.5 text-[7px] text-white/22">
                        {config.label}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-white/24">
                      {result.snippet || "Без описания"}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[8px] text-violet-200/40">
                        {result.category}
                      </span>
                      <span className="text-[8px] text-white/13">•</span>
                      <span className="text-[8px] text-white/16">
                        {config.section}
                      </span>
                    </div>
                  </div>
                  <span className="self-center text-white/15">↵</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.06] px-5 py-3">
          <span className="text-[8px] text-white/16">
            Найдено: {results.length}
          </span>
          <div className="flex items-center gap-3 text-[8px] text-white/16">
            <span>↑↓ выбрать</span>
            <span>Enter открыть</span>
            <span>Esc закрыть</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function PortalHome({
  articles,
  favorites,
  recent,
  onOpenArticle,
  onCreate,
  onImport,
}: {
  articles: Article[]
  favorites: Article[]
  recent: Article[]
  onOpenArticle: (article: Article) => void
  onCreate: () => void
  onImport: () => void
}) {
  const [stats, setStats] = useState({
    articles: articles.length,
    cases: 0,
    regulations: 0,
    tools: 0,
    favorites: favorites.length,
    recent: recent.length,
    activitiesToday: 0,
  })
  const [activity, setActivity] = useState<
    Array<{
      id: number
      actor: string
      action: string
      entityType: string
      entityTitle: string
      metadata: Record<string, unknown>
      createdAt: string
    }>
  >([])
  const [latest, setLatest] = useState<
    Array<{
      id: number
      title: string
      kind: string
      category: string
      updatedAt: string
    }>
  >([])
  const [dashboardError, setDashboardError] = useState("")

  useEffect(() => {
    async function loadDashboard() {
      try {
        const responses = await Promise.all([
          fetch("/api/wiki/dashboard/stats", { cache: "no-store" }),
          fetch("/api/wiki/dashboard/activity", { cache: "no-store" }),
          fetch("/api/wiki/dashboard/recent", { cache: "no-store" }),
        ])

        const payloads = await Promise.all(
          responses.map(async (response) => {
            const contentType = response.headers.get("content-type") ?? ""
            if (!contentType.includes("application/json")) {
              throw new Error(`Dashboard API вернул HTTP ${response.status}`)
            }
            const payload = await response.json()
            if (!response.ok) {
              throw new Error(payload.error || "Ошибка Dashboard API")
            }
            return payload
          }),
        )

        setStats(payloads[0].stats)
        setActivity(payloads[1].activity ?? [])
        setLatest(payloads[2].recent ?? [])
      } catch (error) {
        setDashboardError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить Dashboard.",
        )
      }
    }

    void loadDashboard()
  }, [articles.length, favorites.length, recent.length])

  const quickActions = [
    ["Новая статья", "Создать материал Wiki", "📄", onCreate],
    ["AI импорт", "Загрузить PDF или DOCX", "🤖", onImport],
    ["Новый кейс", "Зафиксировать решение", "💼", () => {}],
    ["Новый регламент", "Добавить процесс", "📋", () => {}],
    ["Новый инструмент", "Добавить сервис", "🛠️", () => {}],
  ] as const

  const kindConfig: Record<string, { label: string; icon: string }> = {
    article: { label: "Статья", icon: "📄" },
    case: { label: "Кейс", icon: "💼" },
    regulation: { label: "Регламент", icon: "📋" },
    tool: { label: "Инструмент", icon: "🛠️" },
  }

  const weekBars = [42, 58, 36, 74, 66, 92, 78]

  return (
    <div className="min-h-[calc(100vh-205px)] bg-[#0b0c0f] p-5 md:p-8">
      <section className="relative overflow-hidden rounded-3xl border border-violet-400/12 bg-gradient-to-br from-violet-500/[0.14] via-white/[0.025] to-fuchsia-500/[0.04] p-6 md:p-8">
        <div className="absolute -right-20 -top-24 size-80 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-violet-300/65">
              LEGION KNOWLEDGE DASHBOARD
            </p>
            <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-[-0.05em] text-white md:text-5xl">
              Центр управления знаниями команды
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/35">
              Статьи, кейсы, регламенты, инструменты и активность команды в
              одном рабочем пространстве.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCreate}
              className="h-10 rounded-xl bg-white px-4 text-[10px] font-semibold text-black"
            >
              + Новая статья
            </button>
            <button
              type="button"
              onClick={onImport}
              className="h-10 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] px-4 text-[10px] text-violet-200"
            >
              AI импорт
            </button>
          </div>
        </div>
      </section>

      {dashboardError && (
        <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-xs text-rose-200">
          {dashboardError}
        </div>
      )}

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <PortalMetric label="Статей" value={String(stats.articles)} note="База знаний" />
        <PortalMetric label="Кейсов" value={String(stats.cases)} note="Решения команды" />
        <PortalMetric label="Регламентов" value={String(stats.regulations)} note="Процессы" />
        <PortalMetric label="Инструментов" value={String(stats.tools)} note="Сервисы" />
        <PortalMetric label="Избранное" value={String(stats.favorites)} note="Закреплено" />
        <PortalMetric label="Недавние" value={String(stats.recent)} note="Просмотры" />
        <PortalMetric label="Сегодня" value={String(stats.activitiesToday)} note="Событий" />
      </section>

      <div className="mt-5 grid gap-5 2xl:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Активность команды</p>
              <p className="mt-1 text-[10px] text-white/22">
                Последние изменения в системе
              </p>
            </div>
            <span className="rounded-lg border border-emerald-400/12 bg-emerald-400/[0.05] px-2 py-1 text-[8px] text-emerald-300">
              LIVE
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {activity.length ? (
              activity.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] p-3"
                >
                  <div className="flex size-9 items-center justify-center rounded-lg bg-violet-400/[0.06] text-base">
                    {String(item.metadata.icon ?? "•")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] text-white/48">
                      <span className="font-semibold text-white/68">
                        {item.actor}
                      </span>{" "}
                      {item.action}{" "}
                      <span className="text-violet-200/55">
                        {item.entityTitle}
                      </span>
                    </p>
                    <p className="mt-1 text-[8px] text-white/16">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-white/[0.07] py-10 text-center text-[10px] text-white/18">
                Активности пока нет
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5">
          <div>
            <p className="text-sm font-semibold text-white">Динамика за неделю</p>
            <p className="mt-1 text-[10px] text-white/22">
              Изменения в базе знаний
            </p>
          </div>

          <div className="mt-6 flex h-48 items-end gap-3">
            {weekBars.map((height, index) => (
              <div key={index} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <div className="flex h-40 w-full items-end rounded-lg bg-black/15 p-1">
                  <div
                    className="w-full rounded-md bg-gradient-to-t from-violet-500/45 to-fuchsia-400/55"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[8px] text-white/18">
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][index]}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Последние материалы</p>
              <p className="mt-1 text-[10px] text-white/22">
                Всё, что недавно обновлялось
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2">
            {latest.slice(0, 10).map((item) => {
              const config = kindConfig[item.kind] ?? {
                label: item.kind,
                icon: "•",
              }

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="rounded-xl border border-white/[0.05] bg-white/[0.018] p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[8px] text-violet-200/45">
                      {config.icon} {config.label}
                    </span>
                    <span className="text-[8px] text-white/15">
                      {formatDate(item.updatedAt)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-4 text-white/50">
                    {item.title}
                  </p>
                  <p className="mt-2 text-[8px] text-white/18">
                    {item.category}
                  </p>
                </div>
              )
            })}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-violet-400/12 bg-violet-400/[0.035] p-5">
            <div className="flex items-center gap-2 text-violet-200">
              <SparklesIcon className="size-4" />
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                LEGION AI
              </p>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/35">
              AI готов искать по знаниям, импортировать документы и помогать
              создавать материалы.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <MiniStat label="Статус" value="Online" />
              <MiniStat label="Импорт" value="Ready" />
              <MiniStat label="Поиск" value="Active" />
              <MiniStat label="Gemini" value="Live" />
            </div>
          </section>

          <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5">
            <p className="text-xs font-semibold text-white">Быстрые действия</p>
            <div className="mt-3 space-y-2">
              {quickActions.map(([title, description, icon, action]) => (
                <button
                  key={title}
                  type="button"
                  onClick={action}
                  className="flex w-full items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.018] p-3 text-left transition hover:bg-white/[0.04]"
                >
                  <span className="flex size-9 items-center justify-center rounded-lg bg-white/[0.035] text-base">
                    {icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[10px] font-medium text-white/55">
                      {title}
                    </span>
                    <span className="mt-1 block text-[8px] text-white/18">
                      {description}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <PortalListCard
          title="Избранные статьи"
          articles={favorites.slice(0, 6)}
          empty="Добавь статьи в избранное"
          onOpenArticle={onOpenArticle}
        />
        <PortalListCard
          title="Недавно открытые статьи"
          articles={recent.slice(0, 6)}
          empty="Открой несколько статей"
          onOpenArticle={onOpenArticle}
        />
      </div>
    </div>
  )
}

function PortalMetric({
  label,
  value,
  note,
}: {
  label: string
  value: string
  note: string
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
      <p className="text-[9px] uppercase tracking-[0.18em] text-white/20">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
        {value}
      </p>
      <p className="mt-1 text-[9px] text-white/20">{note}</p>
    </div>
  )
}

function PortalListCard({
  title,
  articles,
  empty,
  onOpenArticle,
}: {
  title: string
  articles: Article[]
  empty: string
  onOpenArticle: (article: Article) => void
}) {
  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
      <p className="text-xs font-semibold text-white">{title}</p>
      <div className="mt-3 space-y-2">
        {articles.length ? (
          articles.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => onOpenArticle(article)}
              className="w-full rounded-xl border border-white/[0.05] bg-white/[0.018] p-3 text-left transition hover:bg-white/[0.045]"
            >
              <p className="line-clamp-2 text-[10px] leading-4 text-white/55">
                {article.title}
              </p>
              <p className="mt-1 text-[8px] text-violet-200/35">
                {article.category}
              </p>
            </button>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.07] px-3 py-8 text-center text-[10px] text-white/18">
            {empty}
          </div>
        )}
      </div>
    </section>
  )
}

function PortalArticleCatalog({
  articles,
  onOpenArticle,
}: {
  articles: Article[]
  onOpenArticle: (article: Article) => void
}) {
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [author, setAuthor] = useState("all")
  const [sort, setSort] = useState<
    "updated" | "title" | "reading" | "favorite"
  >("updated")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const categories = Array.from(
    new Set(articles.map((article) => article.category)),
  ).sort((a, b) => a.localeCompare(b, "ru"))

  const authors = Array.from(
    new Set(articles.map((article) => article.author)),
  ).sort((a, b) => a.localeCompare(b, "ru"))

  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    const filtered = articles.filter((article) => {
      const matchesQuery =
        !normalizedQuery ||
        article.title.toLowerCase().includes(normalizedQuery) ||
        article.excerpt.toLowerCase().includes(normalizedQuery) ||
        article.content.toLowerCase().includes(normalizedQuery)

      const matchesCategory =
        category === "all" || article.category === category
      const matchesAuthor = author === "all" || article.author === author

      return matchesQuery && matchesCategory && matchesAuthor
    })

    return [...filtered].sort((a, b) => {
      if (sort === "title") {
        return a.title.localeCompare(b.title, "ru")
      }

      if (sort === "reading") {
        return readingTime(b.content) - readingTime(a.content)
      }

      if (sort === "favorite") {
        return Number(b.isFavorite) - Number(a.isFavorite)
      }

      return (
        new Date(b.updatedAt).getTime() -
        new Date(a.updatedAt).getTime()
      )
    })
  }, [articles, query, category, author, sort])

  const allSelected =
    visible.length > 0 &&
    visible.every((article) => selectedIds.includes(article.id))

  function toggleSelected(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((current) =>
        current.filter(
          (id) => !visible.some((article) => article.id === id),
        ),
      )
      return
    }

    setSelectedIds((current) =>
      Array.from(
        new Set([...current, ...visible.map((article) => article.id)]),
      ),
    )
  }

  const favoriteCount = articles.filter(
    (article) => article.isFavorite,
  ).length
  const totalWords = articles.reduce(
    (sum, article) =>
      sum + article.content.split(/\s+/).filter(Boolean).length,
    0,
  )

  return (
    <div className="min-h-[calc(100vh-205px)] bg-[#0b0c0f] p-5 md:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-300/60">
            LEGION ARTICLES CENTER
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            Управление статьями
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/30">
            Поиск, фильтрация, сортировка и быстрый доступ ко всем
            материалам корпоративной базы знаний.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="h-10 rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 text-[10px] text-white/40"
          >
            Экспорт
          </button>
          <button
            type="button"
            className="h-10 rounded-xl border border-violet-400/18 bg-violet-400/[0.06] px-4 text-[10px] text-violet-200"
          >
            AI создать
          </button>
          <button
            type="button"
            className="h-10 rounded-xl bg-white px-4 text-[10px] font-semibold text-black"
          >
            + Новая статья
          </button>
        </div>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PortalMetric
          label="Всего статей"
          value={String(articles.length)}
          note="В Knowledge Base"
        />
        <PortalMetric
          label="Избранных"
          value={String(favoriteCount)}
          note="Закреплённые материалы"
        />
        <PortalMetric
          label="Категорий"
          value={String(categories.length)}
          note="Активные разделы"
        />
        <PortalMetric
          label="Авторов"
          value={String(authors.length)}
          note="Участники Wiki"
        />
        <PortalMetric
          label="Слов"
          value={compactNumber(totalWords)}
          note="Объём базы знаний"
        />
      </section>

      <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_190px_190px_180px_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/22" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию, описанию и тексту..."
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/20 pl-10 pr-3 text-xs text-white outline-none placeholder:text-white/18"
            />
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white outline-none"
          >
            <option value="all">Все категории</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white outline-none"
          >
            <option value="all">Все авторы</option>
            {authors.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value as
                  | "updated"
                  | "title"
                  | "reading"
                  | "favorite",
              )
            }
            className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white outline-none"
          >
            <option value="updated">Сначала новые</option>
            <option value="title">По названию</option>
            <option value="reading">По времени чтения</option>
            <option value="favorite">Сначала избранные</option>
          </select>

          <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={[
                "h-8 flex-1 rounded-lg px-3 text-[9px] transition",
                view === "grid"
                  ? "bg-white/[0.08] text-white"
                  : "text-white/25",
              ].join(" ")}
            >
              Плитка
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={[
                "h-8 flex-1 rounded-lg px-3 text-[9px] transition",
                view === "list"
                  ? "bg-white/[0.08] text-white"
                  : "text-white/25",
              ].join(" ")}
            >
              Список
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.05] pt-3">
          <label className="flex cursor-pointer items-center gap-2 text-[10px] text-white/30">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 accent-violet-500"
            />
            Выбрать все видимые
          </label>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-white/22">
              Найдено: {visible.length}
            </span>
            {selectedIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-violet-400/[0.08] px-2 py-1 text-[9px] text-violet-200">
                  Выбрано: {selectedIds.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="text-[9px] text-white/25 hover:text-white/60"
                >
                  Сбросить
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {selectedIds.length > 0 && (
        <section className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-violet-400/12 bg-violet-400/[0.04] p-3">
          <span className="mr-2 text-[10px] text-violet-200">
            Массовые действия
          </span>
          {[
            "Сменить категорию",
            "Добавить теги",
            "Экспортировать",
            "Архивировать",
          ].map((action) => (
            <button
              key={action}
              type="button"
              className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[9px] text-white/35"
            >
              {action}
            </button>
          ))}
        </section>
      )}

      {view === "grid" ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((article) => (
            <ArticleCenterCard
              key={article.id}
              article={article}
              selected={selectedIds.includes(article.id)}
              onToggle={() => toggleSelected(article.id)}
              onOpen={() => onOpenArticle(article)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.015]">
          <div className="grid grid-cols-[44px_minmax(240px,1fr)_140px_120px_120px_110px] border-b border-white/[0.06] px-3 py-3 text-[8px] font-semibold uppercase tracking-[0.16em] text-white/18">
            <span />
            <span>Статья</span>
            <span>Категория</span>
            <span>Автор</span>
            <span>Обновлено</span>
            <span>Чтение</span>
          </div>

          {visible.map((article) => (
            <button
              key={article.id}
              type="button"
              onClick={() => onOpenArticle(article)}
              className="grid w-full grid-cols-[44px_minmax(240px,1fr)_140px_120px_120px_110px] items-center border-b border-white/[0.045] px-3 py-3 text-left transition last:border-0 hover:bg-white/[0.035]"
            >
              <span
                onClick={(event) => {
                  event.stopPropagation()
                  toggleSelected(article.id)
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(article.id)}
                  readOnly
                  className="size-4 accent-violet-500"
                />
              </span>
              <span className="min-w-0 pr-4">
                <span className="block truncate text-xs font-medium text-white/62">
                  {article.title}
                </span>
                <span className="mt-1 block truncate text-[9px] text-white/20">
                  {article.excerpt || "Без описания"}
                </span>
              </span>
              <span className="text-[10px] text-violet-200/50">
                {article.category}
              </span>
              <span className="truncate text-[10px] text-white/28">
                {article.author}
              </span>
              <span className="text-[9px] text-white/20">
                {formatDate(article.updatedAt)}
              </span>
              <span className="text-[9px] text-white/20">
                {readingTime(article.content)} мин
              </span>
            </button>
          ))}
        </div>
      )}

      {!visible.length && (
        <div className="mt-5 rounded-2xl border border-dashed border-white/[0.07] py-16 text-center">
          <p className="text-sm text-white/28">Статьи не найдены</p>
          <p className="mt-2 text-[10px] text-white/16">
            Измени фильтры или поисковый запрос.
          </p>
        </div>
      )}
    </div>
  )
}

function ArticleCenterCard({
  article,
  selected,
  onToggle,
  onOpen,
}: {
  article: Article
  selected: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  const words = article.content.split(/\s+/).filter(Boolean).length

  return (
    <article
      className={[
        "group rounded-2xl border p-5 transition",
        selected
          ? "border-violet-400/25 bg-violet-400/[0.055]"
          : "border-white/[0.07] bg-white/[0.018] hover:-translate-y-0.5 hover:border-violet-400/15 hover:bg-violet-400/[0.03]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggle}
            className="size-4 accent-violet-500"
          />
          <span className="rounded-lg bg-violet-400/[0.07] px-2 py-1 text-[9px] text-violet-200">
            {article.category}
          </span>
        </label>

        <span
          className={[
            "text-base",
            article.isFavorite ? "text-amber-300" : "text-white/12",
          ].join(" ")}
        >
          ★
        </span>
      </div>

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 w-full text-left"
      >
        <h3 className="line-clamp-2 text-base font-semibold leading-6 text-white/74">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-3 min-h-[60px] text-[10px] leading-5 text-white/25">
          {article.excerpt || "Без краткого описания"}
        </p>
      </button>

      <div className="mt-5 grid grid-cols-3 gap-2">
        <MiniStat label="Чтение" value={`${readingTime(article.content)} мин`} />
        <MiniStat label="Слов" value={compactNumber(words)} />
        <MiniStat label="Версия" value="v1+" />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
        <div>
          <p className="text-[9px] font-medium text-white/35">
            {article.author}
          </p>
          <p className="mt-1 text-[8px] text-white/16">
            {formatDate(article.updatedAt)}
          </p>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[9px] text-white/38 transition group-hover:border-violet-400/15 group-hover:text-violet-200"
        >
          Открыть →
        </button>
      </div>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-black/10 px-2 py-2">
      <p className="text-[7px] uppercase tracking-[0.14em] text-white/15">
        {label}
      </p>
      <p className="mt-1 text-[9px] font-medium text-white/38">{value}</p>
    </div>
  )
}

function readingTime(content: string) {
  return Math.max(
    1,
    Math.ceil(content.split(/\s+/).filter(Boolean).length / 180),
  )
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    notation: value >= 1000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

function CasesCenter() {
  const [cases, setCases] = useState<WikiCase[]>([])
  const [selected, setSelected] = useState<WikiCase | null>(null)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [category, setCategory] = useState("all")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)

  async function loadCases() {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (status !== "all") params.set("status", status)
      if (category !== "all") params.set("category", category)

      const response = await fetch(`/api/wiki/cases?${params.toString()}`, {
        cache: "no-store",
      })

      const contentType = response.headers.get("content-type") ?? ""
      const payload = contentType.includes("application/json")
        ? await response.json()
        : {
            error: `Cases API вернул HTTP ${response.status} вместо JSON.`,
          }

      if (!response.ok || !payload.cases) {
        throw new Error(payload.error || "Не удалось загрузить кейсы.")
      }

      setCases(payload.cases)
      setSelected((current) => {
        if (!current) return payload.cases[0] ?? null
        return (
          payload.cases.find(
            (item: WikiCase) => item.id === current.id,
          ) ??
          payload.cases[0] ??
          null
        )
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка загрузки кейсов.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCases(), 180)
    return () => window.clearTimeout(timer)
  }, [query, status, category])

  const categories = Array.from(
    new Set(cases.map((item) => item.category)),
  )

  const counts = {
    success: cases.filter((item) => item.status === "success").length,
    inProgress: cases.filter((item) => item.status === "in_progress").length,
    failed: cases.filter((item) => item.status === "failed").length,
  }

  async function createCase(formData: FormData) {
    const response = await fetch("/api/wiki/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        category: String(formData.get("category") ?? "Продажи"),
        status: String(formData.get("status") ?? "success"),
        situation: String(formData.get("situation") ?? ""),
        problem: String(formData.get("problem") ?? ""),
        solution: String(formData.get("solution") ?? ""),
        result: String(formData.get("result") ?? ""),
        lessons: String(formData.get("lessons") ?? ""),
        owner: "VSIPEK",
        tags: String(formData.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    })
    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json()
      : {
          error: `Cases API вернул HTTP ${response.status} вместо JSON.`,
        }

    if (!response.ok || !payload.case) {
      throw new Error(payload.error || "Не удалось создать кейс.")
    }

    setShowCreate(false)
    await loadCases()
    setSelected(payload.case)
  }

  return (
    <div className="min-h-[calc(100vh-205px)] bg-[#0b0c0f] p-5 md:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-300/60">
            LEGION CASES CENTER
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            Кейсы команды
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/30">
            Реальные ситуации, решения, результаты и выводы, которые помогают
            команде быстрее находить правильный следующий шаг.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="h-10 rounded-xl bg-white px-4 text-[10px] font-semibold text-black"
        >
          + Новый кейс
        </button>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PortalMetric label="Всего кейсов" value={String(cases.length)} note="В базе команды" />
        <PortalMetric label="Успешных" value={String(counts.success)} note="Подтверждённый результат" />
        <PortalMetric label="В работе" value={String(counts.inProgress)} note="Требуют продолжения" />
        <PortalMetric label="Неуспешных" value={String(counts.failed)} note="Материал для разбора" />
      </section>

      <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_190px_190px_auto]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/22" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по ситуации, решению и результату..."
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/20 pl-10 pr-3 text-xs text-white outline-none"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white outline-none"
          >
            <option value="all">Все статусы</option>
            <option value="success">Успешные</option>
            <option value="in_progress">В работе</option>
            <option value="failed">Неуспешные</option>
            <option value="archived">Архив</option>
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white outline-none"
          >
            <option value="all">Все категории</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={[
                "h-8 rounded-lg px-3 text-[9px]",
                view === "grid" ? "bg-white/[0.08] text-white" : "text-white/25",
              ].join(" ")}
            >
              Плитка
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={[
                "h-8 rounded-lg px-3 text-[9px]",
                view === "list" ? "bg-white/[0.08] text-white" : "text-white/25",
              ].join(" ")}
            >
              Список
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 text-xs text-white/25">Загрузка кейсов...</div>
      ) : view === "grid" ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {cases.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-400/15 hover:bg-violet-400/[0.03]"
            >
              <div className="flex items-center justify-between gap-3">
                <CaseStatus status={item.status} />
                <span className="text-[9px] text-white/18">{item.category}</span>
              </div>
              <h3 className="mt-4 line-clamp-2 text-base font-semibold leading-6 text-white/72">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-3 min-h-[60px] text-[10px] leading-5 text-white/25">
                {item.situation || "Ситуация не заполнена"}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {item.tags.slice(0, 4).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-white/[0.05] bg-white/[0.025] px-2 py-1 text-[8px] text-white/24"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-3">
                <span className="text-[9px] text-white/25">{item.owner}</span>
                <span className="text-[9px] text-white/18">
                  {formatDate(item.updatedAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
          {cases.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="grid w-full grid-cols-[130px_minmax(220px,1fr)_140px_120px] items-center border-b border-white/[0.05] px-4 py-3 text-left last:border-0 hover:bg-white/[0.035]"
            >
              <CaseStatus status={item.status} />
              <span className="truncate pr-4 text-xs text-white/60">{item.title}</span>
              <span className="text-[10px] text-white/25">{item.category}</span>
              <span className="text-[9px] text-white/20">{item.owner}</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <CaseDetails caseItem={selected} onClose={() => setSelected(null)} />
      )}

      {showCreate && (
        <CreateCaseModal
          onClose={() => setShowCreate(false)}
          onSubmit={createCase}
        />
      )}
    </div>
  )
}

function CaseStatus({
  status,
}: {
  status: WikiCase["status"]
}) {
  const config = {
    success: ["Успешный", "bg-emerald-400/[0.08] text-emerald-300"],
    in_progress: ["В работе", "bg-amber-400/[0.08] text-amber-300"],
    failed: ["Неуспешный", "bg-rose-400/[0.08] text-rose-300"],
    archived: ["Архив", "bg-white/[0.06] text-white/28"],
  }[status]

  return (
    <span className={`rounded-lg px-2 py-1 text-[8px] font-medium ${config[1]}`}>
      {config[0]}
    </span>
  )
}

function CaseDetails({
  caseItem,
  onClose,
}: {
  caseItem: WikiCase
  onClose: () => void
}) {
  const sections = [
    ["Ситуация", caseItem.situation],
    ["Проблема", caseItem.problem],
    ["Решение", caseItem.solution],
    ["Результат", caseItem.result],
    ["Выводы", caseItem.lessons],
  ]

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#0d0f13] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CaseStatus status={caseItem.status} />
              <span className="text-[9px] text-white/22">{caseItem.category}</span>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-white">
              {caseItem.title}
            </h3>
            <p className="mt-2 text-[10px] text-white/22">
              {caseItem.owner} · {formatDate(caseItem.updatedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/30">
            ✕
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {sections.map(([label, value]) => (
            <section
              key={label}
              className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
            >
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-200/55">
                {label}
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/45">
                {value || "Не заполнено"}
              </p>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

function CreateCaseModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (formData: FormData) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <form
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError("")
          try {
            await onSubmit(new FormData(event.currentTarget))
          } catch (submitError) {
            setError(
              submitError instanceof Error
                ? submitError.message
                : "Ошибка создания кейса.",
            )
          } finally {
            setBusy(false)
          }
        }}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#0d0f13] p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Новый кейс</p>
            <p className="mt-1 text-xs text-white/28">
              Зафиксируй ситуацию, решение и итог.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/30">
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input name="title" required placeholder="Название кейса" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none md:col-span-2" />
          <input name="category" placeholder="Категория" defaultValue="Продажи" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none" />
          <select name="status" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white">
            <option value="success">Успешный</option>
            <option value="in_progress">В работе</option>
            <option value="failed">Неуспешный</option>
            <option value="archived">Архив</option>
          </select>

          {[
            ["situation", "Ситуация"],
            ["problem", "Проблема"],
            ["solution", "Решение"],
            ["result", "Результат"],
            ["lessons", "Выводы"],
          ].map(([name, placeholder]) => (
            <textarea
              key={name}
              name={name}
              rows={4}
              placeholder={placeholder}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white outline-none"
            />
          ))}

          <input
            name="tags"
            placeholder="Теги через запятую"
            className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none"
          />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 text-xs text-white/35">
            Отмена
          </button>
          <button disabled={busy} className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-black disabled:opacity-40">
            {busy ? "Создаю..." : "Создать кейс"}
          </button>
        </div>
      </form>
    </div>
  )
}

function RegulationsCenter() {
  const [items, setItems] = useState<WikiRegulation[]>([])
  const [selected, setSelected] = useState<WikiRegulation | null>(null)
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("all")
  const [category, setCategory] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)

  async function loadRegulations() {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      if (query.trim()) params.set("q", query.trim())
      if (status !== "all") params.set("status", status)
      if (category !== "all") params.set("category", category)

      const response = await fetch(
        `/api/wiki/regulations?${params.toString()}`,
        { cache: "no-store" },
      )
      const contentType = response.headers.get("content-type") ?? ""
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { error: `Regulations API вернул HTTP ${response.status}` }

      if (!response.ok || !payload.regulations) {
        throw new Error(payload.error || "Не удалось загрузить регламенты.")
      }

      setItems(payload.regulations)
      setSelected((current) => {
        if (!current) return payload.regulations[0] ?? null
        return (
          payload.regulations.find(
            (item: WikiRegulation) => item.id === current.id,
          ) ??
          payload.regulations[0] ??
          null
        )
      })
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка загрузки регламентов.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadRegulations(), 180)
    return () => window.clearTimeout(timer)
  }, [query, status, category])

  const categories = Array.from(new Set(items.map((item) => item.category)))
  const activeCount = items.filter((item) => item.status === "active").length
  const draftCount = items.filter((item) => item.status === "draft").length
  const archivedCount = items.filter((item) => item.status === "archived").length

  async function createRegulation(formData: FormData) {
    const stepsRaw = String(formData.get("steps") ?? "")
    const steps = stepsRaw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [title, ...rest] = line.split(" — ")
        return {
          title: title.trim(),
          description: rest.join(" — ").trim(),
        }
      })

    const response = await fetch("/api/wiki/regulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: String(formData.get("title") ?? ""),
        category: String(formData.get("category") ?? "Общее"),
        status: String(formData.get("status") ?? "active"),
        owner: "VSIPEK",
        summary: String(formData.get("summary") ?? ""),
        content: String(formData.get("content") ?? ""),
        steps,
        tags: String(formData.get("tags") ?? "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }),
    })

    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: `Regulations API вернул HTTP ${response.status}` }

    if (!response.ok || !payload.regulation) {
      throw new Error(payload.error || "Не удалось создать регламент.")
    }

    setShowCreate(false)
    await loadRegulations()
    setSelected(payload.regulation)
  }

  return (
    <div className="min-h-[calc(100vh-205px)] bg-[#0b0c0f] p-5 md:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-300/60">
            LEGION REGULATIONS CENTER
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            Регламенты
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/30">
            Пошаговые процессы, ответственные, версии и контроль исполнения.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="h-10 rounded-xl bg-white px-4 text-[10px] font-semibold text-black"
        >
          + Новый регламент
        </button>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PortalMetric label="Всего" value={String(items.length)} note="В базе процессов" />
        <PortalMetric label="Активных" value={String(activeCount)} note="Используются командой" />
        <PortalMetric label="Черновиков" value={String(draftCount)} note="Требуют доработки" />
        <PortalMetric label="Архивных" value={String(archivedCount)} note="Не используются" />
      </section>

      <section className="mt-5 rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_190px_190px]">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/22" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Поиск по названию и содержимому..."
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/20 pl-10 pr-3 text-xs text-white outline-none"
            />
          </div>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white outline-none"
          >
            <option value="all">Все статусы</option>
            <option value="active">Активные</option>
            <option value="draft">Черновики</option>
            <option value="archived">Архив</option>
          </select>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white outline-none"
          >
            <option value="all">Все категории</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 text-xs text-white/25">Загрузка регламентов...</div>
      ) : (
        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item)}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 text-left transition hover:-translate-y-0.5 hover:border-violet-400/15 hover:bg-violet-400/[0.03]"
            >
              <div className="flex items-center justify-between gap-3">
                <RegulationStatus status={item.status} />
                <span className="text-[9px] text-white/18">
                  v{item.versionNumber}
                </span>
              </div>
              <h3 className="mt-4 line-clamp-2 text-base font-semibold leading-6 text-white/72">
                {item.title}
              </h3>
              <p className="mt-2 line-clamp-3 min-h-[60px] text-[10px] leading-5 text-white/25">
                {item.summary || "Краткое описание не заполнено"}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[9px] text-violet-200/45">
                  {item.category}
                </span>
                <span className="text-[9px] text-white/18">
                  {item.steps.length} шагов
                </span>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-3">
                <span className="text-[9px] text-white/25">{item.owner}</span>
                <span className="text-[9px] text-white/18">
                  {formatDate(item.updatedAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <RegulationDetails
          item={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {showCreate && (
        <CreateRegulationModal
          onClose={() => setShowCreate(false)}
          onSubmit={createRegulation}
        />
      )}
    </div>
  )
}

function RegulationStatus({
  status,
}: {
  status: WikiRegulation["status"]
}) {
  const config = {
    active: ["Активен", "bg-emerald-400/[0.08] text-emerald-300"],
    draft: ["Черновик", "bg-amber-400/[0.08] text-amber-300"],
    archived: ["Архив", "bg-white/[0.06] text-white/28"],
  }[status]

  return (
    <span className={`rounded-lg px-2 py-1 text-[8px] font-medium ${config[1]}`}>
      {config[0]}
    </span>
  )
}

function RegulationDetails({
  item,
  onClose,
}: {
  item: WikiRegulation
  onClose: () => void
}) {
  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#0d0f13] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <RegulationStatus status={item.status} />
              <span className="text-[9px] text-white/22">
                {item.category} · v{item.versionNumber}
              </span>
            </div>
            <h3 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-white">
              {item.title}
            </h3>
            <p className="mt-2 text-[10px] text-white/22">
              Ответственный: {item.owner} · {formatDate(item.updatedAt)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/30">
            ✕
          </button>
        </div>

        <section className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-violet-200/55">
            Описание
          </p>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/45">
            {item.content || item.summary || "Не заполнено"}
          </p>
        </section>

        <section className="mt-4">
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/22">
            Этапы выполнения
          </p>
          <div className="mt-3 space-y-3">
            {item.steps.length ? (
              item.steps.map((step, index) => (
                <div
                  key={`${step.title}-${index}`}
                  className="flex gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                >
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-400/[0.08] text-[10px] font-semibold text-violet-200">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/65">
                      {step.title}
                    </p>
                    <p className="mt-1 text-[10px] leading-5 text-white/28">
                      {step.description || "Описание шага не заполнено"}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[10px] text-white/20">Шаги пока не добавлены.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function CreateRegulationModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (formData: FormData) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <form
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError("")
          try {
            await onSubmit(new FormData(event.currentTarget))
          } catch (submitError) {
            setError(
              submitError instanceof Error
                ? submitError.message
                : "Ошибка создания регламента.",
            )
          } finally {
            setBusy(false)
          }
        }}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#0d0f13] p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Новый регламент</p>
            <p className="mt-1 text-xs text-white/28">
              Создай процесс и добавь пошаговое выполнение.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/30">
            ✕
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input name="title" required placeholder="Название регламента" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none md:col-span-2" />
          <input name="category" placeholder="Категория" defaultValue="Общее" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none" />
          <select name="status" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white">
            <option value="active">Активен</option>
            <option value="draft">Черновик</option>
            <option value="archived">Архив</option>
          </select>
          <textarea name="summary" rows={3} placeholder="Краткое описание" className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white outline-none md:col-span-2" />
          <textarea name="content" rows={5} placeholder="Полное описание регламента" className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white outline-none md:col-span-2" />
          <textarea name="steps" rows={7} placeholder={"Каждый шаг с новой строки:\nПроверить данные — Описание действия\nНазначить ответственного — Описание действия"} className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white outline-none md:col-span-2" />
          <input name="tags" placeholder="Теги через запятую" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none md:col-span-2" />
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 text-xs text-white/35">
            Отмена
          </button>
          <button disabled={busy} className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-black disabled:opacity-40">
            {busy ? "Создаю..." : "Создать регламент"}
          </button>
        </div>
      </form>
    </div>
  )
}

function PortalPlaceholder({
  eyebrow,
  title,
  description,
  icon,
}: {
  eyebrow: string
  title: string
  description: string
  icon: string
}) {
  return (
    <div className="flex min-h-[calc(100vh-205px)] items-center justify-center bg-[#0b0c0f] p-6">
      <div className="max-w-2xl rounded-3xl border border-white/[0.07] bg-white/[0.018] p-8 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-2xl border border-violet-400/14 bg-violet-400/[0.05] text-3xl">
          {icon}
        </div>
        <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-300/60">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          {title}
        </h2>
        <p className="mt-4 text-sm leading-7 text-white/32">
          {description}
        </p>
        <div className="mt-6 inline-flex rounded-xl border border-white/[0.07] bg-white/[0.025] px-4 py-2 text-[10px] text-white/28">
          Раздел подготовлен для следующего спринта
        </div>
      </div>
    </div>
  )
}

function ToolsCenter() {
  const [tools, setTools] = useState<WikiTool[]>([])
  const [selected, setSelected] = useState<WikiTool | null>(null)
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("all")
  const [status, setStatus] = useState("all")
  const [view, setView] = useState<"grid" | "list">("grid")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [recommendQuestion, setRecommendQuestion] = useState("")
  const [recommendAnswer, setRecommendAnswer] = useState("")
  const [recommendLoading, setRecommendLoading] = useState(false)

  async function loadTools() {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams({ user: "VSIPEK" })
      if (query.trim()) params.set("q", query.trim())
      if (category !== "all") params.set("category", category)
      if (status !== "all") params.set("status", status)

      const response = await fetch(`/api/wiki/tools?${params.toString()}`, {
        cache: "no-store",
      })
      const contentType = response.headers.get("content-type") ?? ""
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { error: `Tools API вернул HTTP ${response.status}` }

      if (!response.ok || !payload.tools) {
        throw new Error(payload.error || "Не удалось загрузить инструменты.")
      }

      setTools(payload.tools)
      setSelected((current) =>
        current
          ? payload.tools.find((tool: WikiTool) => tool.id === current.id) ??
            null
          : null,
      )
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Ошибка загрузки инструментов.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadTools(), 180)
    return () => window.clearTimeout(timer)
  }, [query, category, status])

  const categories = Array.from(new Set(tools.map((tool) => tool.category)))
  const activeCount = tools.filter((tool) => tool.status === "active").length
  const betaCount = tools.filter((tool) => tool.status === "beta").length
  const favoriteCount = tools.filter((tool) => tool.isFavorite).length
  const totalViews = tools.reduce((sum, tool) => sum + tool.views, 0)

  async function toggleFavorite(tool: WikiTool) {
    const response = await fetch(`/api/wiki/tools/${tool.id}/favorite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user: "VSIPEK",
        favorite: !tool.isFavorite,
      }),
    })

    if (response.ok) await loadTools()
  }

  async function openTool(tool: WikiTool) {
    setSelected(tool)
    void fetch(`/api/wiki/tools/${tool.id}/view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ viewer: "VSIPEK" }),
    }).then(() => loadTools())
  }

  async function createTool(formData: FormData) {
    const response = await fetch("/api/wiki/tools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
        icon: String(formData.get("icon") ?? "🛠️"),
        category: String(formData.get("category") ?? "Utilities"),
        status: String(formData.get("status") ?? "active"),
        description: String(formData.get("description") ?? ""),
        instructions: String(formData.get("instructions") ?? ""),
        launchUrl: String(formData.get("launchUrl") ?? ""),
        owner: "VSIPEK",
        version: String(formData.get("version") ?? "1.0"),
        tags: String(formData.get("tags") ?? "")
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
        requirements: String(formData.get("requirements") ?? "")
          .split("\n")
          .map((value) => value.trim())
          .filter(Boolean),
      }),
    })

    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: `Tools API вернул HTTP ${response.status}` }

    if (!response.ok) {
      throw new Error(payload.error || "Не удалось создать инструмент.")
    }

    setShowCreate(false)
    await loadTools()
  }

  async function recommendTool() {
    if (!recommendQuestion.trim()) return
    setRecommendLoading(true)
    setRecommendAnswer("")

    try {
      const response = await fetch("/api/wiki/tools/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: recommendQuestion }),
      })
      const contentType = response.headers.get("content-type") ?? ""
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { error: `AI API вернул HTTP ${response.status}` }

      if (!response.ok) throw new Error(payload.error || "Ошибка AI.")
      setRecommendAnswer(payload.answer || "Рекомендация не найдена.")

      if (payload.toolId) {
        const tool = tools.find((item) => item.id === payload.toolId)
        if (tool) setSelected(tool)
      }
    } catch (recommendError) {
      setRecommendAnswer(
        recommendError instanceof Error
          ? recommendError.message
          : "Не удалось подобрать инструмент.",
      )
    } finally {
      setRecommendLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-205px)] bg-[#0b0c0f] p-5 md:p-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-violet-300/60">
            LEGION TOOLS CENTER
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">
            Инструменты команды
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/30">
            Каталог внутренних сервисов, инструкций и быстрых запусков.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="h-10 rounded-xl bg-white px-4 text-[10px] font-semibold text-black"
        >
          + Новый инструмент
        </button>
      </div>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <PortalMetric label="Всего" value={String(tools.length)} note="В каталоге" />
        <PortalMetric label="Активных" value={String(activeCount)} note="Готовы к работе" />
        <PortalMetric label="Beta" value={String(betaCount)} note="Тестируются" />
        <PortalMetric label="Избранных" value={String(favoriteCount)} note="Закреплено" />
        <PortalMetric label="Просмотров" value={compactNumber(totalViews)} note="Все открытия" />
      </section>

      <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_420px]">
        <section className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_170px_150px_auto]">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/22" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Поиск по названию, описанию и тегам..."
                className="h-10 w-full rounded-xl border border-white/[0.07] bg-black/20 pl-10 pr-3 text-xs text-white outline-none"
              />
            </div>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white"
            >
              <option value="all">Все категории</option>
              {categories.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-xs text-white"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="beta">Beta</option>
              <option value="archived">Архив</option>
            </select>
            <div className="flex rounded-xl border border-white/[0.07] bg-black/20 p-1">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`h-8 rounded-lg px-3 text-[9px] ${view === "grid" ? "bg-white/[0.08] text-white" : "text-white/25"}`}
              >
                Плитка
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`h-8 rounded-lg px-3 text-[9px] ${view === "list" ? "bg-white/[0.08] text-white" : "text-white/25"}`}
              >
                Список
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-violet-400/12 bg-violet-400/[0.035] p-4">
          <div className="flex items-center gap-2 text-violet-200">
            <SparklesIcon className="size-4" />
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em]">
              Какой инструмент использовать?
            </p>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              value={recommendQuestion}
              onChange={(event) => setRecommendQuestion(event.target.value)}
              placeholder="Например: импортировать PDF..."
              className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.07] bg-black/20 px-3 text-[10px] text-white outline-none"
            />
            <button
              type="button"
              disabled={recommendLoading || !recommendQuestion.trim()}
              onClick={() => void recommendTool()}
              className="h-10 rounded-xl bg-white px-3 text-[9px] font-semibold text-black disabled:opacity-35"
            >
              {recommendLoading ? "..." : "Подобрать"}
            </button>
          </div>
          {recommendAnswer && (
            <p className="mt-3 text-[10px] leading-5 text-white/40">
              {recommendAnswer}
            </p>
          )}
        </section>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.06] p-3 text-xs text-rose-200">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-6 text-xs text-white/25">Загрузка инструментов...</p>
      ) : view === "grid" ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              onOpen={() => void openTool(tool)}
              onFavorite={() => void toggleFavorite(tool)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.07]">
          {tools.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => void openTool(tool)}
              className="grid w-full grid-cols-[52px_minmax(220px,1fr)_140px_100px_100px] items-center border-b border-white/[0.05] px-4 py-3 text-left last:border-0 hover:bg-white/[0.035]"
            >
              <span className="text-xl">{tool.icon}</span>
              <span>
                <span className="block text-xs text-white/60">{tool.name}</span>
                <span className="mt-1 block truncate text-[9px] text-white/20">
                  {tool.description}
                </span>
              </span>
              <span className="text-[10px] text-violet-200/45">{tool.category}</span>
              <ToolStatus status={tool.status} />
              <span className="text-[9px] text-white/20">{tool.views} просмотров</span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <ToolDetails
          tool={selected}
          onClose={() => setSelected(null)}
          onFavorite={() => void toggleFavorite(selected)}
        />
      )}

      {showCreate && (
        <CreateToolModal
          onClose={() => setShowCreate(false)}
          onSubmit={createTool}
        />
      )}
    </div>
  )
}

function ToolCard({
  tool,
  onOpen,
  onFavorite,
}: {
  tool: WikiTool
  onOpen: () => void
  onFavorite: () => void
}) {
  return (
    <article className="rounded-2xl border border-white/[0.07] bg-white/[0.018] p-5 transition hover:-translate-y-0.5 hover:border-violet-400/15 hover:bg-violet-400/[0.03]">
      <div className="flex items-start justify-between">
        <div className="flex size-12 items-center justify-center rounded-xl bg-white/[0.04] text-2xl">
          {tool.icon}
        </div>
        <button
          type="button"
          onClick={onFavorite}
          className={tool.isFavorite ? "text-amber-300" : "text-white/14"}
        >
          ★
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <ToolStatus status={tool.status} />
        <span className="text-[8px] text-white/18">{tool.category}</span>
      </div>
      <h3 className="mt-3 text-base font-semibold text-white/72">{tool.name}</h3>
      <p className="mt-2 line-clamp-3 min-h-[60px] text-[10px] leading-5 text-white/25">
        {tool.description || "Описание не заполнено"}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {tool.tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded-md bg-white/[0.03] px-2 py-1 text-[8px] text-white/22">
            #{tag}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.05] pt-3">
        <span className="text-[9px] text-white/20">
          v{tool.version} · {tool.views} просмотров
        </span>
        <button
          type="button"
          onClick={onOpen}
          className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[9px] text-white/38"
        >
          Открыть →
        </button>
      </div>
    </article>
  )
}

function ToolStatus({ status }: { status: WikiTool["status"] }) {
  const config = {
    active: ["Активен", "bg-emerald-400/[0.08] text-emerald-300"],
    beta: ["Beta", "bg-amber-400/[0.08] text-amber-300"],
    archived: ["Архив", "bg-white/[0.06] text-white/28"],
  }[status]

  return (
    <span className={`rounded-lg px-2 py-1 text-[8px] font-medium ${config[1]}`}>
      {config[0]}
    </span>
  )
}

function ToolDetails({
  tool,
  onClose,
  onFavorite,
}: {
  tool: WikiTool
  onClose: () => void
  onFavorite: () => void
}) {
  const [versions, setVersions] = useState<
    Array<{ id: number; version: string; changeNote: string; author: string; createdAt: string }>
  >([])

  useEffect(() => {
    void fetch(`/api/wiki/tools/${tool.id}/versions`, { cache: "no-store" })
      .then(async (response) => {
        const contentType = response.headers.get("content-type") ?? ""
        return contentType.includes("application/json")
          ? response.json()
          : { versions: [] }
      })
      .then((payload) => setVersions(payload.versions ?? []))
  }, [tool.id])

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#0d0f13] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/[0.04] text-3xl">
              {tool.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <ToolStatus status={tool.status} />
                <span className="text-[9px] text-white/22">{tool.category}</span>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{tool.name}</h3>
              <p className="mt-1 text-[9px] text-white/20">
                v{tool.version} · {tool.owner} · {tool.views} просмотров
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onFavorite} className="size-9 rounded-lg border border-white/[0.07] text-amber-300">
              ★
            </button>
            <button type="button" onClick={onClose} className="size-9 text-white/30">✕</button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-violet-200/55">Описание</p>
              <p className="mt-3 text-sm leading-7 text-white/45">{tool.description || "Не заполнено"}</p>
            </section>
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
              <p className="text-[9px] uppercase tracking-[0.16em] text-violet-200/55">Инструкция</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/45">{tool.instructions || "Не заполнено"}</p>
            </section>
            {tool.launchUrl && (
              <a
                href={tool.launchUrl}
                className="flex h-12 items-center justify-center rounded-xl bg-white text-xs font-semibold text-black"
              >
                Запустить инструмент →
              </a>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/22">Требования</p>
              <div className="mt-3 space-y-2">
                {tool.requirements.length ? tool.requirements.map((item) => (
                  <p key={item} className="text-[10px] leading-5 text-white/35">• {item}</p>
                )) : <p className="text-[10px] text-white/18">Нет требований</p>}
              </div>
            </section>
            <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[9px] uppercase tracking-[0.16em] text-white/22">История версий</p>
              <div className="mt-3 space-y-2">
                {versions.length ? versions.map((version) => (
                  <div key={version.id} className="rounded-lg border border-white/[0.05] p-3">
                    <div className="flex justify-between">
                      <span className="text-[9px] text-violet-200">v{version.version}</span>
                      <span className="text-[8px] text-white/16">{formatDate(version.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-[9px] text-white/30">{version.changeNote}</p>
                  </div>
                )) : <p className="text-[10px] text-white/18">Истории пока нет</p>}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function CreateToolModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (formData: FormData) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <form
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)
          setError("")
          try {
            await onSubmit(new FormData(event.currentTarget))
          } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : "Ошибка создания.")
          } finally {
            setBusy(false)
          }
        }}
        className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/[0.1] bg-[#0d0f13] p-6"
      >
        <div className="flex justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Новый инструмент</p>
            <p className="mt-1 text-xs text-white/28">Добавь сервис в каталог LegionHunt.</p>
          </div>
          <button type="button" onClick={onClose} className="text-white/30">✕</button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <input name="name" required placeholder="Название" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white md:col-span-2" />
          <input name="icon" defaultValue="🛠️" placeholder="Emoji" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white" />
          <input name="category" defaultValue="Utilities" placeholder="Категория" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white" />
          <select name="status" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white">
            <option value="active">Активен</option>
            <option value="beta">Beta</option>
            <option value="archived">Архив</option>
          </select>
          <input name="version" defaultValue="1.0" placeholder="Версия" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white" />
          <input name="launchUrl" placeholder="URL или путь запуска" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white md:col-span-2" />
          <textarea name="description" rows={3} placeholder="Описание" className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white md:col-span-2" />
          <textarea name="instructions" rows={6} placeholder="Инструкция" className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white md:col-span-2" />
          <input name="tags" placeholder="Теги через запятую" className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white md:col-span-2" />
          <textarea name="requirements" rows={3} placeholder="Требования, каждое с новой строки" className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white md:col-span-2" />
        </div>

        {error && <div className="mt-4 rounded-xl bg-rose-400/[0.06] p-3 text-xs text-rose-200">{error}</div>}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 text-xs text-white/35">Отмена</button>
          <button disabled={busy} className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-black disabled:opacity-40">
            {busy ? "Создаю..." : "Создать инструмент"}
          </button>
        </div>
      </form>
    </div>
  )
}

function SimpleArticleList({
  articles,
  selectedId,
  emptyText,
  onSelect,
}: {
  articles: Article[]
  selectedId: number | null
  emptyText: string
  onSelect: (article: Article) => void
}) {
  if (!articles.length) {
    return (
      <div className="rounded-lg border border-dashed border-white/[0.07] px-3 py-8 text-center text-[10px] text-white/18">
        {emptyText}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {articles.map((article) => (
        <button
          key={article.id}
          type="button"
          onClick={() => onSelect(article)}
          className={[
            "flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left transition",
            selectedId === article.id
              ? "bg-violet-500/12 text-white"
              : "text-white/35 hover:bg-white/[0.035] hover:text-white/65",
          ].join(" ")}
        >
          <span className="mt-0.5 text-[10px] text-amber-300/65">★</span>
          <span className="min-w-0">
            <span className="line-clamp-2 text-[10px] leading-4">
              {article.title}
            </span>
            <span className="mt-1 block text-[8px] text-white/18">
              {article.category}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

function ArticleDocument({ article }: { article: Article }) {
  const toc = buildToc(article.content)
  const readingMinutes = Math.max(
    1,
    Math.ceil(article.content.split(/\s+/).filter(Boolean).length / 180),
  )

  return (
    <article>
      <div className="border-b border-white/[0.06] pb-7">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-300/60">{article.category}</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-[-0.04em] text-white md:text-[38px]">{article.title}</h1>
        {article.excerpt && <p className="mt-4 max-w-2xl text-sm leading-6 text-white/38">{article.excerpt}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3 text-[9px] text-white/22">
          <span>{article.author}</span><span>•</span>
          <span>Обновлено {formatDate(article.updatedAt)}</span><span>•</span>
          <span>{readingMinutes} мин чтения</span>
        </div>
      </div>

      {toc.length > 0 && (
        <div className="mt-7 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 xl:hidden">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">На этой странице</p>
          <div className="mt-3 space-y-2">
            {toc.map((item) => <a key={item.id} href={`#${item.id}`} className="block text-[10px] text-white/35 hover:text-violet-200">{item.label}</a>)}
          </div>
        </div>
      )}

      <div className="mt-8"><MarkdownDocument content={article.content} /></div>
    </article>
  )
}

function MarkdownDocument({ content }: { content: string }) {
  const lines = content.split("\n")
  const blocks: React.ReactNode[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index]

    if (line.startsWith("```")) {
      const language = line.slice(3).trim() || "text"
      const codeLines: string[] = []
      index += 1
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index])
        index += 1
      }
      blocks.push(
        <div key={`code-${index}`} className="my-5 overflow-hidden rounded-xl border border-white/[0.07] bg-black/35">
          <div className="border-b border-white/[0.06] px-4 py-2 text-[9px] uppercase tracking-[0.16em] text-white/20">{language}</div>
          <pre className="overflow-x-auto p-4 text-xs leading-6 text-white/58"><code>{codeLines.join("\n")}</code></pre>
        </div>,
      )
      index += 1
      continue
    }

    if (line.startsWith("|") && index + 1 < lines.length && lines[index + 1].includes("---")) {
      const tableLines = [line]
      index += 2
      while (index < lines.length && lines[index].startsWith("|")) {
        tableLines.push(lines[index])
        index += 1
      }
      const rows = tableLines.map((row) => row.split("|").slice(1, -1).map((cell) => cell.trim()))
      blocks.push(
        <div key={`table-${index}`} className="my-5 overflow-x-auto rounded-xl border border-white/[0.07]">
          <table className="w-full min-w-[520px] border-collapse text-left text-xs">
            <thead className="bg-white/[0.04]"><tr>{rows[0].map((cell, i) => <th key={i} className="border-b border-white/[0.07] px-4 py-3 font-semibold text-white/60">{cell}</th>)}</tr></thead>
            <tbody>{rows.slice(1).map((row, r) => <tr key={r} className="border-b border-white/[0.05] last:border-0">{row.map((cell, c) => <td key={c} className="px-4 py-3 text-white/42">{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      )
      continue
    }

    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/)
    if (imageMatch) {
      blocks.push(
        <figure key={`image-${index}`} className="my-6">
          <img src={imageMatch[2]} alt={imageMatch[1]} className="max-h-[520px] w-full rounded-2xl border border-white/[0.07] object-cover" />
          {imageMatch[1] && <figcaption className="mt-2 text-center text-[9px] text-white/20">{imageMatch[1]}</figcaption>}
        </figure>,
      )
      index += 1
      continue
    }

    const videoMatch = line.match(/^\[\[video:(.*?)\]\]$/)
    if (videoMatch) {
      blocks.push(
        <div key={`video-${index}`} className="my-6 overflow-hidden rounded-2xl border border-white/[0.07] bg-black/30">
          <div className="aspect-video">
            <iframe src={videoMatch[1]} title="Видео Wiki" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </div>,
      )
      index += 1
      continue
    }

    if (line.trim() === "---") {
      blocks.push(<div key={`divider-${index}`} className="my-8 h-px bg-white/[0.07]" />)
      index += 1
      continue
    }

    blocks.push(<MarkdownLine key={`line-${index}`} line={line} />)
    index += 1
  }

  return <div className="space-y-4">{blocks}</div>
}

function MarkdownLine({ line }: { line: string }) {
  if (line.startsWith("# ")) {
    const text = line.slice(2)
    return (
      <h1
        id={headingId(text)}
        className="scroll-mt-20 pt-3 text-3xl font-semibold tracking-[-0.035em] text-white"
      >
        {text}
      </h1>
    )
  }

  if (line.startsWith("## ")) {
    const text = line.slice(3)
    return (
      <h2
        id={headingId(text)}
        className="scroll-mt-20 border-b border-white/[0.06] pt-6 pb-3 text-xl font-semibold text-white/90"
      >
        {text}
      </h2>
    )
  }

  if (line.startsWith("### ")) {
    const text = line.slice(4)
    return (
      <h3
        id={headingId(text)}
        className="scroll-mt-20 pt-4 text-base font-semibold text-white/82"
      >
        {text}
      </h3>
    )
  }

  if (line.startsWith("> [!IMPORTANT]")) {
    return (
      <div className="border-l-2 border-rose-400 bg-rose-400/[0.045] px-4 py-3 text-sm leading-6 text-white/52">
        <strong className="text-rose-200">Важно:</strong>{" "}
        {line.replace("> [!IMPORTANT]", "").trim()}
      </div>
    )
  }

  if (line.startsWith("> [!TIP]")) {
    return (
      <div className="border-l-2 border-violet-400 bg-violet-400/[0.045] px-4 py-3 text-sm leading-6 text-white/52">
        <strong className="text-violet-200">Совет:</strong>{" "}
        {line.replace("> [!TIP]", "").trim()}
      </div>
    )
  }

  if (line.startsWith("> ")) {
    return (
      <blockquote className="border-l-2 border-violet-400 bg-violet-400/[0.035] px-4 py-3 text-sm italic leading-6 text-white/48">
        {line.slice(2)}
      </blockquote>
    )
  }

  if (line.startsWith("- [ ] ")) {
    return (
      <label className="flex items-start gap-3 text-sm leading-7 text-white/55">
        <input type="checkbox" className="mt-1.5 accent-violet-500" />
        <span>{line.slice(6)}</span>
      </label>
    )
  }

  if (line.startsWith("- [x] ")) {
    return (
      <label className="flex items-start gap-3 text-sm leading-7 text-white/30 line-through">
        <input
          type="checkbox"
          checked
          readOnly
          className="mt-1.5 accent-violet-500"
        />
        <span>{line.slice(6)}</span>
      </label>
    )
  }

  if (line.startsWith("- ")) {
    return (
      <div className="flex items-start gap-3 text-sm leading-7 text-white/55">
        <span className="mt-0.5 text-violet-300">•</span>
        <span>{line.slice(2)}</span>
      </div>
    )
  }

  if (/^\d+\.\s/.test(line)) {
    return <p className="text-sm leading-7 text-white/55">{line}</p>
  }

  if (!line.trim()) return <div className="h-1" />

  return <p className="text-sm leading-7 text-white/55">{line}</p>
}

function RightRail({
  article,
  articles,
  onSelect,
}: {
  article: Article
  articles: Article[]
  onSelect: (article: Article) => void
}) {
  const [tab, setTab] = useState<
    "toc" | "history" | "comments" | "ai"
  >("toc")
  const [versions, setVersions] = useState<VersionItem[]>([])
  const [comments, setComments] = useState<CommentItem[]>([])
  const [commentText, setCommentText] = useState("")
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([])
  const [aiQuestion, setAiQuestion] = useState("")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState("")
  const [loading, setLoading] = useState(false)

  const toc = buildToc(article.content)
  const related = articles
    .filter(
      (item) =>
        item.id !== article.id && item.category === article.category,
    )
    .slice(0, 3)

  useEffect(() => {
    let cancelled = false

    async function loadSideData() {
      setLoading(true)

      try {
        const [versionsResponse, commentsResponse, aiResponse] =
          await Promise.all([
            fetch(`/api/wiki/articles/${article.id}/versions`, {
              cache: "no-store",
            }),
            fetch(`/api/wiki/articles/${article.id}/comments`, {
              cache: "no-store",
            }),
            fetch(`/api/wiki/articles/${article.id}/ai`, {
              cache: "no-store",
            }),
          ])

        async function readJsonSafe(
          response: Response,
          fallbackLabel: string,
        ) {
          const contentType = response.headers.get("content-type") ?? ""

          if (!contentType.includes("application/json")) {
            const preview = (await response.text()).slice(0, 120)
            throw new Error(
              `${fallbackLabel}: сервер вернул не JSON (${response.status}). ${preview}`,
            )
          }

          const payload = await response.json()

          if (!response.ok) {
            throw new Error(
              payload?.error || `${fallbackLabel}: HTTP ${response.status}`,
            )
          }

          return payload
        }

        const results = await Promise.allSettled([
          readJsonSafe(versionsResponse, "История версий"),
          readJsonSafe(commentsResponse, "Комментарии"),
          readJsonSafe(aiResponse, "LEGION AI"),
        ])

        if (!cancelled) {
          const [versionsResult, commentsResult, aiResult] = results

          if (versionsResult.status === "fulfilled") {
            setVersions(versionsResult.value.versions ?? [])
          } else {
            console.error(versionsResult.reason)
            setVersions([])
          }

          if (commentsResult.status === "fulfilled") {
            setComments(commentsResult.value.comments ?? [])
          } else {
            console.error(commentsResult.reason)
            setComments([])
          }

          if (aiResult.status === "fulfilled") {
            setAiMessages(aiResult.value.messages ?? [])
          } else {
            console.error(aiResult.reason)
            setAiMessages([])
            setAiError(
              aiResult.reason instanceof Error
                ? aiResult.reason.message
                : "Не удалось загрузить LEGION AI.",
            )
          }
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSideData()

    return () => {
      cancelled = true
    }
  }, [article.id])

  async function addComment() {
    const body = commentText.trim()
    if (!body) return

    const response = await fetch(
      `/api/wiki/articles/${article.id}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, author: "VSIPEK" }),
      },
    )
    const contentType = response.headers.get("content-type") ?? ""
    const payload = contentType.includes("application/json")
      ? await response.json()
      : { error: `Комментарии: сервер вернул HTTP ${response.status}` }

    if (response.ok && payload.comment) {
      setComments((current) => [...current, payload.comment])
      setCommentText("")
    }
  }

  async function runAi(
    mode: "summary" | "question" | "improve" | "quiz",
  ) {
    const question = aiQuestion.trim()

    if (mode === "question" && !question) return

    const userText =
      mode === "summary"
        ? "Сделай краткое содержание статьи."
        : mode === "improve"
          ? "Предложи улучшения статьи."
          : mode === "quiz"
            ? "Создай проверочный тест по статье."
            : question

    const optimistic: AiMessage = {
      id: Date.now(),
      role: "user",
      content: userText,
      createdAt: new Date().toISOString(),
    }

    setAiMessages((current) => [...current, optimistic])
    setAiQuestion("")
    setAiLoading(true)
    setAiError("")

    try {
      const response = await fetch(`/api/wiki/articles/${article.id}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, question }),
      })
      const contentType = response.headers.get("content-type") ?? ""
      const payload = contentType.includes("application/json")
        ? await response.json()
        : { error: `LEGION AI: сервер вернул HTTP ${response.status}` }

      if (!response.ok || !payload.message) {
        throw new Error(payload.error || "Не удалось получить ответ AI.")
      }

      setAiMessages((current) => [...current, payload.message])
    } catch (error) {
      setAiMessages((current) =>
        current.filter((message) => message.id !== optimistic.id),
      )
      setAiError(
        error instanceof Error ? error.message : "Ошибка LEGION AI.",
      )
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="sticky top-0 h-[calc(100vh-205px)] overflow-y-auto">
      <div className="grid grid-cols-4 border-b border-white/[0.06] p-2">
        {[
          ["toc", "Содержание"],
          ["history", "История"],
          ["comments", "Комментарии"],
          ["ai", "AI"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              setTab(key as "toc" | "history" | "comments")
            }
            className={[
              "h-8 rounded-lg text-[8px] font-medium transition",
              tab === key
                ? "bg-white/[0.07] text-white"
                : "text-white/25 hover:text-white/55",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-5">
        {loading && (
          <p className="mb-4 text-[10px] text-white/20">
            Загрузка данных...
          </p>
        )}

        {tab === "toc" && (
          <>
            <section>
              <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/20">
                На этой странице
              </p>
              <div className="mt-3 space-y-2.5 border-l border-white/[0.06] pl-3">
                {toc.length ? (
                  toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className={[
                        "block text-[10px] leading-4 text-white/30 transition hover:text-violet-200",
                        item.level === 3 ? "pl-2" : "",
                      ].join(" ")}
                    >
                      {item.label}
                    </a>
                  ))
                ) : (
                  <p className="text-[10px] text-white/18">
                    В статье нет заголовков
                  </p>
                )}
              </div>
            </section>

            <section className="mt-8">
              <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/20">
                Информация
              </p>
              <dl className="mt-3 space-y-3 text-[10px]">
                <InfoRow label="Автор" value={article.author} />
                <InfoRow label="Раздел" value={article.category} />
                <InfoRow label="Обновлено" value={formatDate(article.updatedAt)} />
                <InfoRow label="Статус" value="Опубликовано" />
              </dl>
            </section>

            <section className="mt-8 rounded-xl border border-violet-400/12 bg-violet-400/[0.04] p-4">
              <div className="flex items-center gap-2 text-violet-200">
                <SparklesIcon className="size-4" />
                <p className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                  Legion AI
                </p>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-white/28">
                Следующим релизом подключим ответы строго по текущей статье.
              </p>
            </section>

            {related.length > 0 && (
              <section className="mt-8">
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/20">
                  Связанные статьи
                </p>
                <div className="mt-3 space-y-2">
                  {related.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelect(item)}
                      className="w-full rounded-lg border border-white/[0.05] bg-white/[0.02] p-3 text-left transition hover:bg-white/[0.045]"
                    >
                      <p className="line-clamp-2 text-[10px] leading-4 text-white/52">
                        {item.title}
                      </p>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {tab === "history" && (
          <section>
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/20">
              История версий
            </p>

            <div className="mt-4 space-y-3">
              {versions.length ? (
                versions.map((version) => (
                  <article
                    key={version.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-violet-400/[0.08] px-2 py-0.5 text-[9px] text-violet-200">
                        v{version.versionNumber}
                      </span>
                      <span className="text-[8px] text-white/18">
                        {formatDate(version.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 text-[10px] font-medium text-white/50">
                      {version.changeNote}
                    </p>
                    <p className="mt-1 text-[9px] text-white/22">
                      {version.author}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-[10px] text-white/20">
                  Предыдущих версий пока нет. Первая появится после сохранения изменений.
                </p>
              )}
            </div>
          </section>
        )}

        {tab === "comments" && (
          <section>
            <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-white/20">
              Обсуждение статьи
            </p>

            <div className="mt-4 space-y-3">
              {comments.length ? (
                comments.map((comment) => (
                  <article
                    key={comment.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[9px] font-semibold text-violet-200">
                        {comment.author}
                      </p>
                      <p className="text-[8px] text-white/18">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-white/42">
                      {comment.body}
                    </p>
                  </article>
                ))
              ) : (
                <p className="text-[10px] text-white/20">
                  Комментариев пока нет.
                </p>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                rows={3}
                placeholder="Добавить комментарий..."
                className="w-full resize-none bg-transparent p-2 text-[10px] leading-5 text-white outline-none placeholder:text-white/18"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void addComment()}
                  className="h-8 rounded-lg bg-white px-3 text-[9px] font-semibold text-black"
                >
                  Отправить
                </button>
              </div>
            </div>
          </section>
        )}

        {tab === "ai" && (
          <section className="flex min-h-[620px] flex-col">
            <div className="flex items-center gap-2 text-violet-200">
              <SparklesIcon className="size-4" />
              <p className="text-[9px] font-semibold uppercase tracking-[0.16em]">
                LEGION Intelligence
              </p>
            </div>

            <p className="mt-2 text-[10px] leading-5 text-white/27">
              Ответы формируются только по текущей статье. Если информации
              недостаточно, AI прямо об этом скажет.
            </p>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void runAi("summary")}
                disabled={aiLoading}
                className="min-h-10 rounded-lg border border-violet-400/15 bg-violet-400/[0.05] px-2 text-[8px] text-violet-200 disabled:opacity-40"
              >
                Краткое содержание
              </button>
              <button
                type="button"
                onClick={() => void runAi("quiz")}
                disabled={aiLoading}
                className="min-h-10 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 text-[8px] text-white/38 disabled:opacity-40"
              >
                Создать тест
              </button>
              <button
                type="button"
                onClick={() => void runAi("improve")}
                disabled={aiLoading}
                className="col-span-2 min-h-10 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 text-[8px] text-white/38 disabled:opacity-40"
              >
                Предложить улучшения статьи
              </button>
            </div>

            {aiError && (
              <div className="mt-3 rounded-lg border border-rose-400/15 bg-rose-400/[0.06] p-2.5 text-[9px] leading-4 text-rose-200">
                {aiError}
              </div>
            )}

            <div className="mt-4 flex-1 space-y-3">
              {aiMessages.length ? (
                aiMessages.map((message) => (
                  <article
                    key={message.id}
                    className={[
                      "rounded-lg border p-3",
                      message.role === "assistant"
                        ? "border-violet-400/12 bg-violet-400/[0.04]"
                        : "border-white/[0.06] bg-white/[0.025]",
                    ].join(" ")}
                  >
                    <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-white/22">
                      {message.role === "assistant"
                        ? "LEGION AI"
                        : "VSIPEK"}
                    </p>
                    <div className="mt-2 whitespace-pre-wrap text-[10px] leading-5 text-white/48">
                      {message.content}
                    </div>
                  </article>
                ))
              ) : (
                <p className="text-[10px] leading-5 text-white/20">
                  Задай вопрос или выбери быстрое AI-действие.
                </p>
              )}

              {aiLoading && (
                <div className="rounded-lg border border-violet-400/12 bg-violet-400/[0.04] p-3 text-[10px] text-violet-200/60">
                  LEGION AI анализирует статью...
                </div>
              )}
            </div>

            <div className="mt-4 rounded-lg border border-white/[0.07] bg-white/[0.025] p-2">
              <textarea
                value={aiQuestion}
                onChange={(event) => setAiQuestion(event.target.value)}
                rows={3}
                placeholder="Задать вопрос по статье..."
                className="w-full resize-none bg-transparent p-2 text-[10px] leading-5 text-white outline-none placeholder:text-white/18"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!aiQuestion.trim() || aiLoading}
                  onClick={() => void runAi("question")}
                  className="h-8 rounded-lg bg-white px-3 text-[9px] font-semibold text-black disabled:opacity-35"
                >
                  Спросить
                </button>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function Editor({
  draft,
  setDraft,
  categories,
}: {
  draft: Article
  setDraft: (article: Article) => void
  categories: string[]
}) {
  const [showPreview, setShowPreview] = useState(false)

  function insertBlock(block: string) {
    const separator = draft.content.trim() ? "\n\n" : ""
    setDraft({ ...draft, content: `${draft.content}${separator}${block}` })
  }

  const tools = [
    ["H1", "# Новый заголовок"],
    ["H2", "## Новый раздел"],
    ["H3", "### Подраздел"],
    ["Текст", "Новый текстовый блок."],
    ["Список", "- Первый пункт\n- Второй пункт\n- Третий пункт"],
    ["Чек-лист", "- [ ] Первый шаг\n- [ ] Второй шаг\n- [ ] Третий шаг"],
    ["Совет", "> [!TIP] Добавьте полезный совет."],
    ["Важно", "> [!IMPORTANT] Добавьте важное предупреждение."],
    ["Цитата", "> Добавьте цитату или заметку."],
    ["Таблица", "| Колонка 1 | Колонка 2 |\n| --- | --- |\n| Значение | Значение |"],
    ["Код", "```text\nВставьте код здесь\n```"],
    ["Изображение", "![Описание](https://example.com/image.jpg)"],
    ["Видео", "[[video:https://www.youtube.com/embed/VIDEO_ID]]"],
    ["Разделитель", "---"],
  ] as const

  return (
    <div className="space-y-4">
      <input
        value={draft.title}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
        className="h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-lg font-semibold text-white outline-none"
      />

      <div className="grid gap-3 sm:grid-cols-[220px_1fr]">
        <select
          value={draft.category}
          onChange={(event) => setDraft({ ...draft, category: event.target.value })}
          className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm text-white outline-none"
        >
          {Array.from(new Set([...categoryOrder, ...categories])).map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <input
          value={draft.excerpt}
          onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
          placeholder="Краткое описание"
          className="h-11 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white outline-none"
        />
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/28">Блоки</p>
            <p className="mt-1 text-[9px] text-white/18">Нажми на тип блока — он добавится в конец статьи.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowPreview((current) => !current)}
            className="h-8 rounded-lg border border-violet-400/15 bg-violet-400/[0.05] px-3 text-[9px] text-violet-200"
          >
            {showPreview ? "Редактор" : "Предпросмотр"}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {tools.map(([label, block]) => (
            <button
              key={label}
              type="button"
              onClick={() => insertBlock(block)}
              className="h-8 rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 text-[9px] text-white/38 transition hover:bg-white/[0.06] hover:text-white"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showPreview ? (
        <div className="min-h-[650px] rounded-2xl border border-white/[0.08] bg-black/20 p-7">
          <ArticleDocument article={draft} />
        </div>
      ) : (
        <textarea
          value={draft.content}
          onChange={(event) => setDraft({ ...draft, content: event.target.value })}
          rows={28}
          className="min-h-[650px] w-full resize-y rounded-2xl border border-white/[0.08] bg-black/20 p-5 font-mono text-sm leading-7 text-white/72 outline-none"
        />
      )}
    </div>
  )
}

function NavigationCard({
  label,
  article,
  onClick,
  alignRight = false,
}: {
  label: string
  article: Article | null
  onClick: () => void
  alignRight?: boolean
}) {
  return (
    <button
      type="button"
      disabled={!article}
      onClick={onClick}
      className={[
        "min-h-20 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:bg-white/[0.045] disabled:cursor-default disabled:opacity-20",
        alignRight ? "text-right" : "text-left",
      ].join(" ")}
    >
      <p className="text-[8px] uppercase tracking-[0.16em] text-white/20">
        {label}
      </p>
      <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-4 text-white/55">
        {article?.title ?? "Нет статьи"}
      </p>
    </button>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-white/20">{label}</dt>
      <dd className="max-w-[130px] text-right text-white/45">{value}</dd>
    </div>
  )
}

function buildToc(content: string): TocItem[] {
  return content
    .split("\n")
    .filter((line) => line.startsWith("## ") || line.startsWith("### "))
    .map((line) => {
      const level = line.startsWith("### ") ? 3 : 2
      const label = line.slice(level + 1)

      return {
        id: headingId(label),
        label,
        level,
      }
    })
}

function headingId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value))
  } catch {
    return value
  }
}

function CreateArticleModal({
  categories,
  onClose,
  onSubmit,
  onError,
}: {
  categories: string[]
  onClose: () => void
  onSubmit: (formData: FormData) => Promise<void>
  onError: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <form
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={async (event) => {
          event.preventDefault()
          setBusy(true)

          try {
            await onSubmit(new FormData(event.currentTarget))
          } catch (submitError) {
            onError(
              submitError instanceof Error
                ? submitError.message
                : "Ошибка создания статьи.",
            )
          } finally {
            setBusy(false)
          }
        }}
        className="w-full max-w-lg rounded-2xl border border-white/[0.1] bg-[#0d0f13] p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-white">Новая статья</p>
            <p className="mt-1 text-xs text-white/28">
              После создания откроется редактор.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/30">
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <input
            name="title"
            required
            placeholder="Название статьи"
            className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white outline-none"
          />
          <select
            name="category"
            className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 text-sm text-white"
          >
            {Array.from(new Set([...categoryOrder, ...categories])).map(
              (category) => (
                <option key={category}>{category}</option>
              ),
            )}
          </select>
          <textarea
            name="excerpt"
            rows={3}
            placeholder="Краткое описание"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] p-3 text-sm text-white outline-none"
          />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-xs text-white/35"
          >
            Отмена
          </button>
          <button
            disabled={busy}
            className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-black disabled:opacity-40"
          >
            {busy ? "Создаю..." : "Создать"}
          </button>
        </div>
      </form>
    </div>
  )
}

function ImportDocument({
  onClose,
  onDone,
}: {
  onClose: () => void
  onDone: () => Promise<void>
}) {
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("")

  async function upload() {
    if (!file || busy) return

    setBusy(true)
    setStatus("Gemini анализирует документ и создаёт статьи...")

    try {
      const data = new FormData()
      data.set("file", file)

      const response = await fetch("/api/wiki/import", {
        method: "POST",
        body: data,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || "Ошибка импорта.")
      }

      setStatus(`Готово. Создано статей: ${payload.imported}`)
      await onDone()
    } catch (uploadError) {
      setStatus(
        uploadError instanceof Error
          ? uploadError.message
          : "Ошибка импорта.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-xl rounded-2xl border border-white/[0.1] bg-[#0d0f13] p-6"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-lg font-semibold text-white">
              AI импорт документа
            </p>
            <p className="mt-1 text-xs leading-5 text-white/28">
              PDF, DOCX, TXT или Markdown до 12 МБ.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white/30">
            ✕
          </button>
        </div>

        <label className="mt-5 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-violet-400/25 bg-violet-400/[0.04] p-6 text-center">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,.markdown"
            className="hidden"
            onChange={(event) =>
              setFile(event.target.files?.[0] ?? null)
            }
          />
          <BookIcon className="size-7 text-violet-300" />
          <p className="mt-3 text-sm text-white/55">
            {file ? file.name : "Выбери документ"}
          </p>
        </label>

        {status && (
          <div className="mt-4 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-xs leading-5 text-white/40">
            {status}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 text-xs text-white/35"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!file || busy}
            onClick={() => void upload()}
            className="h-10 rounded-xl bg-white px-4 text-xs font-semibold text-black disabled:opacity-40"
          >
            {busy ? "Обрабатываю..." : "Создать статьи"}
          </button>
        </div>
      </div>
    </div>
  )
}
