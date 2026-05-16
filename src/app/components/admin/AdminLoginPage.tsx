import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAdminAuth } from "../../context/AdminAuthContext";
import cardcentralsLogo from "../../assets/cardcentrals-logo.svg";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isSessionLoading } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // If session is loading, show spinner
  if (isSessionLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="w-8 h-8 border-3 border-[#0159C7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If already authenticated, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setError("");
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } else {
      setError(result.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] bg-[#272936] flex-col justify-between p-10">
        <div>
          <img src={cardcentralsLogo} alt="Cardcentrals" className="h-10" />
        </div>
        <div>
          <div className="w-16 h-16 bg-[#0159C7]/20 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck className="w-8 h-8 text-[#126CF8]" />
          </div>
          <h2 className="text-white mb-3" style={{ fontSize: 28, fontWeight: 700 }}>
            Admin Portal
          </h2>
          <p className="text-white/50" style={{ fontSize: 15, lineHeight: 1.7 }}>
            Manage gift card operations, monitor transactions, and oversee platform activities from the Cardcentrals administration dashboard.
          </p>
        </div>
        <p className="text-white/30" style={{ fontSize: 13 }}>
          &copy; 2026 Cardcentrals. All rights reserved.
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center bg-[#F5F7FB] p-6">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <div className="bg-[#272936] rounded-2xl px-6 py-3">
              <img src={cardcentralsLogo} alt="Cardcentrals" className="h-8" />
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-[#272936] mb-2" style={{ fontSize: 26, fontWeight: 700 }}>
              Welcome back
            </h1>
            <p className="text-[#6B7280]" style={{ fontSize: 15 }}>
              Sign in to your admin account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="block text-[#272936] mb-2" style={{ fontSize: 14, fontWeight: 500 }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#9CA3AF]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter your password"
                  className="w-full pl-12 pr-12 py-3.5 bg-white border border-[#E5E7EB] rounded-xl outline-none text-[#272936] placeholder:text-[#9CA3AF] focus:border-[#0159C7] focus:ring-2 focus:ring-[#0159C7]/10 transition-all"
                  style={{ fontSize: 15 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-[#0159C7] hover:text-[#014BA8] transition-colors"
                style={{ fontSize: 14, fontWeight: 500 }}
              >
                Forgot password?
              </Link>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-700" style={{ fontSize: 13, fontWeight: 500 }}>Login successful! Redirecting...</p>
              </div>
            )}

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
                  Sign In
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
