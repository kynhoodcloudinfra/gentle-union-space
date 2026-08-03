import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { AvatarDisplay } from './AvatarDisplay';
import { OrnamentalDivider } from './OrnamentalDivider';
import { avatarMap } from '@/lib/avatars';
import { LogOut, Upload, Image as ImageIcon, Check, Sparkles, Flame } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  totalScore?: number;
  streak?: number;
}

export function ProfileSheet({ open, onOpenChange, totalScore = 0, streak = 0 }: ProfileSheetProps) {
  const {
    phoneNumber, displayName, kynUsername, avatarId, profileImageUrl,
    setAvatarId, setProfileImage, logout,
  } = useUser();
  const [tab, setTab] = useState<'pick' | 'upload'>('pick');
  const [uploading, setUploading] = useState(false);

  const avatarIds = Object.keys(avatarMap).map(Number).sort((a, b) => a - b);



  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !phoneNumber) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Image too large', description: 'Max 5 MB', variant: 'destructive' });
      return;
    }
    setUploading(true);
    const ext = file.name.split('.').pop() || 'png';
    const path = `${phoneNumber}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    await setProfileImage(data.publicUrl);
    toast({ title: 'Profile image updated' });
    setUploading(false);
  }

  function handleLogout() {
    onOpenChange(false);
    logout();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border film-grain overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-accent gold-glow text-center">Profile</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center mt-4">
          <AvatarDisplay avatarId={avatarId} imageUrl={profileImageUrl} seed={phoneNumber} size={96} className="ring-2 ring-accent/40" />
          <p className="font-serif text-2xl text-accent gold-glow mt-3">{displayName || '—'}</p>
          {kynUsername && (
            <p className="text-sm text-muted-foreground mt-1">@{kynUsername}</p>
          )}
        </div>

        <div className="mt-5 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent border border-accent/30 rounded-2xl p-4 text-center">
          <p className="text-[10px] tracking-[0.25em] uppercase text-muted-foreground mb-1">Your Points Are Safe</p>
          <div className="flex items-center justify-center gap-2">
            <Sparkles size={22} className="text-accent" />
            <span className="font-serif text-3xl text-accent gold-glow">{totalScore}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">points earned so far</p>
          {streak > 0 && (
            <p className="flex items-center justify-center gap-1 text-xs text-orange-400/90 mt-2">
              <Flame size={12} /> {streak} day streak
            </p>
          )}
        </div>

        <OrnamentalDivider className="my-5" />

        <div>
          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-2">Profile Image</p>
          <div className="grid grid-cols-2 gap-1 bg-background/50 rounded-lg p-1 mb-3">
            <button
              onClick={() => setTab('pick')}
              className={`flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-serif transition-colors ${
                tab === 'pick' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ImageIcon size={14} /> Pick avatar
            </button>
            <button
              onClick={() => setTab('upload')}
              className={`flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-serif transition-colors ${
                tab === 'upload' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Upload size={14} /> Upload
            </button>
          </div>

          {tab === 'pick' ? (
            <div className="grid grid-cols-6 gap-2 max-h-72 overflow-y-auto pr-1">
              {avatarIds.map(id => {
                const selected = avatarId === id && !profileImageUrl;
                return (
                  <button
                    key={id}
                    onClick={() => setAvatarId(id)}
                    className={`relative rounded-full overflow-hidden aspect-square ring-2 transition-all ${
                      selected ? 'ring-accent scale-105' : 'ring-transparent hover:ring-accent/40'
                    }`}
                  >
                    <AvatarDisplay avatarId={id} size={48} className="ring-0" />
                    {selected && (
                      <span className="absolute inset-0 bg-accent/30 flex items-center justify-center">
                        <Check size={16} className="text-accent-foreground" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-serif file:bg-accent file:text-accent-foreground hover:file:bg-accent/90 disabled:opacity-50"
                />
              </label>
              <p className="text-[10px] text-muted-foreground mt-2">PNG/JPG up to 5 MB.</p>
              {uploading && <p className="text-xs text-accent mt-2">Uploading…</p>}
            </div>
          )}
        </div>

       

        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full mt-6 mb-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-serif"
        >
          <LogOut size={16} className="mr-2" /> Log out
        </Button>
      </SheetContent>
    </Sheet>
  );
}
