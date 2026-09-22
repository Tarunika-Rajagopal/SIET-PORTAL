import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../services/apiClient';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import GlassSurface from './GlassSurface';

export const LoginPage: React.FC = () => {
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const [emailOrRoll, setEmailOrRoll] = useState('student@srishakthi.ac.in');
  const [password, setPassword] = useState('student@123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [serverStatus, setServerStatus] = useState<{ checked: boolean; online: boolean; message: string }>({
    checked: false,
    online: false,
    message: '',
  });

  useEffect(() => {
    if (currentUser) {
      const role = (currentUser.activeRole || currentUser.role || 'student').toLowerCase();
      switch (role) {
        case 'guide':
          navigate('/guide/approve-submissions', { replace: true });
          break;
        case 'advisor':
          navigate('/advisor', { replace: true });
          break;
        case 'hod':
          navigate('/hod', { replace: true });
          break;
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'student':
        default:
          navigate('/student', { replace: true });
          break;
      }
    }
  }, [currentUser, navigate]);

  useEffect(() => {
    ApiClient.checkServerHealth().then((result) => {
      setServerStatus({ checked: true, online: result.online, message: result.message });
    });
  }, []);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleFillDemo = (id: string, pwd: string) => {
    setEmailOrRoll(id);
    setPassword(pwd);
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Try backend login first
    try {
      const backendResult = await ApiClient.login(emailOrRoll, password);
      if (backendResult.success && backendResult.token) {
        sessionStorage.setItem('siet_auth_token', backendResult.token);
        localStorage.setItem('siet_auth_token', backendResult.token);
        login(emailOrRoll, password);
        return;
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('Cannot connect') || msg.includes('not responding')) {
        setErrorMessage('Backend server is not running. Start it with: cd backend && uvicorn main:app --reload');
        return;
      }
      if (msg.includes('Database connection failed') || msg.includes('503')) {
        setErrorMessage('Database connection failed. Check your Supabase credentials in backend/.env');
        return;
      }
      if (msg.includes('Invalid credentials')) {
        setErrorMessage('Invalid credentials. Please verify your email/roll and password.');
        return;
      }
    }

    // Fallback to localStorage auth if backend is down
    const res = login(emailOrRoll, password);
    if (!res.success) {
      setErrorMessage(res.message || 'Invalid institutional credentials');
    }
  };

  const handleSendResetLink = (e: React.FormEvent) => {
    e.preventDefault();
    setForgotSuccess(true);
    setTimeout(() => {
      setForgotModalOpen(false);
      setForgotSuccess(false);
      setForgotEmail('');
    }, 2500);
  };

  return (
    <div className="min-h-screen bg-[#EAE3DE] flex flex-col justify-center items-center px-4 sm:px-6 py-8 relative overflow-hidden font-sans">
      
      {/* Full-Bleed Hand-Drawn Teal Ink Landscape Video Background */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <video
          className="absolute inset-0 w-full h-full object-cover object-bottom pointer-events-none"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4f690bd1-881a-4192-82f2-d714d34c8fb9.png"
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260901_122529_931c22c8-8d2d-47c0-ad51-b97f56a91e42.mp4"
            type="video/mp4"
          />
        </video>
      </div>

      {/* Main Login Shell - Responsive and centered */}
      <div className="w-full max-w-lg sm:max-w-xl z-10 relative">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          
          {/* Logo Container with Liquid Glass Emblem Frame */}
          <div className="relative inline-flex flex-col items-center mb-4">
            <GlassSurface
              width={104}
              height={104}
              borderRadius={26}
              borderWidth={0.08}
              displace={6}
              distortionScale={-140}
              redOffset={2}
              greenOffset={8}
              blueOffset={16}
              brightness={65}
              opacity={0.9}
              backgroundOpacity={0.35}
              saturation={1.8}
              mixBlendMode="screen"
              className="shadow-[0_12px_32px_rgba(23,90,103,0.18)] border border-white/60 hover:scale-105 transition-all duration-300"
              contentClassName="flex items-center justify-center p-2.5 w-full h-full"
            >
              <div className="w-full h-full rounded-2xl bg-white/80 backdrop-blur-xs p-2 flex items-center justify-center border border-white/70 shadow-xs">
                <img src="/logo.jpg" alt="Sri Shakthi Institute SIET CSE" className="w-full h-full object-contain rounded-xl" />
              </div>
            </GlassSurface>
          </div>

          {/* Full College Name */}
          <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#111111] tracking-tight leading-snug max-w-lg mx-auto drop-shadow-xs">
            Sri Shakthi Institute of Engineering and Technology
          </h1>

          {/* Department Name */}
          <p className="text-xs sm:text-sm font-semibold text-[#175A67] mt-1.5 tracking-wide">
            Department of Computer Science and Engineering
          </p>
        </div>

        {/* Database Connection Status Banner */}
        {serverStatus.checked && !serverStatus.online && (
          <div className="mb-4 p-3 rounded-xl bg-[#FFF3E0]/95 backdrop-blur-md border border-[#FFB74D] text-[#E65100] text-xs font-semibold flex items-center gap-2 shadow-xs relative z-10">
            <AlertTriangle size={16} className="shrink-0" />
            <div>
              <span className="font-bold">Backend Offline:</span> {serverStatus.message}. The portal will use local data only.
            </div>
          </div>
        )}

        {/* Liquid Glass Surface Card - Pure Crystal Water */}
        <GlassSurface
          theme="light"
          width="100%"
          height="auto"
          borderRadius={32}
          borderWidth={0.08}
          brightness={75}
          opacity={0.88}
          blur={10}
          displace={8}
          backgroundOpacity={0.25}
          saturation={1.75}
          distortionScale={-140}
          redOffset={3}
          greenOffset={9}
          blueOffset={18}
          mixBlendMode="screen"
          className="w-full shadow-[0_24px_50px_rgba(23,90,103,0.15),0_10px_20px_rgba(0,0,0,0.04),inset_0_1.5px_2px_rgba(255,255,255,0.95),inset_0_0_24px_rgba(255,255,255,0.35),inset_0_-2px_4px_rgba(23,90,103,0.08)] border border-white/80 backdrop-blur-xl transition-all duration-300 relative overflow-hidden"
          contentClassName="p-6 sm:p-9 w-full flex flex-col items-stretch text-left relative"
        >
          {/* Liquid Glass Lens Curvature & Caustic Reflection */}
          <div className="absolute -top-16 -left-16 -right-16 h-36 bg-gradient-to-b from-white/45 via-white/10 to-transparent rounded-[100%] pointer-events-none blur-[1px]"></div>
          
          {/* Subtle Top Pure Liquid Sheen Bar */}
          <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/90 to-transparent"></div>
          
          <div className="mb-5 flex items-center justify-between relative z-10">
            <h2 className="text-2xl font-serif font-bold text-[#111111] tracking-tight">Log in</h2>
            <span className="text-[10px] font-bold text-[#175A67] uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/70 border border-white/90 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
              Secure Access
            </span>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-[#F8EEEE]/95 backdrop-blur-md border border-[#D9AEAE] text-[#7C3838] text-xs font-semibold flex items-center gap-2 shadow-xs relative z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7C3838]"></span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            
            {/* Institutional Email Input with Liquid Glass Finish */}
            <div>
              <label className="block text-xs font-bold text-[#111111] mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#175A67]">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={emailOrRoll}
                  onChange={(e) => setEmailOrRoll(e.target.value)}
                  placeholder="e.g. student@srishakthi.ac.in"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/65 hover:bg-white/80 focus:bg-white/95 backdrop-blur-md border border-white/90 rounded-xl text-xs font-medium text-[#111111] placeholder:text-[#175A67]/60 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_2px_8px_rgba(23,90,103,0.05)] focus:outline-none focus:ring-2 focus:ring-[#175A67]/30 focus:border-[#175A67] transition"
                />
              </div>
            </div>

            {/* Password Input with Liquid Glass Finish */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-[#111111]">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-[11px] font-semibold text-[#175A67] hover:text-[#0F454F] hover:underline focus:outline-none cursor-pointer"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#175A67]">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 bg-white/65 hover:bg-white/80 focus:bg-white/95 backdrop-blur-md border border-white/90 rounded-xl text-xs font-medium text-[#111111] placeholder:text-[#175A67]/60 shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.95),0_2px_8px_rgba(23,90,103,0.05)] focus:outline-none focus:ring-2 focus:ring-[#175A67]/30 focus:border-[#175A67] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#175A67] hover:text-[#0F454F] cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button with Liquid Ink Glass Sheen */}
            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#175A67] via-[#206C7B] to-[#124B56] hover:from-[#0F454F] hover:to-[#175A67] text-white font-bold text-xs rounded-xl shadow-[0_8px_24px_rgba(23,90,103,0.35),inset_0_1px_1px_rgba(255,255,255,0.6)] border border-white/30 transition duration-200 flex items-center justify-center gap-2 group cursor-pointer hover:shadow-[0_10px_28px_rgba(23,90,103,0.45)] active:scale-[0.99]"
            >
              <span>Log in</span>
              <ArrowRight size={15} className="transform group-hover:translate-x-1 transition" />
            </button>

          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-white/60 relative z-10">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-[#175A67] uppercase tracking-wider">
                Quick-Fill Demo Credentials (Click to Test):
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleFillDemo('student@srishakthi.ac.in', 'student@123')}
                className="px-2.5 py-1.5 rounded-lg bg-white/70 hover:bg-white/90 backdrop-blur-md text-[#111111] border border-white/90 text-[11px] font-bold transition shadow-[0_2px_8px_rgba(23,90,103,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.95)] flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>👨‍🎓</span> Student
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('dr.manimegalai@siet.ac.in', 'guide@123')}
                className="px-2.5 py-1.5 rounded-lg bg-white/70 hover:bg-white/90 backdrop-blur-md text-[#111111] border border-white/90 text-[11px] font-bold transition shadow-[0_2px_8px_rgba(23,90,103,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.95)] flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>🔬</span> Guide
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('dr.karthik@siet.ac.in', 'faculty@123')}
                className="px-2.5 py-1.5 rounded-lg bg-white/70 hover:bg-white/90 backdrop-blur-md text-[#111111] border border-white/90 text-[11px] font-bold transition shadow-[0_2px_8px_rgba(23,90,103,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.95)] flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>📋</span> Advisor
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('hod.cse@siet.ac.in', 'hod@123')}
                className="px-2.5 py-1.5 rounded-lg bg-white/70 hover:bg-white/90 backdrop-blur-md text-[#111111] border border-white/90 text-[11px] font-bold transition shadow-[0_2px_8px_rgba(23,90,103,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.95)] flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>🏛️</span> HOD
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('admin@siet.ac.in', 'admin@123')}
                className="px-2.5 py-1.5 rounded-lg bg-white/80 hover:bg-white/95 backdrop-blur-md text-[#111111] border border-white/90 text-[11px] font-bold transition shadow-[0_2px_8px_rgba(23,90,103,0.06),inset_0_1px_1.5px_rgba(255,255,255,0.95)] flex items-center gap-1 cursor-pointer active:scale-95"
              >
                <span>⚙️</span> Admin
              </button>
            </div>
          </div>

        </GlassSurface>

      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
          <GlassSurface
            width="100%"
            height="auto"
            borderRadius={24}
            borderWidth={0.08}
            brightness={70}
            opacity={0.92}
            backgroundOpacity={0.65}
            saturation={1.8}
            className="w-full max-w-md shadow-2xl border border-white/70 backdrop-blur-xl"
            contentClassName="p-6 w-full text-left"
          >
            <h3 className="text-base font-serif font-bold text-[#111111]">Reset Institutional Password</h3>
            <p className="text-xs text-[#75695A] mt-1">
              Enter your registered institutional email to receive a password reset link.
            </p>

            {forgotSuccess ? (
              <div className="my-6 p-4 rounded-xl bg-[#EDF1EC]/90 border border-[#C4D1C2] text-center text-xs text-[#4A5844] font-bold flex flex-col items-center gap-2">
                <CheckCircle size={28} className="text-[#4A5844]" />
                <span>Reset instructions sent to your institutional email!</span>
              </div>
            ) : (
              <form onSubmit={handleSendResetLink} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#111111] mb-1">Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. yourname@srishakthi.ac.in"
                    className="w-full px-3.5 py-2.5 bg-white/60 border border-white/80 rounded-lg text-xs font-medium text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#175A67]/30 focus:border-[#175A67]"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-[#75695A] hover:text-[#111111] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#175A67] hover:bg-[#0F454F] text-[#FAF7F2] font-bold text-xs rounded-lg shadow-subtle border border-white/20 transition cursor-pointer"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </GlassSurface>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
