interface KPICardProps {
  label: string;
  value: number | string;
  trend?: {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  };
  icon?: React.ReactNode;
  description?: string;
}

export default function KPICard({
  label,
  value,
  trend,
  icon,
  description,
}: KPICardProps) {
  return (
    <div className="bg-surface border border-border rounded-[18px] p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate mb-2">{label}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {description && (
            <p className="text-xs text-slate mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 ml-4">
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-2 py-1 rounded-[10px] ${
              trend.direction === 'up'
                ? 'bg-emerald/10 text-emerald'
                : trend.direction === 'down'
                ? 'bg-red/10 text-red'
                : 'bg-slate/10 text-slate'
            }`}
          >
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'}{' '}
            {trend.percentage}%
          </span>
          <span className="text-xs text-slate">vs last period</span>
        </div>
      )}
    </div>
  );
}
