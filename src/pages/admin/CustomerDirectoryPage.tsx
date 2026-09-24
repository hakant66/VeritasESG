import { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  Search,
  Loader2,
  ChevronRight,
  ChevronDown,
  MapPin,
  Users,
  Briefcase,
  FolderKanban,
  Shapes,
  Contact2,
  Plus,
  Edit2,
  FolderPlus,
  Network,
} from 'lucide-react';
import * as DB from '../../services/db';
import { Customer, Segment, Project, Contact, Branch, PlatformUser, ProjectUserAssignment } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getSectorIcon } from '../../lib/sectorIcons';
import { useAuth } from '../../lib/AuthContext';
import { useSettings } from '../../lib/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { PaginationBar, type PageSizeOption } from '../../components/ui/PaginationBar';
import { NewCustomerModal } from '../../components/customer/NewCustomerModal';
import { formatSectorClassificationSummary } from '../../data/sectorClassification';
import { EditCustomerModal } from '../../components/customer/EditCustomerModal';
import { NewProjectLaunchModal } from '../../components/project/NewProjectLaunchModal';
import {
  PageHelpFullModal,
  PageHelpHeaderButton,
} from '../../components/admin/PageHelpGuidance';

type CustomerDirectoryLocationState = {
  expandCustomerId?: string;
};

function projectDirectoryCardTone(status: string | undefined) {
  const s = (status || '').toLowerCase();
  if (s === 'active') {
    return {
      card: 'border-blue-200 bg-blue-50/90 hover:border-blue-400 hover:bg-blue-50',
      badge: 'bg-blue-100 text-blue-800',
    };
  }
  if (s === 'closed') {
    return {
      card: 'border-emerald-200 bg-emerald-50/90 hover:border-emerald-400 hover:bg-emerald-50',
      badge: 'bg-emerald-100 text-emerald-800',
    };
  }
  if (s === 'archived') {
    return {
      card: 'border-amber-200 bg-amber-50/90 hover:border-amber-400 hover:bg-amber-50',
      badge: 'bg-amber-100 text-amber-800',
    };
  }
  return {
    card: 'border-violet-200 bg-violet-50/90 hover:border-violet-400 hover:bg-violet-50',
    badge: 'bg-violet-100 text-violet-800',
  };
}

function projectStatusLabel(
  status: string | undefined,
  labels: { active: string; closed: string; archived: string },
): string {
  const s = (status || '').toLowerCase();
  if (s === 'active') return labels.active;
  if (s === 'closed') return labels.closed;
  if (s === 'archived') return labels.archived;
  return status || '—';
}

function projectDirectoryCategoryIcon(category: Project['category'] | undefined) {
  return category === 'Service' ? Shapes : FolderKanban;
}

export default function CustomerDirectoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const handledExpandFromProfileRef = useRef<string | null>(null);
  const { profile, canCreateCustomersAndProjects } = useAuth();
  const canEditCustomerInModal =
    profile?.role === 'platform_admin' || profile?.role === 'consultant_manager';
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerIdsWithProjects, setCustomerIdsWithProjects] = useState<Set<string>>(new Set());
  const [activeProjectsByCustomerId, setActiveProjectsByCustomerId] = useState<Record<string, Project[]>>({});
  const [availableSectors, setAvailableSectors] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [directoryPage, setDirectoryPage] = useState(1);
  const [directoryPageSize, setDirectoryPageSize] = useState<PageSizeOption>(10);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newProjectForCustomer, setNewProjectForCustomer] = useState<Customer | null>(null);

  // Lazy loaded details per customer
  const [customerDetails, setCustomerDetails] = useState<Record<string, {
    projects: Project[];
    contacts: Contact[];
    branches: Branch[];
    users: PlatformUser[];
    loading: boolean;
  }>>({});

  useEffect(() => {
    loadSectors();
    loadAllCustomers();
  }, []);

  async function loadSectors() {
    try {
      const data = await DB.segments.list();
      const customerSectors = (data || []).filter(
        (s) => s.type === 'Customer Sector' || !s.type,
      );
      setAvailableSectors(customerSectors);
    } catch (error) {
      console.error("Failed to load segments:", error);
    }
  }

  async function loadAllCustomers() {
    setLoading(true);
    setError(null);
    try {
      const isCustomer = profile?.role === 'customer';
      const [custList, allProjects] = await Promise.all([
        DB.customers.list(false, isCustomer ? profile?.customerId : undefined),
        DB.projects.list(),
      ]);
      const idsWithProjects = new Set<string>();
      const activeByCustomer: Record<string, Project[]> = {};
      for (const p of allProjects || []) {
        if (!p.customerId) continue;
        idsWithProjects.add(p.customerId);
        if (p.status === 'active') {
          if (!activeByCustomer[p.customerId]) activeByCustomer[p.customerId] = [];
          activeByCustomer[p.customerId].push(p);
        }
      }
      for (const cid of Object.keys(activeByCustomer)) {
        activeByCustomer[cid].sort((a, b) => a.name.localeCompare(b.name, lang === 'tr' ? 'tr' : 'en'));
      }
      setCustomerIdsWithProjects(idsWithProjects);
      setActiveProjectsByCustomerId(activeByCustomer);
      setCustomers(custList || []);
    } catch (err: any) {
      console.error("Failed to load customers:", err);
      setError("Failed to load customers list.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomerExtraInfo(customerId: string) {
    if (customerDetails[customerId]) return;
    
    setCustomerDetails(prev => ({
      ...prev,
      [customerId]: { projects: [], contacts: [], branches: [], users: [], loading: true }
    }));

    try {
      const [cont, bran, projSnap, puSnap] = await Promise.all([
        DB.contacts.listByCustomer(customerId),
        DB.branches.listByCustomer(customerId),
        DB.getDocs(DB.query(DB.getCol('projects'), DB.where('customerId', '==', customerId))),
        DB.getDocs(DB.getCol('projectUserAssignments'))
      ]);

      const projects = projSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      
      let users: PlatformUser[] = [];
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        const relevantAssignments = puSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as ProjectUserAssignment))
          .filter(a => projectIds.includes(a.projectId));
        
        const userIds = Array.from(new Set(relevantAssignments.map(a => a.userId)));
        if (userIds.length > 0) {
          const userPromises = userIds.map(uid => DB.platformUsers.get(uid));
          const usersRes = await Promise.all(userPromises);
          users = usersRes.filter((u): u is PlatformUser => u !== null);
        }
      }

      setCustomerDetails(prev => ({
        ...prev,
        [customerId]: {
          projects,
          contacts: cont,
          branches: bran,
          users,
          loading: false
        }
      }));
    } catch (err) {
      console.error("Failed to load customer extra info:", err);
    }
  }

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadCustomerExtraInfo(id);
    }
  };

  const sortLocale = lang === 'tr' ? 'tr' : 'en';

  const filteredCustomers = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    const filtered = customers.filter((c) => {
      const matchesSearch =
        !search ||
        (c.name || '').toLowerCase().includes(search) ||
        (c.headquartersCountry || '').toLowerCase().includes(search) ||
        (c.sectorIds || []).some((sid) => {
          const s = availableSectors.find((as) => as.id === sid);
          return s?.name.toLowerCase().includes(search);
        });

      const matchesSector = sectorFilter === 'all' || (c.sectorIds || []).includes(sectorFilter);

      return matchesSearch && matchesSector;
    });

    const byName = (a: Customer, b: Customer) =>
      (a.name || '').localeCompare(b.name || '', sortLocale, { sensitivity: 'base' });

    const withProjects = filtered
      .filter((c) => customerIdsWithProjects.has(c.id))
      .sort(byName);
    const withoutProjects = filtered
      .filter((c) => !customerIdsWithProjects.has(c.id))
      .sort(byName);

    return [...withProjects, ...withoutProjects];
  }, [customers, searchQuery, sectorFilter, availableSectors, customerIdsWithProjects, sortLocale]);

  useEffect(() => {
    setDirectoryPage(1);
  }, [searchQuery, sectorFilter, directoryPageSize]);

  useEffect(() => {
    setExpandedId(null);
  }, [searchQuery, sectorFilter, directoryPageSize]);

  useEffect(() => {
    const expandId = (location.state as CustomerDirectoryLocationState | null)?.expandCustomerId;
    if (!expandId) {
      handledExpandFromProfileRef.current = null;
      return;
    }
    if (loading) return;
    if (handledExpandFromProfileRef.current === expandId) return;

    const index = filteredCustomers.findIndex((c) => c.id === expandId);
    if (index < 0) {
      navigate('/customer-directory', { replace: true, state: {} });
      return;
    }

    handledExpandFromProfileRef.current = expandId;
    const page = Math.floor(index / directoryPageSize) + 1;
    setDirectoryPage(page);
    setExpandedId(expandId);
    void loadCustomerExtraInfo(expandId);

    navigate('/customer-directory', { replace: true, state: {} });

    requestAnimationFrame(() => {
      document
        .getElementById(`customer-directory-card-${expandId}`)
        ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  }, [loading, filteredCustomers, directoryPageSize, location.state, navigate]);

  const currentDirectoryPage = Math.min(
    Math.max(1, directoryPage),
    Math.max(1, Math.ceil(filteredCustomers.length / directoryPageSize)),
  );
  const paginatedCustomers = useMemo(() => {
    const start = (currentDirectoryPage - 1) * directoryPageSize;
    return filteredCustomers.slice(start, start + directoryPageSize);
  }, [filteredCustomers, currentDirectoryPage, directoryPageSize]);

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[400px] text-slate-400 gap-4">
        <Loader2 className="animate-spin text-slate-900" size={32} />
        <p className="text-sm font-medium animate-pulse">Scanning Customer Network...</p>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-none space-y-8">
      <header className="flex flex-col gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <Building2 className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t.customers.title}</h1>
          </div>
          <p className="text-slate-500 font-light text-lg mt-1">{t.customers.directorySubtitle}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-start gap-3">
          {(settings.helpCustomerDirectoryUrl || settings.helpCustomerDirectoryMd) && (
            <PageHelpHeaderButton
              helpUrl={settings.helpCustomerDirectoryUrl || ''}
              helpMd={settings.helpCustomerDirectoryMd || ''}
              isHelpModalOpen={isHelpModalOpen}
              setIsHelpModalOpen={setIsHelpModalOpen}
              title={t.dashboard.guidance}
            />
          )}
        </div>
      </header>

      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={14} />
          <input
            type="text"
            placeholder={t.customers.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-4">
          <select 
            className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-1 focus:ring-slate-900 shadow-sm transition-all cursor-pointer min-w-[160px]"
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            <option value="all">{t.customers.allSectors}</option>
            {availableSectors.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        {canCreateCustomersAndProjects && (
          <div className="md:pl-4 md:border-l md:border-slate-100 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewCustomer(true)}
              className="group relative flex cursor-pointer items-center gap-2 rounded-xl border border-blue-100/80 bg-blue-50 px-4 py-2.5 text-left shadow-sm transition-all hover:border-blue-200 hover:bg-blue-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              <Plus size={16} strokeWidth={2.5} className="shrink-0 text-blue-600" aria-hidden />
              <span className="min-w-0 text-sm font-semibold leading-relaxed tracking-tight text-blue-950">
                {t.customers.createNewCustomer}
              </span>
            </button>
            <Link
              to="/organizational-boundary-onboarding"
              className="group relative flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
            >
              <Network size={16} strokeWidth={2.5} className="shrink-0 text-slate-600" aria-hidden />
              <span className="min-w-0 text-sm font-semibold leading-relaxed tracking-tight text-slate-800">
                Organizasyonel sınır
              </span>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-medium flex items-center gap-3">
          <Building2 size={18} />
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4">
        {paginatedCustomers.map((customer) => {
          const isExpanded = expandedId === customer.id;
          const details = customerDetails[customer.id];
          const activeProjects = activeProjectsByCustomerId[customer.id] ?? [];
          const visibleProjects = activeProjects.slice(0, 2);
          const hasMoreProjects = activeProjects.length > 2;

          return (
            <div
              key={customer.id}
              id={`customer-directory-card-${customer.id}`}
              className="minimal-card group relative overflow-hidden"
            >
              <Building2
                size={80}
                strokeWidth={2}
                className="pointer-events-none absolute -right-4 -bottom-4 text-slate-100 opacity-75 transform -rotate-12 transition-transform duration-500 group-hover:rotate-0"
                aria-hidden
              />
              <div
                role="button"
                tabIndex={0}
                aria-expanded={expandedId === customer.id}
                aria-label={customer.name}
                onClick={(e) => toggleExpand(customer.id, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleExpand(customer.id, e as unknown as React.MouseEvent);
                  }
                }}
                className="relative z-10 p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
              >
                <div className="hidden sm:flex w-12 h-12 bg-slate-900 text-white rounded-xl items-center justify-center font-bold shadow-lg overflow-hidden border border-slate-100 shrink-0">
                  {customer.logoUrl ? (
                    <img 
                      src={customer.logoUrl} 
                      alt={customer.name} 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{customer.name?.[0]}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-900 truncate">{customer.name}</h3>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1">
                    {(customer.sectorIds || []).slice(0, 1).map(sid => {
                      const s = availableSectors.find(as => as.id === sid);
                      return (
                        <span key={sid} className="rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-slate-500">
                          {s?.name || sid}
                        </span>
                      );
                    })}
                    {(customer.sectorIds || []).length > 1 && (
                      <span className="text-[8px] font-bold tracking-widest text-slate-400">+{(customer.sectorIds || []).length - 1}</span>
                    )}
                  </div>
                  <div className="mt-1 flex min-h-[1.25rem] flex-wrap items-center gap-1">
                    {visibleProjects.map((project) => {
                      const tone = projectDirectoryCardTone(project.status);
                      const CategoryIcon = projectDirectoryCategoryIcon(project.category);
                      return (
                        <Link
                          key={project.id}
                          to={`/projects/${project.id}`}
                          title={project.name}
                          onClick={(e) => e.stopPropagation()}
                          className={cn(
                            'inline-flex max-w-[10rem] items-center gap-1 rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm transition-colors',
                            tone.card,
                            tone.badge,
                          )}
                        >
                          <CategoryIcon size={10} strokeWidth={2.5} className="shrink-0" aria-hidden />
                          <span className="truncate">{project.name}</span>
                        </Link>
                      );
                    })}
                    {hasMoreProjects && (
                      <span
                        className="px-1 text-[9px] font-bold text-slate-400"
                        title={activeProjects
                          .slice(2)
                          .map((p) => p.name)
                          .join(', ')}
                      >
                        ...
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  {canEditCustomerInModal && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCustomer(customer);
                      }}
                      title={t.customers.editCustomerTooltip}
                      aria-label={t.customers.editCustomerTooltip}
                      className="p-2 text-slate-400 transition-colors hover:text-slate-900"
                    >
                      <Edit2 size={20} />
                    </button>
                  )}
                  {canCreateCustomersAndProjects && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewProjectForCustomer(customer);
                      }}
                      title={t.customers.startNewProject}
                      aria-label={t.customers.startNewProject}
                      className="p-2 text-slate-400 transition-colors hover:text-blue-600"
                    >
                      <FolderPlus size={20} />
                    </button>
                  )}
                  <Link
                    to={`/customers/${customer.id}`}
                    title={t.customers.openProfile}
                    aria-label={t.customers.openProfile}
                    className="p-2 text-slate-400 transition-colors hover:text-slate-900"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Search size={20} />
                  </Link>
                   <div className={cn("transition-transform duration-200", isExpanded ? "rotate-180" : "")}>
                     <ChevronDown size={20} className="text-slate-400" />
                   </div>
                </div>
              </div>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="relative z-10 border-t border-slate-50 overflow-hidden"
                  >
                    <div className="p-6 bg-slate-50/50 space-y-6">
                      {details?.loading ? (
                        <div className="flex items-center justify-center py-8 gap-3 text-slate-400">
                          <Loader2 className="animate-spin" size={16} />
                          <span className="text-xs font-medium italic">{t.customers.pullingDetails}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:items-stretch">
                          {/* 1 — Firma Bilgileri */}
                          <div className="flex h-full flex-col space-y-4">
                            <h4 className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <Building2 size={12} /> {t.customers.customerSpecs}
                            </h4>
                            <div className="flex min-h-[5.1rem] flex-1 flex-col justify-start space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                              <MiniInfo
                                label={t.customers.definition}
                                value={formatSectorClassificationSummary(customer) || undefined}
                              />
                              <MiniInfo label={t.customers.totalEmployees} value={customer.employeeCountTotal?.toString()} />
                              <MiniInfo label={t.customers.website} value={customer.websiteUrl} isUrl />
                            </div>
                          </div>

                          {/* 2 — Yerel Şubeler */}
                          <div className="flex h-full flex-col space-y-4">
                            <h4 className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <MapPin size={12} /> {t.customers.localBranches}
                            </h4>
                            <div className="flex min-h-[5.1rem] flex-1 flex-col justify-start rounded-xl border border-slate-200 bg-white p-4">
                              {details?.branches.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic">{t.customers.noBranchesMapped}</p>
                              ) : (
                                <div className="space-y-1">
                                  {details?.branches.slice(0, 2).map(b => (
                                    <div key={b.id} className="text-[11px] text-slate-700 truncate">• {b.name}</div>
                                  ))}
                                  {details?.branches && details.branches.length > 2 && (
                                    <p className="text-[10px] text-blue-600 font-bold">{t.customers.moreBranches.replace('{count}', String(details.branches.length - 2))}</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 3 — Ana Paydaşlar */}
                          <div className="flex h-full flex-col space-y-4 md:col-span-2 lg:col-span-1">
                            <h4 className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <Contact2 size={12} /> {t.customers.keyStakeholders}
                            </h4>
                            <div className="flex min-h-[5.1rem] flex-1 flex-col justify-start space-y-2 rounded-xl border border-slate-200 bg-white p-4">
                              {details?.contacts.length === 0 ? (
                                <p className="text-[10px] text-slate-400 italic">{t.customers.noStakeholders}</p>
                              ) : (
                                details?.contacts.slice(0, 3).map(c => (
                                  <div key={c.id} className="flex justify-between items-start text-[11px]">
                                    <span className="font-bold text-slate-900">{c.name}</span>
                                    <span className="text-slate-400 truncate ml-2">{c.role}</span>
                                  </div>
                                ))
                              )}
                              {details?.contacts && details.contacts.length > 3 && (
                                <p className="text-[10px] text-blue-600 font-bold text-center pt-1">{t.customers.moreContacts.replace('{count}', String(details.contacts.length - 3))}</p>
                              )}
                            </div>
                          </div>

                          {/* 4 — Aktif ve Geçmiş Projeler (2 columns, left) */}
                          <div className="flex h-full flex-col space-y-4 md:col-span-2 lg:col-span-2 lg:col-start-1 lg:row-start-2">
                            <h4 className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <FolderKanban size={12} /> {t.customers.activePastProjects}
                            </h4>
                            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 sm:grid-cols-2 sm:auto-rows-fr">
                              {details?.projects.length === 0 ? (
                                <div className="col-span-full flex min-h-[3.4rem] items-start rounded-xl border border-slate-200 bg-white p-4">
                                  <p className="text-[10px] text-slate-400 italic">{t.customers.noProjectsFound}</p>
                                </div>
                              ) : (
                                details?.projects.slice(0, 2).map(p => {
                                  const tone = projectDirectoryCardTone(p.status);
                                  const CategoryIcon = projectDirectoryCategoryIcon(p.category);
                                  return (
                                    <Link
                                      key={p.id}
                                      to={`/projects/${p.id}`}
                                      className={cn(
                                        'flex min-h-[3.4rem] items-start justify-between rounded-xl border p-3 shadow-sm transition-colors',
                                        tone.card,
                                      )}
                                    >
                                      <div className="min-w-0 pr-2">
                                        <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-900">
                                          <CategoryIcon
                                            size={12}
                                            strokeWidth={2.25}
                                            className="shrink-0"
                                            aria-hidden
                                          />
                                          <span className="truncate">{p.name}</span>
                                        </p>
                                        <span
                                          className={cn(
                                            'mt-1 inline-block rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest',
                                            tone.badge,
                                          )}
                                        >
                                          {projectStatusLabel(p.status, {
                                            active: t.projects.statusActive,
                                            closed: t.projects.statusClosed,
                                            archived: t.projects.statusArchived,
                                          })}
                                        </span>
                                      </div>
                                      <ChevronRight size={14} className="mt-0.5 shrink-0 text-slate-400" />
                                    </Link>
                                  );
                                })
                              )}
                              {details?.projects && details.projects.length > 2 && (
                                <Link
                                  to={`/customers/${customer.id}`}
                                  className="col-span-full text-center py-2 text-[10px] font-bold text-blue-600 hover:underline"
                                >
                                  {t.customers.viewAllProjects.replace('{count}', String(details.projects.length))}
                                </Link>
                              )}
                            </div>
                          </div>

                          {/* 5 — Proje Kullanıcıları (right column) */}
                          <div className="flex h-full flex-col space-y-4 lg:col-start-3 lg:row-start-2">
                            <h4 className="flex shrink-0 items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              <Users size={12} /> {t.customers.projectUsers}
                            </h4>
                            <div className="flex min-h-[3.4rem] flex-1 flex-col items-start justify-start rounded-xl border border-slate-200 bg-white p-4">
                              <div className="flex -space-x-2 overflow-hidden">
                                {details?.users.length === 0 ? (
                                  <p className="text-[10px] text-slate-400 italic">{t.customers.noUsersAssigned}</p>
                                ) : (
                                  details?.users.slice(0, 5).map(u => (
                                    <div key={u.id} className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 overflow-hidden border border-slate-200" title={u.name}>
                                      {u.avatarUrl ? <img src={u.avatarUrl} alt={u.name} /> : u.name?.charAt(0)}
                                    </div>
                                  ))
                                )}
                                {details?.users && details.users.length > 5 && (
                                  <div className="flex items-center justify-center h-6 w-6 rounded-full ring-2 ring-white bg-slate-900 text-white text-[8px] font-bold">
                                    +{details.users.length - 5}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Final Action */}
                          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 md:col-span-2 lg:col-span-3 lg:row-start-3">
                            {canEditCustomerInModal && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setEditingCustomer(customer);
                                }}
                                title={t.customers.editCustomerTooltip}
                                className="px-6 py-2 border-2 border-slate-200 bg-white text-slate-900 text-[10px] font-bold uppercase tracking-[.2em] rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all inline-flex items-center gap-2"
                              >
                                <Edit2 size={14} />
                                {t.common.edit}
                              </button>
                            )}
                            <Link
                              to={`/customers/${customer.id}`}
                              className="px-6 py-2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-[.2em] rounded-lg hover:bg-slate-800 transition-all inline-flex items-center gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {t.customers.deepProfile} <ChevronRight size={14} />
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="py-24 text-center text-slate-400 minimal-card bg-slate-50/50 flex flex-col items-center gap-3 border-dashed">
            <Building2 size={48} className="text-slate-100" />
            <p className="text-sm">{t.customers.noCustomersMatched}</p>
          </div>
        )}

        {filteredCustomers.length > 0 && (
          <PaginationBar
            page={currentDirectoryPage}
            pageSize={directoryPageSize}
            totalItems={filteredCustomers.length}
            onPageChange={setDirectoryPage}
            onPageSizeChange={setDirectoryPageSize}
            rangeSummaryTemplate={t.common.paginationRangeSummary}
            perPageLabel={t.common.paginationPerPageLabel}
            pageOfLabel={(c, tot) =>
              t.common.paginationPageOf.replace('{current}', String(c)).replace('{total}', String(tot))
            }
            prevLabel={t.common.paginationPrev}
            nextLabel={t.common.paginationNext}
          />
        )}

      </div>

      <NewCustomerModal
        open={showNewCustomer}
        onClose={() => setShowNewCustomer(false)}
        availableSectors={availableSectors}
        onCreated={loadAllCustomers}
      />

      <EditCustomerModal
        customer={editingCustomer}
        sectors={availableSectors}
        isOpen={!!editingCustomer}
        onClose={() => setEditingCustomer(null)}
        onSaved={(merged) => {
          setCustomers((prev) =>
            prev.map((c) => (c.id === merged.id ? { ...c, ...merged } : c)),
          );
          setEditingCustomer((prev) => (prev?.id === merged.id ? merged : prev));
        }}
      />

      <NewProjectLaunchModal
        isOpen={!!newProjectForCustomer}
        onClose={() => setNewProjectForCustomer(null)}
        onCreated={loadAllCustomers}
        presetCustomerId={newProjectForCustomer?.id}
        presetCustomerName={newProjectForCustomer?.name}
      />

      <PageHelpFullModal
        helpUrl={settings.helpCustomerDirectoryUrl || ''}
        helpMd={settings.helpCustomerDirectoryMd || ''}
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        labels={{
          guidance: t.dashboard.guidance,
          dontShowOnFirstOpen: t.dashboard.dontShowOnFirstOpen,
          interactiveTutorial: t.dashboard.interactiveTutorial,
          noVideo: t.dashboard.noVideo,
        }}
      />
    </div>
  );
}

function MiniInfo({ label, value, isUrl }: { label: string, value?: string, isUrl?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start text-[11px] gap-4">
      <span className="text-slate-400 shrink-0">{label}</span>
      {isUrl ? (
        <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate">
          {value.replace(/^https?:\/\/(www\.)?/, '')}
        </a>
      ) : (
        <span className="font-bold text-slate-700 text-right">{value}</span>
      )}
    </div>
  );
}
