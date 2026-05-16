import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Lock, ArrowRight, ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, Circle, ShieldCheck } from "lucide-react";
import cardcentralsLogo from "../../assets/cardcentrals-logo.svg";
import { api } from "../../../lib/api";

const passwordRules = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p: string) => /\d/.test(p) },
  { id: "special", label: "One special character", test: (p: string) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

export function ResetPasswordPage() {
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const allRulesPassed = passwordRules.every((r) => r.test(password));
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  // Email + OTP are passed via navigate state from ForgotPasswordPage
  const { email, otp } = (location.state ?? {}) as { email?: string; otp?: string };

  const handleReset = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || !otp) {
      setError("Session expired. Please restart the password reset flow.");
      return;
    }
    if (!allRulesPassed) { setError("Please meet all password requirements"); return; }
    if (!passwordsMatch) { setError("Passwords do not match"); return; }
    setError("");
    setLoading(true);
    try {
      await api.post("/admin/auth/reset-password", { email, otp, newPassword: password });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB] p-6">
        <div className="w-full max-w-[420px] text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-[#272936] mb-3" style={{ fontSize: 26, fontWeight: 700 }}>
            Password reset successful
          </h1>
          <p className="text-[#6B7280] mb-8" style={{ fontSize: 15 }}>
            Your password has been updated. You can now log in with your new credentials.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 bg-[#0159C7] hover:bg-[#014BA8] text-white px-8 py-3.5 rounded-xl transition-colors"
            style={{ fontSize: 15, fontWeight: 600 }}
          >
            Go to Login
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-[#272936] flex-col justify-between p-10">
        <div>
          <img src={cardcentralsLogo} alt="Cardcentrals" className="h-10" />
        </div>
        <div>
          <div className="w-16 h-16 bg-[#0159C7]/20 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8 text-[#126CF8]" />
          </div>
          <h2 className="text-white mb-3" style={{ fontSize: 28, fontWeight: 700 }}>
            Set a Strong Password
          </h2>
          <p className="text-white/50" style={{ fontSize: 15, lineHeight: 1.7 }}>
            Choose a secure password that meets all the requirements. A strong password helps protect your admin account from unauthorized access.
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

          <Link to="/login" className="flex items-center gap-2 text-[#6B7280] hover:text-[#272936] mb-8 w-fit transition-colors" style={{ fontSize: 14, fontWeight: 500 }}>
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>

          <div className="mb-8">
            <h1 className="text-[#272936] mb-2" style={{ fontSize: 26, fontWeight: 700 }}>
              Reset your password
            </h1>
            <p className="text-[#6B7280]" style={{ fontSize: 15 }}>
              Create a new password for your admin account
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-5">
            {/* New Password */}
            <div>
              <label className="block text-[#272936] mb-2" style={{ fontSize: 14, fontWeight: 500 }}>
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter new password"
                  className="w-full pl-12 pr-12 py-3.5 bg-white border border-[#E5E7EB] rounded-xl outline-none text-[#272936] placeholder:text-[#9CA3AF] focus:border-[#0159C7] focus:ring-2 focus:ring-[#0159C7]/10 transition-all"
                  style={{ fontSize: 15 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Password Rules */}
            {password.length > 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 space-y-2.5">
                {passwordRules.map((rule) => {
                  const passed = rule.test(password);
                  return (
                    <div key={rule.id} className="flex items-center gap-2.5">
                      {passed ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-[#D1D5DB] shrink-0" />
                      )}
                      <span
                        className={passed ? "text-green-600" : "text-[#9CA3AF]"}
                        style={{ fontSize: 13 }}
                      >
                        {rule.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Confirm Password */}
            <div>
              <label className="block text-[#272936] mb-2" style={{ fontSize: 14, fontWeight: 500 }}>
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                  placeholder="Confirm new password"
                  className={`w-full pl-12 pr-12 py-3.5 bg-white border rounded-xl outline-none text-[#272936] placeholder:text-[#9CA3AF] focus:ring-2 transition-all ${
                    confirmPassword.length > 0
                      ? passwordsMatch
                        ? "border-green-400 focus:border-green-400 focus:ring-green-400/10"
                        : "border-red-400 focus:border-red-400 focus:ring-red-400/10"
                      : "border-[#E5E7EB] focus:border-[#0159C7] focus:ring-[#0159C7]/10"
                  }`}
                  style={{ fontSize: 15 }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="mt-2 text-red-500" style={{ fontSize: 13 }}>Passwords do not match</p>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-red-600" style={{ fontSize: 13 }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !allRulesPassed || !passwordsMatch}
              className="w-full bg-[#0159C7] hover:bg-[#014BA8] text-white py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontSize: 15, fontWeight: 600 }}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Reset Password
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
