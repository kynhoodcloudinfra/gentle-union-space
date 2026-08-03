import { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useUser } from '@/contexts/UserContext';

import { CommunityGatePopup } from '@/components/CommunityGatePopup';
import { DisplayNamePrompt } from '@/components/DisplayNamePrompt';
import { MobileNumberPrompt } from '@/components/MobileNumberPrompt';
import { ProfileSheet } from '@/components/ProfileSheet';
import { QuizModal } from '@/components/QuizModal';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { OrnamentalDivider } from '@/components/OrnamentalDivider';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { supabase, getCurrentMonth, getTodayDayNumber } from '@/lib/supabase';
import { Music, Flame, Sparkles, Play, Check, Gift, Lock } from 'lucide-react';
import devaConcertPoster from '@/assets/deva-concert.jpeg.asset.json';
import { WinnerRevealCard } from '@/components/WinnerRevealCard';
import { RewardsComingSoonCard } from '@/components/RewardsComingSoonCard';
import { WinnerCelebrationModal } from '@/components/WinnerCelebrationModal';
import { isRevealDay, isPostReveal, loadWinnerSnapshot, saveWinnerSnapshot, type WinnerSnapshot } from '@/lib/dateIST';
import { useVisitTracker } from '@/hooks/useVisitTracker';
import { COMING_SOON_MODE } from '@/lib/relaunch';

interface LeaderboardEntry {
  phone_number: string;
  name: string;
  display_name: string | null;
  kyn_username: string | null;
  total_score: number;
  streak: number;
  avatar_id: number | null;
  profile_image_url: string | null;
}

export default function Index() {
  const {
    phoneNumber, isIdentified, authStatus, isCommunityMember, isFirstTime,
    displayName: ctxDisplayName, avatarId: ctxAvatarId, profileImageUrl: ctxProfileImage,
  } = useUser();
  const [data, setData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [playedToday, setPlayedToday] = useState(false);
  const revealDay = useMemo(() => isRevealDay(), []);
  const postReveal = useMemo(() => isPostReveal(), []);
  const [previousWinner, setPreviousWinner] = useState<WinnerSnapshot | null>(() => loadWinnerSnapshot());
  const { markPlayed } = useVisitTracker(phoneNumber);

  const month = getCurrentMonth();
  const dayNumber = getTodayDayNumber();

  async function loadData() {
    setLoading(true);
    // Paginate — PostgREST caps at 1000 rows/request. Loop until fewer than pageSize returned.
    const pageSize = 1000;
    const rows: any[] = [];
    for (let page = 0; page < 20; page++) {
      const { data: batch, error } = await supabase
        .from('leaderboard')
        .select('phone_number, name, display_name, kyn_username, total_score, streak, avatar_id, profile_image_url')
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error || !batch || batch.length === 0) break;
      rows.push(...batch);
      if (batch.length < pageSize) break;
    }

    if (rows) {
      const agg: Record<string, LeaderboardEntry> = {};
      rows.forEach(e => {
        if (!agg[e.phone_number]) {
          agg[e.phone_number] = { ...e, total_score: 0, streak: 0 };
        }
        agg[e.phone_number].total_score += e.total_score;
        agg[e.phone_number].streak = Math.max(agg[e.phone_number].streak, e.streak);
        if (e.avatar_id) agg[e.phone_number].avatar_id = e.avatar_id;
        if (e.profile_image_url) agg[e.phone_number].profile_image_url = e.profile_image_url;
        if (e.display_name) agg[e.phone_number].display_name = e.display_name;
        if (e.kyn_username) agg[e.phone_number].kyn_username = e.kyn_username;
      });
      setData(Object.values(agg).filter(e => e.total_score > 0).sort((a, b) => b.total_score - a.total_score));
    }
    setLoading(false);
  }

  async function checkPlayedToday() {
    if (!phoneNumber) return;
    // Find the currently active question (if any), then see if user submitted for it
    const { data: liveQ } = await supabase
      .from('questions')
      .select('id')
      .eq('is_active', true)
      .maybeSingle();
    if (!liveQ) {
      setPlayedToday(false);
      return;
    }
    // @ts-ignore — RPC name not in generated types yet
    const { data } = await supabase
      .rpc('get_submission_result', { p_phone: phoneNumber, p_question_id: liveQ.id })
      .maybeSingle();
    setPlayedToday(!!data);
  }

  useEffect(() => {
    if (isIdentified && !isFirstTime) {
      loadData();
      checkPlayedToday();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIdentified, isFirstTime, phoneNumber]);

  // Realtime: refresh leaderboard + playedToday when questions or leaderboard change
  useEffect(() => {
    if (!isIdentified || isFirstTime) return;
    const channel = supabase
      .channel('homepage-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leaderboard' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        checkPlayedToday();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'submissions' }, (payload) => {
        const row = (payload.new ?? payload.old) as { phone_number?: string } | null;
        if (row?.phone_number === phoneNumber) checkPlayedToday();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isIdentified, isFirstTime, phoneNumber]);

  const me = useMemo(
    () => data.find(e => e.phone_number === phoneNumber),
    [data, phoneNumber]
  );

  const currentWinner = data[0];
  const iAmWinner = revealDay && !!currentWinner && currentWinner.phone_number === phoneNumber;

  // Persist winner snapshot on reveal day so post-reveal card can show it.
  useEffect(() => {
    if (revealDay && currentWinner) {
      const snap: WinnerSnapshot = {
        phone_number: currentWinner.phone_number,
        name: currentWinner.name,
        display_name: currentWinner.display_name,
        kyn_username: currentWinner.kyn_username,
        total_score: currentWinner.total_score,
        avatar_id: currentWinner.avatar_id,
        profile_image_url: currentWinner.profile_image_url,
      };
      saveWinnerSnapshot(snap);
      setPreviousWinner(snap);
    }
  }, [revealDay, currentWinner]);

  // Header reflects live context values immediately (display name + avatar updates)
  const meDisplayName = ctxDisplayName ?? me?.display_name ?? 'Maestro';
  const meAvatarId = ctxAvatarId ?? me?.avatar_id ?? null;
  const meProfileImage = ctxProfileImage ?? me?.profile_image_url ?? null;

  if (authStatus === 'loading' || authStatus === 'checking_membership') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-serif">Loading…</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') return <MobileNumberPrompt />;

  if (isCommunityMember === false) return <CommunityGatePopup />;

  return (
    <TooltipProvider delayDuration={150}>
      <Helmet>
        <title>Paattu Puzzle</title>
        <meta name="description" content="Daily music trivia for fans. Solve a new riddle each day, build streaks, and climb the leaderboard." />
        <link rel="canonical" href="https://how-to-name-it.kynhood.com/" />
        <meta property="og:title" content="Paattu Puzzle" />
        <meta property="og:description" content="Daily music trivia for fans. Solve a new riddle each day, build streaks, and climb the leaderboard." />
        <meta property="og:url" content="https://how-to-name-it.kynhood.com/" />
      </Helmet>
      <div className="min-h-screen bg-background film-grain pb-12">
        {/* Decorative music notes */}
        <Music size={28} className="fixed top-6 left-4 text-accent/15 animate-pulse pointer-events-none" />
        <Music size={20} className="fixed top-14 right-6 text-accent/10 animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
        <Music size={24} className="fixed bottom-24 left-8 text-accent/10 animate-pulse pointer-events-none" style={{ animationDelay: '2s' }} />

        <div className="max-w-md mx-auto px-4 pt-5">
          {/* Top bar: avatar / streak / points */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 group"
              aria-label="Open profile"
            >
              <AvatarDisplay
                avatarId={meAvatarId}
                imageUrl={meProfileImage}
                seed={phoneNumber}
                size={42}
                className="ring-2 ring-accent/30 group-hover:ring-accent/60 transition-all"
              />
              <div className="text-left">
                <p className="text-xs text-muted-foreground leading-none">Hello,</p>
                <p className="text-sm font-serif text-foreground leading-tight truncate max-w-[120px]">
                  {meDisplayName}
                </p>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border">
                <Flame size={14} className="text-orange-400" />
                <span className="text-sm font-serif text-foreground">{me?.streak ?? 0}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-card border border-border">
                <Sparkles size={14} className="text-accent" />
                <span className="text-sm font-serif text-foreground">{me?.total_score ?? 0}</span>
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-4">
            <p className="text-[10px] tracking-[0.35em] uppercase text-muted-foreground font-serif">
              ✦ HALL OF MUSIC ✦
            </p>
            <h1 className="font-serif text-3xl text-accent gold-glow mt-1">Paattu Puzzle</h1>
          </div>

          {/* Play CTA — prominent */}
          {COMING_SOON_MODE ? (
            <button
              onClick={() => setQuizOpen(true)}
              className="w-full bg-gradient-to-br from-[hsl(345,55%,28%)] via-[hsl(0,55%,22%)] to-[hsl(0,55%,15%)] border border-accent/40 rounded-2xl p-5 mb-6 film-grain text-left relative overflow-hidden group hover:border-accent transition-all hover:shadow-lg hover:shadow-accent/20"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(30,30%,72%,0.15),transparent_60%)] pointer-events-none" />
              <div className="flex items-center gap-4 relative">
                <div className="w-14 h-14 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                  <Sparkles size={22} className="text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-serif text-xl text-accent gold-glow">New Season Coming Soon</p>
                  <p className="text-xs text-muted-foreground mt-0.5">New look, new rewards — tap to see what's next</p>
                </div>
              </div>
            </button>
          ) : playedToday ? (
            <div className="bg-gradient-to-br from-[hsl(0,45%,22%)] to-[hsl(0,55%,15%)] border border-accent/30 rounded-2xl p-4 mb-6 film-grain text-center">
              <Check size={28} className="mx-auto text-accent mb-1" />
              <p className="font-serif text-base text-accent">Today's Puzzle Done</p>
              <p className="text-xs text-muted-foreground mt-0.5">Come back tomorrow for the next one.</p>
              <Button
                onClick={() => setQuizOpen(true)}
                variant="outline"
                size="sm"
                className="mt-3 border-accent/30 text-accent hover:bg-accent/10"
              >
                View Result
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setQuizOpen(true)}
              className="w-full bg-gradient-to-br from-[hsl(345,55%,28%)] via-[hsl(0,55%,22%)] to-[hsl(0,55%,15%)] border border-accent/40 rounded-2xl p-5 mb-6 film-grain text-left relative overflow-hidden group hover:border-accent transition-all hover:shadow-lg hover:shadow-accent/20"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(30,30%,72%,0.15),transparent_60%)] pointer-events-none" />
              <div className="flex items-center gap-4 relative">
                <div className="w-14 h-14 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                  <Play size={24} className="text-accent fill-accent ml-0.5" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] tracking-[0.2em] uppercase text-accent/80 font-serif">{"\n"}</p>
                  <p className="font-serif text-xl text-accent gold-glow">Play Today's Puzzle</p>
                  <p className="text-xs text-muted-foreground mt-0.5">75 seconds · up to 150 points</p>
                </div>
              </div>
            </button>
          )}

          {/* Reward / winner slot */}
          {revealDay && currentWinner ? (
            <WinnerRevealCard winner={currentWinner} isMe={iAmWinner} />
          ) : postReveal ? (
            <RewardsComingSoonCard previousWinner={previousWinner} />
          ) : (
            <div className="relative bg-gradient-to-br from-card via-card to-background border border-accent/40 rounded-2xl overflow-hidden mb-6 film-grain shadow-lg shadow-accent/10">
              {/* Top reward banner */}
              <div className="relative bg-gradient-to-r from-accent/20 via-accent/30 to-accent/20 border-b border-accent/30 py-3 px-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(40,55%,55%,0.15),transparent_70%)] pointer-events-none" />
                <div className="relative flex items-center justify-center gap-2">
                  <Gift size={16} className="text-accent" />
                  <span className="text-sm tracking-[0.35em] uppercase text-accent font-serif font-bold">THE REWARD</span>
                  <Gift size={16} className="text-accent" />
                </div>
              </div>

              <div className="relative">
                <img
                  src={devaConcertPoster.url}
                  alt="Thenisai Baasha Deva — Live in Chennai concert poster"
                  className="w-full h-auto block"
                  loading="lazy"
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
              </div>
              <div className="relative px-4 pt-3 pb-4">
                <h2 className="font-serif text-xl font-bold text-accent gold-glow leading-tight tracking-wide mb-1">
                  WIN TWO EXCLUSIVE TICKETS&nbsp;
                </h2>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Get ready! The top player wins <span className="text-accent font-medium">2 exclusive tickets</span> to the legendary <span className="text-accent font-medium">Thenisai Baasha Deva</span> concert on <span className="text-accent font-medium">July 19, YMCA Nandanam</span>&nbsp;🎶
                </p>
              </div>
            </div>
          )}


          {/* Leaderboard is paused while we roll out the new look — points are
              preserved, just tucked into the profile instead. */}
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full bg-gradient-to-br from-accent/15 via-card to-card border border-accent/30 rounded-2xl p-5 text-center group hover:border-accent/60 transition-all"
          >
            <Lock size={20} className="mx-auto text-accent mb-2" />
            <p className="font-serif text-lg text-accent gold-glow">Your Points Are Safe</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              We're refreshing the leaderboard experience. Tap here to see how many points you've earned so far.
            </p>
            <span className="inline-flex items-center gap-1.5 mt-3 text-xs font-serif text-accent border border-accent/40 rounded-full px-3 py-1.5 group-hover:bg-accent/10 transition-colors">
              <Sparkles size={12} /> View My Points
            </span>
          </button>

          <div className="mt-8 flex flex-col items-center gap-1">
            <p className="text-muted-foreground/40 text-[10px] font-serif italic text-center">
              ♪ a PAATUKKARAN initiative ♪
            </p>
          </div>
        </div>

        {/* First-time display name prompt */}
        {isFirstTime && <DisplayNamePrompt />}

        <ProfileSheet
          open={profileOpen}
          onOpenChange={setProfileOpen}
          totalScore={me?.total_score ?? 0}
          streak={me?.streak ?? 0}
        />
        <QuizModal
          open={quizOpen}
          onOpenChange={setQuizOpen}
          onSubmitted={() => { markPlayed(); loadData(); checkPlayedToday(); }}
        />

        {iAmWinner && currentWinner && <WinnerCelebrationModal winner={currentWinner} />}
      </div>
    </TooltipProvider>
  );
}
