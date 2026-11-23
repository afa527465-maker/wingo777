import React, { useState } from 'react';
import {
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Gift,
  ShieldCheck,
  ChevronLeft,
  Headphones,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { WinGoLogo } from './WinGoBrand';
import { LanguageSelector } from './LanguageSelector';
import { apiFetch, type UserProfile, type WalletData } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { t, translateError } from '../lib/i18n';

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (IN)' },
  { code: '+855', label: '+855 (KH)' },
  { code: '+1', label: '+1 (US)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+65', label: '+65 (SG)' },
  { code: '+66', label: '+66 (TH)' },
  { code: '+84', label: '+84 (VN)' },
];

export function AuthScreen({
  initialMode = 'login',
  onSuccess,
  onCancel,
  onOpenSupport,
}: {
  initialMode?: 'login' | 'register';
  onSuccess: () => void;
  onCancel?: () => void;
  onOpenSupport: () => void;
}) {
  const { signInWithGoogle, setAuthenticatedSession, language } = useAuth();
  const [screen, setScreen] = useState<'login' | 'register' | 'verify' | 'pending_approval' | 'forgot'>(initialMode);
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [jurisdictionCode, setJurisdictionCode] = useState('IN');

  // Verification / Recovery states
  const [pendingIdentifier, setPendingIdentifier] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [providerConfigured, setProviderConfigured] = useState<boolean>(true);
  const [newPassword, setNewPassword] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<'request' | 'confirm'>('request');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile; wallet: WalletData }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({
            method,
            countryCode,
            phone: method === 'phone' ? phone : undefined,
            email: method === 'email' ? email : undefined,
            password,
            rememberMe,
          }),
        }
      );
      setAuthenticatedSession(res.token, res.user, res.wallet);
      onSuccess();
    } catch (err: any) {
      if (err?.data?.requiresApproval) {
        setError('Waiting for Administrator Approval');
      } else if (err?.data?.requiresVerification && err?.data?.identifier) {
        setPendingIdentifier(err.data.identifier);
        setProviderConfigured(err.data.verificationProviderConfigured !== false);
        setScreen('verify');
        setError(err?.message || t(language, 'auth_verify_subtitle'));
      } else {
        setError(translateError(language, err?.message));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (!acceptedTerms || !ageConfirmed) {
      setError(t(language, 'auth_terms_error'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiFetch<{
        message: string;
        identifier: string;
        requiresVerification?: boolean;
        requiresApproval?: boolean;
        verificationProviderConfigured?: boolean;
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          method,
          countryCode,
          phone: method === 'phone' ? phone : undefined,
          email: method === 'email' ? email : undefined,
          displayName: displayName.trim() || undefined,
          password,
          confirmPassword,
          inviteCode: inviteCode.trim(),
          acceptedTerms: true,
          ageConfirmed: true,
          jurisdictionCode,
        }),
      });
      setPendingIdentifier(res.identifier);
      if (res.requiresApproval || !res.requiresVerification) {
        setNotice(res.message || 'Registration Successful! Your account is waiting for administrator approval.');
        setScreen('pending_approval');
      } else {
        setProviderConfigured(res.verificationProviderConfigured !== false);
        setNotice(res.message);
        setScreen('verify');
      }
    } catch (err: any) {
      setError(translateError(language, err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<{ token: string; user: UserProfile; wallet: WalletData }>(
        '/api/auth/verify',
        {
          method: 'POST',
          body: JSON.stringify({ identifier: pendingIdentifier, code: verifyCode }),
        }
      );
      setAuthenticatedSession(res.token, res.user, res.wallet);
      onSuccess();
    } catch (err: any) {
      setError(translateError(language, err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);
    try {
      if (recoveryStep === 'request') {
        const res = await apiFetch<{ message: string }>(
          '/api/auth/forgot-password',
          {
            method: 'POST',
            body: JSON.stringify({ identifier: pendingIdentifier }),
          }
        );
        setNotice(res.message);
        setRecoveryStep('confirm');
      } else {
        const res = await apiFetch<{ message: string }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({
            identifier: pendingIdentifier,
            code: verifyCode,
            newPassword,
          }),
        });
        setNotice(res.message);
        setVerifyCode('');
        setNewPassword('');
        setRecoveryStep('request');
        setScreen('login');
      }
    } catch (err: any) {
      setError(translateError(language, err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      setError(translateError(language, err?.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center">
      {/* Top Orange Hero Header matching WinGo mobile aesthetic */}
      <div className="w-full wingo-gradient-soft text-white pb-10 pt-4 px-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            {onCancel ? (
              <button
                type="button"
                onClick={onCancel}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full hover:bg-white/15 transition-colors"
                aria-label={t(language, 'common_back')}
              >
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" />
              </button>
            ) : (
              <span className="w-11" />
            )}

            <WinGoLogo variant="light" size="md" />

            <LanguageSelector compact />
          </div>

          <h1 className="text-2xl font-display font-bold tracking-tight">
            {screen === 'register'
              ? t(language, 'auth_register')
              : screen === 'verify'
                ? t(language, 'auth_verify_title')
                : screen === 'forgot'
                  ? t(language, 'auth_recovery_title')
                  : t(language, 'auth_login')}
          </h1>
          <p className="text-sm text-white/90 mt-1.5 leading-relaxed">
            {screen === 'register'
              ? t(language, 'auth_register_subtitle')
              : screen === 'verify'
                ? t(language, 'auth_verify_subtitle')
                : screen === 'forgot'
                  ? t(language, 'auth_recovery_subtitle')
                  : t(language, 'auth_login_subtitle')}
          </p>
        </div>
      </div>

      {/* Main White Card Container */}
      <div className="w-full max-w-md px-4 -mt-6 pb-12">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          {(screen === 'login' || screen === 'register') && (
            <div className="grid grid-cols-2 border-b border-slate-100 mb-5">
              <button
                type="button"
                onClick={() => {
                  setMethod('phone');
                  setError(null);
                }}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  method === 'phone'
                    ? 'border-[#F54E2E] text-[#F54E2E]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>{t(language, 'auth_tab_phone')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMethod('email');
                  setError(null);
                }}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 pb-2.5 text-sm font-semibold border-b-2 transition-colors ${
                  method === 'email'
                    ? 'border-[#F54E2E] text-[#F54E2E]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>{t(language, 'auth_tab_email')}</span>
              </button>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{notice}</span>
            </div>
          )}

          {screen === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              {method === 'phone' ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {t(language, 'auth_phone_label')}
                  </label>
                  <div className="flex gap-2" dir="ltr">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="h-12 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t(language, 'auth_phone_placeholder')}
                      required
                      className="flex-1 min-w-0 h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {t(language, 'auth_email_label')}
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t(language, 'auth_email_placeholder')}
                    required
                    className="w-full h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t(language, 'auth_password')}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t(language, 'auth_password_placeholder')}
                    required
                    className="w-full h-12 ps-3.5 pe-12 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute end-1 top-1 h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-700"
                    aria-label={t(language, 'auth_password')}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="inline-flex items-center gap-2 text-slate-600 cursor-pointer min-h-[40px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#F54E2E]"
                  />
                  <span>{t(language, 'auth_remember_login')}</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setScreen('forgot');
                    setRecoveryStep('request');
                    setError(null);
                    setNotice(null);
                  }}
                  className="text-[#F54E2E] font-semibold hover:underline min-h-[40px] px-1"
                >
                  {t(language, 'auth_forgot_password')}
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-full wingo-gradient text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                {submitting ? t(language, 'auth_signing_in') : t(language, 'auth_login')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setScreen('register');
                  setError(null);
                  setNotice(null);
                }}
                className="w-full h-12 rounded-full border border-[#F54E2E] text-[#F54E2E] font-semibold text-sm hover:bg-orange-50 transition-colors"
              >
                {t(language, 'auth_register_new')}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-100" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">{t(language, 'auth_or_continue')}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full h-12 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-[#F54E2E]" />
                <span>{t(language, 'auth_google_signin')}</span>
              </button>
            </form>
          )}

          {screen === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              {method === 'phone' ? (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {t(language, 'auth_phone_label')}
                  </label>
                  <div className="flex gap-2" dir="ltr">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="h-12 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:border-orange-500"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder={t(language, 'auth_phone_placeholder')}
                      required
                      className="flex-1 min-w-0 h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {t(language, 'auth_email_label')}
                  </label>
                  <input
                    type="email"
                    dir="ltr"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t(language, 'auth_email_placeholder')}
                    required
                    className="w-full h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t(language, 'auth_display_name')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder={t(language, 'auth_display_name_placeholder')}
                  className="w-full h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t(language, 'auth_set_password')}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t(language, 'auth_set_password_placeholder')}
                    required
                    className="w-full h-12 ps-3.5 pe-12 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute end-1 top-1 h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-700"
                    aria-label={t(language, 'auth_set_password')}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t(language, 'auth_confirm_password')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t(language, 'auth_confirm_password_placeholder')}
                    required
                    className="w-full h-12 ps-3.5 pe-12 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute end-1 top-1 h-10 w-10 flex items-center justify-center text-slate-400 hover:text-slate-700"
                    aria-label={t(language, 'auth_confirm_password')}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {t(language, 'auth_invite_code')}
                  </label>
                  <div className="relative">
                    <Gift className="w-4 h-4 text-orange-500 absolute start-3 top-4" />
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      placeholder={t(language, 'common_optional')}
                      className="w-full h-12 ps-9 pe-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono-num uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                    {t(language, 'auth_region')}
                  </label>
                  <select
                    value={jurisdictionCode}
                    onChange={(e) => setJurisdictionCode(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  >
                    <option value="IN">{t(language, 'auth_region_india')}</option>
                    <option value="KH">{t(language, 'auth_region_cambodia')}</option>
                    <option value="SG">{t(language, 'auth_region_singapore')}</option>
                    <option value="US">{t(language, 'auth_region_us')}</option>
                    <option value="GB">{t(language, 'auth_region_uk')}</option>
                    <option value="OTHER">{t(language, 'auth_region_other')}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ageConfirmed}
                    onChange={(e) => setAgeConfirmed(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded accent-[#F54E2E]"
                  />
                  <span>{t(language, 'auth_age_confirm')}</span>
                </label>
                <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded accent-[#F54E2E]"
                  />
                  <span>
                    {t(language, 'auth_terms_prefix')}{' '}
                    <span className="text-[#F54E2E] font-semibold">{t(language, 'auth_terms_link')}</span>.
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-full wingo-gradient text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                {submitting ? t(language, 'auth_creating_account') : t(language, 'auth_register')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setScreen('login');
                  setError(null);
                  setNotice(null);
                }}
                className="w-full h-12 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                {t(language, 'auth_have_account')} ·{' '}
                <span className="text-[#F54E2E]">{t(language, 'auth_login')}</span>
              </button>
            </form>
          )}

          {screen === 'pending_approval' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-semibold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Registration Successful! Your account is waiting for administrator approval.</span>
                </div>
                {pendingIdentifier && (
                  <p className="text-xs text-amber-800">
                    Registered account: <strong dir="ltr">{pendingIdentifier}</strong>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setScreen('login');
                  setError(null);
                  setNotice(null);
                }}
                className="w-full h-12 rounded-full wingo-gradient text-white font-semibold text-sm shadow-sm hover:opacity-95 transition-all"
              >
                {t(language, 'auth_back_to_login')}
              </button>
            </div>
          )}

          {screen === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-slate-600">
                {t(language, 'auth_verify_target')}:{' '}
                <strong className="text-slate-900" dir="ltr">
                  {pendingIdentifier}
                </strong>
              </p>

              {!providerConfigured && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                  Verification provider: <strong>Not configured</strong>. Your account has been saved in PostgreSQL with status <strong>Pending Verification</strong>. Configure SMTP/SMS in server environment variables or have an authorized administrator verify your account in the Admin Panel.
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t(language, 'auth_code_label')}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder={t(language, 'auth_code_placeholder')}
                  required
                  className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-lg font-mono-num tracking-[0.35em] text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting || verifyCode.length !== 6}
                className="w-full h-12 rounded-full wingo-gradient text-white font-semibold text-sm disabled:opacity-60"
              >
                {submitting ? t(language, 'auth_verifying') : t(language, 'auth_verify_activate')}
              </button>

              <button
                type="button"
                onClick={() => setScreen('login')}
                className="w-full h-11 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                {t(language, 'auth_back_to_login')}
              </button>
            </form>
          )}

          {screen === 'forgot' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                  {t(language, 'auth_registered_identifier')}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={pendingIdentifier}
                  onChange={(e) => setPendingIdentifier(e.target.value)}
                  placeholder="+919876543210 / name@example.com"
                  required
                  disabled={recoveryStep === 'confirm'}
                  className="w-full h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>



              {recoveryStep === 'confirm' && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      {t(language, 'auth_recovery_code_label')}
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      maxLength={6}
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder={t(language, 'auth_code_placeholder')}
                      required
                      className="w-full h-12 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-800 mb-1.5">
                      {t(language, 'auth_new_password')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute start-3.5 top-4" />
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder={t(language, 'auth_set_password_placeholder')}
                        required
                        className="w-full h-12 ps-10 pe-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-full wingo-gradient text-white font-semibold text-sm disabled:opacity-60"
              >
                {submitting
                  ? t(language, 'auth_processing')
                  : recoveryStep === 'request'
                    ? t(language, 'auth_send_recovery')
                    : t(language, 'auth_reset_password')}
              </button>

              <button
                type="button"
                onClick={() => {
                  setScreen('login');
                  setRecoveryStep('request');
                  setError(null);
                }}
                className="w-full h-11 text-sm font-medium text-slate-500 hover:text-slate-800"
              >
                {t(language, 'auth_back_to_login')}
              </button>
            </form>
          )}

          {/* Customer Service Footer Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center">
            <button
              type="button"
              onClick={onOpenSupport}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-[#F54E2E] min-h-[44px] px-3"
            >
              <Headphones className="w-4 h-4 text-[#F54E2E]" />
              <span>{t(language, 'auth_customer_service')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
