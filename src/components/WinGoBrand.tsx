import React from 'react';
import { useAuth } from '../context/AuthContext';
import { t } from '../lib/i18n';

export function WinGoLogo({
  variant = 'light',
  size = 'md',
}: {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
}) {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 34 : 28;
  const textClass =
    size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';

  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap shrink-0 select-none">
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect
          width="36"
          height="36"
          rx="10"
          fill={variant === 'light' ? 'rgba(255,255,255,0.2)' : '#F54E2E'}
        />
        <path
          d="M7.5 11.5L12.3 24.5H15.2L18 16.4L20.8 24.5H23.7L28.5 11.5H25.1L22.1 20.4L19.4 12.2H16.6L13.9 20.4L10.9 11.5H7.5Z"
          fill="#FFFFFF"
        />
        <circle cx="27.5" cy="8.5" r="2.5" fill="#FDE047" />
      </svg>
      <span
        className={`font-display font-extrabold tracking-tight ${textClass} ${
          variant === 'light' ? 'text-white' : 'text-slate-900'
        }`}
      >
        Win<span className={variant === 'light' ? 'text-amber-200' : 'text-[#F54E2E]'}>Go</span>
      </span>
    </span>
  );
}

/**
 * Tactile WinGo numbered ball preserving iconic color & split-violet visuals (0-9).
 */
export function NumberBall({
  num,
  size = 'md',
  selected = false,
  disabled = false,
  onClick,
}: {
  num: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const { language } = useAuth();
  const isZero = num === 0;
  const isFive = num === 5;
  const isGreen = num === 1 || num === 3 || num === 7 || num === 9;

  let ringBackground = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
  let textColor = 'text-red-600';

  if (isZero) {
    ringBackground = 'linear-gradient(135deg, #ef4444 0%, #ef4444 49%, #8b5cf6 51%, #7c3aed 100%)';
    textColor = 'text-purple-700';
  } else if (isFive) {
    ringBackground = 'linear-gradient(135deg, #16a34a 0%, #16a34a 49%, #8b5cf6 51%, #7c3aed 100%)';
    textColor = 'text-purple-700';
  } else if (isGreen) {
    ringBackground = 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)';
    textColor = 'text-emerald-600';
  }

  const dims =
    size === 'xs'
      ? 'w-7 h-7 text-xs p-[3px]'
      : size === 'sm'
        ? 'w-9 h-9 text-sm p-[4px]'
        : size === 'lg'
          ? 'w-14 h-14 text-2xl p-[6px]'
          : 'w-12 h-12 sm:w-14 sm:h-14 text-xl p-[5px]';

  const inner = (
    <span
      className={`inline-flex items-center justify-center rounded-full shadow-sm transition-transform duration-150 ${dims} ${
        selected ? 'ring-3 ring-orange-500 ring-offset-2 scale-105' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : onClick ? 'hover:scale-105 active:scale-95 cursor-pointer' : ''}`}
      style={{ background: ringBackground }}
    >
      <span
        className={`w-full h-full rounded-full bg-white/95 flex items-center justify-center font-display font-extrabold font-mono-num shadow-inner ${textColor}`}
      >
        {num}
      </span>
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={`${t(language, 'game_number_prefix')} ${num}`}
        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-full"
      >
        {inner}
      </button>
    );
  }
  return inner;
}

export function ColorDots({ colors }: { colors: string[] }) {
  const { language } = useAuth();
  return (
    <span className="inline-flex items-center gap-1.5">
      {colors.map((c) => {
        const bg =
          c === 'green' ? 'bg-emerald-500' : c === 'violet' ? 'bg-violet-500' : 'bg-red-500';
        const label =
          c === 'green'
            ? t(language, 'game_color_green')
            : c === 'violet'
              ? t(language, 'game_color_violet')
              : c === 'red'
                ? t(language, 'game_color_red')
                : c.charAt(0).toUpperCase() + c.slice(1);
        return (
          <span key={c} className="inline-flex items-center gap-1 text-xs font-medium text-slate-700">
            <span className={`w-2.5 h-2.5 rounded-full ${bg}`} aria-hidden="true" />
            <span>{label}</span>
          </span>
        );
      })}
    </span>
  );
}
