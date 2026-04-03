import { useState } from 'react';
import apiClient from '@/lib/api';
import { useDeactivateUrl } from '@/hooks/useUrl';
import { Button } from '@/components/Button';
import { UrlStats } from '@/components/UrlStats';
import { copy } from '@/lib/clipboard';
import { toast } from 'sonner';

// This will be fetched from API when we add that endpoint
export function UrlList() {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const deactivateUrl = useDeactivateUrl();

  // Note: Add an endpoint to list user's URLs
  // GET /api/v1/urls (returns paginated list of user's URLs)

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-900">Your Links</h2>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center text-slate-600">
        <p>Loading your links...</p>
        <p className="text-sm mt-2">
          (Backend needs GET /api/v1/urls endpoint to fetch user's shortened URLs)
        </p>
      </div>
    </div>
  );
}

// Table row component for individual URLs
export function UrlTableRow({ url, onStatsClick }: any) {
  const deactivateUrl = useDeactivateUrl();

  const handleCopy = (text: string, label: string) => {
    copy(text);
    toast.success(`${label} copied to clipboard`);
  };

  return (
    <div className="card flex items-center justify-between">
      <div className="flex-1 space-y-2">
        <div className="flex gap-2 items-center">
          <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-900">
            {window.location.origin}/{url.shortCode}
          </code>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleCopy(`${window.location.origin}/${url.shortCode}`, 'Link')}
          >
            Copy
          </Button>
        </div>
        <p className="text-sm text-slate-600 truncate">{url.originalUrl}</p>
        <p className="text-xs text-slate-500">
          Created {new Date(url.createdAt).toLocaleDateString()}
        </p>
      </div>

      <div className="flex gap-2 ml-4">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onStatsClick(url.shortCode)}
        >
          Stats
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => deactivateUrl.mutate(url.shortCode)}
          isLoading={deactivateUrl.isPending}
        >
          Deactivate
        </Button>
      </div>
    </div>
  );
}
