const avatarModules = import.meta.glob('../assets/avatars/avatar-*.svg', { eager: true, as: 'url' });

const avatarMap: Record<number, string> = {};
for (const [path, url] of Object.entries(avatarModules)) {
  const match = path.match(/avatar-(\d+)\.svg$/);
  if (match) avatarMap[parseInt(match[1])] = url;
}

export function getAvatarUrl(id: number): string | undefined {
  return avatarMap[id];
}

export function getRandomAvatarId(): number {
  return Math.floor(Math.random() * 50) + 1;
}

export { avatarMap };
