import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrnamentalDivider } from './OrnamentalDivider';

export function DisplayNamePrompt() {
  const { name, setDisplayName } = useUser();
  const [inputName, setInputName] = useState(name ?? '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) return;
    setDisplayName(inputName.trim());
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2xl p-8 film-grain">
          <div className="text-center mb-6">
            <h1 className="font-serif text-3xl text-accent gold-glow mb-1">Welcome!</h1>
            <p className="text-muted-foreground text-sm">Choose your display name for the leaderboard</p>
            <OrnamentalDivider className="my-4" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block tracking-wide uppercase">
                Display Name
              </label>
              <Input
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                placeholder="Enter your display name"
                required
                autoFocus
                className="bg-background/50 border-border text-base"
              />
            </div>
            <Button
              type="submit"
              disabled={!inputName.trim()}
              className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-serif text-lg"
            >
              Let's Play!
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
