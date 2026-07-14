import React, { useState } from 'react';
import { Loader2, Pause, Play, RotateCcw } from 'lucide-react';

export default function BackfillControls({ data, run }) {
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');
  const operation = data?.operation;
  const execute = async action => {
    setPendingAction(action);
    setError('');
    try { await run(action); }
    catch (requestError) { setError(requestError.response?.data?.error || requestError.message); }
    finally { setPendingAction(''); }
  };
  const Button = ({ action, children, disabled, icon: Icon }) => (
    <button onClick={() => execute(action)} disabled={disabled || pendingAction === action} className="flex items-center gap-2 rounded bg-foreground px-4 py-2 text-sm text-background disabled:opacity-30">
      {pendingAction === action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}{children}
    </button>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {!operation && <Button action="start" icon={Play} disabled={!data?.totalToProcess}>Lancer le pilote</Button>}
      {operation?.status === 'running' && <Button action="pause" icon={Pause}>Interrompre</Button>}
      {['paused', 'failed'].includes(operation?.status) && <Button action="resume" icon={Play}>Reprendre</Button>}
      {!!operation?.failed_ids?.length && operation?.status !== 'running' && <Button action="retry_failed" icon={RotateCcw}>Relancer les échecs</Button>}
      {error && <p className="w-full text-sm text-destructive">{error}</p>}
    </div>
  );
}