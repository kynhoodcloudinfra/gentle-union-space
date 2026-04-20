// KYN Auth integration — login and OTP are handled by the Kyn app/mweb.
// Lovable receives an authenticated user via JWT token (or legacy URL params).

export interface KynUser {
  phone: string;
  name: string;
  userId: string;
  kynUsername: string;
}

// Decode the JWT payload from the Kyn token.
// Supports both real JWTs (header.payload.signature) and bare base64 payloads (dummy/dev).
export function decodeToken(token: string): KynUser | null {
  try {
    const parts = token.split('.');
    const payloadRaw = parts.length >= 2 ? parts[1] : parts[0];
    // base64url -> base64
    const b64 = payloadRaw.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(b64));
    return {
      phone: payload.phone || payload.phoneNumber || '',
      name: payload.name || payload.fullName || 'Kyn User',
      userId: payload.sub || payload.userId || '',
      kynUsername: payload.username || payload.kynUsername || payload.handle || '',
    };
  } catch {
    return null;
  }
}

// Membership check — replace with real Kyn API call later.
// Currently treats everyone as a member; flip the constant below to test the gate.
const DUMMY_IS_MEMBER = true;

export async function checkCommunityMembership(_phone: string): Promise<{ isMember: boolean }> {
  await new Promise(r => setTimeout(r, 300));
  return { isMember: DUMMY_IS_MEMBER };
}

// Kyn community / tribe-detail page URL
export const COMMUNITY_URL = 'https://kynhood.com/space/space_69cbaa2672985829a489b041';

// Kyn login deep link — used when an unauthenticated user hits Lovable directly
export const KYN_LOGIN_URL = 'https://kynhood.com/login';
