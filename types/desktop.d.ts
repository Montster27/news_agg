export {};

declare global {
  type DesktopResourceImpact = {
    durationMs: number;
    cpuUserMs: number;
    cpuSystemMs: number;
    cpuTotalMs: number;
    cpuPercent: number;
    rssMb: number;
    rssDeltaMb: number;
    heapUsedMb: number;
    heapUsedDeltaMb: number;
    systemFreeMemoryMb: number;
    systemFreeMemoryDeltaMb: number;
  };

  type DesktopPowerState = {
    source: "battery" | "external" | "unknown";
    onBattery: boolean;
    suspended?: boolean;
  };

  type DesktopOperationResult = {
    success: boolean;
    path?: string;
    count?: number;
    inserted?: number;
    updated?: number;
    incoming?: number;
    fetchedAt?: string;
    startedAt?: string;
    completedAt?: string;
    trigger?: "manual" | "scheduled" | "launch";
    skipReason?: "battery" | "running";
    power?: DesktopPowerState;
    resourceImpact?: DesktopResourceImpact | null;
    error?: string;
    warning?: string;
    skipped?: boolean;
  };

  type DesktopPreferences = {
    refreshIntervalMinutes: number;
    notificationsEnabled: boolean;
    notificationImportanceThreshold: number;
    personalizedDefault: boolean;
    appDataPath?: string;
    dbPath?: string;
    lastRefreshError?: string | null;
    lastRefreshStats?: DesktopOperationResult | null;
    learningProfile?: {
      domainAdjustments: Record<string, number>;
      tagAdjustments: Record<string, number>;
      sampleCount: number;
    };
  };

  type SearchInput = {
    q: string;
    domains?: string[];
    tags?: string[];
    dateFrom?: string | null;
    dateTo?: string | null;
    minImportance?: number | null;
    personalizedOnly?: boolean;
    limit?: number;
  };

  type SearchResult = {
    articleId: string;
    headline: string;
    summary: string;
    source: string;
    domain: string;
    importance: number;
    personalizedScore?: number;
    publishedAt: string | null;
    tags: string[];
    rank: number;
    matchSnippet?: string;
  };

  type RecentSearch = {
    id: number;
    queryText: string;
    filters: Partial<SearchInput>;
    searchedAt: string;
  };

  type SavedSearch = {
    id: number;
    name: string;
    queryText: string;
    filters: Partial<SearchInput>;
    createdAt: string;
    updatedAt: string;
  };

  type SearchStats = {
    indexedCount: number;
    articleCount: number;
    lastIndexedAt: string | null;
  };

  interface Window {
    desktop?: {
      appInfo: () => Promise<{
        name: string;
        version: string;
        platform: string;
        dataPath?: string;
        dbPath?: string;
      }>;
      exportData: (payload: unknown) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>;
      ping: () => Promise<string>;
      data: {
        getTopSignals: (filters?: unknown) => Promise<unknown[]>;
        getArticles: (filters?: unknown) => Promise<import("@/lib/types").Article[]>;
        getPatterns: (filters?: unknown) => Promise<import("@/lib/patterns").PatternAnalysis>;
        getBrief: (week?: string) => Promise<import("@/lib/brief").WeeklyBrief | null>;
        getInsights: (week?: string) => Promise<import("@/lib/insights").InsightEngineResult>;
        getLongTermTrends: (filters?: { weeks?: number }) => Promise<import("@/lib/db").LongTermTrendAnalysis>;
        getImportanceFeedback: () => Promise<Record<string, import("@/lib/types").ImportanceFeedback>>;
        saveImportanceFeedback: (payload: {
          articleId: string;
          originalImportance?: 1 | 2 | 3 | 4 | 5;
          userImportance?: 1 | 2 | 3 | 4 | 5;
          reset?: boolean;
        }) => Promise<{ success: boolean; error?: string }>;
        clearLearningProfile: () => Promise<{ success: boolean; error?: string }>;
        getPreferences: () => Promise<DesktopPreferences>;
        savePreferences: (payload: Partial<DesktopPreferences>) => Promise<{
          success: boolean;
          preferences?: DesktopPreferences;
          error?: string;
        }>;
      };
      jobs: {
        runRefreshNow: () => Promise<DesktopOperationResult>;
        getLastRefresh: () => Promise<string | null>;
        onRefreshComplete: (callback: (payload: DesktopOperationResult) => void) => () => void;
      };
      notifications: {
        requestStatus: () => Promise<{ supported: boolean }>;
      };
      imports: {
        importJson: () => Promise<DesktopOperationResult>;
        onImportComplete: (callback: (payload: DesktopOperationResult) => void) => () => void;
      };
      exports: {
        exportJson: () => Promise<DesktopOperationResult>;
        getSnapshot: () => Promise<unknown>;
      };
      search: {
        query: (input: SearchInput) => Promise<SearchResult[]>;
        relatedArticles: (articleId: string) => Promise<SearchResult[]>;
        recent: () => Promise<RecentSearch[]>;
        saveSearch: (payload: {
          name: string;
          queryText: string;
          filters?: Partial<SearchInput>;
        }) => Promise<{ success: boolean; error?: string }>;
        savedSearches: () => Promise<SavedSearch[]>;
        deleteSavedSearch: (id: number) => Promise<{ success: boolean; error?: string }>;
        rebuildIndex: () => Promise<{ success: boolean; count?: number; error?: string }>;
        stats: () => Promise<SearchStats>;
      };
      preferences: {
        onChanged: (callback: (payload: DesktopPreferences) => void) => () => void;
      };
    };
  }
}
