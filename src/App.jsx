import { useState } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import LogoRevealLoader from '@/components/LogoRevealLoader';

import AppLayout from '@/components/AppLayout';
import Memory from '@/pages/Memory';
import Entropy from '@/pages/Entropy';
import Settings from '@/pages/Settings';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-muted-foreground/20 border-t-foreground rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Memory" replace />} />
      <Route element={<AppLayout />}>
        <Route path="/Memory" element={<Memory />} />
        <Route path="/Entropy" element={<Entropy />} />
        <Route path="/Settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  const [isLoading, setIsLoading] = useState(true);
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {isLoading && (
          <LogoRevealLoader
            brandName="SOLWEIG"
            iconSrc="https://i.postimg.cc/fRsZkHHD/mini.png"
            onComplete={() => setIsLoading(false)}
          />
        )}
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App