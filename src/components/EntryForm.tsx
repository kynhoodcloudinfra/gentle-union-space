import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OrnamentalDivider } from './OrnamentalDivider';

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
        <div className="bg-card border border-border rounded-xl p-8 shadow-2xl relative overflow-hidden">
          {/* Film grain overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`
          }} />
          
          <h1 className="font-serif text-3xl text-center text-accent mb-1" style={{
            textShadow: '0 0 20px hsl(var(--accent) / 0.3)'
          }}>
            🎬 Raja Quiz
          </h1>
          <p className="text-center text-muted-foreground text-sm mb-4">Illayaraja Fan Club</p>
          
          <OrnamentalDivider />
          
          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Your Name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
                required
                className="bg-background"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Phone Number</label>
              <Input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Enter phone number"
                required
                className="bg-background"
              />
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-serif text-lg">
              Enter Quiz
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
