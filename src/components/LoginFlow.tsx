import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OrnamentalDivider } from './OrnamentalDivider';
import { useUser } from '@/contexts/UserContext';
import maestroImg from '@/assets/maestro.jpg';

// TEMPORARY proxy login while the real Kyn integration is being wired up.
// Lets a user pick a username + phone to enter the app end-to-end.
export function LoginFlow() {
  const { proxyLogin } = useUser();
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const handle = username.trim().toLowerCase().replace(/^@+/, '');
    if (!/^[a-z0-9_.]{3,20}$/.test(handle)) {
      setError('Username: 3–20 chars (letters, numbers, _ or .)');
      return;
    }
    const cleanPhone = phone.trim().replace(/[^\d]/g, '');
    if (cleanPhone.length < 6) {
      setError('Enter a valid phone number');
      return;
    }
    const fullName = name.trim() || handle;

    setBusy(true);
    try {
      proxyLogin({ phone: cleanPhone, name: fullName, kynUsername: handle });
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
                <Label htmlFor="username" className="text-xs text-muted-foreground">Username</Label>
                <Input
                  id="username"
                  placeholder="@yourhandle"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="off"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="phone" className="text-xs text-muted-foreground">Phone number</Label>
                <Input
                  id="phone"
                  placeholder="9999900001"
                  inputMode="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  autoComplete="off"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="name" className="text-xs text-muted-foreground">Display name (optional)</Label>
                <Input
                  id="name"
                  placeholder="Your name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoComplete="off"
                  className="mt-1"
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
