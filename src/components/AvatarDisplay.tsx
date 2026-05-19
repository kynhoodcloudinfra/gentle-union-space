import { useMemo } from 'react';
import { getAvatarUrl, avatarMap } from '@/lib/avatars';

interface AvatarDisplayProps {
  avatarId?: number | null;
  imageUrl?: string | null;
  size?: number;
  className?: string;
  /** Optional seed (e.g. phone number) so the random default stays stable per user */
  seed?: string | number | null;
}

const allIds = Object.keys(avatarMap).map(Number).sort((a, b) => a - b);

function pickDefaultId(seed?: string | number | null): number {
  if (allIds.length === 0) return 1;
  if (seed == null || seed === '') {
    return allIds[Math.floor(Math.random() * allIds.length)];
  }
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return allIds[hash % allIds.length];
}

export function AvatarDisplay({ avatarId, imageUrl, size = 40, className = '', seed }: AvatarDisplayProps) {
  const fallbackId = useMemo(() => pickDefaultId(seed), [seed]);
  const url = imageUrl || (avatarId ? getAvatarUrl(avatarId) : getAvatarUrl(fallbackId));

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 bg-muted ring-1 ring-accent/30 ${className}`}
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="Avatar" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">?</div>
      )}
    </div>
  );
}
