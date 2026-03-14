import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Zap, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function MediaOverlay({ item, onClose }) {
  const queryClient = useQueryClient();

  if (!item) return null;

  const filename = item.file_url ? item.file_url.split('/').pop().split('?')[0] : item.title || 'untitled';

  const handleDelete = async () => {
    await base44.entities.MediaItem.update(item.id, { is_forgotten: true });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    onClose();
  };

  const handleUseAsPrompt = () => {
    const text = item.title || item.text_content || filename;
    window.location.href = `/Iterate?prompt=${encodeURIComponent(text)}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Blurred backdrop */}
        <div className="absolute inset-0 bg-background/40 backdrop-blur-xl" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-foreground/40 hover:text-foreground transition-colors z-10"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex items-center gap-8"
          onClick={e => e.stopPropagation()}
        >
          {/* Image */}
          <div className="rounded-lg overflow-hidden shadow-2xl max-h-[75vh] max-w-[45vw]">
            <img
              src={item.file_url}
              alt={item.title || ''}
              className="max-h-[75vh] max-w-[45vw] object-contain"
            />
          </div>

          {/* Sidebar actions */}
          <div className="flex flex-col gap-3 min-w-[140px]">
            <p className="text-foreground/70 text-sm font-light truncate max-w-[160px]">{filename}</p>
            <button
              onClick={handleUseAsPrompt}
              className="flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors text-sm font-light"
            >
              <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
              use as prompt
            </button>
            <a
              href={item.file_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-foreground/60 hover:text-foreground transition-colors text-sm font-light"
            >
              <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
              download
            </a>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 text-red-500 hover:text-red-400 transition-colors text-sm font-light"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              delete
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}