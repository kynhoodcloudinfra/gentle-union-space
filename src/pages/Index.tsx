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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase, getCurrentMonth, getTodayDayNumber } from '@/lib/supabase';
import { Music, Flame, Sparkles, Play, Check, ChevronDown, Info, Gift } from 'lucide-react';
import devaConcertPoster from '@/assets/deva-concert.jpeg.asset.json';
import { WinnerRevealCard } from '@/components/WinnerRevealCard';
import { RewardsComingSoonCard } from '@/components/RewardsComingSoonCard';
import { WinnerCelebrationModal } from '@/components/WinnerCelebrationModal';
import { isRevealDay, isPostReveal, loadWinnerSnapshot, saveWinnerSnapshot, type WinnerSnapshot } from '@/lib/dateIST';

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
  const [showAll, setShowAll] = useState(false);
  const [playedToday, setPlayedToday] = useState(false);

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
    const { data } = await supabase
      .from('submissions')
      .select('id')
      .eq('phone_number', phoneNumber)
      .eq('question_id', liveQ.id)
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

  // Header reflects live context values immediately (display name + avatar updates)
  const meDisplayName = ctxDisplayName ?? me?.display_name ?? 'Maestro';
  const meAvatarId = ctxAvatarId ?? me?.avatar_id ?? null;
  const meProfileImage = ctxProfileImage ?? me?.profile_image_url ?? null;

  const myRank = useMemo(
    () => phoneNumber ? data.findIndex(e => e.phone_number === phoneNumber) + 1 : 0,
    [data, phoneNumber]
  );

  if (authStatus === 'loading' || authStatus === 'checking_membership') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-serif">Loading…</p>
      </div>
    );
  }

  if (authStatus === 'unauthenticated') return <MobileNumberPrompt />;

  if (isCommunityMember === false) return <CommunityGatePopup />;

  const visible = showAll ? data : data.slice(0, 10);
  const hasPodium = data.length >= 3;
  const podium = hasPodium ? data.slice(0, 3) : [];
  const rest = hasPodium ? visible.slice(3) : visible;
  const meInVisible = me && visible.some(e => e.phone_number === me.phone_number);

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
          {playedToday ? (
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

          {/* Prize reveal — Deva concert */}
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


          {/* Leaderboard heading + legend */}
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-serif">Leaderboard</p>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors">
                  <Info size={12} /> How it works
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[240px] text-xs">
                <p className="font-serif text-accent mb-1">Points</p>
                <p className="mb-1.5">Points are something you accumulate by playing the games.</p>
                <p className="font-serif text-accent mb-1">Streak 🔥</p>
                <p>Consecutive days you've played the riddle.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Music size={32} className="text-accent/40 mx-auto animate-spin" />
              <p className="text-muted-foreground mt-3 text-sm font-serif">Loading…</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-12 bg-card/50 border border-border rounded-xl">
              <Music size={40} className="text-accent/20 mx-auto mb-3" />
              <p className="text-muted-foreground font-serif">No entries yet — be the first maestro!</p>
            </div>
          ) : (
            <>
              {/* Podium */}
              {hasPodium && <Podium podium={podium} />}

              {/* List */}
              <div className="space-y-1.5">
                {rest.map((entry, i) => {
                  const rank = hasPodium ? i + 4 : i + 1;
                  const isUser = entry.phone_number === phoneNumber;
                  return <LeaderRow key={entry.phone_number} entry={entry} rank={rank} isUser={isUser} />;
                })}
              </div>

              {/* User outside visible list */}
              {!meInVisible && me && myRank > 0 && (
                <>
                  <div className="flex items-center gap-2 justify-center text-muted-foreground py-2">
                    <div className="w-1 h-1 rounded-full bg-accent/40" />
                    <div className="w-1 h-1 rounded-full bg-accent/40" />
                    <div className="w-1 h-1 rounded-full bg-accent/40" />
                  </div>
                  <LeaderRow entry={me} rank={myRank} isUser />
                </>
              )}

              {/* View all toggle */}
              {data.length > 10 && (
                <button
                  onClick={() => setShowAll(s => !s)}
                  className="w-full mt-4 py-2.5 rounded-lg border border-accent/30 bg-card/40 hover:bg-card text-accent font-serif text-sm transition-colors flex items-center justify-center gap-2"
                >
                  {showAll ? 'Show top 10' : `View all (${data.length})`}
                  <ChevronDown size={14} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
                </button>
              )}
            </>
          )}

          <div className="mt-8 flex flex-col items-center gap-1">
            <p className="text-muted-foreground/40 text-[10px] font-serif italic text-center">
              ♪ a PAATUKKARAN initiative ♪
            </p>
          </div>
        </div>

        {/* First-time display name prompt */}
        {isFirstTime && <DisplayNamePrompt />}

        <ProfileSheet open={profileOpen} onOpenChange={setProfileOpen} />
        <QuizModal
          open={quizOpen}
          onOpenChange={setQuizOpen}
          onSubmitted={() => { loadData(); checkPlayedToday(); }}
        />
      </div>
    </TooltipProvider>
  );
}

/* ------- subcomponents ------- */

function Podium({ podium }: { podium: LeaderboardEntry[] }) {
  return (
    <div className="relative mb-5">
      {/* Brass ring backdrop */}
      <div className="absolute inset-x-0 -top-2 h-32 bg-[radial-gradient(ellipse_at_center,hsl(30,30%,72%,0.12),transparent_70%)] pointer-events-none" />

      <div className="flex items-end justify-center gap-2 relative">
        <PodiumPlace entry={podium[1]} rank={2} />
        <PodiumPlace entry={podium[0]} rank={1} />
        <PodiumPlace entry={podium[2]} rank={3} />
      </div>

      {/* Vinyl-record platform */}
      <div className="mt-2 mx-auto w-full max-w-[280px] h-3 rounded-full bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      <div className="mx-auto w-full max-w-[200px] h-2 rounded-full bg-gradient-to-r from-transparent via-accent/15 to-transparent mt-0.5" />
    </div>
  );
}

function PodiumPlace({ entry, rank }: { entry: LeaderboardEntry; rank: 1 | 2 | 3 }) {
  const isFirst = rank === 1;
  const sizes = isFirst ? 'w-20' : 'w-16';
  const avatarSize = isFirst ? 64 : 48;
  const heights = { 1: 'h-24', 2: 'h-16', 3: 'h-12' } as const;
  const tones = {
    1: 'from-[hsl(40,55%,55%)] to-[hsl(35,50%,38%)] border-[hsl(40,55%,65%)]',
    2: 'from-[hsl(0,8%,72%)] to-[hsl(0,5%,55%)] border-[hsl(0,8%,80%)]',
    3: 'from-[hsl(20,45%,48%)] to-[hsl(20,40%,32%)] border-[hsl(20,45%,55%)]',
  } as const;

  return (
    <div className={`flex flex-col items-center ${sizes}`}>
      {/* Crest above #1 — refined laurel-style instead of cartoon crown */}
      {isFirst && (
        <svg width="34" height="20" viewBox="0 0 34 20" className="mb-0.5">
          <defs>
            <linearGradient id="crest" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="hsl(40,70%,68%)" />
              <stop offset="100%" stopColor="hsl(35,55%,42%)" />
            </linearGradient>
          </defs>
          <path d="M2 18 L8 4 L13 14 L17 2 L21 14 L26 4 L32 18 Z" fill="url(#crest)" stroke="hsl(35,40%,30%)" strokeWidth="0.6" strokeLinejoin="round" />
          <circle cx="8" cy="4" r="1.4" fill="hsl(40,70%,75%)" />
          <circle cx="17" cy="2" r="1.6" fill="hsl(40,70%,80%)" />
          <circle cx="26" cy="4" r="1.4" fill="hsl(40,70%,75%)" />
        </svg>
      )}

      <AvatarDisplay
        avatarId={entry.avatar_id}
        imageUrl={entry.profile_image_url}
        seed={entry.phone_number}
        size={avatarSize}
        className={isFirst ? 'ring-2 ring-[hsl(40,55%,55%)] shadow-lg shadow-accent/20' : 'ring-2 ring-accent/30'}
      />
      <p className="text-[11px] text-foreground mt-1 truncate w-full text-center font-serif">
        {entry.display_name ?? entry.name}
      </p>
      {entry.kyn_username && (
        <p className="text-[9px] text-muted-foreground truncate w-full text-center">@{entry.kyn_username}</p>
      )}

      <div className={`mt-1 w-full rounded-t-md bg-gradient-to-b ${tones[rank]} border-x border-t ${heights[rank]} flex flex-col items-center justify-center px-1`}>
        <span className="font-serif font-bold text-base text-[hsl(0,20%,12%)]">{rank}</span>
        <span className="font-serif text-xs text-[hsl(0,20%,12%)]/85">{entry.total_score}</span>
      </div>
    </div>
  );
}

function LeaderRow({ entry, rank, isUser }: { entry: LeaderboardEntry; rank: number; isUser: boolean }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all ${
        isUser
          ? 'border-accent bg-accent/10 shadow-sm shadow-accent/10'
          : 'border-border/60 bg-card/60 hover:bg-card'
      }`}
    >
      <span className="w-6 text-center font-serif text-accent text-sm">{rank}</span>
      <AvatarDisplay
        avatarId={entry.avatar_id}
        imageUrl={entry.profile_image_url}
        seed={entry.phone_number}
        size={32}
      />
      <div className="flex-1 min-w-0">
        <p className="text-foreground truncate text-sm font-serif leading-tight">
          {entry.display_name ?? entry.name}
        </p>
        {entry.kyn_username && (
          <p className="text-[10px] text-muted-foreground truncate leading-tight">@{entry.kyn_username}</p>
        )}
      </div>
      {entry.streak > 0 && (
        <span className="flex items-center gap-0.5 text-xs text-orange-400/90">
          <Flame size={11} /> {entry.streak}
        </span>
      )}
      <span className="font-serif text-accent text-sm w-10 text-right">{entry.total_score}</span>
    </div>
  );
}
