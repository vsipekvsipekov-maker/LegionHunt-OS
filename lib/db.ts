import { Pool } from "pg"

declare global {
  // eslint-disable-next-line no-var
  var legionHuntPool: Pool | undefined
  // eslint-disable-next-line no-var
  var legionHuntSchemaInitPromise: Promise<void> | undefined
  // eslint-disable-next-line no-var
  var legionHuntSchemaInitialized: boolean | undefined
}

function createPool() {
  const connectionString = process.env.DATABASE_URL?.trim()

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not configured. Add it to .env.local.",
    )
  }

  return new Pool({
    connectionString,
    ssl:
      connectionString.includes("localhost") ||
      connectionString.includes("127.0.0.1")
        ? false
        : { rejectUnauthorized: false },
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  })
}

export const db = global.legionHuntPool ?? createPool()

if (process.env.NODE_ENV !== "production") {
  global.legionHuntPool = db
}

async function initializeCrmSchema() {
  const client = await db.connect()
  const lockName = "legionhunt_schema_v7_4_0"

  try {
    // Protect schema initialization across concurrent API requests,
    // Next.js workers and separate Node.js processes.
    await client.query(
      "SELECT pg_advisory_lock(hashtext($1)::bigint)",
      [lockName],
    )

    await client.query(`
    CREATE TABLE IF NOT EXISTS legionhunt_candidates (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(160) NOT NULL,
      username VARCHAR(160) NOT NULL DEFAULT '',
      country VARCHAR(100) NOT NULL DEFAULT '',
      source VARCHAR(100) NOT NULL DEFAULT '',
      mentor VARCHAR(160) NOT NULL DEFAULT '',
      status VARCHAR(30) NOT NULL DEFAULT 'new',
      priority VARCHAR(20) NOT NULL DEFAULT 'medium',
      score INTEGER NOT NULL DEFAULT 50,
      last_activity VARCHAR(120) NOT NULL DEFAULT 'Только что',
      next_action TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      next_contact_at TIMESTAMPTZ NULL,
      archived_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT legionhunt_candidates_status_check
        CHECK (status IN ('new', 'contact', 'call', 'training', 'active')),
      CONSTRAINT legionhunt_candidates_priority_check
        CHECK (priority IN ('high', 'medium', 'low')),
      CONSTRAINT legionhunt_candidates_score_check
        CHECK (score >= 0 AND score <= 100)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_candidates_status_idx
      ON legionhunt_candidates(status);

    CREATE INDEX IF NOT EXISTS legionhunt_candidates_priority_idx
      ON legionhunt_candidates(priority);

    ALTER TABLE legionhunt_candidates
      ADD COLUMN IF NOT EXISTS next_contact_at TIMESTAMPTZ NULL;

    ALTER TABLE legionhunt_candidates
      ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

    CREATE INDEX IF NOT EXISTS legionhunt_candidates_updated_idx
      ON legionhunt_candidates(updated_at DESC);

    CREATE INDEX IF NOT EXISTS legionhunt_candidates_next_contact_idx
      ON legionhunt_candidates(next_contact_at);

    CREATE INDEX IF NOT EXISTS legionhunt_candidates_archived_idx
      ON legionhunt_candidates(archived_at, updated_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_candidate_activity (
      id BIGSERIAL PRIMARY KEY,
      candidate_id BIGINT NOT NULL REFERENCES legionhunt_candidates(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL,
      title VARCHAR(220) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      created_by VARCHAR(160) NOT NULL DEFAULT 'System',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_candidate_activity_candidate_idx
      ON legionhunt_candidate_activity(candidate_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_candidate_comments (
      id BIGSERIAL PRIMARY KEY,
      candidate_id BIGINT NOT NULL REFERENCES legionhunt_candidates(id) ON DELETE CASCADE,
      author VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_candidate_comments_candidate_idx
      ON legionhunt_candidate_comments(candidate_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_candidate_tasks (
      id BIGSERIAL PRIMARY KEY,
      candidate_id BIGINT NOT NULL REFERENCES legionhunt_candidates(id) ON DELETE CASCADE,
      title VARCHAR(240) NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      due_at TIMESTAMPTZ NULL,
      created_by VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_candidate_tasks_candidate_idx
      ON legionhunt_candidate_tasks(candidate_id, completed, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_articles (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(220) NOT NULL,
      slug VARCHAR(240) NOT NULL UNIQUE,
      category VARCHAR(120) NOT NULL DEFAULT 'Общее',
      content TEXT NOT NULL DEFAULT '',
      excerpt TEXT NOT NULL DEFAULT '',
      is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
      author VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_articles_category_idx
      ON legionhunt_wiki_articles(category);

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_articles_updated_idx
      ON legionhunt_wiki_articles(updated_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_versions (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL REFERENCES legionhunt_wiki_articles(id) ON DELETE CASCADE,
      version_number INTEGER NOT NULL,
      title VARCHAR(220) NOT NULL,
      category VARCHAR(120) NOT NULL,
      excerpt TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      author VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      change_note TEXT NOT NULL DEFAULT 'Изменение статьи',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(article_id, version_number)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_versions_article_idx
      ON legionhunt_wiki_versions(article_id, version_number DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_comments (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL REFERENCES legionhunt_wiki_articles(id) ON DELETE CASCADE,
      author VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_comments_article_idx
      ON legionhunt_wiki_comments(article_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_views (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL REFERENCES legionhunt_wiki_articles(id) ON DELETE CASCADE,
      viewer VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_views_article_idx
      ON legionhunt_wiki_views(article_id, viewed_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_ai_messages (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL REFERENCES legionhunt_wiki_articles(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_by VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_ai_messages_article_idx
      ON legionhunt_wiki_ai_messages(article_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_favorites (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL REFERENCES legionhunt_wiki_articles(id) ON DELETE CASCADE,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(article_id, user_name)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_favorites_user_idx
      ON legionhunt_wiki_favorites(user_name, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_recent (
      id BIGSERIAL PRIMARY KEY,
      article_id BIGINT NOT NULL REFERENCES legionhunt_wiki_articles(id) ON DELETE CASCADE,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(article_id, user_name)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_recent_user_idx
      ON legionhunt_wiki_recent(user_name, opened_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_cases (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(220) NOT NULL,
      category VARCHAR(120) NOT NULL DEFAULT 'Продажи',
      status VARCHAR(30) NOT NULL DEFAULT 'success'
        CHECK (status IN ('success', 'in_progress', 'failed', 'archived')),
      situation TEXT NOT NULL DEFAULT '',
      problem TEXT NOT NULL DEFAULT '',
      solution TEXT NOT NULL DEFAULT '',
      result TEXT NOT NULL DEFAULT '',
      lessons TEXT NOT NULL DEFAULT '',
      owner VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      tags TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_cases_status_idx
      ON legionhunt_wiki_cases(status, updated_at DESC);

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_cases_category_idx
      ON legionhunt_wiki_cases(category);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_regulations (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(220) NOT NULL,
      category VARCHAR(120) NOT NULL DEFAULT 'Общее',
      status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('draft', 'active', 'archived')),
      owner VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      version_number INTEGER NOT NULL DEFAULT 1,
      tags TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_regulations_status_idx
      ON legionhunt_wiki_regulations(status, updated_at DESC);

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_regulations_category_idx
      ON legionhunt_wiki_regulations(category);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_tools (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(180) NOT NULL,
      slug VARCHAR(200) NOT NULL UNIQUE,
      icon VARCHAR(20) NOT NULL DEFAULT '🛠️',
      category VARCHAR(120) NOT NULL DEFAULT 'Utilities',
      status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'beta', 'archived')),
      description TEXT NOT NULL DEFAULT '',
      instructions TEXT NOT NULL DEFAULT '',
      launch_url TEXT NOT NULL DEFAULT '',
      owner VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      version VARCHAR(40) NOT NULL DEFAULT '1.0',
      tags TEXT[] NOT NULL DEFAULT '{}',
      requirements TEXT[] NOT NULL DEFAULT '{}',
      related_article_ids BIGINT[] NOT NULL DEFAULT '{}',
      related_case_ids BIGINT[] NOT NULL DEFAULT '{}',
      related_regulation_ids BIGINT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_tools_category_idx
      ON legionhunt_wiki_tools(category, updated_at DESC);

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_tools_status_idx
      ON legionhunt_wiki_tools(status, updated_at DESC);


    -- Full-text indexes for Wiki search and AI Knowledge retrieval.
    -- The built-in 'simple' configuration works consistently with mixed RU/EN content.
    CREATE INDEX IF NOT EXISTS legionhunt_wiki_articles_fts_idx
      ON legionhunt_wiki_articles USING GIN (
        to_tsvector('simple',
          COALESCE(title, '') || ' ' || COALESCE(category, '') || ' ' ||
          COALESCE(excerpt, '') || ' ' || COALESCE(content, '')
        )
      );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_cases_fts_idx
      ON legionhunt_wiki_cases USING GIN (
        to_tsvector('simple',
          COALESCE(title, '') || ' ' || COALESCE(category, '') || ' ' ||
          COALESCE(situation, '') || ' ' || COALESCE(problem, '') || ' ' ||
          COALESCE(solution, '') || ' ' || COALESCE(result, '') || ' ' ||
          COALESCE(lessons, '')
        )
      );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_regulations_fts_idx
      ON legionhunt_wiki_regulations USING GIN (
        to_tsvector('simple',
          COALESCE(title, '') || ' ' || COALESCE(category, '') || ' ' ||
          COALESCE(summary, '') || ' ' || COALESCE(content, '')
        )
      );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_tools_fts_idx
      ON legionhunt_wiki_tools USING GIN (
        to_tsvector('simple',
          COALESCE(name, '') || ' ' || COALESCE(category, '') || ' ' ||
          COALESCE(description, '') || ' ' || COALESCE(instructions, '')
        )
      )
      WHERE status <> 'archived';

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_tool_favorites (
      id BIGSERIAL PRIMARY KEY,
      tool_id BIGINT NOT NULL REFERENCES legionhunt_wiki_tools(id) ON DELETE CASCADE,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(tool_id, user_name)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_tool_favorites_user_idx
      ON legionhunt_wiki_tool_favorites(user_name, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_tool_views (
      id BIGSERIAL PRIMARY KEY,
      tool_id BIGINT NOT NULL REFERENCES legionhunt_wiki_tools(id) ON DELETE CASCADE,
      viewer VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_tool_views_tool_idx
      ON legionhunt_wiki_tool_views(tool_id, viewed_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_wiki_tool_versions (
      id BIGSERIAL PRIMARY KEY,
      tool_id BIGINT NOT NULL REFERENCES legionhunt_wiki_tools(id) ON DELETE CASCADE,
      version VARCHAR(40) NOT NULL,
      change_note TEXT NOT NULL DEFAULT 'Обновление инструмента',
      snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
      author VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_wiki_tool_versions_tool_idx
      ON legionhunt_wiki_tool_versions(tool_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_notification_reads (
      id BIGSERIAL PRIMARY KEY,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      notification_key VARCHAR(180) NOT NULL,
      read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_name, notification_key)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_notification_reads_user_idx
      ON legionhunt_notification_reads(user_name, read_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_activity (
      id BIGSERIAL PRIMARY KEY,
      actor VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      action VARCHAR(120) NOT NULL,
      entity_type VARCHAR(60) NOT NULL,
      entity_id BIGINT,
      entity_title VARCHAR(240) NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_activity_created_idx
      ON legionhunt_activity(created_at DESC);

    CREATE INDEX IF NOT EXISTS legionhunt_activity_entity_idx
      ON legionhunt_activity(entity_type, entity_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_ai_sessions (
      id BIGSERIAL PRIMARY KEY,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      title VARCHAR(240) NOT NULL DEFAULT 'Новый диалог',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_ai_sessions_user_idx
      ON legionhunt_ai_sessions(user_name, updated_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_ai_messages (
      id BIGSERIAL PRIMARY KEY,
      session_id BIGINT NOT NULL REFERENCES legionhunt_ai_sessions(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      sources JSONB NOT NULL DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_ai_messages_session_idx
      ON legionhunt_ai_messages(session_id, created_at ASC);

    CREATE INDEX IF NOT EXISTS legionhunt_ai_messages_recent_idx
      ON legionhunt_ai_messages(session_id, created_at DESC, id DESC);

    ALTER TABLE legionhunt_ai_sessions
      ADD COLUMN IF NOT EXISTS memory_enabled BOOLEAN NOT NULL DEFAULT TRUE;

    CREATE TABLE IF NOT EXISTS legionhunt_ai_learning_queue (
      id BIGSERIAL PRIMARY KEY,
      normalized_question VARCHAR(500) NOT NULL UNIQUE,
      question TEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'learned', 'ignored')),
      occurrences INTEGER NOT NULL DEFAULT 1,
      first_user VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      last_user VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      answer TEXT NOT NULL DEFAULT '',
      article_id BIGINT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS legionhunt_ai_learning_queue_status_idx
      ON legionhunt_ai_learning_queue(status, occurrences DESC, updated_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_ai_agent_runs (
      id BIGSERIAL PRIMARY KEY,
      agent_name VARCHAR(60) NOT NULL,
      session_id BIGINT REFERENCES legionhunt_ai_sessions(id) ON DELETE SET NULL,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'skipped', 'failed')),
      duration_ms INTEGER NOT NULL DEFAULT 0,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_ai_agent_runs_recent_idx
      ON legionhunt_ai_agent_runs(agent_name, created_at DESC);


    CREATE TABLE IF NOT EXISTS legionhunt_academy_courses (
      id BIGSERIAL PRIMARY KEY,
      title VARCHAR(220) NOT NULL,
      slug VARCHAR(220) NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      category VARCHAR(120) NOT NULL DEFAULT 'Основы',
      level VARCHAR(30) NOT NULL DEFAULT 'beginner'
        CHECK (level IN ('beginner', 'intermediate', 'advanced')),
      status VARCHAR(24) NOT NULL DEFAULT 'published'
        CHECK (status IN ('draft', 'published', 'archived')),
      cover_emoji VARCHAR(16) NOT NULL DEFAULT '🎓',
      estimated_minutes INTEGER NOT NULL DEFAULT 60,
      author VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_courses_status_idx
      ON legionhunt_academy_courses(status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_academy_modules (
      id BIGSERIAL PRIMARY KEY,
      course_id BIGINT NOT NULL REFERENCES legionhunt_academy_courses(id) ON DELETE CASCADE,
      title VARCHAR(220) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      position INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_modules_course_idx
      ON legionhunt_academy_modules(course_id, position ASC);

    CREATE TABLE IF NOT EXISTS legionhunt_academy_lessons (
      id BIGSERIAL PRIMARY KEY,
      module_id BIGINT NOT NULL REFERENCES legionhunt_academy_modules(id) ON DELETE CASCADE,
      title VARCHAR(240) NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL DEFAULT '',
      lesson_type VARCHAR(24) NOT NULL DEFAULT 'text'
        CHECK (lesson_type IN ('text', 'video', 'quiz', 'task')),
      duration_minutes INTEGER NOT NULL DEFAULT 10,
      position INTEGER NOT NULL DEFAULT 0,
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      wiki_article_id BIGINT REFERENCES legionhunt_wiki_articles(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_lessons_module_idx
      ON legionhunt_academy_lessons(module_id, position ASC);

    CREATE TABLE IF NOT EXISTS legionhunt_academy_progress (
      id BIGSERIAL PRIMARY KEY,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      course_id BIGINT NOT NULL REFERENCES legionhunt_academy_courses(id) ON DELETE CASCADE,
      lesson_id BIGINT REFERENCES legionhunt_academy_lessons(id) ON DELETE SET NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      progress_percent INTEGER NOT NULL DEFAULT 0
        CHECK (progress_percent >= 0 AND progress_percent <= 100),
      score INTEGER,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_name, course_id, lesson_id)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_progress_user_idx
      ON legionhunt_academy_progress(user_name, updated_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_academy_notes (
      id BIGSERIAL PRIMARY KEY,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      lesson_id BIGINT NOT NULL REFERENCES legionhunt_academy_lessons(id) ON DELETE CASCADE,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_name, lesson_id)
    );

    CREATE TABLE IF NOT EXISTS legionhunt_academy_certificates (
      id BIGSERIAL PRIMARY KEY,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      course_id BIGINT NOT NULL REFERENCES legionhunt_academy_courses(id) ON DELETE CASCADE,
      certificate_code VARCHAR(80) NOT NULL UNIQUE,
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_name, course_id)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_certificates_user_idx
      ON legionhunt_academy_certificates(user_name, issued_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_academy_tests (
      id BIGSERIAL PRIMARY KEY,
      course_id BIGINT NOT NULL REFERENCES legionhunt_academy_courses(id) ON DELETE CASCADE,
      module_id BIGINT REFERENCES legionhunt_academy_modules(id) ON DELETE CASCADE,
      title VARCHAR(240) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      passing_score INTEGER NOT NULL DEFAULT 70 CHECK (passing_score BETWEEN 0 AND 100),
      max_attempts INTEGER NOT NULL DEFAULT 3 CHECK (max_attempts > 0),
      questions JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_tests_course_idx
      ON legionhunt_academy_tests(course_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS legionhunt_academy_test_attempts (
      id BIGSERIAL PRIMARY KEY,
      test_id BIGINT NOT NULL REFERENCES legionhunt_academy_tests(id) ON DELETE CASCADE,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      answers JSONB NOT NULL DEFAULT '[]'::jsonb,
      score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
      passed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_test_attempts_user_idx
      ON legionhunt_academy_test_attempts(user_name, test_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_academy_assignments (
      id BIGSERIAL PRIMARY KEY,
      course_id BIGINT NOT NULL REFERENCES legionhunt_academy_courses(id) ON DELETE CASCADE,
      lesson_id BIGINT REFERENCES legionhunt_academy_lessons(id) ON DELETE SET NULL,
      title VARCHAR(240) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      instructions TEXT NOT NULL DEFAULT '',
      due_days INTEGER NOT NULL DEFAULT 7,
      is_required BOOLEAN NOT NULL DEFAULT TRUE,
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_assignments_course_idx
      ON legionhunt_academy_assignments(course_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS legionhunt_academy_assignment_submissions (
      id BIGSERIAL PRIMARY KEY,
      assignment_id BIGINT NOT NULL REFERENCES legionhunt_academy_assignments(id) ON DELETE CASCADE,
      user_name VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      answer TEXT NOT NULL DEFAULT '',
      attachment_url TEXT NOT NULL DEFAULT '',
      status VARCHAR(24) NOT NULL DEFAULT 'submitted'
        CHECK (status IN ('draft','submitted','accepted','revision')),
      mentor_comment TEXT NOT NULL DEFAULT '',
      submitted_at TIMESTAMPTZ,
      reviewed_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(assignment_id, user_name)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_academy_assignment_submissions_status_idx
      ON legionhunt_academy_assignment_submissions(status, updated_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_team_departments (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(140) NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      color VARCHAR(32) NOT NULL DEFAULT 'violet',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS legionhunt_team_roles (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      level INTEGER NOT NULL DEFAULT 10,
      description TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS legionhunt_team_members (
      id BIGSERIAL PRIMARY KEY,
      display_name VARCHAR(180) NOT NULL,
      username VARCHAR(160) NOT NULL DEFAULT '',
      email VARCHAR(220) NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      role_id BIGINT REFERENCES legionhunt_team_roles(id) ON DELETE SET NULL,
      department_id BIGINT REFERENCES legionhunt_team_departments(id) ON DELETE SET NULL,
      mentor_id BIGINT REFERENCES legionhunt_team_members(id) ON DELETE SET NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'online'
        CHECK (status IN ('online','offline','vacation','inactive')),
      kpi INTEGER NOT NULL DEFAULT 70 CHECK (kpi BETWEEN 0 AND 100),
      position_title VARCHAR(160) NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_team_members_status_idx
      ON legionhunt_team_members(status, updated_at DESC);
    CREATE INDEX IF NOT EXISTS legionhunt_team_members_department_idx
      ON legionhunt_team_members(department_id);
    CREATE INDEX IF NOT EXISTS legionhunt_team_members_mentor_idx
      ON legionhunt_team_members(mentor_id);

    CREATE TABLE IF NOT EXISTS legionhunt_team_activity (
      id BIGSERIAL PRIMARY KEY,
      member_id BIGINT NOT NULL REFERENCES legionhunt_team_members(id) ON DELETE CASCADE,
      event_type VARCHAR(50) NOT NULL DEFAULT 'system',
      title VARCHAR(220) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_team_activity_member_idx
      ON legionhunt_team_activity(member_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_team_notes (
      id BIGSERIAL PRIMARY KEY,
      member_id BIGINT NOT NULL REFERENCES legionhunt_team_members(id) ON DELETE CASCADE,
      author VARCHAR(160) NOT NULL DEFAULT 'VSIPEK',
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_team_notes_member_idx
      ON legionhunt_team_notes(member_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_team_kpi_history (
      id BIGSERIAL PRIMARY KEY,
      member_id BIGINT NOT NULL REFERENCES legionhunt_team_members(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK (value BETWEEN 0 AND 100),
      source VARCHAR(80) NOT NULL DEFAULT 'manual',
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_team_kpi_history_member_idx
      ON legionhunt_team_kpi_history(member_id, recorded_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_team_achievements (
      id BIGSERIAL PRIMARY KEY,
      member_id BIGINT NOT NULL REFERENCES legionhunt_team_members(id) ON DELETE CASCADE,
      achievement_key VARCHAR(100) NOT NULL,
      title VARCHAR(180) NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      icon VARCHAR(20) NOT NULL DEFAULT '🏆',
      awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(member_id, achievement_key)
    );

    CREATE INDEX IF NOT EXISTS legionhunt_team_achievements_member_idx
      ON legionhunt_team_achievements(member_id, awarded_at DESC);


    INSERT INTO legionhunt_team_kpi_history (member_id, value, source)
    SELECT tm.id, tm.kpi, 'initial'
    FROM legionhunt_team_members tm
    WHERE NOT EXISTS (SELECT 1 FROM legionhunt_team_kpi_history h WHERE h.member_id=tm.id);

    INSERT INTO legionhunt_team_achievements (member_id, achievement_key, title, description, icon)
    SELECT tm.id, 'academy-starter', 'Старт в Academy', 'Участник начал обучение в LegionHunt Academy', '🎓'
    FROM legionhunt_team_members tm
    WHERE EXISTS (
      SELECT 1 FROM legionhunt_academy_progress p
      WHERE lower(p.user_name)=lower(tm.display_name) OR lower(p.user_name)=lower(replace(tm.username,'@',''))
    )
    ON CONFLICT (member_id, achievement_key) DO NOTHING;

    INSERT INTO legionhunt_team_achievements (member_id, achievement_key, title, description, icon)
    SELECT tm.id, 'kpi-90', 'Высокий KPI', 'KPI участника достиг уровня 90% или выше', '⚡'
    FROM legionhunt_team_members tm WHERE tm.kpi >= 90
    ON CONFLICT (member_id, achievement_key) DO NOTHING;

    CREATE TABLE IF NOT EXISTS legionhunt_workflow_runs (
      id BIGSERIAL PRIMARY KEY,
      workflow_key VARCHAR(100) NOT NULL,
      entity_type VARCHAR(60) NOT NULL,
      entity_id BIGINT,
      status VARCHAR(24) NOT NULL DEFAULT 'running'
        CHECK (status IN ('running','completed','partial','failed','skipped')),
      summary TEXT NOT NULL DEFAULT '',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS legionhunt_workflow_runs_created_idx
      ON legionhunt_workflow_runs(started_at DESC);

    CREATE TABLE IF NOT EXISTS legionhunt_workflow_steps (
      id BIGSERIAL PRIMARY KEY,
      run_id BIGINT NOT NULL REFERENCES legionhunt_workflow_runs(id) ON DELETE CASCADE,
      step_key VARCHAR(100) NOT NULL,
      title VARCHAR(220) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','completed','failed','skipped')),
      detail TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS legionhunt_workflow_steps_run_idx
      ON legionhunt_workflow_steps(run_id, id ASC);

    INSERT INTO legionhunt_team_departments (name, description, color)
    VALUES
      ('Management', 'Руководство и стратегия', 'violet'),
      ('Recruiting', 'Поиск и сопровождение кандидатов', 'blue'),
      ('Mentoring', 'Обучение и поддержка участников', 'emerald'),
      ('Operations', 'Операционные процессы команды', 'amber')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO legionhunt_team_roles (name, level, description)
    VALUES
      ('Administrator', 100, 'Полный доступ к системе'),
      ('Leader', 80, 'Управление отделом и показателями'),
      ('Mentor', 60, 'Сопровождение и проверка учеников'),
      ('Member', 30, 'Участник команды'),
      ('Student', 10, 'Новый участник на обучении')
    ON CONFLICT (name) DO NOTHING;

    INSERT INTO legionhunt_team_members
      (display_name, username, email, role_id, department_id, status, kpi, position_title, bio, joined_at)
    SELECT seed.display_name, seed.username, seed.email, r.id, d.id, seed.status, seed.kpi,
           seed.position_title, seed.bio, NOW() - seed.joined_days * INTERVAL '1 day'
    FROM (VALUES
      ('Sergey Aleksandrovich', '@vsipek', 'admin@legionhunt.local', 'Administrator', 'Management', 'online', 0, 'Founder', 'Управление LegionHunt OS и развитие команды.', 240)
    ) AS seed(display_name, username, email, role_name, department_name, status, kpi, position_title, bio, joined_days)
    JOIN legionhunt_team_roles r ON r.name = seed.role_name
    JOIN legionhunt_team_departments d ON d.name = seed.department_name
    WHERE NOT EXISTS (
      SELECT 1 FROM legionhunt_team_members tm WHERE tm.username = seed.username
    );


    INSERT INTO legionhunt_team_activity (member_id, event_type, title, description)
    SELECT m.id, seed.event_type, seed.title, seed.description
    FROM legionhunt_team_members m
    CROSS JOIN LATERAL (VALUES
      ('academy', 'Прогресс Academy обновлён', 'Участник продолжил обучение в Academy.'),
      ('system', 'Профиль синхронизирован', 'Данные участника доступны в Team Center.')
    ) AS seed(event_type, title, description)
    WHERE NOT EXISTS (SELECT 1 FROM legionhunt_team_activity a WHERE a.member_id = m.id);

    INSERT INTO legionhunt_academy_courses
      (title, slug, description, category, level, cover_emoji, estimated_minutes)
    VALUES
      ('Основы LegionHunt', 'legionhunt-basics', 'Первый курс для знакомства с платформой, командой и основными процессами.', 'Старт', 'beginner', '🚀', 70),
      ('Работа с CRM', 'crm-foundation', 'Карточки кандидатов, статусы, задачи, заметки и правильная фиксация действий.', 'CRM', 'beginner', '👥', 95),
      ('AI Center и Wiki', 'ai-wiki', 'Как искать знания, задавать вопросы AI и обучать систему новым ответам.', 'AI', 'intermediate', '🧠', 80),
      ('Наставничество', 'mentoring', 'Пошаговая система сопровождения новичков и контроля прогресса.', 'Team', 'advanced', '🏆', 120)
    ON CONFLICT (slug) DO NOTHING;

    INSERT INTO legionhunt_academy_modules (course_id, title, description, position)
    SELECT c.id, seed.title, seed.description, seed.position
    FROM legionhunt_academy_courses c
    CROSS JOIN LATERAL (VALUES
      ('Знакомство', 'Как устроена платформа и где искать нужные инструменты.', 1),
      ('Практика', 'Закрепление навыков на реальных сценариях.', 2)
    ) AS seed(title, description, position)
    WHERE NOT EXISTS (SELECT 1 FROM legionhunt_academy_modules m WHERE m.course_id = c.id);

    INSERT INTO legionhunt_academy_lessons
      (module_id, title, summary, content, lesson_type, duration_minutes, position)
    SELECT m.id, seed.title, seed.summary, seed.content, seed.lesson_type, seed.duration, seed.position
    FROM legionhunt_academy_modules m
    CROSS JOIN LATERAL (VALUES
      ('Введение', 'Короткое знакомство с темой модуля.', '# Введение\n\nИзучи основные понятия и отметь урок завершённым.', 'text', 8, 1),
      ('Практический сценарий', 'Применение материала на примере.', '# Практика\n\nВыполни шаги из урока и проверь результат.', 'task', 15, 2)
    ) AS seed(title, summary, content, lesson_type, duration, position)
    WHERE NOT EXISTS (SELECT 1 FROM legionhunt_academy_lessons l WHERE l.module_id = m.id);


    INSERT INTO legionhunt_academy_tests
      (course_id, module_id, title, description, passing_score, max_attempts, questions)
    SELECT c.id, m.id, 'Итоговый тест: ' || c.title,
      'Проверь понимание ключевых принципов курса.', 70, 3,
      jsonb_build_array(
        jsonb_build_object('question','Какой первый шаг при работе с материалом курса?','options',jsonb_build_array('Пропустить теорию','Изучить инструкцию и цель','Сразу закрыть урок','Удалить заметки'),'correctIndex',1,'explanation','Сначала нужно понять цель и изучить инструкцию.'),
        jsonb_build_object('question','Где сохраняется прогресс обучения?','options',jsonb_build_array('Только в браузере','В профиле Academy','В случайном файле','Нигде'),'correctIndex',1,'explanation','Прогресс хранится в профиле Academy.'),
        jsonb_build_object('question','Что делать при непонятном материале?','options',jsonb_build_array('Игнорировать','Спросить AI Mentor или наставника','Удалить курс','Отметить всё выполненным'),'correctIndex',1,'explanation','AI Mentor и наставник помогают разобрать сложный материал.')
      )
    FROM legionhunt_academy_courses c
    JOIN LATERAL (
      SELECT id FROM legionhunt_academy_modules WHERE course_id=c.id ORDER BY position LIMIT 1
    ) m ON TRUE
    WHERE NOT EXISTS (SELECT 1 FROM legionhunt_academy_tests t WHERE t.course_id=c.id);

    INSERT INTO legionhunt_academy_assignments
      (course_id, lesson_id, title, description, instructions, due_days, is_required)
    SELECT c.id, l.id, 'Практическое задание: ' || c.title,
      'Примени знания курса в рабочем сценарии.',
      'Опиши ситуацию, свои действия, полученный результат и вывод. Ответ должен содержать не менее 100 символов.',
      7, TRUE
    FROM legionhunt_academy_courses c
    JOIN LATERAL (
      SELECT l.id FROM legionhunt_academy_lessons l
      JOIN legionhunt_academy_modules m ON m.id=l.module_id
      WHERE m.course_id=c.id ORDER BY m.position DESC,l.position DESC LIMIT 1
    ) l ON TRUE
    WHERE NOT EXISTS (SELECT 1 FROM legionhunt_academy_assignments a WHERE a.course_id=c.id);
  `)

    // Release cleanup: remove only records created by the bundled demo seeds.
    // Real users and records with other identifiers are never touched.
    await client.query(`
      DELETE FROM legionhunt_candidates
      WHERE username IN ('@alex_orlov','@maria_k','@denis_lt','@irina_sm','@max_belov','@kristina_n','@roman_l');

      DELETE FROM legionhunt_team_members
      WHERE username IN ('@alexmentor','@mariahunt','@nikitahunt');
    `)
  } finally {
    await client
      .query(
        "SELECT pg_advisory_unlock(hashtext($1)::bigint)",
        [lockName],
      )
      .catch((unlockError) => {
        console.error("Schema advisory unlock error:", unlockError)
      })

    client.release()
  }
}

export async function ensureCrmSchema() {
  if (global.legionHuntSchemaInitialized) return

  if (!global.legionHuntSchemaInitPromise) {
    global.legionHuntSchemaInitPromise = initializeCrmSchema()
      .then(() => {
        global.legionHuntSchemaInitialized = true
      })
      .catch((error) => {
        // A transient failure may be retried by the next request.
        global.legionHuntSchemaInitPromise = undefined
        throw error
      })
  }

  await global.legionHuntSchemaInitPromise
}
