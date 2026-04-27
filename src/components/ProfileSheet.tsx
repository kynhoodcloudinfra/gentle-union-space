import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/lib/supabase';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarDisplay } from './AvatarDisplay';
import { OrnamentalDivider } from './OrnamentalDivider';
import { avatarMap } from '@/lib/avatars';
import { LogOut, Upload, Image as ImageIcon, Check, Pencil, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface ProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSheet({ open, onOpenChange }: ProfileSheetProps) {
  const {
    phoneNumber, displayName, kynUsername, avatarId, profileImageUrl,
    setAvatarId, setProfileImage, setKynUsername, logout,
  } = useUser();
  const [tab, setTab] = useState<'pick' | 'upload'>('pick');
  const [uploading, setUploading] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(kynUsername ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => { setUsernameDraft(kynUsername ?? ''); }, [kynUsername, open]);

  async function handleSaveUsername() {
    setSavingUsername(true);
    setUsernameError(null);
    const res = await setKynUsername(usernameDraft);
    setSavingUsername(false);
    if (!res.ok) {
      setUsernameError((res as { ok: false; error: string }).error);
      return;
    }
    toast({ title: 'Username updated' });
    setEditingUsername(false);
  }

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md bg-card border-border film-grain overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-serif text-2xl text-accent gold-glow text-center">Profile</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col items-center mt-4">
          <AvatarDisplay avatarId={avatarId} imageUrl={profileImageUrl} size={96} className="ring-2 ring-accent/40" />
          <p className="font-serif text-xl text-foreground mt-3">{displayName ?? '—'}</p>
          {kynUsername && (
            <p className="text-xs text-muted-foreground tracking-wide">@{kynUsername}</p>
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

        <OrnamentalDivider className="my-5" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-1.5 border-b border-border/50">
            <span className="text-muted-foreground">Display name</span>
            <span className="text-foreground font-serif">{displayName ?? '—'}</span>
          </div>
          <div className="py-1.5 border-b border-border/50">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Username</span>
              {!editingUsername ? (
                <div className="flex items-center gap-2">
                  <span className="text-foreground font-serif">{kynUsername ? `@${kynUsername}` : '—'}</span>
                  <button
                    onClick={() => { setEditingUsername(true); setUsernameError(null); }}
                    className="text-muted-foreground hover:text-accent"
                    aria-label="Edit username"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { setEditingUsername(false); setUsernameDraft(kynUsername ?? ''); setUsernameError(null); }}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {editingUsername && (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground font-serif">@</span>
                  <Input
                    value={usernameDraft}
                    onChange={e => { setUsernameDraft(e.target.value); setUsernameError(null); }}
                    placeholder="your_handle"
                    maxLength={20}
                    className="bg-background h-8 text-sm"
                    autoFocus
                  />
                  <Button
                    onClick={handleSaveUsername}
                    disabled={savingUsername || !usernameDraft.trim()}
                    size="sm"
                    className="h-8 bg-accent text-accent-foreground hover:bg-accent/90 font-serif"
                  >
                    {savingUsername ? '…' : 'Save'}
                  </Button>
                </div>
                {usernameError ? (
                  <p className="text-[11px] text-destructive">{usernameError}</p>
                ) : (
                  <p className="text-[10px] text-muted-foreground">3–20 chars · letters, numbers, _ or . · must be unique</p>
                )}
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={logout}
          variant="outline"
          className="w-full mt-6 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive font-serif"
        >
          <LogOut size={16} className="mr-2" /> Log out
        </Button>
      </SheetContent>
    </Sheet>
  );
}
