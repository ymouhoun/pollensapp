import React from 'react';

export default function SearchMatchHint({ reason }) {
  if (!reason) return null;
  return (
    <div className="mt-1 rounded-md bg-background/70 px-2 py-1 text-[10px] leading-snug text-foreground/55 backdrop-blur-md">
      {reason}
    </div>
  );
}