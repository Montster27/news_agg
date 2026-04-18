import Link from "next/link";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/patterns", label: "Patterns" },
  { href: "/brief", label: "Weekly Brief" },
];

type SidebarNavProps = {
  activePath?: string;
};

export function SidebarNav({ activePath = "/" }: SidebarNavProps) {
  return (
    <aside className="lg:sticky lg:top-6">
      <div className="surface-card p-4 lg:p-6">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-700">
            Tech Command Center
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Daily signals, weekly shifts, structural patterns.
          </p>
        </div>

        <nav className="mt-4 space-y-2">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? activePath === "/"
                : activePath.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-xs ${active ? "text-sky-100" : "text-slate-400"}`}>
                  {active ? "●" : "○"}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
