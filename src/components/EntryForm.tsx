import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrnamentalDivider } from './OrnamentalDivider';
import maestroImg from '@/assets/maestro.jpg';

export function EntryForm() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    const path = location.pathname === '/' ? '/home' : location.pathname;
    navigate(`${path}?phoneNumber=${encodeURIComponent(phone.trim())}&name=${encodeURIComponent(name.trim())}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2xl relative overflow-hidden film-grain vignette">
          {/* Maestro Hero Image */}
          <div className="relative w-full aspect-square overflow-hidden">
            <img
              src={maestroImg}
              alt="Maestro Ilaiyaraaja"
              className="w-full h-full object-cover object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
          </div>

          {/* Content */}
          <div className="px-6 pb-8 -mt-4 relative z-10">
            <h1 className="font-serif text-3xl text-center text-accent gold-glow mb-0.5">
              Raja Quiz
            </h1>
            <p className="text-center text-muted-foreground text-xs tracking-[0.2em] uppercase mb-3">
              Illayaraja Fan Club
            </p>

            <OrnamentalDivider className="my-3" />

            <form onSubmit={handleSubmit} className="space-y-3 mt-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block tracking-wide uppercase">Your Name</label>
                <Input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your name"
                  required
                  className="bg-background/50 border-border"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block tracking-wide uppercase">Phone Number</label>
                <Input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  required
                  className="bg-background/50 border-border"
                />
              </div>
              <Button type="submit" className="w-full bg-[hsl(345,50%,30%)] text-accent hover:bg-[hsl(345,50%,25%)] font-serif text-lg mt-2 border border-accent/20">
                Enter Quiz
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
