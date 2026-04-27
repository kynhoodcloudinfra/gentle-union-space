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
}

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
  // TEMP: Kyn login flow disabled for end-to-end testing — auto-injects a dummy user.
  // To re-enable real auth, set BYPASS_KYN_AUTH = false.
  const BYPASS_KYN_AUTH = true;

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

    setAuthStatus('unauthenticated');
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
  const loadProfile = useCallback(async (phone: string) => {
    const { data } = await supabase
      .from('leaderboard')
      .select('display_name, profile_image_url, avatar_id, name')
      .eq('phone_number', phone)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setDisplayNameState(data.display_name ?? null);
      setProfileImageUrlState(data.profile_image_url ?? null);
      setAvatarIdState(data.avatar_id ?? null);
    }
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated' && user && !profileLoaded) {
      loadProfile(user.phone);
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
    // Upsert: ensure at least one row exists so the name persists pre-quiz
    const { data: existing } = await supabase
      .from('leaderboard')
      .select('phone_number')
      .eq('phone_number', user.phone)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await persistProfileField({ display_name: newName, name: newName, kyn_username: user.kynUsername });
    } else {
      await supabase.from('leaderboard').insert({
        phone_number: user.phone,
        name: newName,
        display_name: newName,
        kyn_username: user.kynUsername,
        total_score: 0,
        streak: 0,
      });
    }
  }, [user, persistProfileField]);

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
      await loadProfile(user.phone);
    }
  }, [user, loadProfile]);

  const logout = useCallback(() => {
    setUser(null);
    setAuthStatus('unauthenticated');
    setDisplayNameState(null);
    setProfileImageUrlState(null);
    setAvatarIdState(null);
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
      kynUsername: user?.kynUsername ?? null,
      displayName,
      profileImageUrl,
      avatarId,
      setDisplayName,
      setProfileImage,
      setAvatarId,
      isIdentified,
      authStatus,
      isCommunityMember,
      isFirstTime,
      logout,
      refreshProfile,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
