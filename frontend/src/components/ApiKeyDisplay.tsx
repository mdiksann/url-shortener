import { useState } from 'react';
import { Button } from '@/components/Button';
import { copy } from '@/lib/clipboard';
import { toast } from 'sonner';

interface ApiKeyDisplayProps {
  key: string;
  appName: string;
}

export function ApiKeyDisplay({ key, appName }: ApiKeyDisplayProps) {
  const [revealed, setRevealed] = useState(false);

  const handleCopy = () => {
    copy(key);
    toast.success('API key copied to clipboard');
  };

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-blue-900">✓ API Key Created</p>
        <p className="text-slate-600 text-sm">
          Your API key for "{appName}" has been created. Save it somewhere secure—you won't be able
          to see it again.
        </p>
      </div>

      <div className="bg-white border border-slate-300 rounded-lg p-3 flex items-center gap-2 font-mono">
        <code
          className={`flex-1 text-sm ${
            revealed ? 'text-slate-900' : 'text-slate-900'
          }`}
        >
          {revealed ? key : key.substring(0, 10) + '•'.repeat(key.length - 10)}
        </code>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setRevealed(!revealed)}
        >
          {revealed ? 'Hide' : 'Show'}
        </Button>
      </div>

      <Button variant="primary" onClick={handleCopy} className="w-full">
        Copy Key
      </Button>

      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
        <p className="text-xs text-yellow-900">
          ⚠️ Use this key as a Bearer token in the Authorization header: <br />
          <code className="bg-yellow-100 px-1 rounded">Authorization: Bearer {key.substring(0, 15)}...</code>
        </p>
      </div>
    </div>
  );
}
