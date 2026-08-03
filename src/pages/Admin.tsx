import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionsTab } from '@/components/admin/QuestionsTab';
import { LeaderboardTab } from '@/components/admin/LeaderboardTab';
import { AnalyticsTab } from '@/components/admin/AnalyticsTab';
import { getAdminPassword, setAdminPassword, verifyAdminPassword } from '@/lib/adminApi';

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const stored = getAdminPassword();
    if (!stored) return;
    verifyAdminPassword(stored).then(
      () => setAuthenticated(true),
      () => {}, // stored password no longer valid — stay on the login screen
    );
  }, []);

  const [error, setError] = useState('');

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setChecking(true);
    setError('');
    try {
      await verifyAdminPassword(password);
      setAdminPassword(password);
      setAuthenticated(true);
    } catch {
      setError('Incorrect password');
    } finally {
      setChecking(false);
    }
  };

  const adminHelmet = (
    <Helmet>
      <title>Admin Panel — Paattu Puzzle</title>
      <meta name="description" content="Internal admin panel for managing Paattu Puzzle daily questions and leaderboard." />
      <meta name="robots" content="noindex,nofollow" />
      <link rel="canonical" href="https://how-to-name-it.kynhood.com/admin" />
      <meta property="og:title" content="Admin Panel — Paattu Puzzle" />
      <meta property="og:description" content="Internal admin panel for managing Paattu Puzzle." />
      <meta property="og:url" content="https://how-to-name-it.kynhood.com/admin" />
    </Helmet>
  );

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 film-grain">
        {adminHelmet}
        <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm vignette">
          <h1 className="font-serif text-2xl text-accent gold-glow text-center mb-1">Admin Access</h1>
          <p className="text-xs text-muted-foreground text-center mb-4">Paattu Puzzle</p>
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
            <Button type="submit" disabled={checking} className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-serif">
              {checking ? 'Checking…' : 'Enter'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 film-grain">
      {adminHelmet}
      <div className="max-w-3xl mx-auto">
        <div className="text-center pt-3">
          <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-serif">✦ PAATTU PUZZLE ✦</p>
          <h1 className="font-serif text-3xl text-accent gold-glow">Admin Panel</h1>
        </div>
        <OrnamentalDivider />

        <Tabs defaultValue="questions" className="mt-4">
          <TabsList className="grid w-full grid-cols-3 bg-card border border-border">
            <TabsTrigger value="questions" className="font-serif data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Questions
            </TabsTrigger>
            <TabsTrigger value="leaderboard" className="font-serif data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Leaderboard
            </TabsTrigger>
            <TabsTrigger value="analytics" className="font-serif data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">
              Analytics
            </TabsTrigger>
          </TabsList>
          <TabsContent value="questions" className="mt-4">
            <QuestionsTab />
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-4">
            <LeaderboardTab />
          </TabsContent>
          <TabsContent value="analytics" className="mt-4">
            <AnalyticsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
