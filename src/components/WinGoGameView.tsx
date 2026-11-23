import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  RefreshCw,
  Clock,
  Volume2,
  BookOpen,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Shuffle,
  CheckCircle2,
  AlertCircle,
  Lock,
  Sparkles,
  BarChart3,
  History,
  Ticket,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from 'recharts';
import {
  apiFetch,
  createIdempotencyKey,
  formatCurrency,
  type WinGoMode,
} from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  formatLocaleNumber,
  formatLocaleTime,
  t,
  translateError,
  translateStatus,
} from '../lib/i18n';
import { ColorDots, NumberBall } from './WinGoBrand';

interface LiveGameState {
  serverTimeMs: number;
  mode: WinGoMode;
  modeConfig: {
    mode: WinGoMode;
    label: string;
    shortLabel: string;
    durationSeconds: number;
    cutoffSeconds: number;
  };
  ruleset: {
    version: string;
    ownerApprovedForProd: boolean;
    config: {
      currency: string;
      feePercent: number;
      minWager: number;
      maxWager: number;
      unitPresets: number[];
      stakeMultipliers: number[];
      payoutMultipliers: {
        colorStandard: number;
        colorSplitViolet: number;
        violet: number;
        numberExact: number;
        bigSmall: number;
      };
    };
  };
  currentRound: {
    id: number;
    periodId: string;
    status: 'open' | 'closed';
    startsAt: string;
    closesAt: string;
    endsAt: string;
    remainingSeconds: number;
    cutoffRemainingSeconds: number;
    bettingOpen: boolean;
    serverSeedHash: string;
  };
  recentResults: {
    id: number;
    periodId: string;
    mode: string;
    winningNumber: number;
    winningColors: string[];
    winningSize: string;
    endsAt: string;
    settledAt: string | null;
    serverSeedHash: string;
    serverSeedReveal: string | null;
  }[];
}

interface PendingSelection {
  category: 'color' | 'number' | 'size';
  selection: string;
  label: string;
  accentClass: string;
}

const MODES: { id: WinGoMode; subtitleKey: 'game_mode_30s' | 'game_mode_1m' | 'game_mode_3m' | 'game_mode_5m'; labelKey: 'game_mode_label_30s' | 'game_mode_label_1m' | 'game_mode_label_3m' | 'game_mode_label_5m' }[] = [
  { id: '30s', subtitleKey: 'game_mode_30s', labelKey: 'game_mode_label_30s' },
  { id: '1m', subtitleKey: 'game_mode_1m', labelKey: 'game_mode_label_1m' },
  { id: '3m', subtitleKey: 'game_mode_3m', labelKey: 'game_mode_label_3m' },
  { id: '5m', subtitleKey: 'game_mode_5m', labelKey: 'game_mode_label_5m' },
];

export function WinGoGameView({
  onOpenDeposit,
  onOpenWithdraw,
  onRequireLogin,
}: {
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onRequireLogin: () => void;
}) {
  const { user, wallet, refreshAccount, language } = useAuth();
  const [mode, setMode] = useState<WinGoMode>('30s');
  const [state, setState] = useState<LiveGameState | null>(null);
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const [nowTickMs, setNowTickMs] = useState(Date.now());
  const [announcement, setAnnouncement] = useState<string>(
    'WinGo runs authoritative server-timed rounds with SHA-256 seed commitments and transactional PostgreSQL settlements.'
  );
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Betting UI state
  const [quickMultiplier, setQuickMultiplier] = useState(1);
  const [slip, setSlip] = useState<PendingSelection | null>(null);
  const [unitAmount, setUnitAmount] = useState(10);
  const [manualUnitText, setManualUnitText] = useState('10');
  const [slipMultiplier, setSlipMultiplier] = useState(1);
  const [placingBet, setPlacingBet] = useState(false);
  const [betFeedback, setBetFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshingWallet, setRefreshingWallet] = useState(false);

  // Result reveal animation banner
  const lastPeriodRef = useRef<string | null>(null);
  const [revealResult, setRevealResult] = useState<LiveGameState['recentResults'][0] | null>(null);

  // History / My Bets / Chart tabs
  const [bottomTab, setBottomTab] = useState<'history' | 'my-bets' | 'chart'>('history');
  const [historyData, setHistoryData] = useState<any>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [myBetsData, setMyBetsData] = useState<any>(null);
  const [myBetsPage, setMyBetsPage] = useState(1);
  const [myBetsStatus, setMyBetsStatus] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [selectedRoundProof, setSelectedRoundProof] = useState<any>(null);

  const loadModeState = useCallback(async (targetMode: WinGoMode) => {
    try {
      const data = await apiFetch<LiveGameState>(`/api/game/state/${targetMode}`);
      setClockOffsetMs(data.serverTimeMs - Date.now());
      setState((prev) => {
        if (
          prev &&
          prev.mode === targetMode &&
          prev.currentRound.periodId !== data.currentRound.periodId &&
          data.recentResults[0]
        ) {
          setRevealResult(data.recentResults[0]);
          setTimeout(() => setRevealResult(null), 5000);
          refreshAccount();
        }
        return data;
      });
      lastPeriodRef.current = data.currentRound.periodId;
    } catch (err) {
      console.error('Failed to poll WinGo round:', err);
    }
  }, [refreshAccount]);

  const loadHistory = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        mode,
        page: String(historyPage),
        pageSize: '10',
      });
      if (historySearch.trim()) params.set('search', historySearch.trim());
      if (historyDateFrom) params.set('dateFrom', historyDateFrom);
      const data = await apiFetch(`/api/game/history?${params.toString()}`);
      setHistoryData(data);
    } catch (err) {
      console.error('Failed to load game history:', err);
    }
  }, [mode, historyPage, historySearch, historyDateFrom]);

  const loadMyBets = useCallback(async () => {
    if (!user) {
      setMyBetsData(null);
      return;
    }
    try {
      const params = new URLSearchParams({
        mode,
        status: myBetsStatus,
        page: String(myBetsPage),
        pageSize: '10',
      });
      const data = await apiFetch(`/api/game/my-bets?${params.toString()}`);
      setMyBetsData(data);
    } catch (err) {
      console.error('Failed to load my bets:', err);
    }
  }, [user, mode, myBetsStatus, myBetsPage]);

  useEffect(() => {
    apiFetch<{ announcement: { text: string } }>('/api/public/announcement')
      .then((res) => {
        if (res.announcement?.text) setAnnouncement(res.announcement.text);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setHistoryPage(1);
    setMyBetsPage(1);
    loadModeState(mode);
  }, [mode, loadModeState]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory, state?.currentRound.periodId]);

  useEffect(() => {
    loadMyBets();
  }, [loadMyBets, state?.currentRound.periodId]);

  // Live 250ms client ticker anchored strictly to server clock offset
  useEffect(() => {
    const id = setInterval(() => {
      setNowTickMs(Date.now());
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Poll authoritative server state every 3s, and immediately when round hits 0
  const authoritativeNow = nowTickMs + clockOffsetMs;
  const endsAtMs = state ? Date.parse(state.currentRound.endsAt) : 0;
  const closesAtMs = state ? Date.parse(state.currentRound.closesAt) : 0;
  const remainingSec = state ? Math.max(0, Math.ceil((endsAtMs - authoritativeNow) / 1000)) : 0;
  const bettingOpen = state ? authoritativeNow < closesAtMs && state.currentRound.status === 'open' : false;

  useEffect(() => {
    const poll = setInterval(() => {
      loadModeState(mode);
    }, 3000);
    return () => clearInterval(poll);
  }, [mode, loadModeState]);

  useEffect(() => {
    if (state && remainingSec === 0) {
      const timer = setTimeout(() => {
        loadModeState(mode);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [remainingSec, state, mode, loadModeState]);

  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const digitM1 = String(Math.floor(mins / 10));
  const digitM2 = String(mins % 10);
  const digitS1 = String(Math.floor(secs / 10));
  const digitS2 = String(secs % 10);

  const localizeToken = useCallback(
    (token: string) => {
      const lower = token.toLowerCase();
      if (lower === 'green') return t(language, 'game_color_green');
      if (lower === 'violet') return t(language, 'game_color_violet');
      if (lower === 'red') return t(language, 'game_color_red');
      if (lower === 'big') return t(language, 'game_size_big');
      if (lower === 'small') return t(language, 'game_size_small');
      return token;
    },
    [language]
  );

  const activeModeMeta = MODES.find((m) => m.id === mode) || MODES[0];

  const openBetSlip = (sel: PendingSelection) => {
    if (!bettingOpen) {
      setBetFeedback({ type: 'error', text: t(language, 'game_closed_error') });
      return;
    }
    if (!user) {
      onRequireLogin();
      return;
    }
    setBetFeedback(null);
    setSlipMultiplier(quickMultiplier);
    setSlip(sel);
  };

  const handleRandomPick = () => {
    const randNum = Math.floor(Math.random() * 10);
    openBetSlip({
      category: 'number',
      selection: String(randNum),
      label: `${t(language, 'game_number_prefix')} ${randNum}`,
      accentClass: 'bg-[#F54E2E]',
    });
  };

  const slipQuote = useMemo(() => {
    if (!slip || !state) return null;
    const cfg = state.ruleset.config;
    const totalStake = Math.round(unitAmount * slipMultiplier * 100) / 100;
    const fee = Math.round(totalStake * (cfg.feePercent / 100) * 100) / 100;
    const netStake = Math.round((totalStake - fee) * 100) / 100;
    let payoutMult = cfg.payoutMultipliers.bigSmall;
    let splitMult: number | null = null;
    if (slip.category === 'color') {
      if (slip.selection === 'violet') payoutMult = cfg.payoutMultipliers.violet;
      else {
        payoutMult = cfg.payoutMultipliers.colorStandard;
        splitMult = cfg.payoutMultipliers.colorSplitViolet;
      }
    } else if (slip.category === 'number') {
      payoutMult = cfg.payoutMultipliers.numberExact;
    }
    const potentialPayout = Math.round(netStake * payoutMult * 100) / 100;
    return { totalStake, fee, netStake, payoutMult, splitMult, potentialPayout };
  }, [slip, state, unitAmount, slipMultiplier]);

  const handleConfirmBet = async () => {
    if (!slip || !state || !slipQuote) return;
    if (!bettingOpen) {
      setBetFeedback({ type: 'error', text: t(language, 'game_closed_error') });
      return;
    }
    setPlacingBet(true);
    setBetFeedback(null);
    try {
      await apiFetch('/api/game/bet', {
        method: 'POST',
        body: JSON.stringify({
          mode,
          periodId: state.currentRound.periodId,
          category: slip.category,
          selection: slip.selection,
          unitAmount,
          multiplier: slipMultiplier,
          idempotencyKey: createIdempotencyKey('bet'),
        }),
      });
      setSlip(null);
      setBetFeedback({
        type: 'success',
        text: t(language, 'game_bet_accepted', {
          period: state.currentRound.periodId,
          label: slip.label,
          stake: formatCurrency(slipQuote.totalStake, wallet?.currency, language),
        }),
      });
      await Promise.all([refreshAccount(), loadMyBets()]);
    } catch (err: any) {
      setBetFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setPlacingBet(false);
    }
  };

  const handleRefreshWallet = async () => {
    setRefreshingWallet(true);
    await refreshAccount();
    setTimeout(() => setRefreshingWallet(false), 400);
  };

  const currency = wallet?.currency || state?.ruleset.config.currency || 'USD';

  const chartData = useMemo(() => {
    const counts = historyData?.stats?.numberCounts || {};
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => ({
      num: String(n),
      count: counts[n] || 0,
      fill:
        n === 0 || n === 5
          ? '#8b5cf6'
          : n % 2 === 1
            ? '#16a34a'
            : '#ef4444',
    }));
  }, [historyData]);

  return (
    <div className="space-y-4">

      {/* Main Responsive 2-Column Layout on Desktop, Stacked Mobile-First on Phones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (Mobile Primary Arena) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Wallet Summary Card modeled on Screenshot #3 */}
          <div className="rounded-3xl wingo-gradient-soft p-4 shadow-sm">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 font-mono-num tracking-tight" dir="ltr">
                    {user && wallet
                      ? formatCurrency(wallet.availableBalance, currency, language)
                      : formatCurrency(0, currency, language)}
                  </span>
                  {user && (
                    <button
                      type="button"
                      onClick={handleRefreshWallet}
                      aria-label={t(language, 'common_refresh')}
                      className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshingWallet ? 'animate-spin' : ''}`} />
                    </button>
                  )}
                </div>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  {t(language, 'game_wallet_balance')}
                  {user && wallet && parseFloat(wallet.reservedBalance) > 0 && (
                    <span>
                      {' '}
                      · {t(language, 'game_reserved')}:{' '}
                      <span dir="ltr">{formatCurrency(wallet.reservedBalance, currency, language)}</span>
                    </span>
                  )}
                </p>

                <div className="grid grid-cols-2 gap-3 w-full mt-4">
                  <button
                    type="button"
                    onClick={() => (user ? onOpenWithdraw() : onRequireLogin())}
                    className="h-11 rounded-full bg-gradient-to-r from-[#FF6B4A] to-[#F04428] text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
                  >
                    {t(language, 'game_withdraw')}
                  </button>
                  <button
                    type="button"
                    onClick={() => (user ? onOpenDeposit() : onRequireLogin())}
                    className="h-11 rounded-full bg-gradient-to-r from-[#22C55E] to-[#16A34A] text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.98] transition-all"
                  >
                    {t(language, 'game_deposit')}
                  </button>
                </div>
              </div>
            </div>

            {/* Announcement bar */}
            <div className="mt-3 bg-white rounded-full px-3 py-1.5 flex items-center gap-2.5 shadow-sm">
              <Volume2 className="w-4 h-4 text-[#F54E2E] shrink-0" />
              <p className="text-xs text-slate-700 truncate flex-1">{announcement}</p>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(true)}
                className="px-3 py-1 rounded-full wingo-gradient text-white text-xs font-semibold whitespace-nowrap shrink-0"
              >
                {t(language, 'common_detail')}
              </button>
            </div>
          </div>

          {/* 4 Game Duration Tabs (30s, 1m, 3m, 5m) */}
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 grid grid-cols-4 gap-1">
            {MODES.map((m) => {
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`min-h-[72px] rounded-xl flex flex-col items-center justify-center gap-1 px-1 py-2 transition-all ${
                    active
                      ? 'wingo-gradient text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </span>
                  <span className="text-[11px] font-bold leading-tight whitespace-nowrap">
                    {t(language, 'brand')}
                  </span>
                  <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-white/95' : 'text-slate-400'}`}>
                    {t(language, m.subtitleKey)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Authoritative Countdown & Period Ticket Card */}
          <div className="relative rounded-2xl wingo-gradient text-white p-4 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-6 pe-2 border-e border-dashed border-white/35">
                <button
                  type="button"
                  onClick={() => setShowHowToPlay(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/60 text-xs font-semibold hover:bg-white/15 transition-colors mb-2"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t(language, 'game_how_to_play')}</span>
                </button>
                <div className="text-xs font-semibold text-white/90 mb-2">
                  {t(language, activeModeMeta.labelKey)}
                </div>
                <div className="flex items-center gap-1.5">
                  {(state?.recentResults || []).slice(0, 5).map((r) => (
                    <NumberBall key={r.periodId} num={r.winningNumber} size="xs" />
                  ))}
                </div>
              </div>

              <div className="col-span-6 ps-1 text-end">
                <div className="text-xs font-semibold text-white/90 mb-1.5">
                  {bettingOpen ? t(language, 'game_time_remaining') : t(language, 'game_betting_closed')}
                </div>
                <div className="inline-flex items-center gap-1 font-mono-num" dir="ltr">
                  {[digitM1, digitM2].map((d, idx) => (
                    <span
                      key={`m-${idx}`}
                      className="w-7 h-9 rounded-md bg-white text-slate-900 font-extrabold text-xl flex items-center justify-center shadow-sm"
                    >
                      {d}
                    </span>
                  ))}
                  <span className="font-bold text-lg px-0.5">:</span>
                  {[digitS1, digitS2].map((d, idx) => (
                    <span
                      key={`s-${idx}`}
                      className={`w-7 h-9 rounded-md font-extrabold text-xl flex items-center justify-center shadow-sm ${
                        !bettingOpen ? 'bg-amber-200 text-red-700' : 'bg-white text-slate-900'
                      }`}
                    >
                      {d}
                    </span>
                  ))}
                </div>
                <div className="text-xs font-mono-num font-bold tracking-tight mt-2 text-white/95 truncate" dir="ltr">
                  {state?.currentRound.periodId || t(language, 'game_loading_round')}
                </div>
              </div>
            </div>
          </div>

          {/* Smooth Result Reveal Banner on Round Transition */}
          {revealResult && (
            <div className="rounded-2xl bg-slate-900 text-white p-3.5 flex items-center justify-between gap-3 shadow-md transition-all">
              <div className="flex items-center gap-3">
                <NumberBall num={revealResult.winningNumber} size="sm" />
                <div>
                  <div className="text-xs text-amber-300 font-semibold">
                    {t(language, 'game_official_result_drawn')} · <span dir="ltr">#{revealResult.periodId}</span>
                  </div>
                  <div className="text-sm font-bold mt-0.5">
                    {t(language, 'game_number_prefix')} {revealResult.winningNumber} ·{' '}
                    {revealResult.winningColors.map((c) => localizeToken(c)).join(' + ')} ·{' '}
                    {localizeToken(revealResult.winningSize)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevealResult(null)}
                className="p-1.5 text-slate-400 hover:text-white"
                aria-label={t(language, 'common_close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Feedback banner */}
          {betFeedback && (
            <div
              className={`rounded-xl px-3.5 py-2.5 text-xs font-medium flex items-center justify-between gap-2 border ${
                betFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <span className="flex items-center gap-2">
                {betFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{betFeedback.text}</span>
              </span>
              <button type="button" onClick={() => setBetFeedback(null)} className="p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* MAIN BETTING PANEL */}
          <div className="relative bg-white rounded-3xl p-4 shadow-sm border border-slate-100 space-y-4">
            {/* Server-enforced Betting Closed overlay */}
            {state && !bettingOpen && (
              <div className="absolute inset-0 z-20 rounded-3xl bg-slate-900/65 backdrop-blur-[2px] flex flex-col items-center justify-center text-white p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6 text-amber-300" />
                </div>
                <div className="text-lg font-display font-bold">{t(language, 'game_betting_closed')}</div>
                <p className="text-xs text-white/85 mt-1">
                  {t(language, 'game_cutoff_desc', {
                    period: state.currentRound.periodId,
                    seconds: remainingSec,
                  })}
                </p>
              </div>
            )}

            {/* A. Color Betting Buttons */}
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                disabled={!bettingOpen}
                onClick={() =>
                  openBetSlip({
                    category: 'color',
                    selection: 'green',
                    label: `${t(language, 'game_col_color')}: ${t(language, 'game_color_green')}`,
                    accentClass: 'bg-emerald-600',
                  })
                }
                className="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
              >
                {t(language, 'game_color_green')}
              </button>
              <button
                type="button"
                disabled={!bettingOpen}
                onClick={() =>
                  openBetSlip({
                    category: 'color',
                    selection: 'violet',
                    label: `${t(language, 'game_col_color')}: ${t(language, 'game_color_violet')}`,
                    accentClass: 'bg-violet-600',
                  })
                }
                className="min-h-[48px] rounded-xl bg-violet-600 hover:bg-violet-700 active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
              >
                {t(language, 'game_color_violet')}
              </button>
              <button
                type="button"
                disabled={!bettingOpen}
                onClick={() =>
                  openBetSlip({
                    category: 'color',
                    selection: 'red',
                    label: `${t(language, 'game_col_color')}: ${t(language, 'game_color_red')}`,
                    accentClass: 'bg-red-500',
                  })
                }
                className="min-h-[48px] rounded-xl bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50"
              >
                {t(language, 'game_color_red')}
              </button>
            </div>

            {/* B. Number Betting Grid 0-9 */}
            <div className="bg-slate-50 rounded-2xl p-3 grid grid-cols-5 gap-y-3 gap-x-1 place-items-center">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <NumberBall
                  key={num}
                  num={num}
                  size="md"
                  disabled={!bettingOpen}
                  onClick={() =>
                    openBetSlip({
                      category: 'number',
                      selection: String(num),
                      label: `${t(language, 'game_number_prefix')} ${num}`,
                      accentClass:
                        num === 0 || num === 5
                          ? 'bg-violet-600'
                          : num % 2 === 1
                            ? 'bg-emerald-600'
                            : 'bg-red-500',
                    })
                  }
                />
              ))}
            </div>

            {/* Stake Multiplier Selector Strip (explicitly separated from payout odds) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 px-0.5">
                <span className="truncate">{t(language, 'game_stake_multiplier_label')}</span>
                <span className="font-mono-num shrink-0">
                  {t(language, 'game_default_unit')}: <span dir="ltr">{formatCurrency(unitAmount, currency, language)}</span>
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <button
                  type="button"
                  disabled={!bettingOpen}
                  onClick={handleRandomPick}
                  className="min-h-[40px] px-3 rounded-lg border border-[#F54E2E] text-[#F54E2E] text-xs font-semibold inline-flex items-center gap-1 hover:bg-orange-50 whitespace-nowrap shrink-0"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>{t(language, 'game_random')}</span>
                </button>
                {[1, 5, 10, 20, 50, 100].map((mult) => (
                  <button
                    key={mult}
                    type="button"
                    onClick={() => setQuickMultiplier(mult)}
                    dir="ltr"
                    className={`min-h-[40px] flex-1 min-w-[44px] px-2 rounded-lg text-xs font-bold font-mono-num transition-colors whitespace-nowrap ${
                      quickMultiplier === mult
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    X{mult}
                  </button>
                ))}
              </div>
            </div>

            {/* C. Big / Small Split Button Bar */}
            <div className="grid grid-cols-2 rounded-full overflow-hidden shadow-sm">
              <button
                type="button"
                disabled={!bettingOpen}
                onClick={() =>
                  openBetSlip({
                    category: 'size',
                    selection: 'big',
                    label: `${t(language, 'game_size_big')} (5–9)`,
                    accentClass: 'bg-amber-500',
                  })
                }
                className="min-h-[48px] bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold text-sm transition-opacity disabled:opacity-50"
              >
                {t(language, 'game_size_big')} (5–9)
              </button>
              <button
                type="button"
                disabled={!bettingOpen}
                onClick={() =>
                  openBetSlip({
                    category: 'size',
                    selection: 'small',
                    label: `${t(language, 'game_size_small')} (0–4)`,
                    accentClass: 'bg-blue-500',
                  })
                }
                className="min-h-[48px] bg-gradient-to-r from-blue-500 to-indigo-500 hover:opacity-95 text-white font-bold text-sm transition-opacity disabled:opacity-50"
              >
                {t(language, 'game_size_small')} (0–4)
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (History, My Bets & Trend Chart — expands smoothly on desktop!) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Segmented Tab Controls */}
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setBottomTab('history')}
              className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                bottomTab === 'history'
                  ? 'wingo-gradient text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <History className="w-4 h-4 shrink-0" />
              <span>{t(language, 'game_tab_history')}</span>
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('my-bets')}
              className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                bottomTab === 'my-bets'
                  ? 'wingo-gradient text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Ticket className="w-4 h-4 shrink-0" />
              <span>{t(language, 'game_tab_my_bets')}</span>
            </button>
            <button
              type="button"
              onClick={() => setBottomTab('chart')}
              className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-all whitespace-nowrap ${
                bottomTab === 'chart'
                  ? 'wingo-gradient text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span>{t(language, 'game_tab_chart')}</span>
            </button>
          </div>

          {/* TAB 1: Official Game Result History */}
          {bottomTab === 'history' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-wrap items-center gap-2.5">
                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-4 h-4 text-slate-400 absolute start-3 top-3" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => {
                      setHistorySearch(e.target.value);
                      setHistoryPage(1);
                    }}
                    placeholder={t(language, 'game_search_period')}
                    className="w-full h-10 ps-9 pe-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <input
                  type="date"
                  value={historyDateFrom}
                  onChange={(e) => {
                    setHistoryDateFrom(e.target.value);
                    setHistoryPage(1);
                  }}
                  aria-label={t(language, 'common_search')}
                  className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-start border-collapse">
                  <thead>
                    <tr className="bg-[#F54E2E] text-white text-xs font-semibold">
                      <th className="py-3 px-4 text-start">{t(language, 'game_col_period')}</th>
                      <th className="py-3 px-3 text-center">{t(language, 'game_col_number')}</th>
                      <th className="py-3 px-3 text-center">{t(language, 'game_col_big_small')}</th>
                      <th className="py-3 px-3 text-start">{t(language, 'game_col_color')}</th>
                      <th className="py-3 px-4 text-end">{t(language, 'game_col_audit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {(historyData?.items || []).map((row: any) => (
                      <tr key={row.periodId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono-num font-semibold text-slate-800">
                          <div dir="ltr">{row.periodId}</div>
                          <div className="text-[11px] font-normal text-slate-400">
                            {formatLocaleTime(row.endsAt, language)}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <NumberBall num={row.winningNumber} size="xs" />
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-slate-700">
                          {localizeToken(row.winningSize)}
                        </td>
                        <td className="py-3 px-3">
                          <ColorDots colors={row.winningColors || []} />
                        </td>
                        <td className="py-3 px-4 text-end">
                          <button
                            type="button"
                            onClick={() => setSelectedRoundProof(row)}
                            className="text-[#F54E2E] font-semibold hover:underline"
                          >
                            {t(language, 'common_verify')}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!historyData?.items || historyData.items.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-400">
                          {t(language, 'game_no_results')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                <button
                  type="button"
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  className="min-h-[38px] px-3 rounded-lg border border-slate-200 inline-flex items-center gap-1 disabled:opacity-40 hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4 rtl:rotate-180" /> {t(language, 'common_prev')}
                </button>
                <span className="font-mono-num">
                  {t(language, 'common_page_of', {
                    page: formatLocaleNumber(historyPage, language),
                    total: formatLocaleNumber(Math.max(1, Math.ceil((historyData?.total || 0) / 10)), language),
                  })}
                </span>
                <button
                  type="button"
                  disabled={historyPage >= Math.ceil((historyData?.total || 0) / 10)}
                  onClick={() => setHistoryPage((p) => p + 1)}
                  className="min-h-[38px] px-3 rounded-lg border border-slate-200 inline-flex items-center gap-1 disabled:opacity-40 hover:bg-slate-50"
                >
                  {t(language, 'common_next')} <ChevronRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: My Betting History */}
          {bottomTab === 'my-bets' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
              {!user ? (
                <div className="p-10 text-center space-y-3">
                  <p className="text-sm text-slate-600">{t(language, 'game_signin_my_bets')}</p>
                  <button
                    type="button"
                    onClick={onRequireLogin}
                    className="px-5 h-11 rounded-full wingo-gradient text-white text-sm font-semibold"
                  >
                    {t(language, 'auth_signin_or_register')}
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-3.5 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
                    {['all', 'pending', 'won', 'lost', 'refunded'].map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setMyBetsStatus(st);
                          setMyBetsPage(1);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                          myBetsStatus === st
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {st === 'all' ? t(language, 'common_all') : translateStatus(language, st)}
                      </button>
                    ))}
                  </div>

                  <div className="divide-y divide-slate-100">
                    {(myBetsData?.items || []).map((bet: any) => {
                      const net = parseFloat(bet.netWinLoss || '0');
                      const badgeLabel = /^\d$/.test(String(bet.selection))
                        ? String(bet.selection)
                        : localizeToken(String(bet.selection)).slice(0, 3);
                      return (
                        <button
                          key={bet.ticketId}
                          type="button"
                          onClick={() => setSelectedTicket(bet)}
                          className="w-full text-start p-4 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs uppercase shrink-0 ${
                                bet.selection === 'green'
                                  ? 'bg-emerald-600'
                                  : bet.selection === 'violet'
                                    ? 'bg-violet-600'
                                    : bet.selection === 'red'
                                      ? 'bg-red-500'
                                      : bet.selection === 'big'
                                        ? 'bg-amber-500'
                                        : bet.selection === 'small'
                                          ? 'bg-blue-500'
                                          : 'bg-slate-800'
                              }`}
                            >
                              {badgeLabel}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-mono-num font-bold text-slate-900 truncate" dir="ltr">
                                #{bet.periodId} · {bet.mode.toUpperCase()}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                <span dir="ltr">{bet.ticketId}</span> · {t(language, 'game_stake_label')}{' '}
                                <span dir="ltr">{formatCurrency(bet.totalStake, currency, language)}</span> (X
                                {bet.multiplier})
                              </div>
                            </div>
                          </div>

                          <div className="text-end shrink-0">
                            <div
                              className={`text-xs font-bold uppercase ${
                                bet.status === 'won'
                                  ? 'text-emerald-600'
                                  : bet.status === 'lost'
                                    ? 'text-red-500'
                                    : 'text-amber-600'
                              }`}
                            >
                              {translateStatus(language, bet.status)}
                            </div>
                            <div className="text-xs font-mono-num font-semibold text-slate-800 mt-0.5" dir="ltr">
                              {bet.status === 'pending'
                                ? `${t(language, 'game_est_payout')} ${formatCurrency(bet.potentialPayout, currency, language)}`
                                : `${net >= 0 ? '+' : ''}${formatCurrency(net, currency, language)}`}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                    {(!myBetsData?.items || myBetsData.items.length === 0) && (
                      <div className="p-10 text-center text-xs text-slate-400">
                        {t(language, 'game_no_bets', { mode: t(language, activeModeMeta.subtitleKey) })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: Statistical Trend Chart */}
          {bottomTab === 'chart' && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-5">
              <div>
                <h3 className="text-sm font-display font-bold text-slate-900">
                  {t(language, 'game_chart_title', {
                    count: formatLocaleNumber(historyData?.stats?.sampleSize || 0, language),
                  })}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t(language, 'game_chart_subtitle', { mode: t(language, activeModeMeta.subtitleKey) })}
                </p>
              </div>

              <div className="h-56 w-full" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                    <XAxis dataKey="num" tick={{ fontSize: 12, fill: '#475569' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry) => (
                        <Cell key={entry.num} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 border-t border-slate-100 text-center">
                <div>
                  <div className="text-xs text-slate-500">{t(language, 'game_color_green')}</div>
                  <div className="text-lg font-mono-num font-bold text-emerald-600">
                    {formatLocaleNumber(historyData?.stats?.colors?.green ?? 0, language)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t(language, 'game_color_red')}</div>
                  <div className="text-lg font-mono-num font-bold text-red-500">
                    {formatLocaleNumber(historyData?.stats?.colors?.red ?? 0, language)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t(language, 'game_color_violet')}</div>
                  <div className="text-lg font-mono-num font-bold text-violet-600">
                    {formatLocaleNumber(historyData?.stats?.colors?.violet ?? 0, language)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t(language, 'game_size_big')} (5–9)</div>
                  <div className="text-lg font-mono-num font-bold text-amber-600">
                    {formatLocaleNumber(historyData?.stats?.sizes?.big ?? 0, language)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{t(language, 'game_size_small')} (0–4)</div>
                  <div className="text-lg font-mono-num font-bold text-blue-600">
                    {formatLocaleNumber(historyData?.stats?.sizes?.small ?? 0, language)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* BET SLIP BOTTOM SHEET / MODAL */}
      {slip && slipQuote && state && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-xl">
            <div className={`${slip.accentClass} text-white px-5 py-4 text-center relative`}>
              <div className="text-xs font-semibold text-white/90">
                {t(language, activeModeMeta.labelKey)} · <span dir="ltr">#{state.currentRound.periodId}</span>
              </div>
              <div className="text-lg font-display font-bold mt-0.5">
                {t(language, 'game_select_label', { selection: slip.label })}
              </div>
              <button
                type="button"
                onClick={() => setSlip(null)}
                className="absolute end-3 top-3 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full hover:bg-white/15"
                aria-label={t(language, 'common_close')}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Unit Amount Controls */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                  <span>{t(language, 'game_unit_amount')}</span>
                  <span className="text-slate-400 font-normal">
                    {t(language, 'game_min_max', {
                      min: formatLocaleNumber(state.ruleset.config.minWager, language),
                      max: formatLocaleNumber(state.ruleset.config.maxWager, language),
                    })}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-2.5">
                  {state.ruleset.config.unitPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setUnitAmount(preset);
                        setManualUnitText(String(preset));
                      }}
                      className={`h-10 rounded-xl font-mono-num text-xs font-bold transition-colors ${
                        unitAmount === preset
                          ? 'bg-[#F54E2E] text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {formatLocaleNumber(preset, language)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  step="1"
                  value={manualUnitText}
                  onChange={(e) => {
                    setManualUnitText(e.target.value);
                    const n = parseFloat(e.target.value);
                    if (Number.isFinite(n) && n > 0) setUnitAmount(n);
                  }}
                  placeholder={t(language, 'game_manual_unit_placeholder')}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono-num text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Stake Multiplier Controls */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                  <span>{t(language, 'game_stake_multiplier')}</span>
                  <div className="flex items-center gap-1.5" dir="ltr">
                    <button
                      type="button"
                      onClick={() => setSlipMultiplier((m) => Math.max(1, m - 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-mono-num font-bold text-sm">
                      X{slipMultiplier}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSlipMultiplier((m) => Math.min(1000, m + 1))}
                      className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-6 gap-1.5" dir="ltr">
                  {[1, 5, 10, 20, 50, 100].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSlipMultiplier(m)}
                      className={`h-9 rounded-lg font-mono-num text-xs font-bold transition-colors ${
                        slipMultiplier === m
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      X{m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transparent Breakdown: Stake Multiplier vs Payout Odds */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>
                    {t(language, 'game_total_stake')} ({formatCurrency(unitAmount, currency, language)} ×{' '}
                    {slipMultiplier})
                  </span>
                  <span className="font-mono-num font-bold text-slate-900" dir="ltr">
                    {formatCurrency(slipQuote.totalStake, currency, language)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>{t(language, 'game_platform_fee', { fee: state.ruleset.config.feePercent })}</span>
                  <span className="font-mono-num" dir="ltr">
                    -{formatCurrency(slipQuote.fee, currency, language)} ·{' '}
                    {formatCurrency(slipQuote.netStake, currency, language)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>{t(language, 'game_configured_odds', { version: state.ruleset.version })}</span>
                  <span className="font-mono-num font-bold text-slate-900">
                    {slipQuote.payoutMult}x
                    {slipQuote.splitMult
                      ? ` ${t(language, 'game_violet_split_note', { mult: slipQuote.splitMult })}`
                      : ''}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-bold">
                  <span className="text-slate-900">{t(language, 'game_potential_payout')}</span>
                  <span className="font-mono-num text-emerald-600" dir="ltr">
                    {formatCurrency(slipQuote.potentialPayout, currency, language)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setSlip(null)}
                  className="col-span-2 h-12 rounded-xl bg-slate-100 text-slate-700 font-semibold text-sm hover:bg-slate-200"
                >
                  {t(language, 'common_cancel')}
                </button>
                <button
                  type="button"
                  disabled={placingBet || !bettingOpen}
                  onClick={handleConfirmBet}
                  className="col-span-3 h-12 rounded-xl wingo-gradient text-white font-bold text-sm shadow-sm hover:opacity-95 disabled:opacity-50"
                >
                  {placingBet
                    ? t(language, 'game_submitting_bet')
                    : `${t(language, 'game_confirm_bet')} (${formatCurrency(slipQuote.totalStake, currency, language)})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HOW TO PLAY & RULESET MODAL */}
      {showHowToPlay && state && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-xl max-h-[85vh] flex flex-col">
            <div className="wingo-gradient text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-display font-bold text-base">
                {t(language, 'game_rules_title', { version: state.ruleset.version })}
              </h3>
              <button
                type="button"
                onClick={() => setShowHowToPlay(false)}
                aria-label={t(language, 'common_close')}
                className="p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>{t(language, 'game_rules_intro')}</p>
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5">
                <div className="font-bold text-slate-900">{t(language, 'game_rules_payout_heading')}</div>
                <div>
                  • {t(language, 'game_color_green')} (1, 3, 7, 9): {state.ruleset.config.payoutMultipliers.colorStandard}x{' '}
                  {t(language, 'game_violet_split_note', {
                    mult: state.ruleset.config.payoutMultipliers.colorSplitViolet,
                  })}
                </div>
                <div>
                  • {t(language, 'game_color_red')} (2, 4, 6, 8): {state.ruleset.config.payoutMultipliers.colorStandard}x{' '}
                  {t(language, 'game_violet_split_note', {
                    mult: state.ruleset.config.payoutMultipliers.colorSplitViolet,
                  })}
                </div>
                <div>
                  • {t(language, 'game_color_violet')} (0, 5): {state.ruleset.config.payoutMultipliers.violet}x
                </div>
                <div>
                  • {t(language, 'game_col_number')} (0–9): {state.ruleset.config.payoutMultipliers.numberExact}x
                </div>
                <div>
                  • {t(language, 'game_size_big')} (5–9) / {t(language, 'game_size_small')} (0–4):{' '}
                  {state.ruleset.config.payoutMultipliers.bigSmall}x
                </div>
                <div>
                  • {t(language, 'game_platform_fee', { fee: state.ruleset.config.feePercent })} ·{' '}
                  {t(language, 'game_min_max', {
                    min: formatLocaleNumber(state.ruleset.config.minWager, language),
                    max: formatLocaleNumber(state.ruleset.config.maxWager, language),
                  })}
                </div>
              </div>
              <p className="text-amber-700">{t(language, 'game_rules_disclaimer')}</p>
            </div>
          </div>
        </div>
      )}

      {/* TICKET DETAIL MODAL */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-bold text-slate-900">{t(language, 'game_ticket_details')}</h3>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                aria-label={t(language, 'common_close')}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'game_ticket_id')}</span>
                <span className="font-mono-num font-bold" dir="ltr">
                  {selectedTicket.ticketId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'game_period_mode')}</span>
                <span className="font-mono-num" dir="ltr">
                  {selectedTicket.periodId} ({selectedTicket.mode})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'game_selection')}</span>
                <span className="font-bold">{localizeToken(String(selectedTicket.selection))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'game_total_stake')}</span>
                <span className="font-mono-num" dir="ltr">
                  {formatCurrency(selectedTicket.totalStake, currency, language)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'game_net_stake_fee')}</span>
                <span className="font-mono-num" dir="ltr">
                  {formatCurrency(selectedTicket.netStake, currency, language)} /{' '}
                  {formatCurrency(selectedTicket.feeAmount, currency, language)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'common_status')}</span>
                <span className="font-bold uppercase">{translateStatus(language, selectedTicket.status)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'game_actual_payout')}</span>
                <span className="font-mono-num font-bold text-emerald-600" dir="ltr">
                  {formatCurrency(selectedTicket.actualPayout, currency, language)}
                </span>
              </div>
              {selectedTicket.roundOutcome && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <span className="text-slate-500">{t(language, 'game_official_outcome')}</span>
                  <span className="inline-flex items-center gap-2 font-bold">
                    <NumberBall num={selectedTicket.roundOutcome.winningNumber} size="xs" />
                    {localizeToken(selectedTicket.roundOutcome.winningSize)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAIRNESS AUDIT PROOF MODAL */}
      {selectedRoundProof && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-display font-bold text-slate-900">{t(language, 'game_audit_proof_title')}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoundProof(null)}
                aria-label={t(language, 'common_close')}
                className="p-1 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'game_col_period')}</span>
                <span className="font-mono-num font-bold" dir="ltr">
                  {selectedRoundProof.periodId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t(language, 'game_ruleset_version')}</span>
                <span className="font-mono-num" dir="ltr">
                  {selectedRoundProof.rulesetVersion}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">{t(language, 'game_col_number')}</span>
                <NumberBall num={selectedRoundProof.winningNumber} size="xs" />
              </div>
              <div>
                <div className="text-slate-500 mb-1">{t(language, 'game_committed_hash')}</div>
                <div
                  dir="ltr"
                  className="p-2 rounded-lg bg-slate-50 font-mono-num text-[11px] break-all text-slate-700 border border-slate-200"
                >
                  {selectedRoundProof.serverSeedHash}
                </div>
              </div>
              {selectedRoundProof.serverSeedReveal && (
                <div>
                  <div className="text-slate-500 mb-1">{t(language, 'game_revealed_seed')}</div>
                  <div
                    dir="ltr"
                    className="p-2 rounded-lg bg-slate-50 font-mono-num text-[11px] break-all text-slate-700 border border-slate-200"
                  >
                    {selectedRoundProof.serverSeedReveal}
                  </div>
                </div>
              )}
              <p className="text-[11px] text-slate-500 font-mono-num" dir="ltr">
                SHA256(seed) == Hash · HMAC-SHA256(seed, &quot;wingo:{selectedRoundProof.periodId}&quot;) mod 10 =={' '}
                {selectedRoundProof.winningNumber}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ANNOUNCEMENT MODAL */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F54E2E]" /> {t(language, 'game_platform_notice')}
              </h3>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                aria-label={t(language, 'common_close')}
                className="p-1"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">{announcement}</p>
          </div>
        </div>
      )}
    </div>
  );
}
