import { getAvatarUrl } from '@/lib/avatars';

interface AvatarDisplayProps {
  avatarId: number | null;
  size?: number;
  className?: string;
}

export function AvatarDisplay({ avatarId, size = 40, className = '' }: AvatarDisplayProps) {
  const url = avatarId ? getAvatarUrl(avatarId) : undefined;

  return (
    <div
      className={`rounded-full overflow-hidden shrink-0 bg-muted ${className}`}
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
