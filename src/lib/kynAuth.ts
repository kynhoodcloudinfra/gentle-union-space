// Dummy KYN Auth API — replace with real endpoints later

export interface KynUser {
  phone: string;
  name: string;
  userId: string;
}

// Dummy JWT decode — extracts payload from a real or dummy token
export function decodeToken(token: string): KynUser | null {
  try {
    // For dummy flow, accept a base64-encoded JSON payload
    const payload = JSON.parse(atob(token.split('.')[1] || token));
    return {
      phone: payload.phone || payload.phoneNumber || '',
      name: payload.name || 'KYN User',
      userId: payload.sub || payload.userId || '',
    };
  } catch {
    return null;
  }
}

// Dummy: Send OTP to phone number
export async function sendOTP(phone: string): Promise<{ success: boolean; message: string }> {
  // Simulate API delay
  await new Promise(r => setTimeout(r, 1000));
  console.log('[KYN Dummy] OTP sent to', phone);
  return { success: true, message: 'OTP sent successfully' };
}

// Dummy: Verify OTP — any 4-digit code works
export async function verifyOTP(phone: string, otp: string): Promise<{ success: boolean; user: KynUser | null; message: string }> {
  await new Promise(r => setTimeout(r, 1000));
  if (otp.length === 4) {
    return {
      success: true,
      user: { phone, name: 'Quiz Player', userId: `user_${phone}` },
      message: 'Verified',
    };
  }
  return { success: false, user: null, message: 'Invalid OTP' };
}

// Dummy: Check community membership
export async function checkCommunityMembership(phone: string): Promise<{ isMember: boolean }> {
  await new Promise(r => setTimeout(r, 500));
  // For dummy flow, treat all users as members
  // Change to `false` to test the non-member popup
  return { isMember: true };
}

export const COMMUNITY_URL = 'https://kynhood.com/space/space_69cbaa2672985829a489b041';
