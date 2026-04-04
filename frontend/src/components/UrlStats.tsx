import { useUrlStats } from '@/hooks/useUrl';

interface UrlStatsProps {
  shortCode: string;
}

export function UrlStats({ shortCode }: UrlStatsProps) {
  const { data: stats, isLoading, error } = useUrlStats(shortCode);

  if (isLoading) {
    return <div className="card animate-pulse">Loading stats...</div>;
  }

  if (error) {
    return <div className="card text-red-600">Failed to load stats</div>;
  }

  if (!stats) {
    return <div className="card text-slate-600">No stats available</div>;
  }

  return (
    <div className="card space-y-4">
      <h3 className="text-lg font-semibold text-slate-900">Analytics</h3>

      {/* Total Clicks */}
      <div className="bg-slate-50 rounded-lg p-4">
        <p className="text-sm text-slate-600">Total Clicks</p>
        <p className="text-3xl font-bold text-slate-900">{stats.totalClicks}</p>
      </div>

      {/* Last Click */}
      {stats.lastClickedAt && (
        <div className="bg-slate-50 rounded-lg p-4">
          <p className="text-sm text-slate-600">Last Clicked</p>
          <p className="text-sm text-slate-900">
            {new Date(stats.lastClickedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Clicks by Day */}
      {Object.keys(stats.clicksByDay || {}).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-900">Clicks by Day</p>
          <div className="space-y-1">
            {Object.entries(stats.clicksByDay || {})
              .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
              .slice(0, 7)
              .map(([date, count]) => (
                <div key={date} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">{date}</span>
                  <span className="font-medium text-slate-900">{count} clicks</span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
