import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AvatarDisplay } from '@/components/AvatarDisplay';
import { Phone, MessageCircle, Trophy, Sparkles } from 'lucide-react';

interface Winner {
  phone_number: string;
  name: string;
  display_name: string | null;
  kyn_username: string | null;
  total_score: number;
  avatar_id: number | null;
  profile_image_url: string | null;
}

const CONTACT_NUMBER = '+91 91767 77632';
const CONTACT_DIGITS = '919176777632';
const WHATSAPP_MSG = encodeURIComponent(
  "Hi! I'm the winner of today's Paattu Puzzle 🎉 — I'd like to claim my Thenisai Baasha Deva concert tickets."
);

export function WinnerCelebrationModal({ winner }: { winner: Winner }) {
  const [open, setOpen] = useState(true);

  // Reopen on every mount (i.e. every visit/login) — no persistent dismissal.
  useEffect(() => {
    setOpen(true);
  }, []);

  const name = winner.display_name ?? winner.name;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-accent/50 bg-gradient-to-br from-card via-card to-background film-grain">
        {/* Confetti (pure CSS/SVG) */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <span
              key={i}
              className="absolute block rounded-sm animate-confetti"
              style={{
                left: `${(i * 37) % 100}%`,
                top: `-10%`,
                width: `${6 + (i % 3) * 2}px`,
                height: `${8 + (i % 4) * 3}px`,
                background: [
                  'hsl(40,70%,60%)',
                  'hsl(0,55%,55%)',
                  'hsl(30,30%,72%)',
                  'hsl(45,80%,65%)',
                ][i % 4],
                animationDelay: `${(i % 8) * 0.25}s`,
                animationDuration: `${3 + (i % 5) * 0.5}s`,
                transform: `rotate(${(i * 33) % 360}deg)`,
              }}
            />
          ))}
        </div>

        <div className="relative px-6 pt-8 pb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/20 border border-accent/40 mb-4">
            <Trophy size={12} className="text-accent" />
            <span className="text-[10px] tracking-[0.3em] uppercase text-accent font-serif font-bold">Champion</span>
          </div>

          <div className="flex justify-center mb-3">
            <div className="relative">
              <AvatarDisplay
                avatarId={winner.avatar_id}
                imageUrl={winner.profile_image_url}
                seed={winner.phone_number}
                size={96}
                className="ring-4 ring-accent shadow-2xl shadow-accent/40"
              />
              <div className="absolute -top-1 -right-1 w-9 h-9 rounded-full bg-accent flex items-center justify-center shadow-lg animate-pulse">
                <Sparkles size={18} className="text-background" />
              </div>
            </div>
          </div>

          <h2 className="font-serif text-3xl font-bold text-accent gold-glow leading-tight">
            🎉 You won!
          </h2>
          <p className="font-serif text-lg text-foreground mt-1">{name}</p>
          <p className="text-sm text-accent mt-1">{winner.total_score} points</p>

          <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
            You've won <span className="text-accent font-medium">2 exclusive tickets</span> to the
            legendary <span className="text-accent font-medium">Thenisai Baasha Deva</span> concert.
            Reach out to claim your prize:
          </p>

          <p className="font-serif text-accent text-base mt-3">{CONTACT_NUMBER}</p>

          <div className="grid grid-cols-2 gap-3 mt-5">
            <a
              href={`https://wa.me/${CONTACT_DIGITS}?text=${WHATSAPP_MSG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[hsl(142,70%,35%)] hover:bg-[hsl(142,70%,42%)] text-white font-serif text-sm transition-colors shadow-md"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a
              href={`tel:+${CONTACT_DIGITS}`}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-accent hover:bg-accent/90 text-background font-serif text-sm font-bold transition-colors shadow-md"
            >
              <Phone size={16} /> Call
            </a>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="mt-4 text-xs text-muted-foreground hover:text-accent transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
