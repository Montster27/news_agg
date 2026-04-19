const fs = require("node:fs/promises");
const {
  getArticleTagRows,
  getArticles,
  getRawArticleRows,
  getTagRows,
  upsertArticles,
} = require("../repositories/articlesRepo");
const {
  getBriefRows,
  getInsightRows,
  getPatternRows,
} = require("../repositories/patternsRepo");
const {
  getFeedbackRows,
  getLearningRows,
  getPreferenceRows,
} = require("../repositories/preferencesRepo");

function createSnapshot(db) {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "tech-command-center",
    data: {
      articles: getArticles(db, { limit: 1000 }),
      articleRows: getRawArticleRows(db),
      tags: getTagRows(db),
      article_tags: getArticleTagRows(db),
      patterns: getPatternRows(db),
      briefs: getBriefRows(db),
      insights: getInsightRows(db),
      feedback: getFeedbackRows(db),
      learning_profile: getLearningRows(db),
      preferences: getPreferenceRows(db),
    },
  };
}

async function exportSnapshot(db, filePath) {
  const snapshot = createSnapshot(db);
  await fs.writeFile(filePath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return { success: true, path: filePath, count: snapshot.data.articles.length };
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateSnapshotShape(snapshot) {
  if (!isObject(snapshot)) {
    return "Import file must contain a JSON object.";
  }

  const data = isObject(snapshot.data) ? snapshot.data : snapshot;
  const articles = data.articles;

  if (articles !== undefined && !Array.isArray(articles)) {
    return "articles must be an array.";
  }

  if (!articles && !Array.isArray(data.articleRows)) {
    return "Import file must contain articles or articleRows.";
  }

  return null;
}

function mergeRawRows(db, table, rows, keyColumns, allowedColumns) {
  if (!Array.isArray(rows) || !rows.length) {
    return;
  }

  const allowed = new Set(allowedColumns);
  const columns = Object.keys(rows[0]).filter((column) =>
    allowed.has(column) && rows.every((row) => column in row),
  );

  if (!columns.length) {
    return;
  }

  const placeholders = columns.map(() => "?").join(", ");
  const updates = columns
    .filter((column) => !keyColumns.includes(column))
    .map((column) => `${column} = excluded.${column}`)
    .join(", ");
  const conflict = keyColumns.length ? `ON CONFLICT(${keyColumns.join(", ")}) DO ${updates ? `UPDATE SET ${updates}` : "NOTHING"}` : "";
  const statement = db.prepare(`
    INSERT INTO ${table} (${columns.join(", ")})
    VALUES (${placeholders})
    ${conflict}
  `);

  for (const row of rows) {
    statement.run(...columns.map((column) => row[column]));
  }
}

async function importSnapshot(db, filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  let snapshot;

  try {
    snapshot = JSON.parse(raw);
  } catch {
    return { success: false, error: "Selected file is not valid JSON." };
  }

  const validationError = validateSnapshotShape(snapshot);
  if (validationError) {
    return { success: false, error: validationError };
  }

  const data = isObject(snapshot.data) ? snapshot.data : snapshot;
  const run = db.transaction(() => {
    const articleResult = upsertArticles(db, data.articles ?? data.articleRows ?? []);
    mergeRawRows(db, "preferences", data.preferences, ["key"], ["key", "value_json"]);
    mergeRawRows(db, "learning_profile", data.learning_profile, ["key"], ["key", "value_json"]);
    mergeRawRows(
      db,
      "importance_feedback",
      data.feedback,
      ["article_id"],
      ["article_id", "original_importance", "user_importance", "updated_at"],
    );
    mergeRawRows(
      db,
      "briefs",
      data.briefs,
      ["week"],
      ["week", "content_json", "created_at"],
    );

    if (Array.isArray(data.insights)) {
      for (const insight of data.insights) {
        db.prepare(`
          INSERT INTO insights (week, title, explanation, confidence, created_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            week = excluded.week,
            title = excluded.title,
            explanation = excluded.explanation,
            confidence = excluded.confidence,
            created_at = excluded.created_at
        `).run(
          insight.week,
          insight.title,
          insight.explanation,
          insight.confidence ?? null,
          insight.created_at ?? new Date().toISOString(),
        );
      }
    }

    return articleResult;
  });
  const result = run();

  return {
    success: true,
    count: result.inserted + result.updated,
  };
}

module.exports = {
  createSnapshot,
  exportSnapshot,
  importSnapshot,
  validateSnapshotShape,
};
