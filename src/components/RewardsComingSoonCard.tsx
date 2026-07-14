import { Gift, Sparkles } from 'lucide-react';
import type { WinnerSnapshot } from '@/lib/dateIST';

export function RewardsComingSoonCard({ previousWinner }: { previousWinner: WinnerSnapshot | null }) {
  return (
    <div className="relative bg-gradient-to-br from-card via-card to-background border border-accent/40 rounded-2xl overflow-hidden mb-6 film-grain shadow-lg shadow-accent/10">
      <div className="relative bg-gradient-to-r from-accent/20 via-accent/30 to-accent/20 border-b border-accent/30 py-3 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(40,55%,55%,0.15),transparent_70%)] pointer-events-none" />
        <div className="relative flex items-center justify-center gap-2">
          <Gift size={16} className="text-accent" />
          <span className="text-sm tracking-[0.35em] uppercase text-accent font-serif font-bold">REWARDS</span>
          <Gift size={16} className="text-accent" />
        </div>
      </div>

      <div className="relative px-5 py-8 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-14 h-14 rounded-full bg-accent/15 border border-accent/40 flex items-center justify-center">
            <Sparkles size={24} className="text-accent" />
          </div>
        </div>
        <h2 className="font-serif text-xl font-bold text-accent gold-glow leading-tight">
          Rewards Coming Soon
        </h2>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          The next reward is being tuned. Keep your streak alive — surprises await the maestros. 🎶
        </p>

        {previousWinner && (
          <div className="mt-5 pt-4 border-t border-border/60">
            <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground font-serif mb-1">Previous Winner</p>
            <p className="text-sm text-foreground font-serif">
              {previousWinner.display_name ?? previousWinner.name}
              {previousWinner.kyn_username && (
                <span className="text-muted-foreground"> · @{previousWinner.kyn_username}</span>
              )}
            </p>
            <p className="text-xs text-accent mt-0.5">{previousWinner.total_score} pts</p>
          </div>
        )}
      </div>
    </div>
  );
}
