const migrations = [
  {
    version: 1,
    name: "phase_2_local_data",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
          id TEXT PRIMARY KEY,
          headline TEXT NOT NULL,
          summary TEXT,
          domain TEXT,
          source TEXT,
          url TEXT UNIQUE,
          importance INTEGER,
          personalized_score REAL,
          published_at TEXT,
          processed_at TEXT,
          raw_payload TEXT
        );

        CREATE TABLE IF NOT EXISTS tags (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          category TEXT
        );

        CREATE TABLE IF NOT EXISTS article_tags (
          article_id TEXT NOT NULL,
          tag_id INTEGER NOT NULL,
          PRIMARY KEY (article_id, tag_id),
          FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS patterns (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          week TEXT NOT NULL,
          tag_id INTEGER NOT NULL,
          count INTEGER NOT NULL,
          delta REAL,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS briefs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          week TEXT UNIQUE NOT NULL,
          content_json TEXT NOT NULL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS insights (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          week TEXT NOT NULL,
          title TEXT NOT NULL,
          explanation TEXT NOT NULL,
          confidence TEXT,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS importance_feedback (
          article_id TEXT PRIMARY KEY,
          original_importance INTEGER NOT NULL,
          user_importance INTEGER NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS learning_profile (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS preferences (
          key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
        CREATE INDEX IF NOT EXISTS idx_articles_domain ON articles(domain);
        CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);
        CREATE INDEX IF NOT EXISTS idx_patterns_week ON patterns(week);
        CREATE INDEX IF NOT EXISTS idx_article_tags_tag_id ON article_tags(tag_id);
        CREATE INDEX IF NOT EXISTS idx_article_tags_article_id ON article_tags(article_id);
      `);
    },
  },
  {
    version: 2,
    name: "phase_3a_local_search",
    up(db) {
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS article_search USING fts5(
          article_id UNINDEXED,
          headline,
          summary,
          source,
          tags_text,
          tokenize = 'porter unicode61'
        );

        CREATE TABLE IF NOT EXISTS saved_searches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          query_text TEXT NOT NULL,
          filters_json TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS recent_searches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          query_text TEXT NOT NULL,
          filters_json TEXT,
          searched_at TEXT NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_saved_searches_updated_at
          ON saved_searches(updated_at);
        CREATE INDEX IF NOT EXISTS idx_recent_searches_searched_at
          ON recent_searches(searched_at);
      `);

      db.prepare("DELETE FROM article_search").run();
      db.prepare(`
        INSERT INTO article_search (article_id, headline, summary, source, tags_text)
        SELECT
          a.id,
          a.headline,
          COALESCE(a.summary, ''),
          COALESCE(a.source, ''),
          COALESCE(group_concat(t.name, ' '), '')
        FROM articles a
        LEFT JOIN article_tags at ON at.article_id = a.id
        LEFT JOIN tags t ON t.id = at.tag_id
        GROUP BY a.id
      `).run();
    },
  },
  {
    version: 3,
    name: "phase_3_personal_intelligence",
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS user_feedback (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cluster_id TEXT NOT NULL,
          action TEXT NOT NULL,
          value REAL,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_affinity (
          key TEXT PRIMARY KEY,
          type TEXT NOT NULL,
          score REAL NOT NULL,
          updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT NOT NULL,
          field TEXT NOT NULL,
          value TEXT NOT NULL,
          weight REAL NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_user_feedback_cluster_id
          ON user_feedback(cluster_id);
        CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at
          ON user_feedback(created_at);
        CREATE INDEX IF NOT EXISTS idx_user_affinity_type_score
          ON user_affinity(type, score);
      `);
    },
  },
];

function ensureSchemaVersionTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);
}

function appliedVersions(db) {
  return new Set(
    db.prepare("SELECT version FROM schema_version").all().map((row) => row.version),
  );
}

function runMigrations(db) {
  ensureSchemaVersionTable(db);
  const applied = appliedVersions(db);

  for (const migration of migrations) {
    if (applied.has(migration.version)) {
      continue;
    }

    const apply = db.transaction(() => {
      migration.up(db);
      db.prepare(
        "INSERT OR IGNORE INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)",
      ).run(migration.version, migration.name, new Date().toISOString());
    });

    apply();
  }
}

module.exports = {
  migrations,
  runMigrations,
};
