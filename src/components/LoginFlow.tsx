import { useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { OrnamentalDivider } from './OrnamentalDivider';
import maestroImg from '@/assets/maestro.jpg';
import { toast } from '@/hooks/use-toast';

type Step = 'phone' | 'otp';

export function LoginFlow() {
  const { requestOTP, login } = useUser();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    const result = await requestOTP(phone.trim());
    setLoading(false);
    if (result.success) {
      setStep('otp');
      toast({ title: 'OTP Sent', description: `A verification code has been sent to ${phone}` });
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) return;
    setLoading(true);
    const result = await login(phone.trim(), otp);
    setLoading(false);
    if (!result.success) {
      toast({ title: 'Verification Failed', description: result.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card border border-border rounded-2xl shadow-2xl relative overflow-hidden film-grain vignette">
          {/* Maestro Hero Image */}
          <div className="relative w-full aspect-square overflow-hidden">
            <img
              src={maestroImg}
              alt="Maestro Ilaiyaraaja"
              className="w-full h-full object-cover object-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card" />
          </div>

          {/* Content */}
          <div className="px-6 pb-8 -mt-4 relative z-10">
            <h1 className="font-serif text-3xl text-center text-accent gold-glow mb-0.5">
              Raja Quiz
            </h1>
            <p className="text-center text-muted-foreground text-xs tracking-[0.2em] uppercase mb-3">
              Illayaraja Fan Club
            </p>

            <OrnamentalDivider className="my-3" />

            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="space-y-3 mt-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block tracking-wide uppercase">
                    Mobile Number
                  </label>
                  <Input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Enter your mobile number"
                    required
                    type="tel"
                    className="bg-background/50 border-border"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !phone.trim()}
                  className="w-full bg-[hsl(345,55%,22%)] text-[hsl(35,40%,85%)] hover:bg-[hsl(345,55%,18%)] font-serif text-lg mt-2 border border-[hsl(35,40%,85%)]/15"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4 mt-4">
                <p className="text-center text-muted-foreground text-sm">
                  Enter the OTP sent to <span className="text-accent">{phone}</span>
                </p>
                <div className="flex justify-center">
                  <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length < 4}
                  className="w-full bg-[hsl(345,55%,22%)] text-[hsl(35,40%,85%)] hover:bg-[hsl(345,55%,18%)] font-serif text-lg border border-[hsl(35,40%,85%)]/15"
                >
                  {loading ? 'Verifying...' : 'Verify & Enter'}
                </Button>
                <button
                  onClick={() => { setStep('phone'); setOtp(''); }}
                  className="w-full text-accent text-sm hover:underline"
                >
                  ← Change number
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
