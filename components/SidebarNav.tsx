import Link from "next/link";

const items = [
  { href: "/", label: "Dashboard", icon: "D" },
  { href: "/trends", label: "Trends", icon: "T" },
  { href: "/patterns", label: "Patterns", icon: "P" },
  { href: "/brief", label: "Brief", icon: "B" },
];

type SidebarNavProps = {
  activePath?: string;
};

export function SidebarNav({ activePath = "/" }: SidebarNavProps) {
  return (
    <aside className="lg:sticky lg:top-6">
      <div className="surface-card p-4">
        <div className="border-b border-slate-200 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
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
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span
                  className={`grid h-6 w-6 place-items-center rounded-lg text-xs font-semibold ${
                    active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
