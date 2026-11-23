import React, { useState } from 'react';
import {
  Gamepad2,
  Wallet,
  Users,
  Gift,
  Headphones,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WinGoLogo } from './components/WinGoBrand';
import { LanguageSelector } from './components/LanguageSelector';
import { AuthScreen } from './components/AuthViews';
import { WinGoGameView } from './components/WinGoGameView';
import { WalletFinanceViews } from './components/WalletFinanceViews';
import { AgencyView, GiftCodeView, SupportCenterView } from './components/CommunityViews';
import { PlayerAccountModal } from './components/PlayerAccountModal';
import { t } from './lib/i18n';

type PlayerPage = 'play' | 'wallet' | 'agency' | 'gifts' | 'support' | 'auth';

function WinGoPlayerShell() {
  const { user, loading, language } = useAuth();
  const [page, setPage] = useState<PlayerPage>('play');
  const [walletInitialTab, setWalletInitialTab] = useState<'overview' | 'deposit' | 'withdraw' | 'banks'>('overview');
  const [authInitialMode, setAuthInitialMode] = useState<'login' | 'register'>('login');
  const [showAccountModal, setShowAccountModal] = useState(false);

  if (page === 'auth') {
    return (
      <AuthScreen
        initialMode={authInitialMode}
        onSuccess={() => setPage('play')}
        onCancel={() => setPage('play')}
        onOpenSupport={() => setPage('support')}
      />
    );
  }

  const openLogin = (mode: 'login' | 'register' = 'login') => {
    setAuthInitialMode(mode);
    setPage('auth');
  };

  const navLinks: { id: PlayerPage; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'play', label: t(language, 'nav_play'), icon: Gamepad2 },
    { id: 'wallet', label: t(language, 'nav_wallet'), icon: Wallet },
    { id: 'agency', label: t(language, 'nav_agency'), icon: Users },
    { id: 'gifts', label: t(language, 'nav_gifts'), icon: Gift },
    { id: 'support', label: t(language, 'nav_support'), icon: Headphones },
  ];

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 flex flex-col">
      <header className="sticky top-0 z-30 h-14 wingo-gradient text-white shadow-xs">
        <div className="max-w-7xl mx-auto h-full px-4 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => setPage('play')}
            className="focus-visible:outline-none whitespace-nowrap shrink-0"
          >
            <WinGoLogo variant="light" size="md" />
          </button>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-white/90">
            {navLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'wallet') setWalletInitialTab('overview');
                  setPage(item.id);
                }}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  page === item.id
                    ? 'border-white text-white font-semibold'
                    : 'border-transparent hover:text-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <LanguageSelector compact />

            {loading ? (
              <span className="text-xs text-white/80">...</span>
            ) : user ? (
              <button
                type="button"
                onClick={() => setShowAccountModal(true)}
                title={user.displayName}
                className="h-9 px-3 rounded-full bg-white text-[#F54E2E] hover:bg-orange-50 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="max-w-[90px] truncate">{user.displayName}</span>
                <LogOut className="w-3.5 h-3.5 opacity-60" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => openLogin('login')}
                className="h-9 px-4 rounded-full bg-white text-[#F54E2E] hover:bg-orange-50 text-xs font-bold whitespace-nowrap shrink-0"
              >
                {t(language, 'auth_login')}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-24 md:pb-10">
        {page === 'play' && (
          <WinGoGameView
            onOpenDeposit={() => {
              setWalletInitialTab('deposit');
              setPage('wallet');
            }}
            onOpenWithdraw={() => {
              setWalletInitialTab('withdraw');
              setPage('wallet');
            }}
            onRequireLogin={() => openLogin('login')}
          />
        )}

        {page === 'wallet' && (
          <WalletFinanceViews
            initialSubTab={walletInitialTab}
            onRequireLogin={() => openLogin('login')}
          />
        )}

        {page === 'agency' && <AgencyView onRequireLogin={() => openLogin('login')} />}
        {page === 'gifts' && <GiftCodeView onRequireLogin={() => openLogin('login')} />}
        {page === 'support' && <SupportCenterView onRequireLogin={() => openLogin('login')} />}
      </main>

      <footer className="hidden md:block border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <span>{t(language, 'footer_tagline')}</span>
          <span>WinGo Player Platform</span>
        </div>
      </footer>

      <nav
        aria-label="Mobile navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-safe"
      >
        <div className="grid grid-cols-5 h-14">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (item.id === 'wallet') setWalletInitialTab('overview');
                  setPage(item.id);
                }}
                className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? 'text-[#F54E2E]' : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold tracking-tight leading-none">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      {showAccountModal && <PlayerAccountModal onClose={() => setShowAccountModal(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WinGoPlayerShell />
    </AuthProvider>
  );
}
