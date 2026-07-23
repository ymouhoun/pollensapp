import { useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

interface LocationTagProps {
  label: string;
  detail: string;
  active?: boolean;
  pending?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function LocationTag({ label, detail, active = false, pending = false, disabled = false, onClick }: LocationTagProps) {
  const [isHovered, setIsHovered] = useState(false);
  const dotClass = pending ? 'bg-amber-300' : active ? 'bg-emerald-400' : 'bg-white/35';

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={`${label}. ${detail}`}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-white/10 bg-black/35 px-4 py-2.5 text-white shadow-2xl backdrop-blur-xl transition-all duration-500 ease-out hover:border-white/20 hover:bg-black/50 disabled:cursor-wait"
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {(active || pending) && <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${dotClass}`} />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
      </span>
      <span className="relative grid min-w-0 overflow-hidden text-[10px] font-medium uppercase tracking-widest">
        <span className={`col-start-1 row-start-1 truncate transition-all duration-500 ${isHovered ? '-translate-y-full opacity-0' : 'translate-y-0 opacity-100'}`}>{label}</span>
        <span className={`col-start-1 row-start-1 truncate transition-all duration-500 ${isHovered ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>{detail}</span>
      </span>
      <ArrowUpRight className={`h-3 w-3 shrink-0 text-white/45 transition-all duration-300 ${isHovered ? 'translate-x-0.5 -translate-y-0.5 opacity-100' : 'opacity-50'}`} strokeWidth={2} />
    </button>
  );
}