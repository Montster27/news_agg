export {};

declare global {
  interface Window {
    desktop?: {
      appInfo: () => Promise<{
        name: string;
        version: string;
        platform: string;
      }>;
      exportData: (payload: unknown) => Promise<{
        success: boolean;
        path?: string;
        error?: string;
      }>;
      ping: () => Promise<string>;
    };
  }
}
