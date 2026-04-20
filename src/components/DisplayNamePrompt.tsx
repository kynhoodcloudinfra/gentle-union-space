import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrnamentalDivider } from './OrnamentalDivider';

// Non-intrusive first-time popup. Prefilled with the user's Kyn name; they can edit or accept.
export function DisplayNamePrompt() {
  const { name, setDisplayName } = useUser();
  const [inputName, setInputName] = useState(name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) return;
    setSaving(true);
    await setDisplayName(trimmed);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6 film-grain vignette">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">🎵</div>
          <h2 className="font-serif text-2xl text-accent gold-glow mb-1">Welcome, Maestro!</h2>
          <p className="text-muted-foreground text-xs">Pick the name you want on the leaderboard</p>
          <OrnamentalDivider className="my-3" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block tracking-[0.15em] uppercase">
              Display Name
            </label>
            <Input
              value={inputName}
              onChange={e => setInputName(e.target.value)}
              placeholder="Your display name"
              required
              autoFocus
              maxLength={30}
              className="bg-background/50 border-border text-base font-serif"
            />
            <p className="text-[10px] text-muted-foreground mt-1.5">
              We pre-filled this from Kyn. Change it if you'd like.
            </p>
          </div>
          <Button
            type="submit"
            disabled={!inputName.trim() || saving}
            className="w-full bg-[hsl(345,55%,22%)] text-[hsl(35,40%,85%)] hover:bg-[hsl(345,55%,18%)] font-serif text-lg border border-[hsl(35,40%,85%)]/15"
          >
            {saving ? 'Saving…' : "Let's Play!"}
          </Button>
        </form>
      </div>
    </div>
  );
}
