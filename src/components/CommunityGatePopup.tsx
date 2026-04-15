import { COMMUNITY_URL } from '@/lib/kynAuth';
import { OrnamentalDivider } from './OrnamentalDivider';
import { Button } from './ui/button';

export function CommunityGatePopup() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center film-grain shadow-2xl">
        <div className="text-5xl mb-4">🎬</div>
        <h2 className="font-serif text-2xl text-accent gold-glow mb-2">
          Exclusive Community
        </h2>
        <OrnamentalDivider className="my-4" />
        <p className="text-muted-foreground text-sm leading-relaxed mb-6">
          This game is exclusive for the community members, join the community and start playing
        </p>
        <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer">
          <Button className="w-full bg-[hsl(345,55%,22%)] text-[hsl(35,40%,85%)] hover:bg-[hsl(345,55%,18%)] font-serif text-lg border border-[hsl(35,40%,85%)]/15">
            Join Community
          </Button>
        </a>
      </div>
    </div>
  );
}
