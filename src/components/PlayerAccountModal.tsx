import React, { useEffect, useState } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  Shield,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatLocaleDateTime, t, translateError, translateStatus } from '../lib/i18n';

export function PlayerAccountModal({ onClose }: { onClose: () => void }) {
  const { user, refreshAccount, logout, language } = useAuth();
  const [tab, setTab] = useState<'profile' | 'password' | 'sessions'>('profile');
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sessions, setSessions] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (tab === 'sessions') {
      apiFetch('/api/auth/sessions')
        .then((res) => setSessions(res.items || []))
        .catch(() => {});
    }
  }, [tab]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName }),
      });
      await refreshAccount();
      setFeedback({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', text: res.message });
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeSession = async (id: number) => {
    try {
      await apiFetch(`/api/auth/sessions/${id}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        <div className="wingo-gradient text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <UserIcon className="w-5 h-5" />
            <div>
              <h3 className="text-sm font-bold leading-tight">{user.displayName}</h3>
              <p className="text-[11px] text-white/85 font-mono-num" dir="ltr">
                ID #{user.id} · {user.email || user.phone || user.username}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15"
            aria-label={t(language, 'common_close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 border-b border-slate-100 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setTab('profile');
              setFeedback(null);
            }}
            className={`py-3 border-b-2 ${
              tab === 'profile' ? 'border-[#F54E2E] text-[#F54E2E]' : 'border-transparent text-slate-500'
            }`}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('password');
              setFeedback(null);
            }}
            className={`py-3 border-b-2 ${
              tab === 'password' ? 'border-[#F54E2E] text-[#F54E2E]' : 'border-transparent text-slate-500'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('sessions');
              setFeedback(null);
            }}
            className={`py-3 border-b-2 ${
              tab === 'sessions' ? 'border-[#F54E2E] text-[#F54E2E]' : 'border-transparent text-slate-500'
            }`}
          >
            Sessions
          </button>
        </div>

        <div className="p-5 space-y-4">
          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2.5 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 block">Status</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {translateStatus(language, user.status)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Invite Code</span>
                  <span className="font-mono-num font-bold text-[#F54E2E]" dir="ltr">
                    {user.inviteCode}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t(language, 'auth_display_name')}
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  minLength={2}
                  maxLength={50}
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-full wingo-gradient text-white font-semibold text-sm disabled:opacity-50"
              >
                Save Profile
              </button>
            </form>
          )}

          {tab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t(language, 'auth_new_password')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t(language, 'auth_confirm_password')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full h-11 rounded-full wingo-gradient text-white font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>Update Password</span>
              </button>
            </form>
          )}

          {tab === 'sessions' && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sessions.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">No active database sessions.</div>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl border border-slate-200 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-mono-num font-semibold text-slate-800 flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{s.ipAddress || 'unknown'}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate mt-0.5">
                        {formatLocaleDateTime(s.createdAt, language)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRevokeSession(s.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                      title="Revoke session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={async () => {
                await logout();
                onClose();
              }}
              className="w-full h-10 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold inline-flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t(language, 'auth_logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
