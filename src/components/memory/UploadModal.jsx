import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Upload, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { embedMediaLocally } from '@/lib/localVision';

export default function UploadModal({ open, onOpenChange, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [collection, setCollection] = useState('');
  const [textContent, setTextContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const reset = () => {
    setFiles([]); setTitle(''); setTags(''); setCollection(''); setTextContent('');
  };

  const handleUploadMedia = async () => {
    if (files.length === 0) return;
    setUploading(true);
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isVideo = file.type.startsWith('video/');
      const item = await base44.entities.MediaItem.create({
        title: title || file.name.split('.')[0],
        file_url,
        content_type: isVideo ? 'video' : 'image',
        embedding_status: isVideo ? undefined : 'pending',
        tags: tagList,
        collection: collection || undefined,
      });
      if (!isVideo) await embedMediaLocally(item.id, { file }).catch(() => {});
    }
    setUploading(false);
    reset();
    onOpenChange(false);
    onUploaded?.();
  };

  const handleSaveText = async () => {
    if (!textContent.trim()) return;
    setUploading(true);
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    await base44.entities.MediaItem.create({
      title: title || undefined,
      content_type: 'text',
      text_content: textContent.trim(),
      tags: tagList,
      collection: collection || undefined,
    });
    setUploading(false);
    reset();
    onOpenChange(false);
    onUploaded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border/50 max-w-md bg-background/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-normal">Add to Memory</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="media" className="mt-2">
          <TabsList className="bg-muted/50 w-full">
            <TabsTrigger value="media" className="flex-1 text-xs font-light">Image / Video</TabsTrigger>
            <TabsTrigger value="text" className="flex-1 text-xs font-light">Quote / Text</TabsTrigger>
          </TabsList>

          <TabsContent value="media" className="space-y-4 mt-4">
            <div
              className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" multiple accept="image/*,video/*" className="hidden" onChange={e => setFiles(Array.from(e.target.files))} />
              {files.length > 0 ? (
                <div className="space-y-1">
                  {files.map((f, i) => <p key={i} className="text-xs text-muted-foreground">{f.name}</p>)}
                </div>
              ) : (
                <>
                  <Upload className="w-5 h-5 mx-auto text-muted-foreground mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground font-light">Drop files or click to browse</p>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground font-light">Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="optional" className="mt-1 bg-transparent border-border/40 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-light">Collection</Label>
                <Input value={collection} onChange={e => setCollection(e.target.value)} placeholder="spaces..." className="mt-1 bg-transparent border-border/40 text-sm" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-light">Tags</Label>
              <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="portrait, film, minimal" className="mt-1 bg-transparent border-border/40 text-sm" />
            </div>
            <Button onClick={handleUploadMedia} disabled={files.length === 0 || uploading} className="w-full bg-foreground text-background hover:bg-foreground/90 font-light">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : `Upload ${files.length > 0 ? files.length : ''} file${files.length !== 1 ? 's' : ''}`}
            </Button>
          </TabsContent>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div>
              <Label className="text-xs text-muted-foreground font-light">Quote or note</Label>
              <textarea
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                placeholder="dans une ère d'ultra-saturation..."
                className="mt-1 w-full text-sm font-light bg-transparent border border-border/40 rounded-lg p-3 outline-none resize-none min-h-[120px] placeholder:text-muted-foreground/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground font-light">Author / Title</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="optional" className="mt-1 bg-transparent border-border/40 text-sm" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-light">Tags</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="littérature..." className="mt-1 bg-transparent border-border/40 text-sm" />
              </div>
            </div>
            <Button onClick={handleSaveText} disabled={!textContent.trim() || uploading} className="w-full bg-foreground text-background hover:bg-foreground/90 font-light">
              {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : 'Save to Memory'}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}