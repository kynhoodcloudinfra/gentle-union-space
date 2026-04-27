import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrnamentalDivider } from './OrnamentalDivider';
import { useUser } from '@/contexts/UserContext';
import maestroImg from '@/assets/maestro.jpg';

// TEMPORARY proxy login while the real Kyn integration is being wired up.
// Display Name is the only field shown — phone + username will be supplied
// by Kyn in production. We synthesise placeholders here just to keep the
// downstream identity wiring working end-to-end.
export function LoginFlow() {
  const { proxyLogin } = useUser();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const fullName = name.trim();
    if (fullName.length < 2) {
      setError('Please enter your display name (min 2 characters)');
      return;
    }

    // Synthesise stable-ish proxy identifiers from the display name so the
    // app's phone/username-based logic keeps working until Kyn is wired up.
    const slug = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'guest';
    const handle = (slug.length >= 3 ? slug : `${slug}_user`).slice(0, 20);
    const phone = `proxy_${slug}_${Date.now().toString().slice(-6)}`;

    setBusy(true);
    try {
      proxyLogin({ phone, name: fullName, kynUsername: handle });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2xl relative overflow-hidden film-grain vignette">
          <div className="relative w-full aspect-square overflow-hidden">
            <img src={maestroImg} alt="Maestro Ilaiyaraaja" className="w-full h-full object-cover object-bottom" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
          </div>

          <div className="px-6 pb-8 -mt-4 relative z-10 text-center">
            <h1 className="font-serif text-3xl text-accent gold-glow mb-0.5">Raaja Riddle</h1>
            <div className="text-xs font-extralight font-serif text-secondary-foreground tracking-[0.2em] uppercase mb-3">
              HOW TO NAME IT?<br />(An Ilaiyaraaja Fan Club)
            </div>

            <OrnamentalDivider className="my-3" />

            <p className="text-muted-foreground text-xs leading-relaxed mb-4">
              Temporary login while Kyn integration is being completed.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 text-left">
              <div>
                <Label htmlFor="name" className="text-xs text-muted-foreground">Display name</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="off"
                  className="mt-1"
                  autoFocus
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-[hsl(345,55%,22%)] text-[hsl(35,40%,85%)] hover:bg-[hsl(345,55%,18%)] font-serif text-lg border border-[hsl(35,40%,85%)]/15"
              >
                {busy ? 'Entering…' : 'Enter Raaja Riddle'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
