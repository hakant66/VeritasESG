/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Building, 
  Loader2,
  Edit2
} from 'lucide-react';
import * as DB from '../../services/db';
import { Customer, Contact, Branch, Project, PlatformUser, ProjectUserAssignment, Segment } from '../../types';
import { useAuth } from '../../lib/AuthContext';
import { getSectorIcon } from '../../lib/sectorIcons';
import { useTranslation } from '../../hooks/useTranslation';
import { EditCustomerModal } from '../../components/customer/EditCustomerModal';
import { CustomerProfileDataSections } from '../../components/customer/CustomerProfileDataSections';

export default function CustomerProfilePage() {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  const { t } = useTranslation();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectUsers, setProjectUsers] = useState<PlatformUser[]>([]);
  const [availableSectors, setAvailableSectors] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditCustomerModal, setShowEditCustomerModal] = useState(false);

  const canEditCustomerInModal =
    profile?.role === 'platform_admin' || profile?.role === 'consultant_manager';

  const [collapsed, setCollapsed] = useState({
    basicInfo: false,
    projects: false,
    projectUsers: false,
    stakeholders: false,
    facilities: false,
    sectorInfo: false,
    reporting: false,
    esgSummary: false,
  });

  const goBackToCustomerDirectory = () => {
    if (customerId) {
      navigate('/customer-directory', { state: { expandCustomerId: customerId } });
    } else {
      navigate('/customer-directory');
    }
  };

  useEffect(() => {
    if (customerId) {
      loadCustomerData();
    }
  }, [customerId]);

  async function loadCustomerData() {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const [cData, sectorsList] = await Promise.all([
        DB.customers.get(customerId, true),
        DB.segments.list()
      ]);

      if (!cData) {
        setError(t.customers.customerNotFound);
        return;
      }

      setCustomer(cData);
      setAvailableSectors(sectorsList);

      const [cList, bList, pSnap, puSnap] = await Promise.all([
        DB.contacts.listByCustomer(customerId),
        DB.branches.listByCustomer(customerId),
        DB.getDocs(DB.query(DB.getCol('projects'), DB.where('customerId', '==', customerId))),
        DB.getDocs(DB.getCol('projectUserAssignments'))
      ]);

      setContacts(cList);
      setBranches(bList);
      
      const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() } as Project));
      setProjects(pList);

      if (pList.length > 0) {
        const projectIds = pList.map(p => p.id);
        const relevantAssignments = puSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as ProjectUserAssignment))
          .filter(a => projectIds.includes(a.projectId));
        
        const userIds = Array.from(new Set(relevantAssignments.map(a => a.userId)));
        if (userIds.length > 0) {
          const userPromises = userIds.map(uid => DB.platformUsers.get(uid));
          const usersRes = await Promise.all(userPromises);
          setProjectUsers(usersRes.filter((u): u is PlatformUser => u !== null));
        } else {
          setProjectUsers([]);
        }
      } else {
        setProjectUsers([]);
      }

    } catch (err) {
      console.error("Failed to load customer profile:", err);
      setError(t.customers.profileLoadFailed);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-slate-400" size={32} />
          <p className="text-slate-500 font-medium">{t.customers.loadingProfile}</p>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 w-full max-w-none text-center space-y-4">
        <Building size={48} className="mx-auto text-slate-200" />
        <h1 className="text-2xl font-bold text-slate-900">{error || t.customers.customerNotFound}</h1>
        <Link
          to="/customer-directory"
          state={customerId ? { expandCustomerId: customerId } : undefined}
          className="inline-flex items-center gap-2 text-blue-600 hover:underline"
        >
          <ChevronLeft size={16} /> {t.customers.backToCustomers}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 w-full max-w-none space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-100 mb-2">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={goBackToCustomerDirectory}
            title={t.customers.backToCustomers}
            aria-label={t.customers.backToCustomers}
            className="p-2 hover:bg-white rounded-xl text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-5">
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">{customer.name}</h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-3">
                {(customer.sectorIds || []).map(sid => {
                  const s = availableSectors.find(as => as.id === sid);
                  return (
                    <span key={sid} className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {s?.name || sid}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
              {customer.logoUrl ? (
                <img src={customer.logoUrl} alt={customer.name} className="h-full w-full object-contain" referrerPolicy="no-referrer" />
              ) : (
                (() => {
                  const Icon = getSectorIcon((customer.sectorIds || [])[0] || '');
                  return <Icon size={32} className="text-slate-400" />;
                })()
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {canEditCustomerInModal && (
            <button
              type="button"
              onClick={() => setShowEditCustomerModal(true)}
              title={t.customers.editCustomerTooltip}
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              <Edit2 size={16} />
              {t.common.edit}
            </button>
          )}
          {isAdmin && !canEditCustomerInModal && (
            <Link
              to={`/customers`}
              state={{ selectedId: customer.id }}
              className="px-6 py-2.5 bg-slate-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm text-center"
            >
              {t.customers.manageData}
            </Link>
          )}
        </div>
      </header>

      <CustomerProfileDataSections
        customer={customer}
        contacts={contacts}
        branches={branches}
        projects={projects}
        projectUsers={projectUsers}
        availableSectors={availableSectors}
        collapsed={collapsed}
        onToggle={(key) => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
      />

      <EditCustomerModal
        customer={customer}
        sectors={availableSectors}
        isOpen={showEditCustomerModal}
        onClose={() => setShowEditCustomerModal(false)}
        onSaved={(merged) => setCustomer(merged)}
      />
    </div>
  );
}
