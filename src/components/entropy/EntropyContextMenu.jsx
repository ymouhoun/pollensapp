import React, { useEffect, useRef } from 'react';
import { Save, Download, Trash2 } from 'lucide-react';

export default function EntropyContextMenu({ position, onClose, onSaveToMemory, onDownload, onDelete }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  if (!position) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[200] w-40 rounded-lg overflow-hidden shadow-lg border"
      style={{
        top: position.y,
        left: position.x,
        background: 'hsl(var(--entropy-panel) / 0.86)',
        borderColor: 'hsl(var(--entropy-border))',
        backdropFilter: 'blur(60px) saturate(180%)',
        WebkitBackdropFilter: 'blur(60px) saturate(180%)',
      }}
    >
      <div className="py-0.5">
        <MenuItem icon={Save} label="Save to memory" onClick={() => { onSaveToMemory(); onClose(); }} />
        <MenuItem icon={Download} label="Download" onClick={() => { onDownload(); onClose(); }} />
        <div className="h-px bg-entropy-border my-0.5" />
        <MenuItem icon={Trash2} label="Delete" onClick={() => { onDelete(); onClose(); }} danger />
      </div>
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors cursor-pointer ${
        danger ? 'text-red-400 hover:bg-red-500/15' : 'text-entropy-foreground hover:bg-entropy-bg'
      }`}
    >
      <Icon className="w-3 h-3 opacity-60 flex-shrink-0" strokeWidth={1.5} />
      <span className="font-light tracking-wide">{label}</span>
    </button>
  );
}