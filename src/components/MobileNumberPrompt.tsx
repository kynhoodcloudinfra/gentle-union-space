import { useState, useEffect } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrnamentalDivider } from './OrnamentalDivider';

// Mobile number is required before we let the user in. In production this
// will come from Kyn — this popup is the temporary capture point.
export function MobileNumberPrompt() {
  const { proxyLogin, prefillPhoneNumber } = useUser();
  const [phone, setPhone] = useState('');

  // Prefill from query params if available
  useEffect(() => {
    if (prefillPhoneNumber) {
      setPhone(prefillPhoneNumber);
    }
  }, [prefillPhoneNumber]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleaned = phone.replace(/[^\d]/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setBusy(true);
    try {
      // Name will be captured next via DisplayNamePrompt.
      proxyLogin({ phone: cleaned, name: '', kynUsername: `user_${cleaned.slice(-6)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 film-grain vignette">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">📱</div>
          <h2 className="font-serif text-2xl text-accent gold-glow mb-1">Enter Mobile Number</h2>
          <p className="text-muted-foreground text-xs">We need your number to track your scores</p>
          <OrnamentalDivider className="my-3" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block tracking-[0.15em] uppercase">
              Mobile Number
            </label>
            <Input
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="10-digit mobile number"
              type="tel"
              inputMode="numeric"
              required
              autoFocus
              maxLength={15}
              disabled={!!prefillPhoneNumber}
              className="bg-background/50 border-border text-base font-serif disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {error && <p className="text-[11px] text-destructive mt-1.5">{error}</p>}
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full bg-[hsl(345,55%,22%)] text-[hsl(35,40%,85%)] hover:bg-[hsl(345,55%,18%)] font-serif text-lg border border-[hsl(35,40%,85%)]/15"
          >
            {busy ? 'Continuing…' : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
}
