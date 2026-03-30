import { ApiKey } from '@/types/api';
import { useRevokeApiKey } from '@/hooks/useApiKey';
import { Button } from '@/components/Button';
import { copy } from '@/lib/clipboard';
import { toast } from 'sonner';

interface ApiKeyListProps {
  keys: ApiKey[];
}

export function ApiKeyList({ keys }: ApiKeyListProps) {
  const revokeKey = useRevokeApiKey();

  return (
    <div className="space-y-3">
      {keys.map((key) => (
        <ApiKeyRow key={key.id} apiKey={key} onRevoke={() => revokeKey.mutate(key.id)} />
      ))}
    </div>
  );
}

interface ApiKeyRowProps {
  apiKey: ApiKey;
  onRevoke: () => void;
}

function ApiKeyRow({ apiKey, onRevoke }: ApiKeyRowProps) {
  const handleCopyPrefix = () => {
    copy(apiKey.prefix);
    toast.success('Prefix copied');
  };

  return (
    <div className="card flex items-center justify-between">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-900">{apiKey.appName}</h4>
          <span
            className={`text-xs font-semibold px-2 py-1 rounded ${
              apiKey.prefix === 'sk_live'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-orange-100 text-orange-700'
            }`}
          >
            {apiKey.prefix}
          </span>
          <span className={`text-xs px-2 py-1 rounded ${
            apiKey.isActive
              ? 'bg-green-100 text-green-700'
              : 'bg-slate-100 text-slate-700'
          }`}>
            {apiKey.isActive ? 'Active' : 'Revoked'}
          </span>
        </div>
        <div className="flex gap-4 text-sm text-slate-600">
          <span>Created {new Date(apiKey.createdAt).toLocaleDateString()}</span>
          {apiKey.lastUsedAt && (
            <span>Last used {new Date(apiKey.lastUsedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      <div className="flex gap-2 ml-4">
        <Button size="sm" variant="secondary" onClick={handleCopyPrefix}>
          Copy Prefix
        </Button>
        {apiKey.isActive && (
          <Button
            size="sm"
            variant="danger"
            onClick={onRevoke}
          >
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}
