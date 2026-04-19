const defaultPreferences = {
  refreshIntervalMinutes: 30,
  notificationsEnabled: true,
  notificationImportanceThreshold: 5,
  personalizedDefault: false,
};

function safeParse(value, fallback = null) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function getPreference(db, key, fallback = null) {
  const row = db.prepare("SELECT value_json FROM preferences WHERE key = ?").get(key);
  return row ? safeParse(row.value_json, fallback) : fallback;
}

function savePreference(db, key, value) {
  db.prepare(`
    INSERT INTO preferences (key, value_json)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
  `).run(key, JSON.stringify(value));
}

function getPreferences(db) {
  const stored = getPreference(db, "settings", {});
  return {
    ...defaultPreferences,
    ...(stored && typeof stored === "object" ? stored : {}),
  };
}

function savePreferences(db, next) {
  const current = getPreferences(db);
  const sanitized = { ...current };

  if (Number.isFinite(Number(next.refreshIntervalMinutes))) {
    sanitized.refreshIntervalMinutes = Math.max(
      5,
      Math.min(240, Math.floor(Number(next.refreshIntervalMinutes))),
    );
  }

  if (typeof next.notificationsEnabled === "boolean") {
    sanitized.notificationsEnabled = next.notificationsEnabled;
  }

  if (Number.isFinite(Number(next.notificationImportanceThreshold))) {
    sanitized.notificationImportanceThreshold = Math.max(
      1,
      Math.min(5, Math.floor(Number(next.notificationImportanceThreshold))),
    );
  }

  if (typeof next.personalizedDefault === "boolean") {
    sanitized.personalizedDefault = next.personalizedDefault;
  }

  savePreference(db, "settings", sanitized);
  return sanitized;
}

function getLastRefresh(db) {
  return getPreference(db, "lastRefresh", null);
}

function setLastRefresh(db, value) {
  savePreference(db, "lastRefresh", value);
}

function getLastRefreshError(db) {
  return getPreference(db, "lastRefreshError", null);
}

function setLastRefreshError(db, value) {
  if (value) {
    savePreference(db, "lastRefreshError", value);
    return;
  }

  db.prepare("DELETE FROM preferences WHERE key = ?").run("lastRefreshError");
}

function getLastRefreshStats(db) {
  return getPreference(db, "lastRefreshStats", null);
}

function setLastRefreshStats(db, value) {
  if (value) {
    savePreference(db, "lastRefreshStats", value);
    return;
  }

  db.prepare("DELETE FROM preferences WHERE key = ?").run("lastRefreshStats");
}

function getImportanceFeedback(db) {
  const rows = db.prepare(`
    SELECT article_id, original_importance, user_importance, updated_at
    FROM importance_feedback
    ORDER BY updated_at DESC
  `).all();
  const feedback = {};

  for (const row of rows) {
    feedback[row.article_id] = {
      articleId: row.article_id,
      originalImportance: row.original_importance,
      userImportance: row.user_importance,
      updatedAt: row.updated_at,
    };
  }

  return feedback;
}

function saveImportanceFeedback(db, payload) {
  if (!payload || typeof payload.articleId !== "string") {
    throw new Error("articleId is required");
  }

  if (payload.reset === true) {
    db.prepare("DELETE FROM importance_feedback WHERE article_id = ?").run(payload.articleId);
    rebuildLearningProfile(db);
    return { success: true };
  }

  const originalImportance = Number(payload.originalImportance);
  const userImportance = Number(payload.userImportance);

  if (![1, 2, 3, 4, 5].includes(originalImportance) || ![1, 2, 3, 4, 5].includes(userImportance)) {
    throw new Error("originalImportance and userImportance must be 1-5");
  }

  db.prepare(`
    INSERT INTO importance_feedback (
      article_id, original_importance, user_importance, updated_at
    )
    VALUES (?, ?, ?, ?)
    ON CONFLICT(article_id) DO UPDATE SET
      original_importance = excluded.original_importance,
      user_importance = excluded.user_importance,
      updated_at = excluded.updated_at
  `).run(payload.articleId, originalImportance, userImportance, new Date().toISOString());

  rebuildLearningProfile(db);
  return { success: true };
}

function averageMap(values) {
  const result = {};

  for (const [key, value] of values.entries()) {
    result[key] = Number((value.total / Math.max(value.count, 1)).toFixed(2));
  }

  return result;
}

function rebuildLearningProfile(db) {
  const rows = db.prepare(`
    SELECT
      f.article_id,
      f.original_importance,
      f.user_importance,
      a.domain,
      t.name AS tag
    FROM importance_feedback f
    JOIN articles a ON a.id = f.article_id
    LEFT JOIN article_tags at ON at.article_id = a.id
    LEFT JOIN tags t ON t.id = at.tag_id
  `).all();
  const domainTotals = new Map();
  const tagTotals = new Map();
  const seenFeedback = new Set();

  for (const row of rows) {
    const delta = row.user_importance - row.original_importance;
    seenFeedback.add(row.article_id);

    const domain = domainTotals.get(row.domain) ?? { total: 0, count: 0 };
    domain.total += delta;
    domain.count += 1;
    domainTotals.set(row.domain, domain);

    if (row.tag) {
      const tag = tagTotals.get(row.tag) ?? { total: 0, count: 0 };
      tag.total += delta;
      tag.count += 1;
      tagTotals.set(row.tag, tag);
    }
  }

  const profile = {
    domainAdjustments: averageMap(domainTotals),
    tagAdjustments: averageMap(tagTotals),
    sampleCount: seenFeedback.size,
  };

  db.prepare(`
    INSERT INTO learning_profile (key, value_json)
    VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json
  `).run("importance", JSON.stringify(profile));

  return profile;
}

function getLearningProfile(db) {
  const row = db.prepare("SELECT value_json FROM learning_profile WHERE key = ?").get("importance");
  return safeParse(row?.value_json, {
    domainAdjustments: {},
    tagAdjustments: {},
    sampleCount: 0,
  });
}

function clearLearningProfile(db) {
  db.prepare("DELETE FROM importance_feedback").run();
  db.prepare("DELETE FROM learning_profile").run();
  return { success: true };
}

function getPreferenceRows(db) {
  return db.prepare("SELECT * FROM preferences ORDER BY key ASC").all();
}

function getLearningRows(db) {
  return db.prepare("SELECT * FROM learning_profile ORDER BY key ASC").all();
}

function getFeedbackRows(db) {
  return db.prepare("SELECT * FROM importance_feedback ORDER BY updated_at DESC").all();
}

module.exports = {
  clearLearningProfile,
  defaultPreferences,
  getFeedbackRows,
  getImportanceFeedback,
  getLastRefresh,
  getLastRefreshError,
  getLastRefreshStats,
  getLearningProfile,
  getLearningRows,
  getPreference,
  getPreferenceRows,
  getPreferences,
  rebuildLearningProfile,
  saveImportanceFeedback,
  savePreference,
  savePreferences,
  setLastRefresh,
  setLastRefreshError,
  setLastRefreshStats,
};
