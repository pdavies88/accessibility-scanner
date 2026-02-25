import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface ImpactChartProps {
  data: Array<{ impact: string; count: number }>;
}

export function ImpactChart({ data }: ImpactChartProps) {
  const colors = {
    critical: '#991b1b',
    serious: '#ea580c',
    moderate: '#ca8a04',
    minor: '#6b7280'
  };

  const sortedData = [...data].sort((a, b) => {
    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    return order[a.impact as keyof typeof order] - order[b.impact as keyof typeof order];
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={sortedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="impact" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="count">
          {sortedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={colors[entry.impact as keyof typeof colors]} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}