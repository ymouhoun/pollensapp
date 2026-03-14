import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2, Zap, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';

export default function MediaOverlay({ item, onClose, onPrev, onNext }) {
  const queryClient = useQueryClient();
  const [backdropImage, setBackdropImage] = useState(null);

  useEffect(() => {
    if (!item || item.content_type !== 'video') return;

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = item.file_url;

    video.onloadedmetadata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      setBackdropImage(canvas.toDataURL());
    };
  }, [item]);

  useEffect(() => {
    if (!item) return;
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev?.();
      if (e.key === 'ArrowRight') onNext?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [item, onClose, onPrev, onNext]);

  if (!item) return null;

  const filename = item.file_url ? item.file_url.split('/').pop().split('?')[0] : item.title || 'untitled';

  const handleDelete = async () => {
    await base44.entities.MediaItem.update(item.id, { is_forgotten: true });
    queryClient.invalidateQueries({ queryKey: ['media-items'] });
    onClose();
  };

  const handleUseAsPrompt = async () => {
    const caption = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this image in great detail and provide a comprehensive visual description suitable as a creative prompt for image generation. Include: the main subjects and their arrangement, background elements and depth, color palette and lighting conditions, atmospheric qualities and mood, composition and framing techniques, textures and materials, any distinctive style or aesthetic, technical aspects like focus and perspective, and the overall narrative or feeling conveyed. Be specific, vivid, and evocative. Aim for a rich, detailed description that captures both obvious and subtle visual elements.`,
      file_urls: [item.file_url]
    });
    window.location.href = `/Entropy?prompt=${encodeURIComponent(caption)}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
        exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        {/* Fullscreen blurred + grain image backdrop */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={item.content_type === 'video' && backdropImage ? backdropImage : item.file_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: 'blur(40px)', transform: 'scale(1.15)' }}
          />
          <div className="absolute inset-0 bg-background/15" />
          {/* Grain overlay */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '128px 128px',
              mixBlendMode: 'overlay',
            }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-foreground/40 hover:text-foreground transition-colors z-10"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
        </button>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative flex items-center gap-8"
          onClick={e => e.stopPropagation()}
        >
          {/* Media */}
          <div className="rounded-lg overflow-hidden shadow-2xl max-h-[75vh] max-w-[45vw]">
            {item.content_type === 'video' ? (
              <video
                src={item.file_url}
                controls
                className="max-h-[75vh] max-w-[45vw] object-contain"
              />
            ) : (
              <img
                src={item.file_url}
                alt={item.title || ''}
                className="max-h-[75vh] max-w-[45vw] object-contain"
              />
            )}
          </div>

          {/* Sidebar actions */}
          <div className="flex flex-col gap-3 min-w-[140px]">
            <p className="text-foreground/70 text-sm font-light truncate max-w-[160px]">{filename}</p>
            <button
              onClick={handleUseAsPrompt}
              className="flex items-center gap-2 text-blue-500 hover:text-blue-400 transition-colors text-sm font-light disabled:opacity-50"
              disabled={false}
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