"use client";

import { useEffect, useState } from "react";

type DesktopControlsProps = {
  exportPayload: unknown;
};

type AppInfo = {
  name: string;
  version: string;
  platform: string;
};

export function DesktopControls({ exportPayload }: DesktopControlsProps) {
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!window.desktop) {
      return () => {
        mounted = false;
      };
    }

    setIsDesktop(true);
    window.desktop?.appInfo().then((info) => {
      if (mounted) {
        setAppInfo(info);
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!isDesktop || !appInfo) {
    return null;
  }

  const handleExport = async () => {
    setExportStatus(null);
    const result = await window.desktop?.exportData(exportPayload);

    if (!result) {
      setExportStatus("Export unavailable");
      return;
    }

    setExportStatus(result.success ? "Exported JSON" : result.error ?? "Export canceled");
  };

  const handlePing = async () => {
    const response = await window.desktop?.ping();
    setExportStatus(response === "pong" ? "Desktop bridge online" : "Bridge unavailable");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
        Desktop {appInfo.version} - {appInfo.platform}
      </span>
      <button
        type="button"
        onClick={handleExport}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-sky-700 transition hover:bg-slate-100"
      >
        Export
      </button>
      <button
        type="button"
        onClick={handlePing}
        className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 transition hover:bg-slate-100"
      >
        Ping
      </button>
      {exportStatus ? <span>{exportStatus}</span> : null}
    </div>
  );
}
