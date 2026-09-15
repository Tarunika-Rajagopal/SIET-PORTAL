import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, CheckCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, currentUser } = useAuth();
  const navigate = useNavigate();
  const [emailOrRoll, setEmailOrRoll] = useState('student@srishakthi.ac.in');
  const [password, setPassword] = useState('student@123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const handleFillDemo = (id: string, pwd: string) => {
    setEmailOrRoll(id);
    setPassword(pwd);
    setErrorMessage('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const res = login(emailOrRoll, password);
    if (!res.success) {
      setErrorMessage(res.message || 'Invalid institutional credentials');
      return;
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
    <div className="min-h-screen bg-[#EFF3F1] flex flex-col justify-center items-center px-4 sm:px-6 py-8 relative overflow-hidden font-sans">
      
      {/* Ambient Decorative Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-mint-200/60 rounded-full blur-3xl opacity-60 pointer-events-none animate-pulse"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-mint-100/70 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
      <div className="absolute top-1/3 -right-20 w-64 h-64 bg-teal-100/40 rounded-full blur-2xl opacity-40 pointer-events-none"></div>

      {/* Main Login Shell - Expanded horizontally and responsive */}
      <div className="w-full max-w-lg sm:max-w-xl z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          
          {/* Logo Container with Glow & Emblem */}
          <div className="relative inline-flex flex-col items-center mb-4">
            <div className="relative group">
              {/* Soft Ambient Glow */}
              <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/30 via-mint-400/40 to-teal-500/30 rounded-3xl blur-xl group-hover:opacity-100 transition duration-500"></div>
              
              {/* Institutional Logo from Attached Image */}
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-2 shadow-xl shadow-mint-700/20 border border-mint-200 transform hover:scale-105 transition-all duration-300 flex items-center justify-center">
                <img src="/logo.jpg" alt="Sri Shakthi Institute SIET CSE" className="w-full h-full object-contain rounded-2xl" />
              </div>
            </div>
          </div>

          {/* Full College Name */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug max-w-lg mx-auto">
            Sri Shakthi Institute of Engineering and Technology
          </h1>

          {/* Department Name */}
          <p className="text-xs sm:text-sm font-bold text-mint-700 mt-1.5">
            Department of Computer Science and Engineering
          </p>
        </div>

        {/* Crisp White Card - Expanded and Responsive */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-6 sm:p-9 shadow-card border border-[#E2E8E4] relative overflow-hidden">
          {/* Subtle Top Accent Bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-mint-500 to-teal-500"></div>
          
          <div className="mb-5">
            <h2 className="text-xl font-extrabold text-slate-900">Log in</h2>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Institutional Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  value={emailOrRoll}
                  onChange={(e) => setEmailOrRoll(e.target.value)}
                  placeholder="e.g. student@srishakthi.ac.in"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/80 border border-[#E2E8E4] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500 focus:bg-white transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-[11px] font-semibold text-mint-600 hover:text-mint-700 hover:underline focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border border-[#E2E8E4] rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-mint-500/20 focus:border-mint-500 focus:bg-white transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-mint-500 to-emerald-600 hover:from-mint-600 hover:to-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-hover transition duration-200 flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Log in</span>
              <ArrowRight size={15} className="transform group-hover:translate-x-1 transition" />
            </button>

          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-[#E2E8E4]">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Quick-Fill Demo Credentials (Click to Test):
              </span>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleFillDemo('student@srishakthi.ac.in', 'student@123')}
                className="px-2.5 py-1.5 rounded-lg bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-[11px] font-bold transition flex items-center gap-1"
              >
                <span>👨‍🎓</span> Student
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('dr.manimegalai@siet.ac.in', 'guide@123')}
                className="px-2.5 py-1.5 rounded-lg bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-[11px] font-bold transition flex items-center gap-1"
              >
                <span>🔬</span> Guide
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('dr.karthik@siet.ac.in', 'faculty@123')}
                className="px-2.5 py-1.5 rounded-lg bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-[11px] font-bold transition flex items-center gap-1"
              >
                <span>📋</span> Advisor
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('hod.cse@siet.ac.in', 'hod@123')}
                className="px-2.5 py-1.5 rounded-lg bg-mint-50 hover:bg-mint-100 text-mint-800 border border-mint-200 text-[11px] font-bold transition flex items-center gap-1"
              >
                <span>🏛️</span> HOD
              </button>

              <button
                type="button"
                onClick={() => handleFillDemo('admin@siet.ac.in', 'admin@123')}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-[11px] font-bold transition flex items-center gap-1"
              >
                <span>⚙️</span> Admin
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-[#E2E8E4] text-left">
            <h3 className="text-base font-extrabold text-slate-900">Reset Institutional Password</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your registered institutional email to receive a password reset link.
            </p>

            {forgotSuccess ? (
              <div className="my-6 p-4 rounded-2xl bg-mint-50 border border-mint-200 text-center text-xs text-mint-800 font-bold flex flex-col items-center gap-2">
                <CheckCircle size={28} className="text-mint-600" />
                <span>Reset instructions sent to your institutional email!</span>
              </div>
            ) : (
              <form onSubmit={handleSendResetLink} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Institutional Email</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="e.g. yourname@srishakthi.ac.in"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#E2E8E4] rounded-xl text-xs focus:outline-none focus:border-mint-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-mint-500 hover:bg-mint-600 text-white font-bold text-xs rounded-xl shadow-sm transition"
                  >
                    Send Reset Link
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default LoginPage;
