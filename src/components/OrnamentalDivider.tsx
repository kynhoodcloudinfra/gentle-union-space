export function OrnamentalDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-3 my-4 ${className}`}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-40" />
      <span className="text-accent text-lg">✦</span>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-40" />
    </div>
  );
}
