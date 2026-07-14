import { Sparkles, Trophy } from 'lucide-react';
import { AvatarDisplay } from '@/components/AvatarDisplay';

interface Winner {
  phone_number: string;
  name: string;
  display_name: string | null;
  kyn_username: string | null;
  total_score: number;
  avatar_id: number | null;
  profile_image_url: string | null;
}

export function WinnerRevealCard({ winner, isMe }: { winner: Winner; isMe: boolean }) {
  const name = winner.display_name ?? winner.name;
  return (
    <div className="relative bg-gradient-to-br from-card via-card to-background border border-accent/50 rounded-2xl overflow-hidden mb-6 film-grain shadow-lg shadow-accent/20">
      {/* Top banner */}
      <div className="relative bg-gradient-to-r from-accent/25 via-accent/40 to-accent/25 border-b border-accent/40 py-3 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(40,55%,55%,0.25),transparent_70%)] pointer-events-none" />
        <div className="relative flex items-center justify-center gap-2">
          <Trophy size={16} className="text-accent" />
          <span className="text-sm tracking-[0.35em] uppercase text-accent font-serif font-bold">THE WINNER</span>
          <Trophy size={16} className="text-accent" />
        </div>
      </div>

      {/* Sparkle backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(40,55%,55%,0.18),transparent_70%)] pointer-events-none" />

      <div className="relative px-5 pt-6 pb-5 text-center">
        <div className="flex justify-center mb-3">
          <div className="relative">
            <AvatarDisplay
              avatarId={winner.avatar_id}
              imageUrl={winner.profile_image_url}
              seed={winner.phone_number}
              size={88}
              className="ring-4 ring-accent shadow-xl shadow-accent/30"
            />
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg">
              <Trophy size={16} className="text-background" />
            </div>
          </div>
        </div>

        <p className="text-[10px] tracking-[0.3em] uppercase text-accent/80 font-serif mb-1">Champion of Paattu Puzzle</p>
        <h2 className="font-serif text-2xl font-bold text-accent gold-glow leading-tight">
          {name}
        </h2>
        {winner.kyn_username && (
          <p className="text-xs text-muted-foreground mt-0.5">@{winner.kyn_username}</p>
        )}

        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/15 border border-accent/40">
          <Sparkles size={14} className="text-accent" />
          <span className="font-serif text-accent font-bold">{winner.total_score}</span>
          <span className="text-xs text-muted-foreground">points</span>
        </div>

        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          {isMe ? (
            <>🎉 <span className="text-accent font-medium">Congratulations, you did it!</span> You've won the two exclusive tickets to the legendary Thenisai Baasha Deva concert.</>
          ) : (
            <>A huge round of applause to our champion! <span className="text-accent font-medium">Keep playing — you could be the next one.</span> 🎶</>
          )}
        </p>
      </div>
    </div>
  );
}
