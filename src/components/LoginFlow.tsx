import { Button } from '@/components/ui/button';
import { OrnamentalDivider } from './OrnamentalDivider';
import maestroImg from '@/assets/maestro.jpg';
import { KYN_LOGIN_URL } from '@/lib/kynAuth';

// Shown only when a user opens Lovable directly (e.g. via deep link) without a Kyn token.
// In-app and mweb flows always arrive with ?token=… and skip this screen.
export function LoginFlow() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2xl relative overflow-hidden film-grain vignette">
          <div className="relative w-full aspect-square overflow-hidden">
            <img src={maestroImg} alt="Maestro Ilaiyaraaja" className="w-full h-full object-cover object-bottom" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
          </div>

          <div className="px-6 pb-8 -mt-4 relative z-10 text-center">
            <h1 className="font-serif text-3xl text-accent gold-glow mb-0.5">Raaja Riddle</h1>
            <div className="text-xs font-extralight font-serif text-secondary-foreground tracking-[0.2em] uppercase mb-3">
              HOW TO NAME IT?<br />(An Ilaiyaraaja Fan Club)
            </div>

            <OrnamentalDivider className="my-3" />

            <p className="text-muted-foreground text-sm leading-relaxed mb-5">
              Please log in via Kyn to continue. The quiz is exclusive to Kyn community members.
            </p>

            <a href={KYN_LOGIN_URL} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-[hsl(345,55%,22%)] text-[hsl(35,40%,85%)] hover:bg-[hsl(345,55%,18%)] font-serif text-lg border border-[hsl(35,40%,85%)]/15">
                Log in via Kyn
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
