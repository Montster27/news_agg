"use client";

type TagProps = {
  label: string;
  active?: boolean;
  onClick?: (tag: string) => void;
};

export function Tag({ label, active = false, onClick }: TagProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(label)}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-accent bg-accent text-white"
          : "border-line bg-white text-slate-600 hover:border-accent hover:text-accent"
      }`}
    >
      #{label}
    </button>
  );
}
