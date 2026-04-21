const MAX_STRING = 2000;
const MAX_SEARCH_QUERY = 500;
const MAX_TAG_LEN = 120;
const MAX_NAME = 200;
const MAX_ARRAY = 50;

function clampString(value, max = MAX_STRING) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function clampNumber(value, { min, max } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  let result = parsed;
  if (typeof min === "number") result = Math.max(min, result);
  if (typeof max === "number") result = Math.min(max, result);
  return result;
}

function clampStringArray(value, maxLen = MAX_TAG_LEN) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value.slice(0, MAX_ARRAY)) {
    const s = clampString(item, maxLen);
    if (s !== undefined) out.push(s);
  }
  return out;
}

function pickObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : {};
}

function sanitizeArticleFilters(input) {
  const src = pickObject(input);
  return {
    domain: clampString(src.domain, MAX_TAG_LEN),
    tag: clampString(src.tag, MAX_TAG_LEN),
    minImportance: clampNumber(src.minImportance, { min: 1, max: 5 }),
    search: clampString(src.search, MAX_SEARCH_QUERY),
    limit: clampNumber(src.limit, { min: 1, max: 1000 }),
    offset: clampNumber(src.offset, { min: 0, max: 1_000_000 }),
  };
}

function sanitizeSearchInput(input) {
  const src = pickObject(input);
  return {
    q: clampString(src.q, MAX_SEARCH_QUERY) ?? "",
    domains: clampStringArray(src.domains),
    tags: clampStringArray(src.tags),
    dateFrom: clampString(src.dateFrom, 32),
    dateTo: clampString(src.dateTo, 32),
    minImportance: clampNumber(src.minImportance, { min: 1, max: 5 }),
    personalizedOnly: Boolean(src.personalizedOnly),
    limit: clampNumber(src.limit, { min: 1, max: 100 }),
    recordRecent: Boolean(src.recordRecent),
  };
}

function sanitizeSavedSearchPayload(input) {
  const src = pickObject(input);
  const filters = pickObject(src.filters);
  return {
    name: clampString(src.name, MAX_NAME),
    queryText: clampString(src.queryText ?? src.query_text, MAX_SEARCH_QUERY),
    filters: {
      domains: clampStringArray(filters.domains),
      tags: clampStringArray(filters.tags),
      dateFrom: clampString(filters.dateFrom, 32),
      dateTo: clampString(filters.dateTo, 32),
      minImportance: clampNumber(filters.minImportance, { min: 1, max: 5 }),
      personalizedOnly: Boolean(filters.personalizedOnly),
    },
  };
}

function sanitizeWeek(value) {
  const s = clampString(value, 32);
  if (!s) return undefined;
  return /^\d{4}-W\d{2}$|^\d{4}-\d{2}-\d{2}$|^\d{4}-\d{2}$/.test(s) ? s : undefined;
}

function sanitizeArticleId(value) {
  return clampString(value, 256) ?? "";
}

function sanitizeSavedSearchId(value) {
  return clampNumber(value, { min: 1, max: Number.MAX_SAFE_INTEGER });
}

function sanitizeImportanceFeedback(input) {
  const src = pickObject(input);
  return {
    articleId: sanitizeArticleId(src.articleId),
    originalImportance: clampNumber(src.originalImportance, { min: 1, max: 5 }),
    userImportance: clampNumber(src.userImportance, { min: 1, max: 5 }),
  };
}

function sanitizeUserFeedback(input) {
  const src = pickObject(input);
  return {
    articleId: sanitizeArticleId(src.articleId),
    signal: clampString(src.signal, 64),
    note: clampString(src.note, 2000),
  };
}

function sanitizePreferences(input) {
  const src = pickObject(input);
  return {
    refreshIntervalMinutes: clampNumber(src.refreshIntervalMinutes, { min: 1, max: 10080 }),
    importanceThreshold: clampNumber(src.importanceThreshold, { min: 1, max: 5 }),
    personalizedThreshold: clampNumber(src.personalizedThreshold, { min: 0, max: 10 }),
    notificationsEnabled:
      typeof src.notificationsEnabled === "boolean" ? src.notificationsEnabled : undefined,
    sources: clampStringArray(src.sources, 500),
  };
}

module.exports = {
  clampString,
  clampNumber,
  clampStringArray,
  sanitizeArticleFilters,
  sanitizeSearchInput,
  sanitizeSavedSearchPayload,
  sanitizeWeek,
  sanitizeArticleId,
  sanitizeSavedSearchId,
  sanitizeImportanceFeedback,
  sanitizeUserFeedback,
  sanitizePreferences,
};
