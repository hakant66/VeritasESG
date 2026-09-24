export type SidebarNavContext = 'projects';

const STORAGE_KEY = 'giq.sidebarNavContext';

export function setSidebarNavContext(ctx: SidebarNavContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, ctx);
  } catch {
    /* ignore */
  }
}

export function readSidebarNavContext(
  pathname: string,
  locationState: unknown,
): SidebarNavContext | null {
  const fromState = (locationState as { sidebarNav?: SidebarNavContext } | null)?.sidebarNav;
  if (fromState === 'projects') {
    return fromState;
  }
  if (!/^\/projects\/[^/]+/.test(pathname)) return null;
  return 'projects';
}

export function isMainNavItemActive(
  itemPath: string,
  pathname: string,
  sidebarNav: SidebarNavContext | null,
): boolean {
  if (itemPath === '/') return pathname === '/';

  const onProjectDetail = /^\/projects\/[^/]+/.test(pathname);
  const onMateriality = pathname === '/materiality' || pathname.startsWith('/materiality/');

  if (itemPath === '/materiality') {
    return onMateriality;
  }

  if (itemPath === '/projects') {
    // Materiality is nested under Projects in the nav; keep Projects inactive while there
    // so the nested item is the clear selection.
    if (onMateriality) return false;
    return pathname === '/projects' || onProjectDetail;
  }

  return pathname === itemPath || (itemPath !== '/' && pathname.startsWith(itemPath));
}
