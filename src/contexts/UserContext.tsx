import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { decodeToken, verifyOTP, sendOTP, checkCommunityMembership, KynUser } from '@/lib/kynAuth';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated' | 'checking_membership';

interface UserContextType {
  phoneNumber: string | null;
  name: string | null;
  displayName: string | null;
  setDisplayName: (name: string) => void;
  isIdentified: boolean;
  authStatus: AuthStatus;
  isCommunityMember: boolean | null;
  login: (phone: string, otp: string) => Promise<{ success: boolean; message: string }>;
  requestOTP: (phone: string) => Promise<{ success: boolean; message: string }>;
}

const UserContext = createContext<UserContextType>({
  phoneNumber: null,
  name: null,
  displayName: null,
  setDisplayName: () => {},
  isIdentified: false,
  authStatus: 'loading',
  isCommunityMember: null,
  login: async () => ({ success: false, message: '' }),
  requestOTP: async () => ({ success: false, message: '' }),
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<KynUser | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [isCommunityMember, setIsCommunityMember] = useState<boolean | null>(null);
  const [displayName, setDisplayNameState] = useState<string | null>(null);

  const setDisplayName = useCallback((name: string) => {
    setDisplayNameState(name);
  }, []);

  // On mount: check for token in URL or existing phoneNumber params
  useEffect(() => {
    const token = searchParams.get('token');
    const phoneNumber = searchParams.get('phoneNumber');
    const name = searchParams.get('name');

    if (token) {
      const decoded = decodeToken(token);
      if (decoded) {
        setUser(decoded);
        setAuthStatus('checking_membership');
        // Clean token from URL
        const newParams = new URLSearchParams(searchParams);
        newParams.delete('token');
        setSearchParams(newParams, { replace: true });
        return;
      }
    }

    // Legacy support: if phoneNumber + name in URL, treat as authenticated
    if (phoneNumber && name) {
      setUser({ phone: phoneNumber, name, userId: `legacy_${phoneNumber}` });
      setAuthStatus('checking_membership');
      return;
    }

    setAuthStatus('unauthenticated');
  }, []);

  // Check community membership after auth
  useEffect(() => {
    if (authStatus !== 'checking_membership' || !user) return;

    checkCommunityMembership(user.phone).then(({ isMember }) => {
      setIsCommunityMember(isMember);
      setAuthStatus('authenticated');
    });
  }, [authStatus, user]);

  const requestOTP = useCallback(async (phone: string) => {
    return sendOTP(phone);
  }, []);

  const login = useCallback(async (phone: string, otp: string) => {
    const result = await verifyOTP(phone, otp);
    if (result.success && result.user) {
      setUser(result.user);
      setAuthStatus('checking_membership');
      // Add params to URL for downstream compatibility
      const newParams = new URLSearchParams(searchParams);
      newParams.set('phoneNumber', result.user.phone);
      newParams.set('name', result.user.name);
      setSearchParams(newParams, { replace: true });
    }
    return { success: result.success, message: result.message };
  }, [searchParams, setSearchParams]);

  const isIdentified = authStatus === 'authenticated' && !!user;

  return (
    <UserContext.Provider value={{
      phoneNumber: user?.phone ?? null,
      name: user?.name ?? null,
      displayName,
      setDisplayName,
      isIdentified,
      authStatus,
      isCommunityMember,
      login,
      requestOTP,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}
