"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { articleTime, buildReadingList, READING_TOPICS, topicActivity } from "@/lib/reading-list";
import { loadUserProfile, saveUserProfile } from "@/lib/user";
import { DOMAIN_LABELS, type Article, type ArticleDomain } from "@/lib/types";
import styles from "./ReadingHome.module.css";

export function ReadingHome({ initialArticles, initialError }: { initialArticles: Article[]; initialError: string | null }) {
  const [articles, setArticles] = useState(initialArticles);
  const [followed, setFollowed] = useState<ArticleDomain[]>([]);
  const [desktop, setDesktop] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState(initialError);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [visible, setVisible] = useState(6);
  const [topic, setTopic] = useState("All");
  const [query, setQuery] = useState("");
  const [settings, setSettings] = useState(false);
  const [preferences, setPreferences] = useState<DesktopPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(0);
  const request = useRef(0);

  const load = useCallback(async () => {
    const api = window.desktop;
    if (!api) return;
    const id = ++request.current;
    setLoading(true);
    try {
      const [items, lastRefresh] = await Promise.all([
        api.data.getArticles({ limit: 200 }), api.jobs.getLastRefresh(),
      ]);
      if (id !== request.current) return;
      setArticles(items);
      setUpdatedAt(lastRefresh);
      setNow(Date.now());
    } catch {
      if (id === request.current) setNotice("Couldn't read saved articles. Your current reading list is still available; try Refresh again.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setNow(Date.now());
    try { setFollowed(loadUserProfile().preferred_domains); } catch { /* Storage can be unavailable. */ }
    if (!window.desktop) return;
    const api = window.desktop;
    setDesktop(true);
    void load();
    let active = true;
    void api.data.getPreferences().then((value) => {
      if (active) setPreferences(value);
    }).catch(() => { if (active) setNotice("Settings are unavailable. Reopen the app to try again."); });
    const offRefresh = api.jobs.onRefreshComplete((result) => {
      if (!result.skipped) {
        setNotice(result.success ? result.warning ? "Some feeds couldn't update. Showing available articles." : null : result.error ?? "Refresh failed. Showing saved articles.");
        if (result.success) void load();
      }
    });
    const offImport = api.imports.onImportComplete(() => { void load(); });
    const offPreferences = api.preferences.onChanged(setPreferences);
    return () => { active = false; request.current++; offRefresh(); offImport(); offPreferences(); };
  }, [load]);

  const ranked = useMemo(() => buildReadingList(articles, followed, now), [articles, followed, now]);
  const filtered = useMemo(() => ranked.filter(({ article }) => {
    const selected = READING_TOPICS.find((item) => item.label === topic);
    return (!selected || selected.domains.includes(article.domain)) &&
      `${article.headline} ${article.summary} ${article.source ?? ""}`.toLowerCase().includes(query.toLowerCase());
  }), [ranked, topic, query]);
  const activity = useMemo(() => topicActivity(articles, now), [articles, now]);

  function toggleTopic(domains: ArticleDomain[]) {
    const selected = domains.every((domain) => followed.includes(domain));
    const next = selected ? followed.filter((domain) => !domains.includes(domain)) : [...new Set([...followed, ...domains])];
    setFollowed(next);
    setVisible(6);
    try { saveUserProfile({ ...loadUserProfile(), preferred_domains: next }); }
    catch { setNotice("Your interests apply now, but couldn't be saved on this device."); }
  }

  async function refresh() {
    if (!window.desktop || refreshing) return;
    setRefreshing(true);
    setNotice(null);
    try {
      const result = await window.desktop.jobs.runRefreshNow();
      if (!result.success) setNotice(result.error ?? "Couldn't refresh. Showing saved articles.");
      // Successful refreshes are loaded once through onRefreshComplete.
    } catch { setNotice("Couldn't refresh. Showing saved articles; try again later."); }
    finally { setRefreshing(false); }
  }

  async function savePreferences(next: Partial<DesktopPreferences>) {
    if (!window.desktop) return;
    setSaving(true);
    try {
      const result = await window.desktop.data.savePreferences(next);
      if (!result.success || !result.preferences) throw new Error();
      setPreferences(result.preferences);
    } catch { setNotice("Couldn't save settings. Please try again."); }
    finally { setSaving(false); }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link className={styles.brand} href="/" prefetch={false}>News Agg<span>Technology, in perspective.</span></Link>
          <Link href="/research" prefetch={false}>Research</Link>
          <button onClick={() => setSettings(!settings)} aria-expanded={settings}>Your interests & settings</button>
        </nav>
        <header className={styles.header}>
          <div><h1>Your technology briefing</h1><p>A broad view of tech, one worthwhile story from each field.</p></div>
          <div className={styles.refresh}>
            {desktop ? <button disabled={refreshing || loading} onClick={() => void refresh()}>{refreshing ? "Refreshing…" : loading ? "Loading…" : "Refresh"}</button> : <button onClick={() => window.location.reload()}>Reload saved stories</button>}
            <span>{updatedAt ? `Checked ${new Date(updatedAt).toLocaleString()}` : desktop ? "Reads saved articles first" : "From your saved article collection"}</span>
          </div>
        </header>
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {settings && <section className={styles.settings} aria-label="Interests and settings">
          <h2>What do you want to keep up with?</h2>
          <p>Follow topics to shape your picks while keeping a mix of fields.</p>
          <div className={styles.topics}>{READING_TOPICS.map((item) => <button key={item.label} aria-pressed={item.domains.every((domain) => followed.includes(domain))} onClick={() => toggleTopic(item.domains)}>{item.label}</button>)}</div>
          {desktop && preferences && <div className={styles.preferences}>
            <label>Check for new stories <select disabled={saving} value={preferences.refreshIntervalMinutes} onChange={(e) => void savePreferences({ refreshIntervalMinutes: Number(e.target.value) })}>{[...new Set([preferences.refreshIntervalMinutes, 30, 60, 120, 240])].sort((a, b) => a - b).map((minutes) => <option key={minutes} value={minutes}>Every {minutes} minutes</option>)}</select></label>
            <label><input type="checkbox" disabled={saving} checked={preferences.enrichmentEnabled ?? false} onChange={(e) => void savePreferences({ enrichmentEnabled: e.target.checked })} /> Full article extraction & AI for newly discovered stories</label>
            <p>Off keeps refreshes light, using feed summaries. Turning it on uses more CPU and memory; existing articles stay unchanged.</p>
            <label><input type="checkbox" disabled={saving} checked={preferences.notificationsEnabled} onChange={(e) => void savePreferences({ notificationsEnabled: e.target.checked })} /> Notify me about important stories</label>
          </div>}
        </section>}
        <section aria-labelledby="reading-title" aria-busy={loading}>
          <div className={styles.listHeading}><div><h2 id="reading-title">Worth your time</h2><p>A mix of fields, balanced by relevance, recency and source.</p></div><label className={styles.search}>Search this reading list<input type="search" value={query} placeholder="Find a story" onChange={(e) => { setQuery(e.target.value); setVisible(6); }} /></label></div>
          <div className={styles.topics}><button aria-pressed={topic === "All"} onClick={() => { setTopic("All"); setVisible(6); }}>All topics</button>{READING_TOPICS.map((item) => <button key={item.label} aria-pressed={topic === item.label} onClick={() => { setTopic(item.label); setVisible(6); }}>{item.label}</button>)}</div>
          <div className={styles.stories}>{filtered.slice(0, visible).map(({ article, reason }) => <article key={article.id} className={styles.story}>
            <div className={styles.meta}><span>{DOMAIN_LABELS[article.domain]}</span><span>{article.source || "Source unavailable"}</span><time dateTime={article.date}>{article.date}</time>{now - articleTime(article) > 7 * 86400000 && <span>Older coverage</span>}</div>
            <h3>{article.url && /^https?:\/\//i.test(article.url) ? <a href={article.url} target="_blank" rel="noopener noreferrer">{article.headline}<span className={styles.external} aria-label="opens in a new tab">↗</span></a> : article.headline}</h3>
            <p>{article.summary}</p>
            <span className={styles.reason}>{reason}</span>
          </article>)}</div>
          {!filtered.length && <div className={styles.empty}><h3>{loading ? "Opening your reading list…" : articles.length ? "No stories match just yet." : "Your reading list starts here."}</h3><p>{articles.length ? "Try another topic or a shorter search." : desktop ? "Refresh to collect the latest stories. They’ll be saved here for offline reading." : "No saved stories are available. Open the desktop app and refresh its feeds, or connect a populated web database."}</p>{!!articles.length && <button onClick={() => { setTopic("All"); setQuery(""); }}>Clear filters</button>}</div>}
          {!!filtered.length && <footer className={styles.end}><span>{Math.min(visible, filtered.length)} of {filtered.length} stories. {visible === 6 ? "A good place to pause." : "Explore at your own pace."}</span>{visible < filtered.length && <button onClick={() => setVisible(visible + 6)}>Show 6 more</button>}</footer>}
        </section>
        {!!activity.length && <section className={styles.activity} aria-label="Topics in recent coverage">
          <div><h2>In the conversation</h2><p>Past 7 days in your saved coverage</p></div>
          <div className={styles.topics}>{activity.map((item) => <button key={item.label} aria-pressed={topic === item.label} onClick={() => { setTopic(topic === item.label ? "All" : item.label); setVisible(6); }}>{item.label}<span>{item.current} {item.current === 1 ? "story" : "stories"}</span></button>)}</div>
        </section>}

      </div>
    </main>
  );
}
