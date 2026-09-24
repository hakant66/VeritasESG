/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Users, 
  Building2,
  Building,
  Mail,
  ChevronRight,
  ChevronLeft,
  UserPlus,
  Loader2,
  FileBox,
  Search,
  Filter,
  ChevronDown,
  Edit2,
  Trash2,
  ExternalLink,
  Linkedin
} from 'lucide-react';
import * as DB from '../../services/db';
import { logActivity } from '../../services/db';
import { Customer, Contact, Template, Project, Segment, Branch, PlatformUser, ProjectUserAssignment } from '../../types';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { getSectorIcon } from '../../lib/sectorIcons';
import { formatBranchLocation } from '../../lib/branchUtils';
import { useAuth } from '../../lib/AuthContext';
import { normalizePlatformRole } from '../../lib/platformRoles.ts';
import { useSettings } from '../../lib/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import Modal from '../../components/ui/Modal';
import { PaginationBar, type PageSizeOption } from '../../components/ui/PaginationBar';
import { NewCustomerModal } from '../../components/customer/NewCustomerModal';
import { EditCustomerModal } from '../../components/customer/EditCustomerModal';
import {
  PageHelpFullModal,
  PageHelpHeaderButton,
} from '../../components/admin/PageHelpGuidance';

export default function CustomersPage() {
  const { user, profile, isAdmin, canCreateCustomersAndProjects } = useAuth();
  const { t, lang } = useTranslation();
  const { settings } = useSettings();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerIdsWithProjects, setCustomerIdsWithProjects] = useState<Set<string>>(new Set());
  const [availableSectors, setAvailableSectors] = useState<Segment[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeProjects, setActiveProjects] = useState<Project[]>([]);
  const [projectUsers, setProjectUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [showLaunchProject, setShowLaunchProject] = useState(false);
  const [launchCategory] = useState<Project['category']>('Project');
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [customerListPage, setCustomerListPage] = useState(1);
  const [customerPageSize, setCustomerPageSize] = useState<PageSizeOption>(10);

  // Modal State
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'info' | 'warning' | 'danger' | 'confirm';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    type: 'info'
  });

  const showAlert = (title: string, description: string, type: 'info' | 'warning' | 'danger' = 'info') => {
    setModal({ isOpen: true, title, description, type });
  };

  const showConfirm = (title: string, description: string, onConfirm: () => void, type: 'confirm' | 'danger' = 'confirm') => {
    setModal({ isOpen: true, title, description, type, onConfirm });
  };

  const platformUserRoleLabel = (role: string) => {
    const canonical = normalizePlatformRole(role);
    if (canonical === 'platform_admin') return t.users.roles.platform_admin;
    if (canonical === 'consultant_manager') return t.users.roles.consultant_manager;
    if (canonical === 'consultant') return t.users.roles.consultant;
    if (canonical === 'customer') return t.users.roles.customer;
    if (canonical === 'contributor') return t.users.roles.contributor;
    if (canonical === 'auditor') return t.users.roles.auditor;
    return role.replace(/_/g, ' ');
  };

  useEffect(() => {
    if (!selectedCustomer) {
      setIsSidebarCollapsed(false);
    }
  }, [selectedCustomer]);

  useEffect(() => {
    loadCustomers();
    loadAllTemplates();
    loadSectors();
  }, []);

  async function loadSectors() {
    try {
      const data = await DB.segments.list();
      setAvailableSectors(data);
    } catch (error) {
      console.error("Failed to load sectors:", error);
    }
  }

  async function loadCustomers() {
    setLoading(true);
    try {
      const [data, allProjects] = await Promise.all([
        DB.customers.list(),
        DB.projects.list(),
      ]);
      const idsWithProjects = new Set(
        (allProjects || [])
          .map((p) => p.customerId)
          .filter((id): id is string => Boolean(id)),
      );
      setCustomerIdsWithProjects(idsWithProjects);
      const safeData = data || [];
      const unique = Array.from(new Map(safeData.map(c => [c.id, c])).values());
      setCustomers(unique);
    } catch (error) {
      console.error("Failed to load customers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadAllTemplates() {
    try {
      const snap = await DB.getDocs(DB.collection(DB.db, 'templates'));
      const docs = snap.docs || [];
      const data = docs.map(d => ({ id: d.id, ...d.data() } as Template))
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setTemplates(Array.from(new Map(data.map(t => [t.id, t])).values()));
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  async function handleSelectCustomer(c: Customer) {
    setSelectedCustomer(c);
    console.log("Loading details for customer:", c.id);
    setContacts([]);
    setBranches([]);
    setActiveProjects([]);
    setProjectUsers([]);
    
    try {
      const results = await Promise.allSettled([
        DB.contacts.listByCustomer(c.id),
        DB.getDocs(DB.query(
          DB.collection(DB.db, 'projects'), 
          DB.where('customerId', '==', c.id)
        )),
        DB.getDocs(DB.collection(DB.db, 'questions')),
        DB.getDocs(DB.collection(DB.db, 'answers')),
        DB.branches.listByCustomer(c.id),
        DB.getDocs(DB.collection(DB.db, 'projectUserAssignments'))
      ]);

      if (results[0].status === 'fulfilled') {
        setContacts(results[0].value);
      }

      let projectsToUse: Project[] = [];

      if (results[1].status === 'fulfilled' && results[2].status === 'fulfilled' && results[3].status === 'fulfilled') {
        const projectDocs = results[1].value.docs || [];
        const qSnap = results[2].value;
        const aSnap = results[3].value;

        const qByTemplate = (qSnap.docs || []).reduce((acc, d) => {
          const data = d.data();
          if (data && data.templateId) {
            const tId = data.templateId;
            acc[tId] = (acc[tId] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);
        
        const aByProject = (aSnap.docs || []).reduce((acc, d) => {
          const data = d.data();
          if (data && data.projectId) {
            const pId = data.projectId;
            acc[pId] = (acc[pId] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        projectsToUse = projectDocs.map(doc => {
          const data = doc.data();
          if (!data) return null;
          const total = qByTemplate[data.templateId] || 0;
          const answered = aByProject[doc.id] || 0;
          return {
            id: doc.id,
            ...data,
            progress: total > 0 ? Math.round((answered / total) * 100) : 0
          } as Project;
        }).filter((p): p is Project => p !== null);

        setActiveProjects(projectsToUse);
      } else {
        // If stats fail, still show projects if possible
        if (results[1].status === 'fulfilled' && results[1].value.docs) {
          projectsToUse = results[1].value.docs.map(d => ({ id: d.id, ...d.data() } as Project));
          setActiveProjects(projectsToUse);
        }
        console.warn("Some detail components failed to load:", results.filter(r => r.status === 'rejected'));
      }

      // Fetch Project Users
      if (projectsToUse.length > 0 && results[5].status === 'fulfilled' && results[5].value.docs) {
        const projectIds = projectsToUse.map(p => p.id);
        const allAss = results[5].value.docs
          .map(d => ({ id: d.id, ...d.data() } as ProjectUserAssignment))
          .filter(a => a && a.projectId && projectIds.includes(a.projectId));
        
        const distinctUserIds = Array.from(new Set(allAss.map(a => a.userId).filter(Boolean) as string[]));
        if (distinctUserIds.length > 0) {
          const userPromises = distinctUserIds.map(uid => DB.platformUsers.get(uid));
          const usersRes = await Promise.all(userPromises);
          setProjectUsers(usersRes.filter((u): u is PlatformUser => u !== null));
        }
      }

      if (results[4].status === 'fulfilled') {
        setBranches(results[4].value);
      }
    } catch (error) {
      console.error("Critical failure during customer load:", error);
    }
  }

  const handleLaunchProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    
    const formData = new FormData(e.currentTarget);
    const rawTemplateId = formData.get('templateId');
    const templateId =
      typeof rawTemplateId === 'string' && rawTemplateId.trim() ? rawTemplateId.trim() : undefined;
    const name = formData.get('name') as string;
    const category = formData.get('category') as Project['category'];

    if (!name) return;

    setIsSubmitting(true);
    try {
      // @ts-ignore - allowMultipleAssignments is a new field
      const projectId = await DB.projects.createFromTemplate(
        selectedCustomer.id,
        templateId,
        name,
        user?.uid,
        category,
        false,
      );
      if (user) {
        await logActivity(user, 'create', 'projects', projectId, `Launched project "${name}" with category "${category}" for customer ${selectedCustomer.name}`);
      }
      setShowLaunchProject(false);
      await loadCustomers();
      handleSelectCustomer(selectedCustomer);
      alert(`Project "${name}" launched successfully.`);
    } catch (error) {
      console.error("Launch failed:", error);
      alert("Failed to launch project. Check console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    
    const hasRecords = contacts.length > 0 || activeProjects.length > 0;
    if (hasRecords) {
      showAlert("Cannot Delete", "This customer has active contacts or projects and cannot be deleted until those are removed.", "warning");
      return;
    }

    showConfirm(
      "Confirm Deletion",
      `Are you sure you want to delete ${selectedCustomer.name}? This action cannot be undone.`,
      async () => {
        setIsSubmitting(true);
        try {
          await DB.customers.delete(selectedCustomer.id);
          if (user) {
            await logActivity(user, 'delete', 'customers', selectedCustomer.id, `Deleted customer "${selectedCustomer.name}"`);
          }
          setSelectedCustomer(null);
          loadCustomers();
          showAlert("Customer Deleted", "The customer has been successfully removed.");
        } catch (error) {
          console.error("Delete failed:", error);
          showAlert("Delete Failed", "Failed to delete customer. Please check the console for details.", "danger");
        } finally {
          setIsSubmitting(false);
        }
      },
      "danger"
    );
  };

  const handleUpdateContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer || !editingContact) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const department = formData.get('department') as string;
    const linkedinUrl = formData.get('linkedinUrl') as string;
    const branchId = (formData.get('branchId') as string) || '';

    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      const updateData: any = { name, email, role, department, linkedinUrl };
      if (branchId) updateData.branchId = branchId;
      await DB.contacts.update(selectedCustomer.id, editingContact.id, updateData);
      setEditingContact(null);
      const cList = await DB.contacts.listByCustomer(selectedCustomer.id);
      setContacts(cList);
      showAlert("Stakeholder Updated", "Stakeholder contact details have been successfully updated.");
    } catch (error) {
      console.error("Update failed:", error);
      showAlert("Update Failed", "Failed to update stakeholder contact.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const department = formData.get('department') as string;
    const linkedinUrl = formData.get('linkedinUrl') as string;
    const branchId = (formData.get('branchId') as string) || '';

    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      const contactData: any = { 
        name, 
        email, 
        role, 
        department, 
        linkedinUrl
      };
      if (branchId) contactData.branchId = branchId;
      await DB.contacts.create(selectedCustomer.id, contactData);
      setShowAddContact(false);
      const cList = await DB.contacts.listByCustomer(selectedCustomer.id);
      setContacts(cList);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer || !editingBranch) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const branchType = (formData.get('type') as string)?.trim();
    const address = formData.get('address') as string;

    if (!name) return;

    setIsSubmitting(true);
    try {
      await DB.branches.update(selectedCustomer.id, editingBranch.id, {
        name,
        type: branchType || undefined,
        address,
      });
      setEditingBranch(null);
      const bList = await DB.branches.listByCustomer(selectedCustomer.id);
      setBranches(bList);
      showAlert("Branch Updated", "Branch details have been successfully updated.");
    } catch (error) {
      console.error("Update failed:", error);
      showAlert("Update Failed", "Failed to update branch.", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const branchType = (formData.get('type') as string)?.trim();
    const address = formData.get('address') as string;

    if (!name) return;

    setIsSubmitting(true);
    try {
      await DB.branches.create(selectedCustomer.id, {
        name,
        type: branchType || undefined,
        address,
      });
      setShowAddBranch(false);
      const bList = await DB.branches.listByCustomer(selectedCustomer.id);
      setBranches(bList);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortLocale = lang === 'tr' ? 'tr' : 'en';

  const filteredCustomers = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    const filtered = customers.filter((c) => {
      const matchesSearch =
        !search ||
        (c.name || '').toLowerCase().includes(search) ||
        (c.headquartersCountry || '').toLowerCase().includes(search) ||
        (c.sectorIds || []).some((sid) => {
          const s = availableSectors.find((as) => as.id === sid);
          return s?.name.toLowerCase().includes(search);
        });
      const matchesSector = sectorFilter === 'all' || (c.sectorIds && c.sectorIds.includes(sectorFilter));
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
  }, [customers, searchTerm, sectorFilter, availableSectors, customerIdsWithProjects, sortLocale]);

  useEffect(() => {
    setCustomerListPage(1);
  }, [searchTerm, sectorFilter, customerPageSize]);

  const currentCustomerPage = Math.min(Math.max(1, customerListPage), Math.max(1, Math.ceil(filteredCustomers.length / customerPageSize)));
  const paginatedCustomers = useMemo(() => {
    const start = (currentCustomerPage - 1) * customerPageSize;
    return filteredCustomers.slice(start, start + customerPageSize);
  }, [filteredCustomers, currentCustomerPage, customerPageSize]);

  const serviceCategorySegmentIds = useMemo(
    () =>
      availableSectors
        .filter((s) => s.type === 'Service Category' || s.type === 'Kategori')
        .map((s) => s.id),
    [availableSectors],
  );

  const launchTemplates = useMemo(() => {
    const sectorIds = selectedCustomer?.sectorIds || [];
    if (!selectedCustomer || sectorIds.length === 0) return [];

    let base: Template[];
    if (launchCategory === 'Service') {
      base = templates.filter(
        (t) => t.sectorId && serviceCategorySegmentIds.includes(t.sectorId),
      );
    } else {
      base = templates.filter(
        (t) => !t.sectorId || !serviceCategorySegmentIds.includes(t.sectorId),
      );
    }
    return base.filter((t) => t.sectorId && sectorIds.includes(t.sectorId));
  }, [templates, launchCategory, serviceCategorySegmentIds, selectedCustomer]);

  const displaySectors = (availableSectors.length > 0
    ? availableSectors
    : Array.from(new Set(customers.flatMap(c => c.sectorIds || []))).map(id => ({ id, name: id } as Segment)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-8 w-full max-w-none space-y-8">
      <header className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-4">
            <Building2 className="text-blue-600" size={36} strokeWidth={2.5} />
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">{t.customers.title}</h1>
          </div>
          <p className="mt-1 text-lg font-light text-slate-500">{t.customers.managementSubtitle}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-start gap-3">
          {(settings.helpCustomersUrl || settings.helpCustomersMd) && (
            <PageHelpHeaderButton
              helpUrl={settings.helpCustomersUrl || ''}
              helpMd={settings.helpCustomersMd || ''}
              isHelpModalOpen={isHelpModalOpen}
              setIsHelpModalOpen={setIsHelpModalOpen}
              title={t.dashboard.guidance}
            />
          )}
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-8 relative">
        {/* Left: Customer List / Sidebar */}
        <motion.div 
          initial={false}
          animate={{ 
            width: isSidebarCollapsed ? 48 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? '100%' : '33.333333%'),
            marginRight: isSidebarCollapsed ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? 0 : 32)
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className={cn(
            "space-y-4 relative shrink-0 lg:overflow-hidden w-full lg:w-1/3",
            isSidebarCollapsed ? "bg-slate-50/50 rounded-lg" : "bg-transparent"
          )}
        >
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center pt-4">
              <button
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 bg-white border border-slate-200 rounded-md shadow-sm text-slate-400 hover:text-slate-900 transition-all hover:bg-slate-50"
                title="Show Sidebar Portfolio"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          ) : (
            <div className="space-y-4 w-full min-w-[300px]">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div className="flex items-center gap-4">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">{t.customers.title}</h2>
                  {canCreateCustomersAndProjects && (
                    <button 
                      onClick={() => setShowNewCustomer(true)}
                      className="px-2 py-1 bg-slate-900 text-[9px] font-bold text-white uppercase tracking-widest rounded hover:bg-slate-800 transition-all shadow-sm flex items-center gap-1"
                    >
                      <Plus size={10} />
                      {t.common.new}
                    </button>
                  )}
                </div>
                {selectedCustomer && (
                  <button
                    onClick={() => setIsSidebarCollapsed(true)}
                    className="p-1.5 bg-white border border-slate-100 rounded-md shadow-sm text-slate-400 hover:text-slate-900 transition-all"
                    title="Hide Sidebar"
                  >
                    <ChevronLeft size={16} />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="text"
                    placeholder={t.customers.searchManagementPlaceholder}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-1 focus:ring-slate-900 outline-none transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="relative group">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select 
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 focus:ring-1 focus:ring-slate-900 outline-none cursor-pointer appearance-none transition-all shadow-sm"
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                  >
                    <option value="all">{t.customers.allSectors}</option>
                    {displaySectors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-12 text-slate-400 text-sm">Loading portfolio...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  {customers.length === 0 ? t.customers.emptyCustomerList : t.customers.emptyFilterList}
                </div>
              ) : (
                <>
                <div className="space-y-2">
                  {paginatedCustomers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-lg transition-all border text-left",
                        selectedCustomer?.id === customer.id 
                          ? "bg-white border-slate-900 shadow-sm ring-1 ring-slate-900" 
                          : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "hidden sm:flex w-10 h-10 rounded flex items-center justify-center transition-colors overflow-hidden border border-slate-100",
                          selectedCustomer?.id === customer.id ? "bg-slate-900" : "bg-slate-100"
                        )}>
                          {customer.logoUrl ? (
                            <img src={customer.logoUrl} alt={customer.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <Building size={18} className={selectedCustomer?.id === customer.id ? "text-white" : "text-slate-400"} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <span className={cn("block font-bold text-sm truncate", selectedCustomer?.id === customer.id ? "text-slate-900" : "text-slate-700")}>
                            {customer.name}
                          </span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {(customer.sectorIds || []).slice(0, 2).map(sid => {
                              const s = availableSectors.find(as => as.id === sid);
                              return (
                                <span key={sid} className="text-[8px] text-slate-400 uppercase font-bold tracking-widest bg-slate-50 px-1 rounded">
                                  {s?.name || sid}
                                </span>
                              );
                            })}
                            {(customer.sectorIds || []).length > 2 && (
                              <span className="text-[8px] text-slate-400 font-bold tracking-widest">+{(customer.sectorIds || []).length - 2}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronRight size={16} className={cn("shrink-0", selectedCustomer?.id === customer.id ? "text-slate-900" : "text-slate-300")} />
                    </button>
                  ))}
                </div>
                {filteredCustomers.length > 0 && (
                  <div className="space-y-3">
                    <PaginationBar
                      page={currentCustomerPage}
                      pageSize={customerPageSize}
                      totalItems={filteredCustomers.length}
                      onPageChange={setCustomerListPage}
                      onPageSizeChange={setCustomerPageSize}
                      rangeSummaryTemplate={t.common.paginationRangeSummary}
                      perPageLabel={t.common.paginationPerPageLabel}
                      pageOfLabel={(c, tot) =>
                        t.common.paginationPageOf.replace('{current}', String(c)).replace('{total}', String(tot))
                      }
                      prevLabel={t.common.paginationPrev}
                      nextLabel={t.common.paginationNext}
                    />
                    {canCreateCustomersAndProjects && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowNewCustomer(true)}
                          className="px-4 py-2.5 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
                        >
                          <Plus size={14} />
                          {t.common.newCustomerAction}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Right: Customer Detail */}
        <div className="flex-1 min-w-0 transition-all duration-300 relative">
          <AnimatePresence mode="wait">
            {!selectedCustomer ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="minimal-card p-24 text-center text-slate-400 h-full flex flex-col justify-center items-center bg-slate-50/50"
              >
                <Building size={48} className="text-slate-200 mb-4" />
                <p className="text-sm font-light">{t.customers.selectCustomerFromSidebar}</p>
              </motion.div>
            ) : (
              <motion.div 
                key={selectedCustomer.id}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="space-y-8"
              >
                {/* Profile Summary */}
                <div className="minimal-card p-8 flex justify-between items-start bg-white shadow-sm border-slate-100">
                  <div className="flex min-w-0 flex-1 items-start justify-between gap-6">
                    <div className="min-w-0 flex-1 space-y-1">
                      <h2 className="truncate text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{selectedCustomer.name}</h2>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          {(selectedCustomer.sectorIds || []).map(sid => {
                            const s = availableSectors.find(as => as.id === sid);
                            return (
                              <span key={sid} className="text-slate-500 font-light uppercase text-[9px] tracking-widest font-bold flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                <Building size={10} /> {s?.name || sid}
                              </span>
                            );
                          })}
                        </div>
                        
                        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

                        {selectedCustomer.headquartersCountry && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Plus size={10} className="rotate-45" /> 
                            <span className="text-[10px] font-bold uppercase tracking-wider">{selectedCustomer.headquartersCountry}</span>
                          </div>
                        )}

                        {selectedCustomer.websiteUrl && (
                          <a 
                            href={selectedCustomer.websiteUrl.startsWith('http') ? selectedCustomer.websiteUrl : `https://${selectedCustomer.websiteUrl}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 uppercase text-[9px] tracking-widest font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink size={10} /> {selectedCustomer.websiteUrl.replace(/^https?:\/\/(www\.)?/, '')}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="hidden h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 sm:flex">
                      {selectedCustomer.logoUrl ? (
                        <img src={selectedCustomer.logoUrl} alt={selectedCustomer.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        (() => {
                          const Icon = getSectorIcon((selectedCustomer.sectorIds || [])[0] || '');
                          return <Icon size={32} className="text-slate-400" />;
                        })()
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/customers/${selectedCustomer.id}`}
                      title={t.customers.openProfile}
                      aria-label={t.customers.openProfile}
                      className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center shadow-sm border border-blue-500/50 h-[44px] w-[44px] shrink-0"
                    >
                      <ExternalLink size={18} />
                    </Link>
                    {isAdmin && (
                      <button 
                        onClick={() => setEditingCustomer(selectedCustomer)}
                        className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-300 rounded-xl transition-all shadow-sm group h-[44px] w-[44px] flex items-center justify-center shrink-0"
                        title={t.customers.editCustomerTooltip}
                      >
                        <Edit2 size={18} className="group-hover:rotate-12 transition-transform" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Company Description */}
                {selectedCustomer.description && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 text-sm text-slate-600 leading-relaxed italic"
                  >
                    "{selectedCustomer.description}"
                  </motion.div>
                )}

                {/* Quick Actions */}
                {isAdmin && (
                  <div className="flex justify-start">
                    <button 
                      onClick={() => setShowLaunchProject(true)}
                      className="minimal-button-primary flex items-center gap-2 group shadow-sm bg-slate-900 text-white"
                    >
                      <FileBox size={18} className="group-hover:scale-110 transition-transform" />
                      {t.customers.launchNewReportingCycle}
                    </button>
                  </div>
                )}

                {/* Contacts Section */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex-grow mr-8">{t.customers.customerStakeholders}</h3>
                    {isAdmin && (
                      <button 
                        onClick={() => setShowAddContact(true)}
                        className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                        <UserPlus size={14} /> + {t.common.new}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {contacts.length === 0 ? (
                      <div className="col-span-full p-12 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-lg border-dashed">
                        {t.customers.noStakeholdersRegistered}
                      </div>
                    ) : (
                      contacts.map(c => {
                        const branch = branches.find(b => b.id === c.branchId);
                        return (
                          <div key={c.id} className="minimal-card p-6 flex items-center justify-between group w-full">
                            <div className="flex items-center gap-4 min-w-0">
                                <div className="w-10 h-10 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center font-bold text-sm border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors shrink-0">
                                  {c.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                                </div>
                              <div className="min-w-0">
                                <p className="font-bold text-slate-900 truncate">{c.name}</p>
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-2 text-[9px] text-slate-400 uppercase font-black tracking-widest">
                                    <span className="text-slate-600">{c.role}</span>
                                    {c.department && (
                                      <>
                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                        <span>{c.department}</span>
                                      </>
                                    )}
                                    {branch && (
                                      <>
                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                        <span className="text-blue-500">{branch.name}</span>
                                      </>
                                    )}
                                  </div>
                                  <a 
                                    href={`mailto:${c.email}`}
                                    className="text-[10px] text-slate-400 hover:text-blue-600 transition-colors truncate"
                                  >
                                    {c.email}
                                  </a>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {c.linkedinUrl && (
                                <a 
                                  href={c.linkedinUrl.startsWith('http') ? c.linkedinUrl : `https://${c.linkedinUrl}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 text-slate-300 hover:text-blue-600 hover:bg-slate-50 rounded-md transition-all"
                                  title={t.customers.linkedInProfile}
                                >
                                  <Linkedin size={16} />
                                </a>
                              )}
                              {isAdmin && (
                                <button 
                                  onClick={() => setEditingContact(c)}
                                  className="p-2 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-all"
                                  title={t.customers.editStakeholderTooltip}
                                >
                                  <Edit2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                {/* Branches Section */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex-grow mr-8">{t.customers.customerBranches}</h3>
                    {isAdmin && (
                      <button 
                        onClick={() => setShowAddBranch(true)}
                        className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-xs font-bold"
                      >
                        <Building size={14} /> + {t.common.new}
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {branches.length === 0 ? (
                      <div className="col-span-full p-8 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-lg border-dashed">
                        {t.customers.noBranchesRegistered}
                      </div>
                    ) : (
                      branches.map(b => (
                        <div key={b.id} className="minimal-card p-4 border border-slate-100 bg-white group hover:border-slate-200 transition-all flex justify-between items-start">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-1.5 bg-slate-50 text-slate-400 rounded">
                              <Building size={14} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 truncate">{b.name}</p>
                              {formatBranchLocation(b) && (
                                <p className="text-[10px] text-slate-400 truncate">{formatBranchLocation(b)}</p>
                              )}
                            </div>
                          </div>
                          {isAdmin && (
                            <button 
                              onClick={() => setEditingBranch(b)}
                              className="p-1.5 text-slate-300 hover:text-white hover:bg-blue-600 rounded-lg transition-all opacity-0 group-hover:opacity-100 shrink-0"
                              title={t.customers.editBranchTooltip}
                            >
                              <Edit2 size={14} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                {/* Active Projects Section */}
                <section className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex-grow mr-8">{t.customers.clientProjects}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeProjects.length === 0 ? (
                      <div className="col-span-full p-12 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-lg border-dashed">
                        {t.customers.noCustomerProjects}
                      </div>
                    ) : (
                      activeProjects.map(p => (
                        <Link 
                          key={p.id} 
                          to={`/projects/${p.id}`}
                          className="minimal-card p-6 flex flex-col justify-between hover:border-slate-900 transition-all group min-w-0"
                        >
                          <div className="flex items-start min-w-0">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 min-w-0">
                                <p className="font-bold text-slate-900 leading-tight truncate" title={p.name}>{p.name}</p>
                                <div className={cn(
                                  "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest whitespace-nowrap shrink-0",
                                  (p.status || '').toLowerCase() === 'closed' ? "bg-emerald-50 text-emerald-700" : 
                                  (p.status || '').toLowerCase() === 'active' ? "bg-blue-50 text-blue-700" :
                                  "bg-slate-100 text-slate-500"
                                )}>
                                  {(p.status || '').toLowerCase() === 'active'
                                    ? t.projects.statusActive
                                    : (p.status || '').toLowerCase() === 'closed'
                                      ? t.projects.statusClosed
                                      : (p.status || '').toLowerCase() === 'archived'
                                        ? t.projects.statusArchived
                                        : p.status}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mt-1 min-w-0">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest truncate">
                                  {t.customers.projectStartedLabel}: {p.startDate || (p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : t.tasks.pending)}
                                </span>
                              </div>
                              
                              <div className="flex flex-col gap-1 mt-3">
                                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  <span>{p.category || t.customers.defaultProjectCategory}</span>
                                  <span>{p.progress || 0}%</span>
                                </div>
                                <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${p.progress || 0}%` }}
                                    className={cn(
                                      "h-full rounded-full transition-all duration-500",
                                      p.progress === 100 ? "bg-emerald-500" : "bg-slate-900"
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))
                    )}
                  </div>
                </section>

                {/* Project Users Section — below client projects */}
                <section className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 flex-grow mr-8">{t.customers.customerProjectUsers}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {projectUsers.length === 0 ? (
                      <div className="col-span-full p-8 text-center text-slate-400 text-sm bg-white border border-slate-100 rounded-lg border-dashed">
                        {t.customers.noProjectUsersAssigned}
                      </div>
                    ) : (
                      projectUsers.map(u => (
                        <div key={u.id} className="minimal-card p-4 flex items-center gap-3 border border-slate-100 bg-white">
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                            u.role === 'platform_admin' ? "bg-slate-900" : "bg-blue-600"
                          )}>
                            {u.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{u.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{platformUserRoleLabel(u.role)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <>
        <NewCustomerModal
          open={showNewCustomer}
          onClose={() => setShowNewCustomer(false)}
          availableSectors={availableSectors}
          onCreated={loadCustomers}
        />

        {/* Add Contact Modal */}
        {showAddContact && (
          <Modal isOpen={true} title="Add Stakeholder" onClose={() => setShowAddContact(false)}>
            <form onSubmit={handleCreateContact} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input name="name" type="text" required className="minimal-input" placeholder="John Doe" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input name="email" type="email" required className="minimal-input" placeholder="john@company.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
                  <input name="department" type="text" className="minimal-input" placeholder="ESG" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role</label>
                  <input name="role" type="text" className="minimal-input" placeholder="Director" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">LinkedIn Profile URL</label>
                <input name="linkedinUrl" type="url" className="minimal-input" placeholder="https://linkedin.com/in/username" />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Branch (Optional)</label>
                <select name="branchId" className="minimal-input">
                  <option value="">No specific branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddContact(false)} className="minimal-button-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">{isSubmitting ? 'Saving...' : '+ NEW'}</button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit Contact Modal */}
        {editingContact && (
          <Modal isOpen={true} title="Edit Stakeholder" onClose={() => setEditingContact(null)}>
            <form onSubmit={handleUpdateContact} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input name="name" type="text" required className="minimal-input" placeholder="John Doe" defaultValue={editingContact.name} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input name="email" type="email" required className="minimal-input" placeholder="john@company.com" defaultValue={editingContact.email} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
                  <input name="department" type="text" className="minimal-input" placeholder="ESG" defaultValue={editingContact.department} />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role</label>
                  <input name="role" type="text" className="minimal-input" placeholder="Director" defaultValue={editingContact.role} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">LinkedIn Profile URL</label>
                <input name="linkedinUrl" type="url" className="minimal-input" placeholder="https://linkedin.com/in/username" defaultValue={editingContact.linkedinUrl} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Branch (Optional)</label>
                <select name="branchId" className="minimal-input" defaultValue={editingContact.branchId || ""}>
                  <option value="">No specific branch</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingContact(null)} className="minimal-button-secondary flex-1">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">{isSubmitting ? 'Saving...' : 'Update'}</button>
              </div>
            </form>
          </Modal>
        )}

        {/* Edit Branch Modal */}
        {editingBranch && (
          <Modal
            isOpen={true}
            title={t.customers.editBranchModalTitle}
            onClose={() => setEditingBranch(null)}
            showFooterClose={false}
            showHeaderClose={false}
          >
            <form onSubmit={handleUpdateBranch} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.customers.branchNameLabel}</label>
                <input name="name" type="text" required className="minimal-input" placeholder={t.customers.branchNamePlaceholder} defaultValue={editingBranch.name} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.customers.branchTypeLabel}</label>
                <input name="type" type="text" className="minimal-input" placeholder={t.customers.branchTypePlaceholder} defaultValue={editingBranch.type} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.customers.branchLocationOptionalLabel}</label>
                <input name="address" type="text" className="minimal-input" placeholder={t.customers.branchLocationSinglePlaceholder} defaultValue={editingBranch.address} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingBranch(null)} className="minimal-button-secondary flex-1">{t.common.cancel}</button>
                <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">{isSubmitting ? t.common.saving : t.common.update}</button>
              </div>
            </form>
          </Modal>
        )}

        {/* Add Branch Modal */}
        {showAddBranch && (
          <Modal
            isOpen={true}
            title={t.customers.addBranchModalTitle}
            onClose={() => setShowAddBranch(false)}
            showFooterClose={false}
            showHeaderClose={false}
          >
            <form onSubmit={handleCreateBranch} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.customers.branchNameLabel}</label>
                <input name="name" type="text" required className="minimal-input" placeholder={t.customers.branchNamePlaceholder} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.customers.branchTypeLabel}</label>
                <input name="type" type="text" className="minimal-input" placeholder={t.customers.branchTypePlaceholder} />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">{t.customers.branchAddressLabel}</label>
                <textarea name="address" className="minimal-input h-20" placeholder={t.customers.branchAddressTextareaPlaceholder} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowAddBranch(false)} className="minimal-button-secondary flex-1">{t.common.cancel}</button>
                <button type="submit" disabled={isSubmitting} className="minimal-button-primary flex-1">{isSubmitting ? t.common.saving : t.customers.addBranchSubmit}</button>
              </div>
            </form>
          </Modal>
        )}

        {/* Launch Project Modal */}
        {showLaunchProject && (
          <Modal
            isOpen={true}
            showFooterClose={false}
            title={t.projects.launchModalTitle}
            onClose={() => setShowLaunchProject(false)}
          >
            <form onSubmit={handleLaunchProject} className="space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t.projects.launchModalProjectTitle}
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  className="minimal-input"
                  defaultValue={`${selectedCustomer?.name} - GRI ${new Date().getFullYear()} Report`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t.projects.launchModalCategoryLabel}
                </label>
                <input type="hidden" name="category" value="Project" />
                <select
                  disabled
                  value="Project"
                  className="minimal-input cursor-not-allowed bg-slate-50 text-slate-700 opacity-90"
                  aria-readonly="true"
                >
                  <option value="Project">{t.projects.launchModalCategoryProject}</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  {t.projects.launchModalSelectDataset}{' '}
                  <span className="font-medium normal-case tracking-normal text-slate-400">
                    ({t.common.optional})
                  </span>
                </label>
                <select
                  key={`${selectedCustomer?.id || 'none'}-${launchCategory}`}
                  name="templateId"
                  className="minimal-input"
                  defaultValue=""
                >
                  <option value="">{t.projects.launchModalSelectPlaceholderOptional}</option>
                  {launchTemplates.length === 0 ? (
                    <option disabled>{t.projects.launchModalNoTemplates}</option>
                  ) : (
                    launchTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))
                  )}
                </select>
                {launchTemplates.length === 0 && (
                  <p className="text-[10px] text-slate-500 mt-1 font-medium">
                    {t.projects.launchModalNoTemplatesOptionalHint}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowLaunchProject(false)}
                  className="minimal-button-secondary flex-1"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="minimal-button-primary flex-1"
                >
                  {isSubmitting
                    ? t.projects.launchModalLaunching
                    : t.projects.launchModalInitialize}
                </button>
              </div>
            </form>
          </Modal>
        )}

        <EditCustomerModal
          customer={editingCustomer}
          sectors={availableSectors}
          isOpen={!!editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSaved={(merged) => {
            if (selectedCustomer?.id === merged.id) {
              setSelectedCustomer(merged);
            }
            loadCustomers();
          }}
        />

      </>
      <PageHelpFullModal
        helpUrl={settings.helpCustomersUrl || ''}
        helpMd={settings.helpCustomersMd || ''}
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        labels={{
          guidance: t.dashboard.guidance,
          dontShowOnFirstOpen: t.dashboard.dontShowOnFirstOpen,
          interactiveTutorial: t.dashboard.interactiveTutorial,
          noVideo: t.dashboard.noVideo,
        }}
      />

      <Modal
        isOpen={modal.isOpen}
        onClose={() => setModal(prev => ({ ...prev, isOpen: false }))}
        title={modal.title}
        description={modal.description}
        type={modal.type}
        onConfirm={modal.onConfirm}
      />
    </div>
  );
}



