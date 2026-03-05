import * as React from "react";

interface LevelChartProps {
  data: Array<{ level: string; count: number }>;
}

export function LevelChart({ data }: LevelChartProps) {
  // simple color palette for levels
  const colors: Record<string, string> = {
    A: '#2563eb',
    AA: '#059669',
    AAA: '#8b5cf6',
    unknown: '#6b7280',
  };

  const sortedData = React.useMemo(() => {
    const order: Record<string, number> = { A: 0, AA: 1, AAA: 2, unknown: 3 };
    return [...data].sort((a, b) => (order[a.level] || 99) - (order[b.level] || 99));
  }, [data]);

  const maxCount = React.useMemo(() => {
    return Math.max(...sortedData.map((d) => d.count), 0);
  }, [sortedData]);

  return (
    <div className="space-y-2">
      {sortedData.map((d) => {
        const widthPercent = maxCount > 0 ? (d.count / maxCount) * 100 : 0;
        return (
          <div key={d.level} className="flex items-center">
            <span className="w-24 text-sm font-medium capitalize">{d.level}</span>
            <div className="relative flex-1 ml-2 h-6 bg-gray-200 rounded">
              <div
                className="h-full rounded"
                style={{
                  width: `${widthPercent}%`,
                  background: colors[d.level] || 'gray',
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
