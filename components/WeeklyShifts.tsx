"use client";

type WeeklyShiftsProps = {
  items: string[];
  activeTag: string | null;
  onShiftClick: (text: string) => void;
};

export function WeeklyShifts({ items, activeTag, onShiftClick }: WeeklyShiftsProps) {
  return (
    <section className="rounded-[2rem] border border-line bg-white p-6 shadow-panel">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Recently
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-ink">Weekly Shifts</h2>
        </div>
        {activeTag ? (
          <span className="text-sm text-accent">Highlighting #{activeTag}</span>
        ) : (
          <span className="text-sm text-slate-500">Tap a shift to focus support</span>
        )}
      </div>

      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onShiftClick(item)}
              className="w-full rounded-2xl border border-line bg-mist px-5 py-4 text-left text-sm leading-6 text-slate-600 transition hover:border-accent hover:bg-white"
            >
              {item}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-line bg-mist px-5 py-6 text-sm text-slate-500">
          Weekly shift summaries are not available yet.
        </div>
      )}
    </section>
  );
}
