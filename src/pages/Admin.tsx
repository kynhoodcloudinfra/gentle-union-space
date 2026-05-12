import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionsTab } from '@/components/admin/QuestionsTab';
import { LeaderboardTab } from '@/components/admin/LeaderboardTab';

const ADMIN_PASSWORD = 'rajaadmin123';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('raja_admin') === 'true') setAuthenticated(true);
  }, []);

  const [error, setError] = useState('');

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('raja_admin', 'true');
      setAuthenticated(true);
    } else {
      setError('Incorrect password');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 film-grain">
        <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm vignette">
          <h1 className="font-serif text-2xl text-accent gold-glow text-center mb-1">Admin Access</h1>
          <p className="text-xs text-muted-foreground text-center mb-4">Raaja Riddle</p>
          <OrnamentalDivider className="my-3" />
          <form onSubmit={handleLogin}>
            <Input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter password"
              className="bg-background mb-3"
              autoFocus
            />
            {error && <p className="text-xs text-destructive mb-2">{error}</p>}
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
              Enter
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 film-grain">
      <div className="max-w-3xl mx-auto">
        <div className="text-center pt-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-serif">✦ Raaja Riddle ✦</p>
          <h1 className="font-serif text-3xl text-accent gold-glow">Admin Panel</h1>
        </div>
        <OrnamentalDivider />

        <Tabs defaultValue="questions" className="mt-4">
          <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
            <TabsTrigger value="questions" className="font-serif data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Questions
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="font-serif data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Leaderboard
            </TabsTrigger>
          </TabsList>
          <TabsContent value="questions" className="mt-4">
            <QuestionsTab />
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-4">
            <LeaderboardTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
