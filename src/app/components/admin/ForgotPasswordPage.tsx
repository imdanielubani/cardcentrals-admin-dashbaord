import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Mail, ArrowRight, ArrowLeft, Loader2, KeyRound } from "lucide-react";
import cardcentralsLogo from "../../assets/cardcentrals-logo.svg";
import { api } from "../../../lib/api";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { setError("Please enter your email address"); return; }
    if (!email.includes("@")) { setError("Please enter a valid email address"); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/admin/auth/forgot-password", { email });
      setStep("otp");
      startResendTimer();
    } catch (err) {
      // Backend always returns success to prevent email enumeration,
      // so a real error here means a network/server problem.
      setError(err instanceof Error ? err.message : "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`fp-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`fp-otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = [...otp];
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);
    const focusIndex = Math.min(pasted.length, 5);
    document.getElementById(`fp-otp-${focusIndex}`)?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) { setError("Please enter the complete 6-digit code"); return; }
    setError("");
    // Don't verify the OTP here — pass it to the reset page so both email+OTP
    // are submitted together in one atomic request.
    navigate("/reset-password", { state: { email, otp: code } });
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setLoading(true);
    try {
      await api.post("/admin/auth/forgot-password", { email });
      setOtp(["", "", "", "", "", ""]);
      startResendTimer();
    } catch {
      // Silently ignore — same enumeration-safe behaviour
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-[#272936] flex-col justify-between p-10">
        <div>
          <img src={cardcentralsLogo} alt="Cardcentrals" className="h-10" />
        </div>
        <div>
          <div className="w-16 h-16 bg-[#0159C7]/20 rounded-2xl flex items-center justify-center mb-6">
            <KeyRound className="w-8 h-8 text-[#126CF8]" />
          </div>
          <h2 className="text-white mb-3" style={{ fontSize: 28, fontWeight: 700 }}>
            Account Recovery
          </h2>
          <p className="text-white/50" style={{ fontSize: 15, lineHeight: 1.7 }}>
            We'll send a verification code to your registered email address to confirm your identity before resetting your password.
          </p>
        </div>
        <p className="text-white/30" style={{ fontSize: 13 }}>
          &copy; 2026 Cardcentrals. All rights reserved.
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center bg-[#F5F7FB] p-6">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10 flex justify-center">
            <div className="bg-[#272936] rounded-2xl px-6 py-3">
              <img src={cardcentralsLogo} alt="Cardcentrals" className="h-8" />
            </div>
          </div>

          {step === "email" ? (
            <>
              <div className="mb-8">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[#6B7280] hover:text-[#272936] mb-5 transition-colors"
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Login
                </Link>
                <h1 className="text-[#272936] mb-2" style={{ fontSize: 26, fontWeight: 700 }}>
                  Forgot password?
                </h1>
                <p className="text-[#6B7280]" style={{ fontSize: 15 }}>
                  No worries — enter your email and we'll send you an OTP to verify your identity.
                </p>
              </div>

              <form onSubmit={handleSendOtp} className="space-y-5">
                <div>
                  <label className="block text-[#272936] mb-2" style={{ fontSize: 14, fontWeight: 500 }}>
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(""); }}
                      placeholder="admin@cardcentrals.com"
                      className="w-full pl-12 pr-4 py-3.5 bg-white border border-[#E5E7EB] rounded-xl outline-none text-[#272936] placeholder:text-[#9CA3AF] focus:border-[#0159C7] focus:ring-2 focus:ring-[#0159C7]/10 transition-all"
                      style={{ fontSize: 15 }}
                    />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-red-600" style={{ fontSize: 13 }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0159C7] hover:bg-[#014BA8] text-white py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  style={{ fontSize: 15, fontWeight: 600 }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-[#272936] mb-2" style={{ fontSize: 26, fontWeight: 700 }}>
                  Enter verification code
                </h1>
                <p className="text-[#6B7280]" style={{ fontSize: 15 }}>
                  A 6-digit code was sent to{" "}
                  <span className="text-[#272936]" style={{ fontWeight: 600 }}>{email}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOtp} className="space-y-5">
                <div>
                  <label className="block text-[#272936] mb-3" style={{ fontSize: 14, fontWeight: 500 }}>
                    OTP Code
                  </label>
                  <div className="flex gap-3" onPaste={handleOtpPaste}>
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`fp-otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className="w-full h-14 text-center bg-white border border-[#E5E7EB] rounded-xl outline-none text-[#272936] focus:border-[#0159C7] focus:ring-2 focus:ring-[#0159C7]/10 transition-all"
                        style={{ fontSize: 22, fontWeight: 600 }}
                      />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <p className="text-red-600" style={{ fontSize: 13 }}>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0159C7] hover:bg-[#014BA8] text-white py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                  style={{ fontSize: 15, fontWeight: 600 }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Verify & Continue
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                  className="text-[#6B7280] hover:text-[#272936] transition-colors"
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  Change email
                </button>
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0}
                  className={`transition-colors ${resendTimer > 0 ? "text-[#9CA3AF]" : "text-[#0159C7] hover:text-[#014BA8]"}`}
                  style={{ fontSize: 14, fontWeight: 500 }}
                >
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
