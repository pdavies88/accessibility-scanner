import * as React from "react";

interface ImpactChartProps {
  data: Array<{ impact: string; count: number }>;
}

export function ImpactChart({ data }: ImpactChartProps) {
  const colors: Record<string, string> = {
    critical: '#991b1b',
    serious: '#ea580c',
    moderate: '#ca8a04',
    minor: '#6b7280',
  };

  const sortedData = React.useMemo(() => {
    return [...data].sort((a, b) => {
      const order: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
      return order[a.impact] - order[b.impact];
    });
  }, [data]);

  const maxCount = React.useMemo(() => {
    return Math.max(...sortedData.map((d) => d.count), 0);
  }, [sortedData]);

  return (
    <div className="space-y-2">
      {sortedData.map((d) => {
        const widthPercent = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
        return (
          <div key={d.impact} className="flex items-center">
            <span className="w-24 text-sm font-medium capitalize">{d.impact}</span>
            <div className="relative flex-1 ml-2 h-6 bg-gray-200 rounded">
              <div
                className="h-full rounded"
                style={{
                  width: `${widthPercent}%`,
                  background: colors[d.impact] || 'gray',
                }}
              />
              <span className="absolute right-2 top-0 text-xs font-semibold">
                {d.count}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}