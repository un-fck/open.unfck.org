import { BarChart3, Map, PieChart } from "lucide-react";

type ChartType = "treemap" | "map" | "chart";

interface DataPlaceholderProps {
  title: string;
  description?: string;
  height?: string;
  type?: ChartType;
}

const icons: Record<ChartType, React.ReactNode> = {
  treemap: <PieChart className="h-12 w-12 text-gray-300" />,
  map: <Map className="h-12 w-12 text-gray-300" />,
  chart: <BarChart3 className="h-12 w-12 text-gray-300" />,
};

export function DataPlaceholder({
  title,
  description,
  height = "h-64",
  type = "chart",
}: DataPlaceholderProps) {
  return (
    <div
      className={`flex ${height} flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 bg-gray-50`}
    >
      {icons[type]}
      <p className="mt-4 text-sm font-medium text-gray-500">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}
