import { AlertCircle } from '@radix-ui/react-icons';

interface SLABreachCardProps {
  count: number;
  percentage: number;
}

export default function SLABreachCard({
  count,
  percentage,
}: SLABreachCardProps) {
  return (
    <div className="bg-red/5 border border-red/20 rounded-[18px] p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-5 h-5 text-red flex-shrink-0" />
            <p className="text-sm font-medium text-red">Active SLA Breaches</p>
          </div>
          <p className="text-3xl font-bold text-red">{count}</p>
          <p className="text-xs text-red/70 mt-1">{percentage}% of active orders</p>
        </div>
      </div>

      {/* Mini breakdown */}
      <div className="mt-4 pt-4 border-t border-red/10 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-red/50">Critical</p>
          <p className="text-red font-semibold">{Math.ceil(count * 0.4)}</p>
        </div>
        <div>
          <p className="text-red/50">High</p>
          <p className="text-red font-semibold">{Math.ceil(count * 0.35)}</p>
        </div>
        <div>
          <p className="text-red/50">Medium</p>
          <p className="text-red font-semibold">{Math.ceil(count * 0.25)}</p>
        </div>
      </div>
    </div>
  );
}
