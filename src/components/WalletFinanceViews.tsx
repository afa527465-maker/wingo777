import React, { useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  QrCode,
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Shield,
  Clock,
  ExternalLink,
  Coins,
  Link2,
} from 'lucide-react';
import { apiFetch, createIdempotencyKey, formatCurrency } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { formatLocaleDateTime, t, translateError, translateStatus } from '../lib/i18n';

type FinanceSubTab = 'overview' | 'deposit' | 'withdraw' | 'banks';

const COUNTRY_BANK_PROFILES: Record<
  string,
  { label: string; routingLabel: string; routingPlaceholder: string; banks: string[] }
> = {
  IN: {
    label: 'India (IN)',
    routingLabel: 'IFSC Code',
    routingPlaceholder: 'e.g. SBIN0001234',
    banks: ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank'],
  },
  KH: {
    label: 'Cambodia (KH)',
    routingLabel: 'SWIFT / BIC',
    routingPlaceholder: 'e.g. ABAAKHPP',
    banks: ['ABA Bank', 'ACLEDA Bank', 'Wing Bank', 'Canadia Bank', 'Prince Bank'],
  },
  US: {
    label: 'United States (US)',
    routingLabel: 'ABA Routing Number',
    routingPlaceholder: '9-digit routing number',
    banks: ['Chase Bank', 'Bank of America', 'Wells Fargo', 'Citibank'],
  },
  SG: {
    label: 'Singapore (SG)',
    routingLabel: 'Bank / SWIFT Code',
    routingPlaceholder: 'e.g. DBSSSGSG',
    banks: ['DBS Bank', 'OCBC Bank', 'UOB'],
  },
  GLOBAL: {
    label: 'International / IBAN',
    routingLabel: 'SWIFT / BIC',
    routingPlaceholder: '8 or 11 character SWIFT',
    banks: ['Standard Chartered', 'HSBC', 'Revolut', 'Wise Business', 'Other Bank'],
  },
};

export function WalletFinanceViews({
  initialSubTab = 'overview',
  onRequireLogin,
}: {
  initialSubTab?: FinanceSubTab;
  onRequireLogin: () => void;
}) {
  const { user, wallet, refreshAccount, language } = useAuth();
  const [subTab, setSubTab] = useState<FinanceSubTab>(initialSubTab);

  // Ledger state
  const [ledgerFilter, setLedgerFilter] = useState('all');
  const [ledgerItems, setLedgerItems] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);

  // Deposit state
  const [channels, setChannels] = useState<any[]>([]);
  const [depositConfigured, setDepositConfigured] = useState<boolean>(false);
  const [withdrawalConfigured, setWithdrawalConfigured] = useState<boolean>(false);
  const [selectedChannelCode, setSelectedChannelCode] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState<number>(500);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [utrInput, setUtrInput] = useState('');
  const [depositHistory, setDepositHistory] = useState<any[]>([]);

  // Bank accounts state
  const [bankList, setBankList] = useState<any[]>([]);
  const [showBankForm, setShowBankForm] = useState(false);
  const [bankCountry, setBankCountry] = useState('IN');
  const [bankName, setBankName] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingValue, setRoutingValue] = useState('');
  const [bankPhone, setBankPhone] = useState('');

  // Withdrawal state
  const [selectedBankId, setSelectedBankId] = useState<number | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('100');
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([]);

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setSubTab(initialSubTab);
  }, [initialSubTab]);

  const refreshPaymentChannels = useCallback(async () => {
    if (!user) return;
    try {
      const chRes = await apiFetch('/api/wallet/payment-channels');
      const nextChannels = chRes.channels || [];
      setChannels(nextChannels);
      setDepositConfigured(Boolean(chRes.depositProviderConfigured));
      setWithdrawalConfigured(Boolean(chRes.withdrawalProviderConfigured));
      setSelectedChannelCode((prev) => {
        if (nextChannels.length === 0) return '';
        if (prev && nextChannels.some((c: any) => c.code === prev)) return prev;
        return nextChannels[0].code;
      });
    } catch {
      // ignore transient poll errors
    }
  }, [user]);

  useEffect(() => {
    if (subTab !== 'deposit' || !user) return;
    refreshPaymentChannels();
    const onFocus = () => refreshPaymentChannels();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshPaymentChannels();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const interval = setInterval(refreshPaymentChannels, 15000);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      clearInterval(interval);
    };
  }, [subTab, user, refreshPaymentChannels]);

  const loadWalletData = useCallback(async () => {
    if (!user) return;
    setLoadingLedger(true);
    try {
      const [sumRes, chRes, depRes, bankRes, wdRes] = await Promise.all([
        apiFetch(`/api/wallet/summary?type=${ledgerFilter}`),
        apiFetch('/api/wallet/payment-channels'),
        apiFetch('/api/wallet/deposits'),
        apiFetch('/api/wallet/bank-accounts'),
        apiFetch('/api/wallet/withdrawals'),
      ]);
      setLedgerItems(sumRes.transactions || []);
      setChannels(chRes.channels || []);
      setDepositConfigured(Boolean(chRes.depositProviderConfigured));
      setWithdrawalConfigured(Boolean(chRes.withdrawalProviderConfigured));
      if (chRes.channels?.length && !selectedChannelCode) {
        setSelectedChannelCode(chRes.channels[0].code);
      }
      setDepositHistory(depRes.items || []);
      setBankList(bankRes.items || []);
      if (bankRes.items?.length && !selectedBankId) {
        setSelectedBankId(bankRes.items[0].id);
      }
      setWithdrawalHistory(wdRes.items || []);
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setLoadingLedger(false);
    }
  }, [user, ledgerFilter, selectedChannelCode, selectedBankId, language]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  if (!user || !wallet) {
    return (
      <div className="bg-white rounded-3xl p-8 text-center border border-slate-100 shadow-sm space-y-3">
        <Wallet className="w-10 h-10 text-[#F54E2E] mx-auto" />
        <h2 className="text-lg font-display font-bold text-slate-900">{t(language, 'wallet_title')}</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{t(language, 'wallet_signin_desc')}</p>
        <button
          type="button"
          onClick={onRequireLogin}
          className="px-6 h-11 rounded-full wingo-gradient text-white font-semibold text-sm"
        >
          {t(language, 'wallet_signin_btn')}
        </button>
      </div>
    );
  }

  const currency = wallet.currency || 'USD';
  const activeChannel = channels.find((c) => c.code === selectedChannelCode) || channels[0];
  const countryProfile = COUNTRY_BANK_PROFILES[bankCountry] || COUNTRY_BANK_PROFILES.IN;

  const handleCreateDeposit = async () => {
    if (!activeChannel) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/wallet/deposits', {
        method: 'POST',
        body: JSON.stringify({ channelCode: activeChannel.code, amount: Number(depositAmount) }),
      });
      setActiveOrder(res);
      setUtrInput('');
      await loadWalletData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder?.deposit?.id) return;
    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/wallet/deposits/${activeOrder.deposit.id}/utr`, {
        method: 'POST',
        body: JSON.stringify({ utrReference: utrInput }),
      });
      setFeedback({ type: 'success', text: res.message });
      setActiveOrder(null);
      setUtrInput('');
      await loadWalletData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setBusy(false);
    }
  };

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch('/api/wallet/bank-accounts', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: bankCountry,
          bankName,
          recipientName,
          accountNumber,
          routingCodeLabel: countryProfile.routingLabel,
          routingCodeValue: routingValue,
          phoneNumber: bankPhone,
          isDefault: true,
        }),
      });
      setFeedback({ type: 'success', text: t(language, 'banks_saved_success') });
      setShowBankForm(false);
      setBankName('');
      setRecipientName('');
      setAccountNumber('');
      setRoutingValue('');
      setBankPhone('');
      await loadWalletData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteBank = async (id: number) => {
    setBusy(true);
    try {
      await apiFetch(`/api/wallet/bank-accounts/${id}`, { method: 'DELETE' });
      await loadWalletData();
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setBusy(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBankId) {
      setFeedback({ type: 'error', text: t(language, 'withdraw_bind_bank_first') });
      return;
    }
    setBusy(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/wallet/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          bankAccountId: selectedBankId,
          amount: parseFloat(withdrawAmount),
          idempotencyKey: createIdempotencyKey('wd'),
        }),
      });
      setFeedback({ type: 'success', text: res.message });
      await Promise.all([refreshAccount(), loadWalletData()]);
    } catch (err: any) {
      setFeedback({ type: 'error', text: translateError(language, err?.message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Wallet Hero Banner */}
      <div className="rounded-3xl wingo-gradient text-white p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-white/85 flex items-center gap-1.5">
            <Wallet className="w-4 h-4" />
            <span>{t(language, 'wallet_available_label', { currency })}</span>
          </div>
          <div className="flex items-center gap-2.5 mt-1">
            <span className="text-3xl font-display font-extrabold font-mono-num" dir="ltr">
              {formatCurrency(wallet.availableBalance, currency, language)}
            </span>
            <button
              type="button"
              onClick={() => {
                refreshAccount();
                loadWalletData();
              }}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              aria-label={t(language, 'common_refresh')}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs text-white/85 mt-1.5 font-mono-num">
            {t(language, 'wallet_reserved_deposited', {
              reserved: formatCurrency(wallet.reservedBalance, currency, language),
              deposited: formatCurrency(wallet.totalDeposited, currency, language),
            })}
          </div>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 grid grid-cols-4 gap-1">
        {(
          [
            { id: 'overview', label: t(language, 'wallet_tab_ledger') },
            { id: 'deposit', label: t(language, 'wallet_tab_deposit') },
            { id: 'withdraw', label: t(language, 'wallet_tab_withdraw') },
            { id: 'banks', label: t(language, 'wallet_tab_banks') },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setSubTab(tab.id);
              setFeedback(null);
            }}
            className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap px-2 ${
              subTab === tab.id
                ? 'wingo-gradient text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2 border ${
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

      {/* SUBTAB 1: TRANSACTIONAL LEDGER */}
      {subTab === 'overview' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: t(language, 'common_all') },
              { id: 'deposit', label: t(language, 'wallet_filter_deposits') },
              { id: 'withdrawal', label: t(language, 'wallet_filter_withdrawals') },
              { id: 'wager', label: t(language, 'wallet_filter_wagers') },
              { id: 'payout', label: t(language, 'wallet_filter_payouts') },
              { id: 'gift_bonus', label: t(language, 'wallet_filter_bonuses') },
              { id: 'commission', label: t(language, 'wallet_filter_commissions') },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setLedgerFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  ledgerFilter === f.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="divide-y divide-slate-100">
            {loadingLedger ? (
              <div className="p-8 text-center text-xs text-slate-400">
                {t(language, 'wallet_loading_ledger')}
              </div>
            ) : ledgerItems.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400">
                {t(language, 'wallet_no_ledger')}
              </div>
            ) : (
              ledgerItems.map((tx) => {
                const amt = parseFloat(tx.amount);
                return (
                  <div key={tx.txRef} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 capitalize">
                        {tx.type.replace('_', ' ')} ·{' '}
                        <span className="font-mono-num font-normal text-slate-500" dir="ltr">
                          {tx.txRef}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{tx.note || tx.sourceId}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatLocaleDateTime(tx.createdAt, language)}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div
                        dir="ltr"
                        className={`text-sm font-mono-num font-bold ${
                          amt >= 0 ? 'text-emerald-600' : 'text-red-500'
                        }`}
                      >
                        {amt >= 0 ? '+' : ''}
                        {formatCurrency(amt, currency, language)}
                      </div>
                      <div className="text-[11px] font-mono-num text-slate-400">
                        {t(language, 'wallet_bal_short')}:{' '}
                        <span dir="ltr">{formatCurrency(tx.balanceAfter, currency, language)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* SUBTAB 2: DEPOSIT (Screenshots #4 & #5 layout with genuine verification workflow) */}
      {subTab === 'deposit' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-7 space-y-4">
            {!activeOrder ? (
              <>
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                  <div>
                    <h3 className="text-sm font-display font-bold text-slate-900">
                      {t(language, 'deposit_select_channel')}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t(language, 'deposit_channel_note')}
                    </p>
                  </div>

                  {!depositConfigured || channels.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-5 text-center space-y-2">
                      <AlertCircle className="w-6 h-6 text-amber-500 mx-auto" />
                      <div className="text-sm font-bold text-slate-900">
                        Payment Provider: Not configured
                      </div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        No deposit channels have been configured and enabled by the platform administrator yet. Deposits are disabled until real payment channel details are configured in Admin Panel → Platform Settings.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {channels.map((ch) => {
                        const active = activeChannel?.code === ch.code;
                        return (
                          <button
                            key={ch.code}
                            type="button"
                            onClick={() => setSelectedChannelCode(ch.code)}
                            className={`relative p-3 rounded-2xl border text-start transition-all ${
                              active
                                ? 'border-[#F54E2E] bg-orange-50/60 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            {ch.bonusRate > 0 && (
                              <span className="text-[10px] font-bold text-[#F54E2E] block mb-1">
                                {t(language, 'deposit_bonus_tag', { rate: ch.bonusRate })}
                              </span>
                            )}
                            {ch.category === 'bank_transfer' ? (
                              <Building2 className="w-5 h-5 text-slate-700 mb-1.5" />
                            ) : ch.category === 'payment_url' ? (
                              <Link2 className="w-5 h-5 text-slate-700 mb-1.5" />
                            ) : ch.category === 'usdt_trc20' ? (
                              <Coins className="w-5 h-5 text-slate-700 mb-1.5" />
                            ) : (
                              <QrCode className="w-5 h-5 text-slate-700 mb-1.5" />
                            )}
                            <div className="text-xs font-bold text-slate-900 leading-tight">{ch.name || ch.label}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{ch.subtitle || ch.currency}</div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {activeChannel && (
                    <div className="rounded-2xl bg-orange-50/70 border border-orange-100 p-3.5 text-xs space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold text-[#F54E2E]">
                          {activeChannel.name || activeChannel.label} ({activeChannel.currency || currency})
                        </div>
                        <button
                          type="button"
                          onClick={refreshPaymentChannels}
                          className="text-[11px] text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" /> Refresh
                        </button>
                      </div>
                      <div className="text-slate-600">
                        {t(language, 'deposit_limit_line', {
                          min: formatCurrency(activeChannel.minAmount, activeChannel.currency || currency, language),
                          max: formatCurrency(activeChannel.maxAmount, activeChannel.currency || currency, language),
                          rate: activeChannel.bonusRate,
                        })}
                      </div>

                      {activeChannel.category === 'bank_transfer' && activeChannel.details && (
                        <div className="rounded-xl bg-white border border-orange-100 p-3 space-y-1.5 text-slate-700">
                          <div><span className="text-slate-500">Bank:</span> <strong>{activeChannel.details.bankName}</strong></div>
                          <div><span className="text-slate-500">Account Holder:</span> <strong>{activeChannel.details.accountHolderName}</strong></div>
                          <div className="flex items-center justify-between gap-2">
                            <span>
                              <span className="text-slate-500">Account Number:</span>{' '}
                              <strong className="font-mono-num" dir="ltr">{activeChannel.details.accountNumber}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(String(activeChannel.details.accountNumber || ''));
                                setFeedback({ type: 'success', text: 'Account number copied.' });
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold inline-flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copy Account Number
                            </button>
                          </div>
                          <div>
                            <span className="text-slate-500">Country:</span> {activeChannel.details.country}
                            {activeChannel.details.branch ? ` · Branch: ${activeChannel.details.branch}` : ''}
                            {activeChannel.details.routingCode ? ` · SWIFT/Code: ${activeChannel.details.routingCode}` : ''}
                          </div>
                        </div>
                      )}

                      {activeChannel.category === 'qr_payment' && activeChannel.details && (
                        <div className="rounded-xl bg-white border border-orange-100 p-3 flex flex-col sm:flex-row items-center gap-3">
                          {activeChannel.details.qrImagePath && (
                            <img
                              src={`${activeChannel.details.qrImagePath}?v=${activeChannel.version || 1}`}
                              alt="Payment QR"
                              className="w-24 h-24 rounded-lg border border-slate-200 object-contain bg-white shrink-0"
                            />
                          )}
                          <div className="space-y-1 text-slate-700 min-w-0">
                            <div><span className="text-slate-500">Recipient:</span> <strong>{activeChannel.details.merchantName}</strong></div>
                            {activeChannel.details.qrPayload && (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[11px] break-all text-slate-600">{activeChannel.details.qrPayload}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard?.writeText(String(activeChannel.details.qrPayload || ''));
                                    setFeedback({ type: 'success', text: 'Payment details copied.' });
                                  }}
                                  className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 font-semibold inline-flex items-center gap-1"
                                >
                                  <Copy className="w-3 h-3" /> Copy
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeChannel.category === 'payment_url' && activeChannel.details && (
                        <div className="rounded-xl bg-white border border-orange-100 p-3 space-y-1.5 text-slate-700">
                          <div>{activeChannel.details.description}</div>
                          <div className="font-mono text-[11px] text-slate-500 break-all">{activeChannel.details.paymentUrl}</div>
                        </div>
                      )}

                      {activeChannel.category === 'usdt_trc20' && activeChannel.details && (
                        <div className="rounded-xl bg-white border border-orange-100 p-3 space-y-2 text-slate-700">
                          <div className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[11px]">
                            Network: {activeChannel.details.network || 'TRON (TRC20)'} — Send ONLY USDT on TRON (TRC20)
                          </div>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-mono-num text-[11px] break-all font-bold" dir="ltr">
                              {activeChannel.details.walletAddress}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(String(activeChannel.details.walletAddress || ''));
                                setFeedback({ type: 'success', text: 'TRC20 wallet address copied.' });
                              }}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold inline-flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" /> Copy Address
                            </button>
                          </div>
                        </div>
                      )}

                      {Array.isArray(activeChannel.instructions) && activeChannel.instructions.length > 0 && (
                        <div className="text-[11px] text-slate-600 space-y-0.5">
                          {activeChannel.instructions.map((line: string, i: number) => (
                            <div key={i}>{i + 1}. {line}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preset Amounts */}
                  <div>
                    <label className="block text-sm font-display font-bold text-slate-900 mb-2.5">
                      {t(language, 'deposit_amount_label')}
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                      {(activeChannel?.presets || [100, 200, 300, 500, 1000, 2000, 3000, 5000]).map(
                        (amt: number) => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => setDepositAmount(amt)}
                            className={`h-11 rounded-xl font-mono-num text-sm font-bold border transition-all ${
                              depositAmount === amt
                                ? 'wingo-gradient text-white border-transparent shadow-sm'
                                : 'bg-white border-slate-200 text-[#F54E2E] hover:bg-orange-50'
                            }`}
                          >
                            <span dir="ltr">{amt >= 1000 ? `${amt / 1000}K` : amt}</span>
                          </button>
                        )
                      )}
                    </div>
                    <input
                      type="number"
                      dir="ltr"
                      min={activeChannel?.minAmount || 10}
                      max={activeChannel?.maxAmount || 50000}
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                      className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-base font-mono-num font-bold text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={busy || !depositAmount || !depositConfigured || !activeChannel}
                    onClick={handleCreateDeposit}
                    className="w-full h-12 rounded-full wingo-gradient text-white font-bold text-sm shadow-sm hover:opacity-95 disabled:opacity-50"
                  >
                    {!depositConfigured
                      ? 'Not configured'
                      : busy
                        ? t(language, 'deposit_generating')
                        : t(language, 'deposit_proceed', {
                            amount: formatCurrency(depositAmount, currency, language),
                          })}
                  </button>
                </div>
              </>
            ) : (
              /* Active QR Checkout & UTR Submission View (modeled on Screenshot #5) */
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <div className="text-xs text-slate-500">
                      {t(language, 'deposit_order_label', { ref: activeOrder.deposit.orderRef })}
                    </div>
                    <div className="text-2xl font-display font-extrabold font-mono-num text-slate-900">
                      {formatCurrency(activeOrder.deposit.amount, currency, language)}
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="text-xs font-semibold text-[#F54E2E] flex items-center gap-1 justify-end">
                      <Clock className="w-3.5 h-3.5" /> {t(language, 'deposit_window')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveOrder(null)}
                      className="text-xs text-slate-500 hover:underline mt-1"
                    >
                      {t(language, 'deposit_cancel_back')}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center text-center border border-slate-200/70 space-y-3">
                  {(activeOrder.snapshot?.details?.qrImagePath || activeOrder.qrDataUrl) && (
                    <img
                      src={
                        activeOrder.snapshot?.details?.qrImagePath
                          ? `${activeOrder.snapshot.details.qrImagePath}?v=${activeOrder.snapshot.channelVersion || 1}`
                          : activeOrder.qrDataUrl
                      }
                      alt="WinGo Payment QR Code"
                      className="w-48 h-48 rounded-xl bg-white p-2 shadow-xs object-contain"
                    />
                  )}

                  {activeOrder.snapshot?.category === 'bank_transfer' && activeOrder.snapshot.details && (
                    <div className="w-full text-left bg-white rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                      <div><span className="text-slate-500">Bank:</span> <strong>{activeOrder.snapshot.details.bankName}</strong></div>
                      <div><span className="text-slate-500">Account Holder:</span> <strong>{activeOrder.snapshot.details.accountHolderName}</strong></div>
                      <div className="flex items-center justify-between gap-2">
                        <span><span className="text-slate-500">Account Number:</span> <strong className="font-mono-num" dir="ltr">{activeOrder.snapshot.details.accountNumber}</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(String(activeOrder.snapshot.details.accountNumber || ''));
                            setFeedback({ type: 'success', text: 'Account number copied.' });
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>
                      </div>
                    </div>
                  )}

                  {activeOrder.snapshot?.category === 'payment_url' && activeOrder.snapshot.details?.paymentUrl && (
                    <div className="w-full space-y-2">
                      <a
                        href={activeOrder.snapshot.details.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-full bg-slate-900 text-white text-xs font-bold hover:opacity-90"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Open Approved Payment Link
                      </a>
                      <p className="text-[11px] text-amber-700">
                        Opening the payment link does not confirm payment. Submit your transaction reference below after paying.
                      </p>
                    </div>
                  )}

                  {activeOrder.snapshot?.category === 'usdt_trc20' && activeOrder.snapshot.details && (
                    <div className="w-full text-left bg-white rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
                      <div className="font-bold text-amber-800">Network: {activeOrder.snapshot.details.network || 'TRON (TRC20)'}</div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-mono-num font-bold break-all" dir="ltr">{activeOrder.snapshot.details.walletAddress}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(String(activeOrder.snapshot.details.walletAddress || ''));
                            setFeedback({ type: 'success', text: 'TRC20 address copied.' });
                          }}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 font-semibold inline-flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy Address
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1 text-xs text-slate-600 max-w-sm">
                    {(activeOrder.snapshot?.instructions || activeOrder.channel?.instructions || []).map((line: string, i: number) => (
                      <p key={i}>
                        {i + 1}. {line}
                      </p>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleSubmitUtr} className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-900 mb-1">
                      {t(language, 'deposit_utr_title')}
                    </label>
                    <p className="text-xs text-amber-700 mb-2">
                      {t(language, 'deposit_utr_warning')}
                    </p>
                    <input
                      type="text"
                      dir="ltr"
                      value={utrInput}
                      onChange={(e) => setUtrInput(e.target.value)}
                      placeholder={t(language, 'deposit_utr_placeholder')}
                      required
                      minLength={6}
                      className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono-num text-slate-900 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy}
                    className="w-full h-12 rounded-full wingo-gradient text-white font-bold text-sm"
                  >
                    {busy ? t(language, 'deposit_utr_submitting') : t(language, 'deposit_utr_btn')}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Deposit History Column */}
          <div className="lg:col-span-5 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-slate-900">
                {t(language, 'deposit_history_title')}
              </h3>
              <ArrowDownLeft className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {depositHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {t(language, 'deposit_no_history')}
                </div>
              ) : (
                depositHistory.map((dep) => (
                  <div key={dep.orderRef} className="p-4 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-mono-num font-bold text-slate-900" dir="ltr">
                        {dep.orderRef}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {dep.channelLabel}{' '}
                        {dep.utrReference
                          ? `· ${dep.utrReference}`
                          : `· ${t(language, 'deposit_awaiting_ref')}`}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {formatLocaleDateTime(dep.createdAt, language)}
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      <div className="font-mono-num font-bold text-sm text-slate-900">
                        {formatCurrency(dep.amount, currency, language)}
                      </div>
                      <div
                        className={`text-[11px] font-bold uppercase ${
                          dep.status === 'completed'
                            ? 'text-emerald-600'
                            : dep.status === 'rejected' || dep.status === 'expired'
                              ? 'text-red-500'
                              : 'text-amber-600'
                        }`}
                      >
                        {translateStatus(language, dep.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: WITHDRAWAL */}
      {subTab === 'withdraw' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-display font-bold text-slate-900">
              {t(language, 'withdraw_title')}
            </h3>

            {!withdrawalConfigured && (
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-900">Withdrawal Payout Rail: Not configured</div>
                  <p className="mt-0.5">
                    Withdrawal requests are disabled until a payout rail is configured by the platform administrator in Admin Panel → Platform Settings.
                  </p>
                </div>
              </div>
            )}

            {bankList.length === 0 ? (
              <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 text-xs text-slate-700 space-y-2.5">
                <p>{t(language, 'withdraw_bind_bank_first')}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSubTab('banks');
                    setShowBankForm(true);
                  }}
                  className="px-4 h-10 rounded-full wingo-gradient text-white font-semibold"
                >
                  {t(language, 'withdraw_add_bank_btn')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">
                    {t(language, 'withdraw_dest_bank')}
                  </label>
                  <div className="space-y-2">
                    {bankList.map((b) => (
                      <label
                        key={b.id}
                        className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-colors ${
                          selectedBankId === b.id
                            ? 'border-[#F54E2E] bg-orange-50/50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="bankAccount"
                            checked={selectedBankId === b.id}
                            onChange={() => setSelectedBankId(b.id)}
                            className="accent-[#F54E2E]"
                          />
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {b.bankName} ({b.countryCode})
                            </div>
                            <div className="text-xs text-slate-500 font-mono-num" dir="ltr">
                              {b.recipientName} · {b.accountNumberMasked} · {b.routingCodeLabel}:{' '}
                              {b.routingCodeValue}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    {t(language, 'withdraw_amount_label', {
                      available: formatCurrency(wallet.availableBalance, currency, language),
                    })}
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    min={10}
                    max={parseFloat(wallet.availableBalance)}
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                    disabled={!withdrawalConfigured}
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-base font-mono-num font-bold text-slate-900 focus:outline-none focus:border-orange-500 disabled:opacity-50"
                  />
                </div>

                <p className="text-xs text-slate-500">
                  {t(language, 'withdraw_policy_note')}
                </p>

                <button
                  type="submit"
                  disabled={busy || !withdrawalConfigured}
                  className="w-full h-12 rounded-full wingo-gradient text-white font-bold text-sm disabled:opacity-50"
                >
                  {!withdrawalConfigured
                    ? 'Not configured'
                    : busy
                      ? t(language, 'withdraw_submitting')
                      : t(language, 'withdraw_submit_btn')}
                </button>
              </form>
            )}
          </div>

          <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-display font-bold text-slate-900">
                {t(language, 'withdraw_history_title')}
              </h3>
              <ArrowUpRight className="w-4 h-4 text-[#F54E2E]" />
            </div>
            <div className="divide-y divide-slate-100 max-h-[480px] overflow-y-auto">
              {withdrawalHistory.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {t(language, 'withdraw_no_history')}
                </div>
              ) : (
                withdrawalHistory.map((wd) => (
                  <div key={wd.orderRef} className="p-4 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0">
                      <div className="font-mono-num font-bold text-slate-900" dir="ltr">
                        {wd.orderRef}
                      </div>
                      <div className="text-slate-500 mt-0.5">
                        {wd.bankName} ({wd.accountNumberMasked})
                      </div>
                      {wd.payoutReference && (
                        <div className="text-[11px] font-mono-num text-emerald-700 mt-0.5">
                          {t(language, 'withdraw_payout_ref')}: <span dir="ltr">{wd.payoutReference}</span>
                        </div>
                      )}
                      {wd.reviewNote && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{wd.reviewNote}</div>
                      )}
                    </div>
                    <div className="text-end shrink-0">
                      <div className="font-mono-num font-bold text-sm text-slate-900">
                        {formatCurrency(wd.amount, currency, language)}
                      </div>
                      <div
                        className={`text-[11px] font-bold uppercase ${
                          wd.status === 'completed'
                            ? 'text-emerald-600'
                            : wd.status === 'rejected'
                              ? 'text-red-500'
                              : 'text-amber-600'
                        }`}
                      >
                        {translateStatus(language, wd.status)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: BANK ACCOUNTS (Country-specific & Encrypted, modeled on Screenshot #6) */}
      {subTab === 'banks' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <div className="lg:col-span-6 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-display font-bold text-slate-900">
                {t(language, 'banks_saved_title')}
              </h3>
              <button
                type="button"
                onClick={() => setShowBankForm(!showBankForm)}
                className="h-9 px-3.5 rounded-full wingo-gradient text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" /> {t(language, 'banks_add_btn')}
              </button>
            </div>

            <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 text-xs text-[#E63E22] flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0" />
              <span>{t(language, 'banks_encryption_note')}</span>
            </div>

            <div className="space-y-2.5">
              {bankList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  {t(language, 'banks_empty')}
                </div>
              ) : (
                bankList.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-2xl border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F54E2E] flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {b.bankName} · {b.countryCode}
                        </div>
                        <div className="text-xs text-slate-600 font-mono-num" dir="ltr">
                          {b.recipientName} · {b.accountNumberMasked}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono-num" dir="ltr">
                          {b.routingCodeLabel}: {b.routingCodeValue} · {b.phoneNumber}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteBank(b.id)}
                      className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-red-500 rounded-lg"
                      aria-label={t(language, 'common_remove')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {(showBankForm || bankList.length === 0) && (
            <form
              onSubmit={handleAddBank}
              className="lg:col-span-6 bg-white rounded-3xl p-5 shadow-sm border border-slate-100 space-y-4"
            >
              <h3 className="text-sm font-display font-bold text-slate-900">
                {t(language, 'banks_form_title')}
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {t(language, 'banks_country_label')}
                </label>
                <select
                  value={bankCountry}
                  onChange={(e) => {
                    setBankCountry(e.target.value);
                    setBankName('');
                  }}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                >
                  {Object.entries(COUNTRY_BANK_PROFILES).map(([code, p]) => (
                    <option key={code} value={code}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {t(language, 'banks_choose_bank')}
                </label>
                <input
                  list="wingo-bank-suggestions"
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder={t(language, 'banks_choose_bank_placeholder')}
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                />
                <datalist id="wingo-bank-suggestions">
                  {countryProfile.banks.map((bn) => (
                    <option key={bn} value={bn} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {t(language, 'banks_recipient_label')}
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder={t(language, 'banks_recipient_placeholder')}
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                  {t(language, 'banks_account_label')}
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder={t(language, 'banks_account_placeholder')}
                  required
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono-num text-slate-900 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    {t(language, 'banks_phone_label')}
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={bankPhone}
                    onChange={(e) => setBankPhone(e.target.value)}
                    placeholder={t(language, 'banks_phone_placeholder')}
                    required
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                    {countryProfile.routingLabel}
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    value={routingValue}
                    onChange={(e) => setRoutingValue(e.target.value)}
                    placeholder={countryProfile.routingPlaceholder}
                    required
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-mono-num uppercase text-slate-900 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full h-12 rounded-full wingo-gradient text-white font-bold text-sm"
              >
                {busy ? t(language, 'banks_saving') : t(language, 'banks_save_btn')}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
