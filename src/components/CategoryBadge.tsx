export default function CategoryBadge({ name, color }: { name?: string; color?: string }) {
  if (!name) return <span className="text-xs text-gray-300">--</span>;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-white shadow-sm"
      style={{ backgroundColor: color || "#6B7280" }}
    >
      {name}
    </span>
  );
}
