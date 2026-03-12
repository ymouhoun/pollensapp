import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function UploadModal({ open, onOpenChange, onUploaded }) {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [collection, setCollection] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    setFiles(selected);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);

    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);

    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const isVideo = file.type.startsWith('video/');
      
      await base44.entities.MediaItem.create({
        title: title || file.name.split('.')[0],
        file_url,
        media_type: isVideo ? 'video' : 'image',
        tags: tagList,
        collection: collection || undefined,
      });
    }

    setUploading(false);
    setFiles([]);
    setTitle('');
    setTags('');
    setCollection('');
    onOpenChange(false);
    onUploaded?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vibrancy-popover border border-white/20 shadow-macos-window max-w-md rounded-macos-xl">
        <DialogHeader>
          <DialogTitle className="text-macos-md font-semibold tracking-tight">Add to Memory</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-2">
          <div
            className="border-2 border-dashed border-border/60 rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFiles}
            />
            {files.length > 0 ? (
              <div className="space-y-1">
                {files.map((f, i) => (
                  <p key={i} className="text-sm text-muted-foreground">{f.name}</p>
                ))}
              </div>
            ) : (
              <>
                <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" strokeWidth={1.5} />
                <p className="text-sm text-muted-foreground font-light">Drop files or click to browse</p>
              </>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground font-light">Title</Label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="optional"
                className="mt-1 bg-transparent border-border/40"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-light">Tags (comma separated)</Label>
              <Input
                value={tags}
                onChange={e => setTags(e.target.value)}
                placeholder="portrait, golden hour, film"
                className="mt-1 bg-transparent border-border/40"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground font-light">Collection</Label>
              <Input
                value={collection}
                onChange={e => setCollection(e.target.value)}
                placeholder="spaces, portraits..."
                className="mt-1 bg-transparent border-border/40"
              />
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
            className="w-full bg-foreground text-background hover:bg-foreground/90 font-light"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              `Upload ${files.length || ''} file${files.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}