import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save, Loader2, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import TenantStyleEditor from '@/components/admin/TenantStyleEditor';
import TenantVlmPromptEditor from '@/components/admin/TenantVlmPromptEditor';

export default function TenantDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const tenantId = urlParams.get('id');
  const isNew = !tenantId;
  const queryClient = useQueryClient();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => base44.entities.Tenant.list().then(list => list.find(t => t.id === tenantId)),
    enabled: !!tenantId,
  });

  const [form, setForm] = useState({ name: '', slug: '', style_taxonomy: [], vlm_style_prompt: '', pinecone_index: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (tenant) {
      setForm({
        name: tenant.name || '',
        slug: tenant.slug || '',
        style_taxonomy: tenant.style_taxonomy || [],
        vlm_style_prompt: tenant.vlm_style_prompt || '',
        pinecone_index: tenant.pinecone_index || '',
      });
    }
  }, [tenant]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        await base44.entities.Tenant.create(form);
      } else {
        await base44.entities.Tenant.update(tenantId, form);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const [replayingStyle, setReplayingStyle] = useState(false);
  const handleReplayStyleLayer = async () => {
    if (!tenantId) return;
    setReplayingStyle(true);
    try {
      await base44.functions.invoke('replayStyleLayer', { tenantId });
    } catch (e) {
      console.error('Replay style layer error:', e);
    }
    setReplayingStyle(false);
  };

  if (!isNew && isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-8 py-12 max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-10">
        <Link to="/Settings" className="text-muted-foreground/40 hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </Link>
        <h1 className="text-lg font-light tracking-widest uppercase text-foreground">
          {isNew ? 'New Tenant' : form.name || 'Tenant'}
        </h1>
      </div>

      <div className="space-y-8">
        {/* Basic info */}
        <section className="space-y-4">
          <h2 className="text-[11px] tracking-widest uppercase text-muted-foreground/60">Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground/40">Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => {
                  const name = e.target.value;
                  setForm(f => ({
                    ...f,
                    name,
                    slug: isNew ? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') : f.slug,
                  }));
                }}
                className="w-full bg-transparent border border-border/30 rounded px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/30 outline-none focus:border-foreground/20 transition-colors"
                placeholder="Brand name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] tracking-widest uppercase text-muted-foreground/40">Slug</label>
              <input
                type="text"
                value={form.slug}
                onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                className="w-full bg-transparent border border-border/30 rounded px-3 py-2 text-sm text-foreground/60 font-mono placeholder:text-muted-foreground/30 outline-none focus:border-foreground/20 transition-colors"
                placeholder="brand-slug"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] tracking-widest uppercase text-muted-foreground/40">Pinecone Index</label>
            <input
              type="text"
              value={form.pinecone_index}
              onChange={e => setForm(f => ({ ...f, pinecone_index: e.target.value }))}
              className="w-full bg-transparent border border-border/30 rounded px-3 py-2 text-sm text-foreground/60 font-mono placeholder:text-muted-foreground/30 outline-none focus:border-foreground/20 transition-colors"
              placeholder="index-name (defaults to tenant slug)"
            />
          </div>
        </section>

        {/* Style taxonomy */}
        <section className="space-y-4">
          <h2 className="text-[11px] tracking-widest uppercase text-muted-foreground/60">Style Taxonomy</h2>
          <TenantStyleEditor
            taxonomy={form.style_taxonomy}
            onChange={taxonomy => setForm(f => ({ ...f, style_taxonomy: taxonomy }))}
          />
        </section>

        {/* VLM prompt */}
        <section className="space-y-4">
          <TenantVlmPromptEditor
            value={form.vlm_style_prompt}
            onChange={vlm_style_prompt => setForm(f => ({ ...f, vlm_style_prompt }))}
          />
        </section>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t border-border/20">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.name || !form.slug}
            className="flex items-center gap-2 px-5 py-2.5 rounded bg-foreground text-background text-sm font-light disabled:opacity-30 hover:opacity-80 transition-opacity"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
            )}
            {saved ? 'Saved' : 'Save tenant'}
          </button>

          {!isNew && (
            <button
              onClick={handleReplayStyleLayer}
              disabled={replayingStyle}
              className="flex items-center gap-2 px-4 py-2.5 rounded border border-border/30 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-30"
            >
              {replayingStyle ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              )}
              Replay style layer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}