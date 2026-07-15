import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ComplementaryPromptNotch({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative z-10 ml-4 w-[calc(100%_-_2rem)]">
      <button
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-t-xl border border-b-0 border-white/10 bg-white/[0.07] px-3 py-1.5 text-[9px] uppercase tracking-widest text-white/40 backdrop-blur-2xl hover:text-white/65"
      >
        Complementary prompt
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="rounded-tr-xl border border-b-0 border-white/10 bg-white/[0.07] p-3 backdrop-blur-2xl">
          <textarea
            value={value}
            onChange={event => onChange(event.target.value)}
            rows={2}
            className="w-full resize-none bg-transparent text-[12px] leading-relaxed text-white/65 outline-none placeholder:text-white/20"
            placeholder="Additional conditioning prompt..."
          />
        </div>
      )}
    </div>
  );
}