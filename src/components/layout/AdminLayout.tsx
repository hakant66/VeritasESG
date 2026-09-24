/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, 
  LayoutDashboard, 
  Settings, 
  Users, 
  User,
  LogOut,
  FolderKanban,
  Menu,
  MessageCircle,
  Database,
  ChevronLeft,
  ChevronRight,
  Map,
  History,
  X,
  CheckSquare,
  Shapes,
  Flame,
  BarChart2,
  Target,
  ClipboardList,
  BookOpen,
  Presentation,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '../../lib/AuthContext';
import { useSettings } from '../../lib/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import {
  isAuditorPlatformUser,
  isCustomerPortalPlatformUser,
} from '../../lib/userRoles';
import {
  isMainNavItemActive,
  readSidebarNavContext,
  setSidebarNavContext,
} from '../../lib/sidebarNavContext';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAdmin, profile, logout, isTasksAndProfileOnly } = useAuth();
  const { settings } = useSettings();
  const { t } = useTranslation();
  const projectsModuleEnabled = (settings as any).moduleProjectsEnabled !== false;
  const tasksModuleEnabled = (settings as any).moduleTasksEnabled !== false;
  const importanceModuleEnabled = (settings as any).moduleImportanceEnabled !== false;
  const emissionDataModuleEnabled = (settings as any).moduleEmissionDataEnabled !== false;
  const emissionCalculationModuleEnabled = (settings as any).moduleEmissionCalculationEnabled !== false;
  const aiChatModuleEnabled = (settings as any).moduleAIChatEnabled !== false;

  const mainNavItems: Array<{
    icon: typeof LayoutDashboard;
    label: string;
    path: string;
    /** Nest under Projects in the sidebar (Önceliklendirme / materiality). */
    nestedUnderProjects?: boolean;
  }> = [
    { icon: LayoutDashboard, label: t.nav.dashboard, path: '/' },
    { icon: Building2, label: t.nav.customers, path: '/customer-directory' },
    ...(projectsModuleEnabled
      ? [{ icon: FolderKanban, label: t.nav.projects, path: '/projects' }]
      : []),
    // Önceliklendirme (materiality) lives under Projects, not customer/year context.
    ...(importanceModuleEnabled
      ? [
          {
            icon: Target,
            label: t.nav.materiality,
            path: '/materiality',
            nestedUnderProjects: projectsModuleEnabled,
          },
          {
            icon: ClipboardList,
            label: 'Önemlilik Anketleri',
            path: '/materiality-surveys',
            nestedUnderProjects: projectsModuleEnabled,
          },
        ]
      : []),
    ...(tasksModuleEnabled
      ? [{ icon: CheckSquare, label: t.nav.tasks, path: '/tasks' }]
      : []),
    ...(emissionDataModuleEnabled
      ? [{ icon: BarChart2, label: t.nav.emissionData, path: '/emission-data' }]
      : []),
    ...(emissionCalculationModuleEnabled
      ? [{ icon: Flame, label: t.nav.emissions, path: '/emissions' }]
      : []),
    ...(aiChatModuleEnabled
      ? [{ icon: MessageCircle, label: t.nav.chat, path: '/chat' }]
      : []),
  ];

  const secondaryNavItems = [
    { icon: Building2, label: t.nav.customers, path: '/customers' },
    { icon: Users, label: t.nav.users, path: '/users' },
    { icon: Map, label: t.nav.sectors, path: '/sectors' },
    { icon: Shapes, label: t.nav.categories, path: '/service-categories' },
    { icon: Database, label: t.nav.knowledgeBase, path: '/knowledge-base' },
    ...(importanceModuleEnabled
      ? [{ icon: Target, label: 'Önemlilik Yönetimi', path: '/materiality_design' }]
      : []),
    { icon: History, label: t.nav.audit, path: '/audit' },
    { icon: Map, label: t.nav.translations, path: '/translations' },
    { icon: Settings, label: t.nav.settings, path: '/settings' },
  ];

  const userNavItems = [
    { icon: BookOpen, label: t.nav.platformGuide, path: '/platform' },
    { icon: Presentation, label: t.nav.platformPresentation, path: '/platform-sunumu' },
    { icon: User, label: t.nav.profile, path: '/profile' },
  ];

  const isTasksOnlyUser = isTasksAndProfileOnly;
  const isAuditorUser = isAuditorPlatformUser(profile?.role);
  const isCustomerUser = isCustomerPortalPlatformUser(profile?.role);

  const filteredMainNavItems = mainNavItems.filter(item => {
    if (isAuditorUser) {
      return item.path === '/projects' || item.path === '/platform' || item.path === '/platform-sunumu';
    }
    if (isTasksOnlyUser) {
      return (
        item.path === '/tasks' ||
        item.path === '/' ||
        item.path === '/platform' ||
        item.path === '/platform-sunumu'
      );
    }
    // Customers directory hidden for customer users and consultants
    if (item.path === '/customer-directory' && (isCustomerUser || profile?.role === 'consultant')) return false;
    // Materiality design limited to platform admins and consultant managers
    if (item.path === '/materiality_design') {
      const role = profile?.role;
      return role === 'platform_admin' || role === 'consultant_manager';
    }
    // Emissions and materiality limited to platform admins, consultant managers, and consultants
    if (item.path === '/emissions' || item.path === '/emission-data' || item.path === '/materiality') {
      const role = profile?.role;
      return role === 'platform_admin' || role === 'consultant_manager' || role === 'consultant';
    }
    return true;
  });

  const filteredSecondaryNavItems = secondaryNavItems.filter(item => {
    if (isTasksOnlyUser || isAuditorUser) return false;
    const role = profile?.role;
    const isPlatformAdmin = role === 'platform_admin';
    
    // Items that ONLY platform admins and admins can see
    const platformAdminOnly = ['/sectors', '/service-categories', '/users', '/audit', '/settings', '/translations', '/knowledge-base'];
    if (platformAdminOnly.includes(item.path)) {
      return isPlatformAdmin;
    }

    // Customer management (admin view)
    if (item.path === '/customers') {
      return isPlatformAdmin || role === 'consultant_manager'; 
    }

    // Default to hide for restricted items, show for others
    return true;
  });

  const shouldShowAdminSection = filteredSecondaryNavItems.length > 0;

  const accountDisplayName = useMemo(() => {
    const name = profile?.name?.trim();
    if (name) return name;
    return profile?.email?.trim() || '';
  }, [profile?.name, profile?.email]);

  const accountRoleLabel = useMemo(() => {
    switch (normalizePlatformRole(profile?.role)) {
      case 'platform_admin':
        return t.users.roles.platform_admin;
      case 'consultant_manager':
        return t.users.roles.consultant_manager;
      case 'consultant':
        return t.users.roles.consultant;
      case 'auditor':
        return t.users.roles.auditor;
      case 'contributor':
        return t.users.roles.contributor;
      case 'customer':
        return t.users.roles.customer;
      default:
        return profile?.role?.trim() || t.common.none;
    }
  }, [profile?.role, t]);

  const accountUserSummaryTitle =
    accountDisplayName && accountRoleLabel
      ? `${accountDisplayName} — ${accountRoleLabel}`
      : accountDisplayName || accountRoleLabel;

  const sidebarNav = readSidebarNavContext(location.pathname, location.state);

  const mainNavItemActive = (itemPath: string) =>
    isMainNavItemActive(itemPath, location.pathname, sidebarNav);

  const handleMainNavClick = (itemPath: string) => {
    if (itemPath === '/projects' || itemPath === '/materiality') {
      setSidebarNavContext('projects');
    }
  };

  // Sidebar Resizing
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);
    document.body.style.cursor = 'default';
    document.body.style.userSelect = 'auto';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return;
    const newWidth = e.clientX;
    if (newWidth > 180 && newWidth < 480) {
      setSidebarWidth(newWidth);
    }
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="flex h-screen bg-slate-50 relative overflow-hidden">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-16 bg-white border-b border-slate-200 fixed top-0 left-0 right-0 z-[100]">
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label={t.nav.openMenu}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation"
          className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex-1 px-4 flex justify-center">
            {settings.platformLogoRectangleUrl ? (
                <img src={settings.platformLogoRectangleUrl} alt="Logo" className="h-8 object-contain" />
            ) : (
                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                  {settings.platformName || 'Impact AI Governance'}
                </span>
            )}
        </div>
        <div className="w-10"></div>
      </div>

      {/* Mobile Navigation Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-950/20 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              id="mobile-navigation"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-[85%] max-w-sm h-full shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 h-16 border-b border-slate-100 shrink-0">
                <span className="font-bold text-slate-900">{t.nav.navigation}</span>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  aria-label={t.nav.closeMenu}
                  className="p-2 text-slate-500 hover:text-slate-900 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div className="space-y-2">
                  {filteredMainNavItems.map(item => {
                    const Icon = item.icon;
                    const isActive = mainNavItemActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => handleMainNavClick(item.path)}
                        className={cn(
                          "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                          isActive ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50",
                          item.nestedUnderProjects ? "ml-4" : "",
                        )}
                      >
                        <Icon size={20} />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t.nav.account}</p>
                  <div className="space-y-2">
                    {userNavItems.map(item => {
                      const Icon = item.icon;
                      const isActive = location.pathname === item.path;
                      return (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                            isActive ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          <Icon size={20} />
                          {item.label}
                        </Link>
                      );
                    })}
                    {profile ? (
                      <div className="px-4 pt-1 pb-2">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {accountDisplayName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{accountRoleLabel}</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {shouldShowAdminSection && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t.nav.admin}</p>
                    <div className="space-y-2">
                      {filteredSecondaryNavItems.map(item => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                              "flex items-center gap-4 px-4 py-3 rounded-xl text-sm font-semibold transition-all",
                              isActive ? "bg-slate-100 text-slate-900" : "text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            <Icon size={20} />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-4 px-4 py-3 w-full rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
                >
                  <LogOut size={20} />
                  {t.nav.signOut}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar Navigation */}
      <motion.aside 
        initial={false}
        animate={{ width: isCollapsed ? 80 : sidebarWidth }}
        transition={isResizing.current ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-white border-r border-slate-200 flex flex-col relative shrink-0 hidden md:flex"
      >
        <div className={cn(
          "px-6 flex items-center justify-between border-b border-slate-100 h-[81px]",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 overflow-hidden h-10"
            >
              {settings.platformLogoRectangleUrl ? (
                <div className="flex-1 h-full overflow-hidden">
                  <img 
                    src={settings.platformLogoRectangleUrl} 
                    alt={settings.platformName || "Platform Logo"} 
                    className="h-full object-contain object-left" 
                  />
                </div>
              ) : (
                <>
                <div className="w-8 h-8 bg-white border border-slate-200 rounded-md flex items-center justify-center shrink-0 overflow-hidden p-1.5 shadow-sm">
                  {settings.platformLogoSquareUrl ? (
                    <img src={settings.platformLogoSquareUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-4 h-0.5 bg-slate-900"></div>
                  )}
                </div>
                  <span className="font-semibold tracking-tight text-slate-900 truncate">
                    {settings.platformName || 'Impact AI Governance'}
                  </span>
                </>
              )}
            </motion.div>
          )}
          {isCollapsed && (
            <div className="w-8 h-8 bg-white border border-slate-200 rounded-md flex items-center justify-center shrink-0 overflow-hidden p-1.5 mx-auto shadow-sm">
               {settings.platformLogoSquareUrl ? (
                  <img src={settings.platformLogoSquareUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-4 h-0.5 bg-slate-900"></div>
                )}
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? t.nav.expandSidebar : t.nav.collapseSidebar}
            aria-expanded={!isCollapsed}
            className={cn(
              "p-2 hover:bg-slate-100 rounded-md text-slate-500 transition-colors shrink-0",
              isCollapsed ? "absolute -right-4 top-1/2 -translate-y-1/2 bg-white border border-slate-200 shadow-md z-50 hover:scale-110 active:scale-95" : ""
            )}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
        
        <nav className="p-4 space-y-1 flex-grow overflow-x-hidden">
          {filteredMainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = mainNavItemActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleMainNavClick(item.path)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all relative group overflow-hidden",
                  isActive 
                    ? "bg-slate-100 text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  isCollapsed ? "justify-center px-0" : "",
                  !isCollapsed && item.nestedUnderProjects ? "ml-3 pl-5 border-l border-slate-200" : "",
                )}
              >
                <Icon size={isCollapsed ? 20 : 16} className="shrink-0" />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </Link>
            );
          })}

          <div className="my-4 border-t border-slate-100" />

          {!isCollapsed && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 pt-2 whitespace-nowrap"
            >
              {t.nav.account}
            </motion.div>
          )}

          {userNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                title={isCollapsed ? accountUserSummaryTitle || item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all relative group overflow-hidden",
                  isActive 
                    ? "bg-slate-100 text-slate-900 shadow-sm" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                  isCollapsed ? "justify-center px-0" : ""
                )}
              >
                <Icon size={isCollapsed ? 20 : 16} className="shrink-0" />
                {!isCollapsed && (
                  <motion.span 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
                
                {isCollapsed && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {accountUserSummaryTitle || item.label}
                  </div>
                )}
              </Link>
            );
          })}

          {profile && !isCollapsed ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-3 pb-2 pt-0.5"
            >
              <p className="text-sm font-semibold text-slate-900 truncate">{accountDisplayName}</p>
              <p className="text-[11px] text-slate-500 truncate">{accountRoleLabel}</p>
            </motion.div>
          ) : null}

          {shouldShowAdminSection && (
            <>
              <div className="my-4 border-t border-slate-100" />

              {!isCollapsed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 pt-2 whitespace-nowrap"
                >
                  {t.nav.admin}
                </motion.div>
              )}

              {filteredSecondaryNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    title={isCollapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all relative group overflow-hidden",
                      isActive 
                        ? "bg-slate-100 text-slate-900 shadow-sm" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
                      isCollapsed ? "justify-center px-0" : ""
                    )}
                  >
                    <Icon size={isCollapsed ? 20 : 16} className="shrink-0" />
                    {!isCollapsed && (
                      <motion.span 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                    
                    {isCollapsed && (
                      <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={handleLogout}
            title={isCollapsed ? t.nav.signOut : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2 w-full text-sm font-medium text-slate-500 rounded-md hover:bg-red-50 hover:text-red-700 transition-colors relative group overflow-hidden",
              isCollapsed ? "justify-center px-0" : ""
            )}
          >
            <LogOut size={isCollapsed ? 20 : 16} className="shrink-0" />
            {!isCollapsed && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="truncate"
              >
                {t.nav.signOut}
              </motion.span>
            )}
            
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-2 py-1 bg-red-600 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {t.nav.signOut}
              </div>
            )}
          </button>
        </div>

        {/* Resize Handle */}
        {!isCollapsed && (
          <div 
            onMouseDown={startResizing}
            className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 transition-colors z-20 group"
          >
            <div className="absolute inset-y-0 -right-1 w-2 group-hover:bg-blue-400/10" />
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden pt-16 md:pt-0">
        <div
          className={cn(
            'flex h-0 min-h-0 flex-1 flex-col overflow-y-auto',
            location.pathname === '/' && 'admin-dashboard-scroll',
          )}
        >
          <Outlet context={{ isSidebarCollapsed: isCollapsed }} />
        </div>
      </main>
    </div>
  );
}
