import React from 'react';

const DEFAULT_PROMPT = `You are a visual curator for a fashion/editorial brand. Given an image and the brand's style taxonomy below, analyze the image and return:
1. style_tags: an array of taxonomy slugs that apply to this image
2. tenant_caption: a caption rewritten using the brand's specific vocabulary and aesthetic language

STYLE TAXONOMY:
{{taxonomy}}

Return JSON: { "style_tags": [...], "tenant_caption": "..." }`;

export default function TenantVlmPromptEditor({ value, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[11px] tracking-widest uppercase text-muted-foreground/60">
          VLM Style Prompt
        </label>
        {!value && (
          <button
            onClick={() => onChange(DEFAULT_PROMPT)}
            className="text-[10px] text-muted-foreground/40 hover:text-foreground/60 transition-colors underline underline-offset-2"
          >
            Use default template
          </button>
        )}
      </div>
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter the VLM prompt template. Use {{taxonomy}} as placeholder for the style taxonomy..."
        rows={10}
        className="w-full bg-muted/30 text-xs text-foreground/80 font-mono placeholder:text-muted-foreground/20 outline-none resize-y border border-border/20 rounded-lg px-4 py-3 focus:border-foreground/20 transition-colors leading-relaxed"
      />
      <p className="text-[10px] text-muted-foreground/30">
        Use <code className="text-muted-foreground/50">{'{{taxonomy}}'}</code> where the style taxonomy JSON should be injected.
      </p>
    </div>
  );
}