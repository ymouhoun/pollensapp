import React from 'react';
import { Outlet } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import MacTitleBar from './MacTitleBar';

export default function AppLayout() {
  return (
    // Outer window — simulate a macOS window with rounded corners and shadow
    <div className="min-h-screen flex items-start justify-center bg-[#1e1e1e] p-0">
      <div
        className="flex flex-col w-full min-h-screen bg-background overflow-hidden"
        style={{
          borderRadius: '0px',
          boxShadow: 'none',
        }}
      >
        {/* Title bar */}
        <MacTitleBar />

        {/* Body: sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          <AppSidebar />
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}