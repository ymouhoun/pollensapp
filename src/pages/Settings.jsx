import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Upload, Trash2, Loader2, Type, Image, Zap, Plus, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

function TenantsSection() {
  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => base44.entities.Tenant.list('-created_date'),
  });

  return (
    <section className="mb-10">
      <h2 className="text-[11px] tracking-widest uppercase text-muted-foreground mb-4">Tenants</h2>
      <div className="border border-border/40 rounded-lg p-5 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/40" />
          </div>
        ) : tenants.length === 0 ? (
          <p className="text-sm text-muted-foreground/40 text-center py-2">No tenants yet.</p>
        ) : (
          tenants.map(t => (
            <Link
              key={t.id}
              to={`/admin/tenant?id=${t.id}`}
              className="flex items-center justify-between py-2 px-1 hover:bg-muted/30 rounded transition-colors group"
            >
              <div>
                <span className="text-sm text-foreground">{t.name}</span>
                <span className="text-[10px] text-muted-foreground/40 ml-2 tracking-wider uppercase">{t.slug}</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 group-hover:text-muted-foreground/50 transition-colors" strokeWidth={1.5} />
            </Link>
          ))
        )}
        <Link
          to="/admin/tenant"
          className="flex items-center gap-2 text-xs text-muted-foreground/50 hover:text-foreground/70 transition-colors pt-1"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          New tenant
        </Link>
      </div>
    </section>
  );
}

export default function Settings() {
  const [uploading, setUploading] = useState(false);
  const [fontName, setFontName] = useState('');
  const [file, setFile] = useState(null);
  const fileRef = useRef();
  const queryClient = useQueryClient();

  // Logo state
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const logoFileRef = useRef();
  const [logoSize, setLogoSize] = useState(() => parseInt(localStorage.getItem('logo-size') || '64'));

  const { data: fonts = [] } = useQuery({
    queryKey: ['custom-fonts'],
    queryFn: () => base44.entities.CustomFont.list('-created_date'),
  });

  const { data: logos = [] } = useQuery({
    queryKey: ['app-logo'],
    queryFn: () => base44.entities.AppLogo.list('-created_date', 1),
  });

  const currentLogo = logos[0] || null;

  const { data: generatedImages = [] } = useQuery({
    queryKey: ['generated-images'],
    queryFn: () => base44.entities.GeneratedImage.list('-created_date'),
  });

  const [deletingGenerated, setDeletingGenerated] = useState(false);

  const handleDeleteAllGenerated = async () => {
    if (!confirm('Delete all generated images? This cannot be undone.')) return;
    setDeletingGenerated(true);
    const ids = generatedImages.map(i => i.id);
    for (const id of ids) {
      await base44.entities.GeneratedImage.delete(id);
    }
    setDeletingGenerated(false);
    queryClient.invalidateQueries({ queryKey: ['generated-images'] });
  };

  const getFormat = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (['woff2', 'woff', 'ttf', 'otf'].includes(ext)) return ext;
    return 'woff2';
  };

  const handleUpload = async () => {
    if (!file || !fontName.trim()) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.CustomFont.create({
      name: fontName.trim(),
      file_url,
      format: getFormat(file.name),
    });
    setFontName('');
    setFile(null);
    fileRef.current.value = '';
    setUploading(false);
    queryClient.invalidateQueries({ queryKey: ['custom-fonts'] });
  };

  const handleDelete = async (id) => {
    await base44.entities.CustomFont.delete(id);
    queryClient.invalidateQueries({ queryKey: ['custom-fonts'] });
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setLogoUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
    if (currentLogo) {
      await base44.entities.AppLogo.update(currentLogo.id, { file_url });
    } else {
      await base44.entities.AppLogo.create({ file_url });
    }
    setLogoFile(null);
    logoFileRef.current.value = '';
    setLogoUploading(false);
    queryClient.invalidateQueries({ queryKey: ['app-logo'] });
  };

  const handleLogoDelete = async () => {
    if (!currentLogo) return;
    await base44.entities.AppLogo.delete(currentLogo.id);
    queryClient.invalidateQueries({ queryKey: ['app-logo'] });
  };

  // Inject @font-face styles
  const fontFaceStyle = fonts.map(f =>
    `@font-face { font-family: '${f.name}'; src: url('${f.file_url}') format('${f.format || 'woff2'}'); }`
  ).join('\n');

  return (
    <div className="min-h-screen bg-background px-8 py-12 max-w-xl mx-auto" style={{ fontFamily: 'var(--font-sans)' }}>
      <style>{fontFaceStyle}</style>

      <h1 className="text-2xl font-light tracking-widest uppercase text-foreground mb-8">Settings</h1>

      {/* Logo section */}
      <section className="mb-10">
        <h2 className="text-[11px] tracking-widest uppercase text-muted-foreground mb-4">Centered Logo</h2>
        <div className="border border-border/40 rounded-lg p-5 space-y-4">
          {currentLogo && (
            <div className="flex items-center justify-between">
              <img src={currentLogo.file_url} alt="Logo" className="h-12 object-contain" />
              <button onClick={handleLogoDelete} className="text-muted-foreground/30 hover:text-destructive transition-colors">
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          )}
          <div
            className="flex items-center gap-3 border border-dashed border-border/40 rounded px-3 py-2 cursor-pointer hover:border-foreground/30 transition-colors"
            onClick={() => logoFileRef.current?.click()}
          >
            <Image className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="text-sm text-muted-foreground/50">
              {logoFile ? logoFile.name : 'Choose SVG file'}
            </span>
            <input
              ref={logoFileRef}
              type="file"
              accept=".svg"
              className="hidden"
              onChange={e => setLogoFile(e.target.files[0] || null)}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-[11px] tracking-widest uppercase text-muted-foreground/60 w-16">Size</label>
            <input
              type="range"
              min="24"
              max="160"
              value={logoSize}
              onChange={e => {
                const val = parseInt(e.target.value);
                setLogoSize(val);
                localStorage.setItem('logo-size', val);
                window.dispatchEvent(new CustomEvent('logo-size-change', { detail: val }));
              }}
              className="flex-1"
            />
            <span className="text-[11px] text-muted-foreground/60 w-8">{logoSize}px</span>
          </div>
          <button
            onClick={handleLogoUpload}
            disabled={logoUploading || !logoFile}
            className="flex items-center gap-2 px-4 py-2 rounded bg-foreground text-background text-sm font-light disabled:opacity-30 hover:opacity-80 transition-opacity"
          >
            {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />}
            {currentLogo ? 'Replace logo' : 'Upload logo'}
          </button>
        </div>
      </section>

      {/* Tenants section */}
      <TenantsSection />

      {/* Generated Images section */}
      <section className="mb-10">
        <h2 className="text-[11px] tracking-widest uppercase text-muted-foreground mb-4">Generated Images</h2>
        <div className="border border-border/40 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
              <span className="text-sm text-muted-foreground">
                {generatedImages.length} image{generatedImages.length !== 1 ? 's' : ''} stored
              </span>
            </div>
            <button
              onClick={handleDeleteAllGenerated}
              disabled={deletingGenerated || generatedImages.length === 0}
              className="flex items-center gap-2 px-3 py-1.5 rounded text-xs text-destructive hover:bg-destructive/10 disabled:opacity-30 transition-colors"
            >
              {deletingGenerated ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" strokeWidth={1.5} />}
              Delete all
            </button>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[11px] tracking-widest uppercase text-muted-foreground mb-4">Custom Fonts</h2>

        <div className="border border-border/40 rounded-lg p-5 mb-6 space-y-3">
          <input
            type="text"
            placeholder="Font family name (e.g. MyFont)"
            value={fontName}
            onChange={e => setFontName(e.target.value)}
            className="w-full bg-transparent border border-border/40 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-foreground/30 transition-colors"
          />
          <div
            className="flex items-center gap-3 border border-dashed border-border/40 rounded px-3 py-2 cursor-pointer hover:border-foreground/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
            <span className="text-sm text-muted-foreground/50">
              {file ? file.name : 'Choose font file (.woff2, .woff, .ttf, .otf)'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".woff,.woff2,.ttf,.otf"
              className="hidden"
              onChange={e => setFile(e.target.files[0] || null)}
            />
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !file || !fontName.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded bg-foreground text-background text-sm font-light disabled:opacity-30 hover:opacity-80 transition-opacity"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" strokeWidth={1.5} />}
            Upload font
          </button>
        </div>

        {fonts.length === 0 ? (
          <p className="text-sm text-muted-foreground/40 text-center py-6">No custom fonts uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {fonts.map(font => (
              <div key={font.id} className="flex items-center justify-between border border-border/30 rounded px-4 py-3">
                <div className="flex items-center gap-3">
                  <Type className="w-4 h-4 text-muted-foreground/40" strokeWidth={1.5} />
                  <div>
                    <p className="text-sm text-foreground" style={{ fontFamily: font.name }}>{font.name}</p>
                    <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider">{font.format}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(font.id)}
                  className="text-muted-foreground/30 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}