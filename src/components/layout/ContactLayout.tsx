/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { useSettings } from '../../lib/SettingsContext';

export default function ContactLayout() {
  const { settings } = useSettings();
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4 shadow-sm z-10 sticky top-0">
        <div className="w-full max-w-none px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="text-blue-600" />
            <h1 className="text-lg font-bold font-display">Response Portal</h1>
          </div>
          <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
            Secure Session
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 bg-white p-6 text-center text-xs text-gray-400">
        Consultancy Governance Intelligence Platform • {settings.platformName || 'GovernanceIQ'}
      </footer>
    </div>
  );
}
