import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decodeToken, checkCommunityMembership, KynUser } from '@/lib/kynAuth';
import { supabase } from '@/lib/supabase';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'checking_membership';

interface UserContextType {
  phoneNumber: string | null;
  name: string | null;            // Kyn full name
  kynUsername: string | null;     // Kyn @username (editable, unique)
  displayName: string | null;     // What they chose to show on the leaderboard
  profileImageUrl: string | null; // Custom uploaded image (overrides avatar_id)
  avatarId: number | null;
  setDisplayName: (name: string) => Promise<void>;
  setKynUsername: (username: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  setProfileImage: (url: string | null) => Promise<void>;
  setAvatarId: (id: number) => Promise<void>;
  isIdentified: boolean;
  authStatus: AuthStatus;
  isCommunityMember: boolean | null;
  isFirstTime: boolean;           // true until they've set a display name
  logout: () => void;
  refreshProfile: () => Promise<void>;
  proxyLogin: (u: { phone: string; name: string; kynUsername: string }) => void;
}

const PROXY_SESSION_KEY = 'raaja_proxy_session_v1';

const UserContext = createContext<UserContextType>({
  phoneNumber: null,
  name: null,
  kynUsername: null,
  displayName: null,
  profileImageUrl: null,
  avatarId: null,
  setDisplayName: async () => {},
  setKynUsername: async () => ({ ok: true as const }),
  setProfileImage: async () => {},
  setAvatarId: async () => {},
  isIdentified: false,
  authStatus: 'loading',
  isCommunityMember: null,
  isFirstTime: false,
  logout: () => {},
  refreshProfile: async () => {},
  proxyLogin: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<KynUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [isCommunityMember, setIsCommunityMember] = useState<boolean | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);
  const [profileImageUrl, setProfileImageUrlState] = useState<string | null>(null);
  const [avatarId, setAvatarIdState] = useState<number | null>(null);
  const [kynUsername, setKynUsernameState] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  // Mount: parse token or legacy params
  // Kyn login flow re-enabled so login + logout can be tested end-to-end.
  const BYPASS_KYN_AUTH = false;

  useEffect(() => {
    if (BYPASS_KYN_AUTH) {
      setUser({
        phone: '9999900001',
        name: 'Test User',
        userId: 'dummy_test_user',
        kynUsername: 'testuser',
      });
      setAuthStatus('checking_membership');
      return;
    }

    const token = searchParams.get('token');
    const phoneNumber = searchParams.get('phoneNumber');
    const name = searchParams.get('name');
    const kynUsername = searchParams.get('kynUsername') || '';

    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUser(decoded);
        setAuthStatus('checking_membership');
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('token');
        setSearchParams(newParams, { replace: true });
        return;
      }
    }

    if (phoneNumber && name) {
      setUser({ phone: phoneNumber, name, userId: `legacy_${phoneNumber}`, kynUsername });
      setAuthStatus('checking_membership');
      return;
    }

    // Restore proxy session from localStorage (temporary login)
    try {
      const raw = localStorage.getItem(PROXY_SESSION_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as KynUser;
        if (saved?.phone) {
          setUser(saved);
          setAuthStatus('checking_membership');
          return;
        }
      }
    } catch { /* ignore */ }

    // No session — require mobile number entry before proceeding.
    setAuthStatus('unauthenticated');
  }, []);

  const proxyLogin = useCallback((u: { phone: string; name: string; kynUsername: string }) => {
    const session: KynUser = {
      phone: u.phone,
      name: u.name,
      userId: `proxy_${u.phone}`,
      kynUsername: u.kynUsername,
    };
    try { localStorage.setItem(PROXY_SESSION_KEY, JSON.stringify(session)); } catch { /* ignore */ }
    setUser(session);
    setProfileLoaded(false);
    setAuthStatus('checking_membership');
  }, []);

  // Membership check
  useEffect(() => {
    if (authStatus !== 'checking_membership' || !user) return;
    checkCommunityMembership(user.phone).then(({ isMember }) => {
      setIsCommunityMember(isMember);
      setAuthStatus('authenticated');
    });
  }, [authStatus, user]);

  // Load existing profile from leaderboard once authenticated.
  // Picks the most recent row (any month) for this phone.
  const loadProfile = useCallback(async (phone: string, fallbackKynUsername: string) => {
    const { data } = await supabase
      .from('leaderboard')
      .select('display_name, profile_image_url, avatar_id, name, kyn_username')
      .eq('phone_number', phone)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setDisplayNameState(data.display_name ?? null);
      setProfileImageUrlState(data.profile_image_url ?? null);
      setAvatarIdState(data.avatar_id ?? null);
      setKynUsernameState(data.kyn_username ?? fallbackKynUsername ?? null);
    } else {
      setKynUsernameState(fallbackKynUsername ?? null);
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && user && !profileLoaded) {
      loadProfile(user.phone, user.kynUsername);
    }
  }, [authStatus, user, profileLoaded, loadProfile]);

  const persistProfileField = useCallback(async (fields: {
    display_name?: string;
    name?: string;
    kyn_username?: string;
    profile_image_url?: string | null;
    avatar_id?: number | null;
  }) => {
    if (!user) return;
    // Update every leaderboard row for this user (across months) so it stays consistent
    await supabase
      .from('leaderboard')
      .update(fields)
      .eq('phone_number', user.phone);
  }, [user]);

  const setDisplayName = useCallback(async (newName: string) => {
    setDisplayNameState(newName);
    if (!user) return;
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('phone_number')
      .eq('phone_number', user.phone)
      .limit(1)
      .maybeSingle();

    const handle = kynUsername ?? user.kynUsername;
    if (existing) {
      await persistProfileField({ display_name: newName, name: newName, kyn_username: handle });
    } else {
      await supabase.from('leaderboard').insert({
        phone_number: user.phone,
        name: newName,
        display_name: newName,
        kyn_username: handle,
        total_score: 0,
        streak: 0,
      });
    }
  }, [user, persistProfileField, kynUsername]);

  const setKynUsername = useCallback(async (raw: string): Promise<{ ok: true } | { ok: false; error: string }> => {
    if (!user) return { ok: false, error: 'Not signed in' };
    const username = raw.trim().toLowerCase().replace(/^@+/, '');
    if (!/^[a-z0-9_.]{3,20}$/.test(username)) {
      return { ok: false, error: 'Use 3–20 chars: letters, numbers, _ or .' };
    }
    // Uniqueness — case-insensitive — must not match any other user's username
    const { data: clashes, error: lookupErr } = await supabase
      .from('leaderboard')
      .select('phone_number, kyn_username')
      .ilike('kyn_username', username);
    if (lookupErr) return { ok: false, error: lookupErr.message };
    const taken = (clashes ?? []).some(r => r.phone_number !== user.phone);
    if (taken) return { ok: false, error: 'This username is already taken' };

    setKynUsernameState(username);
    // Persist (insert row if user has none yet)
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('phone_number')
      .eq('phone_number', user.phone)
      .limit(1)
      .maybeSingle();
    if (existing) {
      await persistProfileField({ kyn_username: username });
    } else {
      await supabase.from('leaderboard').insert({
        phone_number: user.phone,
        name: displayName ?? user.name,
        display_name: displayName ?? user.name,
        kyn_username: username,
        total_score: 0,
        streak: 0,
      });
    }
    return { ok: true };
  }, [user, persistProfileField, displayName]);

  const setProfileImage = useCallback(async (url: string | null) => {
    setProfileImageUrlState(url);
    await persistProfileField({ profile_image_url: url });
  }, [persistProfileField]);

  const setAvatarId = useCallback(async (id: number) => {
    setAvatarIdState(id);
    setProfileImageUrlState(null);
    await persistProfileField({ avatar_id: id, profile_image_url: null });
  }, [persistProfileField]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      setProfileLoaded(false);
      await loadProfile(user.phone, user.kynUsername);
    }
  }, [user, loadProfile]);

  const logout = useCallback(() => {
    try { localStorage.removeItem(PROXY_SESSION_KEY); } catch { /* ignore */ }
    setUser(null);
    setAuthStatus('unauthenticated');
    setDisplayNameState(null);
    setProfileImageUrlState(null);
    setAvatarIdState(null);
    setKynUsernameState(null);
    setProfileLoaded(false);
    setIsCommunityMember(null);
    const newParams = new URLSearchParams();
    setSearchParams(newParams, { replace: true });
  }, [setSearchParams]);

  const isIdentified = authStatus === 'authenticated' && !!user;
  const isFirstTime = isIdentified && profileLoaded && !displayName;

  return (
    <UserContext.Provider value={{
      phoneNumber: user?.phone ?? null,
      name: user?.name ?? null,
      kynUsername: kynUsername ?? user?.kynUsername ?? null,
      displayName,
      profileImageUrl,
      avatarId,
      setDisplayName,
      setKynUsername,
      setProfileImage,
      setAvatarId,
      isIdentified,
      authStatus,
      isCommunityMember,
      isFirstTime,
      logout,
      refreshProfile,
      proxyLogin,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
