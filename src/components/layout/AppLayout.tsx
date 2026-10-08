import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { BottomNavigation } from './BottomNavigation';
import { ActivateCodeModal } from '../common/ActivateCodeModal';
import { ContactBuyCodeModal } from '../common/ContactBuyCodeModal';

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activateModalOpen, setActivateModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-16 lg:pb-0">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col flex-1">
        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onOpenActivateModal={() => setActivateModalOpen(true)}
        />

        <main className="flex-1 p-3 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet context={{ openActivateModal: () => setActivateModalOpen(true), openContactModal: () => setContactModalOpen(true) }} />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      <ActivateCodeModal
        isOpen={activateModalOpen}
        onClose={() => setActivateModalOpen(false)}
        onOpenContact={() => setContactModalOpen(true)}
      />

      <ContactBuyCodeModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />
    </div>
  );
};
