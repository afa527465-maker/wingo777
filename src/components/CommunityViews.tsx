import React, { useEffect, useState, useCallback } from 'react';
import {
  Users,
  Copy,
  Check,
  Gift,
  Headphones,
  Send,
  Paperclip,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Share2,
  FileText,
} from 'lucide-react';
import { apiFetch, formatCurrency } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  formatLocaleDate,
  formatLocaleDateTime,
  formatLocaleNumber,
  t,
  translateCategory,
  translateError,
  translateStatus,
} from '../lib/i18n';

const AGENCY_BANNER = '/src/assets/images/wingo_agency_banner_1795272907377.jpg';
const GIFT_HERO = '/src/assets/images/wingo_gift_hero_1795272907845.jpg';
const SUPPORT_BANNER = '/src/assets/images/wingo_support_banner_1795272908702.jpg';

const SUPPORT_CATEGORIES = [
  'Deposit problem',
  'Withdrawal problem',
  'Account problem',
  'Bank account problem',
  'Game problem',
  'Promotion or activity issue',
  'Cryptocurrency payment issue',
  'Other problems',
];

// ===========================================================================
// 1. AGENCY & REFERRAL VIEW (Modeled on Screenshot #7)
// ===========================================================================
export function AgencyView({ onRequireLogin }: { onRequireLogin: () => void }) {
  const { user, wallet, language } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [detailView, setDetailView] = useState<'summary' | 'subordinates' | 'commissions'>('summary');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    apiFetch('/api/agency/dashboard')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-3">
        <Users className="w-10 h-10 text-[#F54E2E] mx-auto" />
        <h2 className="text-lg font-display font-bold text-slate-900">
          {t(language, 'agency_title')}
        </h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          {t(language, 'agency_signin_desc')}
        </p>
        <button
          type="button"
          onClick={onRequireLogin}
          className="px-6 h-11 rounded-full wingo-gradient text-white font-semibold text-sm"
        >
          {t(language, 'agency_signin_btn')}
        </button>
      </div>
    );
  }

  const currency = wallet?.currency || 'USD';
  const inviteCode = data?.inviteCode || user.inviteCode;
  const inviteLink = `${window.location.origin}/?invite=${inviteCode}`;

  const copyText = (text: string, type: 'code' | 'link') => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      {/* Orange Agency Commission Hero Card */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm bg-[#F54E2E]">
        <img
          src={AGENCY_BANNER}
          alt="WinGo Agency Partner Network"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="relative z-10 p-6 text-center text-white">
          <div className="text-3xl sm:text-4xl font-display font-extrabold font-mono-num">
            {formatCurrency(data?.yesterdayCommission || '0.00', currency, language)}
          </div>
          <div className="inline-block mt-2 px-4 py-1 rounded-full bg-white text-[#F54E2E] text-xs font-bold shadow-xs">
            {t(language, 'agency_yesterday_comm')}
          </div>
          <p className="text-xs text-white/90 mt-2">
            {t(language, 'agency_lifetime_summary', {
              total: formatCurrency(data?.totalCommission || '0.00', currency, language),
              active: formatLocaleNumber(data?.activeMembers ?? 0, language),
            })}
          </p>
        </div>
      </div>

      {/* Direct vs Team Subordinates Dual Panel (Screenshot #7) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="grid grid-cols-2 wingo-gradient text-white text-center text-xs sm:text-sm font-bold py-3">
          <div>{t(language, 'agency_direct_subs')}</div>
          <div>{t(language, 'agency_team_subs')}</div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            {t(language, 'common_loading')}
          </div>
        ) : (
          <div className="grid grid-cols-2 divide-x divide-slate-100 text-center py-4 px-2">
            <div className="space-y-3.5">
              <div>
                <div className="text-lg font-mono-num font-bold text-slate-900">
                  {formatLocaleNumber(data?.direct?.registeredCount ?? 0, language)}
                </div>
                <div className="text-xs text-slate-500">{t(language, 'agency_num_register')}</div>
              </div>
              <div>
                <div className="text-lg font-mono-num font-bold text-emerald-600">
                  {formatLocaleNumber(data?.direct?.depositCount ?? 0, language)}
                </div>
                <div className="text-xs text-slate-500">{t(language, 'agency_deposit_num')}</div>
              </div>
              <div>
                <div className="text-lg font-mono-num font-bold text-[#F54E2E]">
                  {formatCurrency(data?.direct?.depositAmount || '0.00', currency, language)}
                </div>
                <div className="text-xs text-slate-500">{t(language, 'agency_deposit_amount')}</div>
              </div>
              <div>
                <div className="text-lg font-mono-num font-bold text-slate-900">
                  {formatLocaleNumber(data?.direct?.firstDepositors ?? 0, language)}
                </div>
                <div className="text-xs text-slate-500">{t(language, 'agency_first_depositors')}</div>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <div className="text-lg font-mono-num font-bold text-slate-900">
                  {formatLocaleNumber(data?.team?.registeredCount ?? 0, language)}
                </div>
                <div className="text-xs text-slate-500">{t(language, 'agency_num_register')}</div>
              </div>
              <div>
                <div className="text-lg font-mono-num font-bold text-emerald-600">
                  {formatLocaleNumber(data?.team?.depositCount ?? 0, language)}
                </div>
                <div className="text-xs text-slate-500">{t(language, 'agency_deposit_num')}</div>
              </div>
              <div>
                <div className="text-lg font-mono-num font-bold text-[#F54E2E]">
                  {formatCurrency(data?.team?.depositAmount || '0.00', currency, language)}
                </div>
                <div className="text-xs text-slate-500">{t(language, 'agency_deposit_amount')}</div>
              </div>
              <div>
                <div className="text-lg font-mono-num font-bold text-slate-900">
                  {formatLocaleNumber(data?.team?.firstDepositors ?? 0, language)}
                </div>
                <div className="text-xs text-slate-500">{t(language, 'agency_first_depositors')}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INVITATION LINK CTA & Action Rows */}
      <button
        type="button"
        onClick={() => copyText(inviteLink, 'link')}
        className="w-full h-12 rounded-full wingo-gradient text-white font-display font-bold text-sm tracking-wide shadow-sm hover:opacity-95 flex items-center justify-center gap-2"
      >
        {copied === 'link' ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
        <span>
          {copied === 'link'
            ? t(language, 'agency_invite_link_copied')
            : t(language, 'agency_invite_link_btn')}
        </span>
      </button>

      <div className="space-y-2.5">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#F54E2E] flex items-center justify-center">
              <Copy className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {t(language, 'agency_copy_invite_code')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => copyText(inviteCode, 'code')}
            className="inline-flex items-center gap-2 text-sm font-mono-num font-bold text-slate-600 hover:text-[#F54E2E] min-h-[40px] px-2"
          >
            <span dir="ltr">{inviteCode}</span>
            {copied === 'code' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setDetailView(detailView === 'subordinates' ? 'summary' : 'subordinates')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#F54E2E] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {t(language, 'agency_subordinate_data')}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
        </button>

        {detailView === 'subordinates' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2 text-xs">
            {(data?.subordinates || []).length === 0 ? (
              <p className="text-slate-400 text-center py-4">
                {t(language, 'agency_no_subordinates')}
              </p>
            ) : (
              data.subordinates.map((s: any) => (
                <div key={s.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="font-bold text-slate-800">{s.displayName}</div>
                    <div className="text-slate-400">
                      {t(language, 'agency_joined', {
                        date: formatLocaleDate(s.joinedAt, language),
                      })}
                    </div>
                  </div>
                  <div className="text-end text-slate-600">
                    {t(language, 'agency_tier', { tier: s.tier })} · {translateStatus(language, s.status)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => setDetailView(detailView === 'commissions' ? 'summary' : 'commissions')}
          className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-50 text-[#F54E2E] flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {t(language, 'agency_commission_detail')}
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 rtl:rotate-180" />
        </button>

        {detailView === 'commissions' && (
          <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-2 text-xs">
            {(data?.commissionHistory || []).length === 0 ? (
              <p className="text-slate-400 text-center py-4">
                {t(language, 'agency_no_commissions')}
              </p>
            ) : (
              data.commissionHistory.map((c: any) => (
                <div key={c.id} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <div className="font-bold text-slate-800">
                      {t(language, 'agency_tier', { tier: c.tier })} · {c.sourceDisplayName || 'Member'} ({c.ratePercent}%)
                    </div>
                    <div className="text-slate-400 font-mono-num" dir="ltr">
                      {c.sourceRef}
                    </div>
                  </div>
                  <div className="font-mono-num font-bold text-emerald-600">
                    +{formatCurrency(c.commissionAmount, currency, language)}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// 2. GIFT CODE & PROMOTIONS VIEW (Modeled on Screenshot #8)
// ===========================================================================
export function GiftCodeView({ onRequireLogin }: { onRequireLogin: () => void }) {
  const { user, wallet, language, refreshAccount } = useAuth();
  const [code, setCode] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/gifts/history');
      setHistory(res.items || []);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ message: string }>('/api/gifts/redeem', {
        method: 'POST',
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      setFeedback({ type: 'success', text: res.message });
      setCode('');
      await Promise.all([refreshAccount(), loadHistory()]);
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err.message) });
    } finally {
      setBusy(false);
    }
  };

  const currency = wallet?.currency || 'USD';

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      {/* Hero Banner with original generated WinGo Gift graphic */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm min-h-[168px] flex items-center bg-[#F54E2E]">
        <img
          src={GIFT_HERO}
          alt="WinGo Gift Code Rewards"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#E63E22]/90 via-[#F54E2E]/65 to-transparent" />
        <div className="relative z-10 p-6 text-white max-w-xs">
          <h2 className="text-2xl font-display font-extrabold">{t(language, 'gift_hero_title')}</h2>
          <p className="text-xs text-white/90 mt-1.5 leading-relaxed">
            {t(language, 'gift_hero_subtitle')}
          </p>
        </div>
      </div>

      {/* Gift Code Input Card */}
      <form
        onSubmit={handleRedeem}
        className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4"
      >
        <h3 className="text-sm font-display font-bold text-slate-900">
          {t(language, 'gift_input_heading')}
        </h3>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
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

        <input
          type="text"
          dir="ltr"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t(language, 'gift_input_placeholder')}
          required
          className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono-num uppercase text-slate-900 focus:outline-none focus:border-orange-500 focus:bg-white"
        />

        <button
          type="submit"
          disabled={busy}
          className="w-full h-12 rounded-full wingo-gradient text-white font-bold text-sm shadow-sm hover:opacity-95 disabled:opacity-50"
        >
          {busy ? t(language, 'gift_validating') : t(language, 'gift_receive_btn')}
        </button>
      </form>

      {/* Redemption History */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-3">
        <div className="flex items-center gap-2">
          <Gift className="w-4 h-4 text-[#F54E2E]" />
          <h3 className="text-sm font-display font-bold text-slate-900">
            {t(language, 'gift_history_title')}
          </h3>
        </div>
        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            {t(language, 'gift_no_history')}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {history.map((h) => (
              <div key={h.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-mono-num font-bold text-slate-900">
                    <span dir="ltr">{h.code}</span> ·{' '}
                    <span className="font-sans font-normal text-slate-500">{h.title}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {formatLocaleDateTime(h.redeemedAt, language)} · <span dir="ltr">{h.txRef}</span>
                  </div>
                </div>
                <div className="font-mono-num font-bold text-emerald-600">
                  +{formatCurrency(h.rewardAmount, currency, language)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Redemption Notes */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-2 text-xs text-slate-600">
        <h3 className="text-sm font-display font-bold text-slate-900">
          {t(language, 'gift_notes_title')}
        </h3>
        <p>• {t(language, 'gift_note_1')}</p>
        <p>• {t(language, 'gift_note_2')}</p>
        <p>• {t(language, 'gift_note_3')}</p>
      </div>
    </div>
  );
}

// ===========================================================================
// 3. CUSTOMER SERVICE HELP CENTER (Modeled on Screenshots #9 & #10)
// ===========================================================================
export function SupportCenterView({ onRequireLogin }: { onRequireLogin: () => void }) {
  const { user, language } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketDetail, setTicketDetail] = useState<any>(null);

  // Create ticket form
  const [category, setCategory] = useState<string>(SUPPORT_CATEGORIES[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string | undefined>(undefined);
  const [replyText, setReplyText] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadTickets = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiFetch('/api/support/tickets');
      setTickets(res.items || []);
    } catch {
      // ignore
    }
  }, [user]);

  const loadTicketDetail = useCallback(async (id: number) => {
    try {
      const res = await apiFetch(`/api/support/tickets/${id}`);
      setTicketDetail(res);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (selectedTicketId) loadTicketDetail(selectedTicketId);
  }, [selectedTicketId, loadTicketDetail]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setFeedback({ type: 'error', text: 'Only PNG, JPEG, or WebP images are supported.' });
      return;
    }
    if (file.size > 1.5 * 1024 * 1024) {
      setFeedback({ type: 'error', text: 'Image must be under 1.5MB.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setAttachmentDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onRequireLogin();
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/support/tickets', {
        method: 'POST',
        body: JSON.stringify({ category, subject, message, attachmentDataUrl }),
      });
      setFeedback({ type: 'success', text: `${res.ticket.ticketRef}` });
      setSubject('');
      setMessage('');
      setAttachmentDataUrl(undefined);
      await loadTickets();
      setSelectedTicketId(res.ticket.id);
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err.message) });
    } finally {
      setBusy(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId || !replyText.trim()) return;
    setBusy(true);
    try {
      await apiFetch(`/api/support/tickets/${selectedTicketId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText.trim() }),
      });
      setReplyText('');
      await loadTicketDetail(selectedTicketId);
      await loadTickets();
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err.message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Original WinGo Customer Service Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden shadow-sm min-h-[168px] flex items-center bg-white border border-slate-100">
        <img
          src={SUPPORT_BANNER}
          alt="WinGo Customer Service Help Center"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover object-right"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent" />
        <div className="relative z-10 p-6 max-w-md">
          <div className="text-xs font-bold text-[#F54E2E] uppercase tracking-wide">
            {t(language, 'support_kicker')}
          </div>
          <h2 className="text-2xl font-display font-extrabold text-slate-900 mt-1">
            {t(language, 'support_hero_title')}
          </h2>
          <p className="text-xs text-slate-600 mt-1.5">
            {t(language, 'support_hero_subtitle')}
          </p>
        </div>
      </div>

      {!user ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-3">
          <Headphones className="w-10 h-10 text-[#F54E2E] mx-auto" />
          <p className="text-sm text-slate-600">{t(language, 'support_signin_prompt')}</p>
          <button
            type="button"
            onClick={onRequireLogin}
            className="px-6 h-11 rounded-full wingo-gradient text-white font-semibold text-sm"
          >
            {t(language, 'support_signin_btn')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Submit New Support Ticket */}
          <form
            onSubmit={handleCreateTicket}
            className="lg:col-span-6 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4"
          >
            <h3 className="text-sm font-display font-bold text-slate-900">
              {t(language, 'support_submit_case_title')}
            </h3>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 border ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                <span>{feedback.text}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                {t(language, 'support_select_category')}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SUPPORT_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2.5 rounded-xl text-start text-xs font-semibold border transition-colors ${
                      category === cat
                        ? 'border-[#F54E2E] bg-orange-50 text-[#F54E2E]'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {translateCategory(language, cat)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t(language, 'support_subject_label')}
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t(language, 'support_subject_placeholder')}
                required
                className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t(language, 'support_description_label')}
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t(language, 'support_description_placeholder')}
                required
                className="w-full p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-[#F54E2E] cursor-pointer min-h-[40px]">
                <Paperclip className="w-4 h-4" />
                <span>
                  {attachmentDataUrl
                    ? t(language, 'support_screenshot_attached')
                    : t(language, 'support_attach_screenshot')}
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handleFileChange} className="hidden" />
              </label>
              {attachmentDataUrl && (
                <button
                  type="button"
                  onClick={() => setAttachmentDataUrl(undefined)}
                  className="text-xs text-red-500 hover:underline"
                >
                  {t(language, 'common_remove')}
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={busy}
              className="w-full h-12 rounded-full wingo-gradient text-white font-bold text-sm"
            >
              {busy ? t(language, 'support_submitting') : t(language, 'support_submit_btn')}
            </button>
          </form>

          {/* Ticket List & Active Conversation */}
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-display font-bold text-slate-900">
                  {t(language, 'support_my_tickets')}
                </h3>
                <MessageSquare className="w-4 h-4 text-[#F54E2E]" />
              </div>
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {tickets.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    {t(language, 'support_no_tickets')}
                  </div>
                ) : (
                  tickets.map((tk) => (
                    <button
                      key={tk.id}
                      type="button"
                      onClick={() => setSelectedTicketId(tk.id)}
                      className={`w-full text-start p-3.5 hover:bg-slate-50 flex items-center justify-between gap-2 ${
                        selectedTicketId === tk.id ? 'bg-orange-50/50' : ''
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{tk.subject}</div>
                        <div className="text-[11px] text-slate-500">
                          <span dir="ltr">{tk.ticketRef}</span> · {translateCategory(language, tk.category)}
                        </div>
                      </div>
                      <span className="text-[11px] font-bold uppercase text-[#F54E2E] shrink-0">
                        {translateStatus(language, tk.status)}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {ticketDetail && (
              <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-3">
                <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900">{ticketDetail.ticket.subject}</div>
                    <div className="text-[11px] text-slate-500">
                      <span dir="ltr">{ticketDetail.ticket.ticketRef}</span> · {t(language, 'common_status')}:{' '}
                      {translateStatus(language, ticketDetail.ticket.status)}
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pe-1">
                  {(ticketDetail.messages || []).map((m: any) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl text-xs max-w-[88%] ${
                        m.senderRole === 'admin'
                          ? 'bg-orange-50 border border-orange-100 text-slate-800 me-auto'
                          : 'bg-slate-900 text-white ms-auto'
                      }`}
                    >
                      <div className="text-[10px] font-bold opacity-75 mb-1">
                        {m.senderRole === 'admin'
                          ? t(language, 'support_agent_name')
                          : t(language, 'support_you')}
                      </div>
                      <p className="whitespace-pre-wrap">{m.message}</p>
                      {m.attachmentDataUrl && (
                        <img
                          src={m.attachmentDataUrl}
                          alt="Ticket attachment"
                          className="mt-2 rounded-lg max-h-40 object-contain"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleReply} className="flex gap-2 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t(language, 'support_reply_placeholder')}
                    className="flex-1 h-10 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="submit"
                    disabled={busy || !replyText.trim()}
                    className="h-10 px-4 rounded-xl wingo-gradient text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> {t(language, 'common_send')}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
