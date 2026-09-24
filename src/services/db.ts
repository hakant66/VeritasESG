/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as Types from '../types';
import { sortQuestionsBySheetAndNumara } from '../lib/compareTemplateQuestions';
import { ApiClientError, apiRequest } from '../lib/apiClient';
import {
  insertAssigneeNoteAfterIndex,
  normalizeAnswerAssigneeNotes,
} from '../lib/answerAssigneeNotes';
import { normalizePlatformRole } from '../lib/platformRoles.ts';

type CompatCollectionRef = { path: string };
type CompatDocRef = { path: string; id: string; collectionPath: string };
type CompatWhere = { type: 'where'; field: string; op: string; value: unknown };
type CompatOrderBy = { type: 'orderBy'; field: string; direction?: 'asc' | 'desc' };
type CompatLimit = { type: 'limit'; value: number };
type CompatQuery = { collectionRef: CompatCollectionRef; constraints: Array<CompatWhere | CompatOrderBy | CompatLimit> };

export const db = { provider: 'mongo-compat' };

const randomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
};

function mapCollectionPath(path: string) {
  const parts = path.split('/').filter(Boolean);
  const parent: Record<string, string> = {};

  if (parts[0] === 'customers' && parts[2] === 'contacts') {
    parent.customerId = parts[1];
    return { resource: 'contacts', parent };
  }
  if (parts[0] === 'customers' && parts[2] === 'branches') {
    parent.customerId = parts[1];
    return { resource: 'branches', parent };
  }
  if (parts[0] === 'projects' && parts[2] === 'pages') {
    parent.projectId = parts[1];
    return { resource: 'projectPages', parent };
  }
  if (parts[0] === 'projects' && parts[2] === 'answers') {
    parent.projectId = parts[1];
    return { resource: 'answers', parent };
  }
  if (parts[0] === 'projects' && parts[2] === 'assignments') {
    parent.projectId = parts[1];
    return { resource: 'assignments', parent };
  }
  if (parts[0] === 'knowledgeBases' && parts[2] === 'documents') {
    parent.kbId = parts[1];
    return { resource: 'kbDocuments', parent };
  }

  return { resource: parts[0], parent };
}

function mapDocPath(path: string) {
  const parts = path.split('/').filter(Boolean);
  const id = parts[parts.length - 1];
  const collectionPath = parts.slice(0, -1).join('/');
  return { ...mapCollectionPath(collectionPath), id, collectionPath };
}

function queryParamsFromConstraints(collectionPath: string, constraints: Array<CompatWhere | CompatOrderBy | CompatLimit>) {
  const { parent } = mapCollectionPath(collectionPath);
  const params: Record<string, string | number | boolean | undefined> = { ...parent };

  constraints.forEach((constraint) => {
    if (constraint.type === 'limit') params.limit = constraint.value;
    if (constraint.type === 'where') {
      if (constraint.field === '__name__' && constraint.op === 'in' && Array.isArray(constraint.value)) {
        params.ids = constraint.value.join(',');
      } else if (constraint.field === '__name__' && constraint.op === '==') {
        params.ids = String(constraint.value);
      } else if (constraint.op === '==') {
        params[constraint.field] = String(constraint.value);
      }
    }
  });

  return params;
}

function makeDocSnapshot<T>(id: string, data: T | null, collectionPath = '') {
  return {
    id,
    ref: { id, path: collectionPath ? `${collectionPath}/${id}` : id, collectionPath },
    exists: () => Boolean(data),
    data: () => data,
  };
}

function makeQuerySnapshot<T extends { id: string }>(items: T[], collectionPath: string) {
  const docs = items.map((item) => makeDocSnapshot(item.id, item, collectionPath));
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: ReturnType<typeof makeDocSnapshot<T>>) => void) => docs.forEach(callback),
  };
}

export const collection = (rootOrRef: unknown, path: string): CompatCollectionRef => {
  const root = rootOrRef as Partial<CompatCollectionRef>;
  return { path: root?.path ? `${root.path}/${path}` : path };
};

export const collectionGroup = (_root: unknown, groupName: string): CompatCollectionRef => ({ path: groupName });

export const doc = (rootOrRef: unknown, pathOrId?: string, maybeId?: string): CompatDocRef => {
  const root = rootOrRef as Partial<CompatCollectionRef>;
  let path = '';

  if (root?.path && !maybeId) {
    path = `${root.path}/${pathOrId || randomId()}`;
  } else if (root?.path && maybeId) {
    path = `${root.path}/${pathOrId}/${maybeId}`;
  } else if (maybeId) {
    path = `${pathOrId}/${maybeId}`;
  } else {
    path = pathOrId || randomId();
  }

  const mapped = mapDocPath(path);
  return { path, id: mapped.id, collectionPath: mapped.collectionPath };
};

export const where = (field: string, op: string, value: unknown): CompatWhere => ({ type: 'where', field, op, value });
export const orderBy = (field: string, direction?: 'asc' | 'desc'): CompatOrderBy => ({ type: 'orderBy', field, direction });
export const limit = (value: number): CompatLimit => ({ type: 'limit', value });
export const documentId = () => '__name__';
export const Timestamp = { now: () => new Date(), fromDate: (date: Date) => date };

export const query = (collectionRef: CompatCollectionRef, ...constraints: Array<CompatWhere | CompatOrderBy | CompatLimit>): CompatQuery => ({
  collectionRef,
  constraints,
});

export async function getDocs<T extends { id: string } = any>(target: CompatCollectionRef | CompatQuery) {
  const collectionRef = 'collectionRef' in target ? target.collectionRef : target;
  const constraints = 'constraints' in target ? target.constraints : [];
  const { resource } = mapCollectionPath(collectionRef.path);
  const raw = await apiList<T | { items?: T[] }>(
    resource,
    queryParamsFromConstraints(collectionRef.path, constraints),
  );
  const items = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { items?: T[] })?.items)
      ? ((raw as { items: T[] }).items)
      : [];
  return makeQuerySnapshot(items as T[], collectionRef.path);
}

export async function getDoc<T = any>(docRef: CompatDocRef) {
  const { resource, id } = mapDocPath(docRef.path);
  const data = await apiGet<T>(resource, id);
  return makeDocSnapshot(id, data, docRef.collectionPath);
}

export async function addDoc<T = any>(collectionRef: CompatCollectionRef, data: Record<string, unknown>) {
  const { resource, parent } = mapCollectionPath(collectionRef.path);
  return await apiCreate<T & { id: string }>(resource, { ...data, ...parent });
}

export async function setDoc<T = any>(docRef: CompatDocRef, data: Record<string, unknown>, options?: { merge?: boolean }) {
  const { resource, id } = mapDocPath(docRef.path);
  const { parent } = mapCollectionPath(docRef.collectionPath);
  const body = { ...data, ...parent };

  if (options?.merge) {
    try {
      return await apiUpdate<T>(resource, id, body);
    } catch (error: any) {
      if (error.status !== 404) throw error;
    }
  }

  return await apiRequest<T>(`/api/db/${resource}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function updateDoc<T = any>(docRef: CompatDocRef, data: Record<string, unknown>) {
  const { resource, id } = mapDocPath(docRef.path);
  return await apiUpdate<T>(resource, id, data);
}

export async function deleteDoc(docRef: CompatDocRef) {
  const { resource, id } = mapDocPath(docRef.path);
  return await apiDelete(resource, id);
}

export function writeBatch(_dbRef: unknown) {
  const operations: Array<() => Promise<unknown>> = [];

  return {
    set: (docRef: CompatDocRef, data: Record<string, unknown>) => operations.push(() => setDoc(docRef, data)),
    update: (docRef: CompatDocRef, data: Record<string, unknown>) => operations.push(() => updateDoc(docRef, data)),
    delete: (docRef: CompatDocRef) => operations.push(() => deleteDoc(docRef)),
    commit: async () => {
      for (const operation of operations) await operation();
    },
  };
}

export async function getCountFromServer(target: CompatCollectionRef | CompatQuery) {
  const snap = await getDocs(target);
  return { data: () => ({ count: snap.size }) };
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (error instanceof ApiClientError) {
    throw error;
  }

  const err = error as any;
  const isQuotaError = err?.message?.includes('Quota exceeded') || err?.code === 'resource-exhausted';
  
  const errInfo: FirestoreErrorInfo = {
    error: isQuotaError ? 'Firebase Quota Exceeded. Please check your project usage.' : (error instanceof Error ? error.message : String(error)),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
    },
    operationType,
    path
  };
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generic CRUD helpers
export const getCol = (path: string) => collection(db, path);

export const generateId = () => randomId();

// Internal cache to conserve quota with session persistence helper
const getSessionCache = (key: string) => {
  const stored = sessionStorage.getItem(`cache_${key}`);
  if (!stored) return null;
  try {
    const { data, ts } = JSON.parse(stored);
    if (Date.now() - ts < 300000) return data; // 5 min session cache
  } catch { return null; }
  return null;
};

const setSessionCache = (key: string, data: any) => {
  try {
    sessionStorage.setItem(`cache_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) { console.warn("Session cache failed", e); }
};

const cache = {
  segments: getSessionCache('segments') as Types.Segment[] | null,
  sectorCategories: getSessionCache('sectorCategories') as any[] | null,
  customers: getSessionCache('customers') as Types.Customer[] | null,
  platformUsers: getSessionCache('platformUsers') as Types.PlatformUser[] | null,
  projects: getSessionCache('projects') as Types.Project[] | null,
  translations: getSessionCache('translations') as Types.Translation[] | null,
  templatesBySegment: {} as Record<string, { data: Types.Template[], ts: number }>,
  documents: new Map<string, { data: any, ts: number }>(),
  lastFetch: {} as Record<string, number>
};

const CACHE_TTL = 60000; // 60 seconds

const queryString = (params: Record<string, string | number | boolean | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') search.set(key, String(value));
  });
  const value = search.toString();
  return value ? `?${value}` : '';
};

const apiList = <T,>(resource: string, params: Record<string, string | number | boolean | undefined> = {}) =>
  apiRequest<T[]>(`/api/db/${resource}${queryString(params)}`);

const apiGet = async <T,>(resource: string, id: string | undefined) => {
  if (!id) return null;
  try {
    return await apiRequest<T>(`/api/db/${resource}/${id}`);
  } catch (error: any) {
    if (error.status === 404) return null;
    throw error;
  }
};

const apiCreate = <T,>(resource: string, data: Record<string, unknown>) =>
  apiRequest<T>(`/api/db/${resource}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

const apiBulkCreate = <T,>(resource: string, items: Record<string, unknown>[]) =>
  apiRequest<T[]>(`/api/db/${resource}/bulk`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });

const apiUpdate = <T,>(resource: string, id: string, data: Record<string, unknown>) =>
  apiRequest<T>(`/api/db/${resource}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

const apiDelete = (resource: string, id: string) =>
  apiRequest<{ id: string }>(`/api/db/${resource}/${id}`, {
    method: 'DELETE',
  });

const cleanData = <T extends Record<string, unknown>>(data: T) =>
  Object.entries(data).reduce((acc, [key, value]) => {
    if (value !== undefined) acc[key] = value;
    return acc;
  }, {} as Record<string, unknown>);

function mapAnswerApiResponse(
  saved: Types.Answer & { legacyFirebaseId?: string },
): Types.Answer {
  const legacy = saved.legacyFirebaseId?.trim();
  return legacy ? { ...saved, id: legacy } : saved;
}

function isMissingDedicatedAnswerRoute(err: unknown): boolean {
  return (
    err instanceof ApiClientError &&
    (err.status === 404 || err.status === 405)
  );
}

async function fetchAnswerByExternalId(answerId: string): Promise<Types.Answer | null> {
  try {
    const doc = await apiRequest<Types.Answer & { legacyFirebaseId?: string }>(
      `/api/db/answers/${encodeURIComponent(answerId)}`,
    );
    return mapAnswerApiResponse(doc);
  } catch (err) {
    if (err instanceof ApiClientError && err.status === 404) return null;
    throw err;
  }
}

async function upsertAnswerRecord(
  projectId: string,
  data: {
    assignmentId: string;
    questionId: string;
    contactId: string;
    latestAnswer?: string;
    comment?: string;
    answerNotes?: Types.AnswerAssigneeNote[];
    evidenceName?: string;
    submittedByUserId?: string;
    onBehalfOfUserId?: string;
    workflowStatus?: Types.QuestionWorkflowStatus;
    submittedAt?: number;
  },
): Promise<Types.Answer> {
  const now = Date.now();
  const body = cleanData({
    projectId,
    assignmentId: data.assignmentId,
    questionId: data.questionId,
    contactId: data.contactId,
    latestAnswer: data.latestAnswer ?? '',
    comment: data.comment ?? '',
    answerNotes: data.answerNotes,
    evidenceName: data.evidenceName,
    submittedByUserId: data.submittedByUserId,
    onBehalfOfUserId: data.onBehalfOfUserId,
    workflowStatus: data.workflowStatus,
    updatedAt: now,
    submittedAt: data.submittedAt ?? now,
  }) as Record<string, unknown>;

  const saved = await apiRequest<Types.Answer & { legacyFirebaseId?: string }>(
    '/api/db/answers/upsert',
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );
  return mapAnswerApiResponse(saved);
}

export const domains = {
  list: async () => {
    try {
      return (await apiList<Types.Domain>('domains')).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'domains');
      return [];
    }
  },
  create: async (
    name: string,
    description?: string,
    category: Types.DomainCategory = 'esg',
  ) => {
    try {
      return await apiCreate<Types.Domain>('domains', {
        name,
        description: description || '',
        category,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'domains');
    }
  },
  delete: async (id: string) => {
    try {
      return await apiDelete('domains', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `domains/${id}`);
    }
  },
  update: async (
    id: string,
    data: { name?: string; description?: string; category?: Types.DomainCategory },
  ) => {
    try {
      return await apiUpdate<Types.Domain>('domains', id, cleanData(data as Record<string, unknown>));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `domains/${id}`);
    }
  },
};

export const segments = {
  list: async (forceFetch = false) => {
    if (!forceFetch && cache.segments && (Date.now() - (cache.lastFetch.segments || 0) < CACHE_TTL)) {
      return cache.segments;
    }
    try {
      const data = (await apiList<Types.Segment>('segments')).sort((a, b) => a.name.localeCompare(b.name));
      cache.segments = data;
      cache.lastFetch.segments = Date.now();
      setSessionCache('segments', data);
      return data;
    } catch (error) {
      if (cache.segments) return cache.segments; // Fallback to stale if error
      handleFirestoreError(error, OperationType.LIST, 'segments');
      return [];
    }
  },
  migrateFromSectors: async () => {
    return { count: 0 };
  },
  create: async (name: string, type: string = 'Customer Sector') => {
    try {
      const res = await apiCreate<Types.Segment>('segments', { 
        name, 
        type,
      });
      cache.segments = null;
      sessionStorage.removeItem('cache_segments');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'segments');
    }
  },
  update: async (id: string, name: string) => {
    try {
      const res = await apiUpdate<Types.Segment>('segments', id, { name });
      cache.segments = null;
      sessionStorage.removeItem('cache_segments');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `segments/${id}`);
    }
  },
  delete: async (id: string) => {
    try {
      const res = await apiDelete('segments', id);
      cache.segments = null;
      sessionStorage.removeItem('cache_segments');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `segments/${id}`);
    }
  }
};

export const templates = {
  listBySector: async (sectorId: string, forceFetch = false) => {
    if (!forceFetch && cache.templatesBySegment[sectorId] && Date.now() - cache.templatesBySegment[sectorId].ts < CACHE_TTL) {
      return cache.templatesBySegment[sectorId].data;
    }
    try {
      const data = (await apiList<Types.Template>('templates', { sectorId }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      cache.templatesBySegment[sectorId] = { data, ts: Date.now() };
      return data;
    } catch (error) {
      if (cache.templatesBySegment[sectorId]) return cache.templatesBySegment[sectorId].data;
      handleFirestoreError(error, OperationType.LIST, 'templates');
      return [];
    }
  },
  create: async (data: Omit<Types.Template, 'id' | 'createdAt'>) => {
    try {
      return await apiCreate<Types.Template>('templates', data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'templates');
    }
  },
  get: async (id: string | undefined) => {
    if (!id) return null;
    try {
      return await apiGet<Types.Template>('templates', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `templates/${id}`);
      return null;
    }
  },
  listAll: async (forceFetch = false) => {
    if (!forceFetch && cache.templatesBySegment['__all__'] && Date.now() - cache.templatesBySegment['__all__'].ts < CACHE_TTL) {
      return cache.templatesBySegment['__all__'].data;
    }
    try {
      const data = (await apiList<Types.Template>('templates', { limit: 1000 })).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0),
      );
      cache.templatesBySegment['__all__'] = { data, ts: Date.now() };
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'templates-all');
      return [];
    }
  },
  update: async (id: string, data: Partial<Types.Template>) => {
    try {
      const res = await apiUpdate<Types.Template>('templates', id, cleanData(data as Record<string, unknown>));
      cache.templatesBySegment = {};
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `templates/${id}`);
    }
  },
};

export const sectorCategories = {
  list: async (forceFetch = false) => {
    if (!forceFetch && cache.sectorCategories && (Date.now() - (cache.lastFetch.sectorCategories || 0) < CACHE_TTL)) {
      return cache.sectorCategories;
    }
    try {
      const data = (await apiList<any>('sectorCategories')).sort((a, b) => (a.order || 0) - (b.order || 0));
      cache.sectorCategories = data;
      cache.lastFetch.sectorCategories = Date.now();
      setSessionCache('sectorCategories', data);
      return data;
    } catch (error) {
      if (cache.sectorCategories) return cache.sectorCategories;
      handleFirestoreError(error, OperationType.LIST, 'sectorCategories');
      return [];
    }
  },
  create: async (data: any) => {
    try {
      const res = await apiCreate<any>('sectorCategories', data);
      cache.sectorCategories = null;
      sessionStorage.removeItem('cache_sectorCategories');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sectorCategories');
    }
  },
  update: async (id: string, data: any) => {
    try {
      const res = await apiUpdate<any>('sectorCategories', id, cleanData(data as Record<string, unknown>));
      cache.sectorCategories = null;
      sessionStorage.removeItem('cache_sectorCategories');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `sectorCategories/${id}`);
    }
  },
  delete: async (id: string) => {
    try {
      const res = await apiDelete('sectorCategories', id);
      cache.sectorCategories = null;
      sessionStorage.removeItem('cache_sectorCategories');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sectorCategories/${id}`);
    }
  },
  bulkCreate: async (items: any[]) => {
    try {
      const created: any[] = [];
      for (const item of items) {
        const res = await apiCreate<any>('sectorCategories', item);
        if (res) created.push(res);
      }
      cache.sectorCategories = null;
      sessionStorage.removeItem('cache_sectorCategories');
      return created;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'sectorCategories');
      return [];
    }
  },
};

export const questions = {
  listByTemplate: async (templateId: string | undefined) => {
    if (!templateId) return [];
    try {
      // Server caps `limit`; omitting it defaulted to 100 and hid most template questions after large imports.
      const rows = await apiList<Types.Question>('questions', { templateId, limit: 5000 });
      return sortQuestionsBySheetAndNumara(rows);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'questions');
      return [];
    }
  },
  bulkCreate: async (questionsList: Omit<Types.Question, 'id'>[]) => {
    try {
      await apiBulkCreate<Types.Question>('questions', questionsList.map((q, index) => ({
        ...q,
        order: q.order !== undefined ? q.order : index,
      })));
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'questions');
    }
  },
  listAll: async () => {
    try {
      return await apiList<Types.Question>('questions', { limit: 5000 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'questions-all');
      return [];
    }
  },
  update: async (id: string, data: Partial<Types.Question>) => {
    try {
      return await apiUpdate<Types.Question>('questions', id, cleanData(data as Record<string, unknown>));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `questions/${id}`);
    }
  },
  /** Project-scoped copies when present; otherwise template questions (legacy projects). */
  listForProject: async (
    projectId: string,
    templateId: string | undefined,
  ): Promise<Types.Question[]> => {
    const projectQs = await projectQuestions.listByProject(projectId);
    if (projectQs.length > 0) {
      return projectQs.map((pq) => ({
        ...pq,
        templateId: pq.sourceTemplateId,
        sourceQuestionId: pq.sourceQuestionId,
        projectId: pq.projectId,
      })) as Types.Question[];
    }
    return questions.listByTemplate(templateId);
  },
};

export const projectQuestions = {
  listByProject: async (projectId: string) => {
    if (!projectId) return [];
    try {
      return (await apiList<Types.ProjectQuestion>('projectQuestions', {
        projectId,
        limit: 5000,
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'projectQuestions');
      return [];
    }
  },
  create: async (data: Omit<Types.ProjectQuestion, 'id'>) => {
    try {
      return await apiCreate<Types.ProjectQuestion>(
        'projectQuestions',
        cleanData(data as Record<string, unknown>),
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projectQuestions');
    }
  },
  update: async (id: string, data: Partial<Types.ProjectQuestion>) => {
    try {
      return await apiUpdate<Types.ProjectQuestion>(
        'projectQuestions',
        id,
        cleanData(data as Record<string, unknown>),
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projectQuestions/${id}`);
    }
  },
};

export const customers = {
  list: async (forceFetch = false, customerId?: string) => {
    if (!forceFetch && !customerId && cache.customers && Date.now() - (cache.lastFetch.customers || 0) < CACHE_TTL) {
      return cache.customers;
    }
    try {
      const data = customerId
        ? [await apiGet<Types.Customer>('customers', customerId)].filter(Boolean) as Types.Customer[]
        : await apiList<Types.Customer>('customers', { limit: 100 });
      if (!customerId) {
        cache.customers = data;
        cache.lastFetch.customers = Date.now();
        setSessionCache('customers', data);
      }
      return data;
    } catch (error) {
      if (cache.customers) return cache.customers;
      handleFirestoreError(error, OperationType.LIST, 'customers');
      return [];
    }
  },
  /** Full customer list for admin / seed (bypasses 100-row default on `list`). */
  listAll: async () => {
    try {
      return await apiList<Types.Customer>('customers', { limit: 500 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'customers-all');
      return [];
    }
  },
  get: async (id: string, forceFetch = false) => {
    const cacheKey = `customers/${id}`;
    if (!forceFetch && cache.documents.has(cacheKey)) {
      const entry = cache.documents.get(cacheKey)!;
      if (Date.now() - entry.ts < CACHE_TTL) return entry.data;
    }
    try {
      const data = await apiGet<Types.Customer>('customers', id);
      if (!data) return null;
      cache.documents.set(cacheKey, { data, ts: Date.now() });
      return data;
    } catch (error) {
      if (cache.documents.has(cacheKey)) return cache.documents.get(cacheKey)!.data;
      handleFirestoreError(error, OperationType.GET, `customers/${id}`);
      return null;
    }
  },
  create: async (data: Omit<Types.Customer, 'id' | 'createdAt'>) => {
    try {
      const res = await apiCreate<Types.Customer>('customers', data as any);
      cache.customers = null; // Invalidate cache
      sessionStorage.removeItem('cache_customers');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customers');
    }
  },
  update: async (id: string, data: Partial<Types.Customer>) => {
    try {
      const res = await apiUpdate<Types.Customer>('customers', id, cleanData(data as any));
      cache.customers = null; // Invalidate cache
      sessionStorage.removeItem('cache_customers');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
    }
  },
  delete: async (id: string) => {
    try {
      const res = await apiDelete('customers', id);
      cache.customers = null; // Invalidate cache
      sessionStorage.removeItem('cache_customers');
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
    }
  }
};

export const contacts = {
  listByCustomer: async (customerId: string) => {
    try {
      return await apiList<Types.Contact>('contacts', { customerId, limit: 1000 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `customers/${customerId}/contacts`);
      return [];
    }
  },
  create: async (customerId: string, data: Omit<Types.Contact, 'id' | 'customerId' | 'createdAt'>) => {
    try {
      return await apiCreate<Types.Contact>('contacts', { 
        ...data, 
        customerId, 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `customers/${customerId}/contacts`);
    }
  },
  update: async (customerId: string, contactId: string, data: Partial<Types.Contact>) => {
    try {
      await apiUpdate<Types.Contact>('contacts', contactId, cleanData(data as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${customerId}/contacts/${contactId}`);
    }
  },
  delete: async (customerId: string, contactId: string) => {
    try {
      await apiDelete('contacts', contactId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${customerId}/contacts/${contactId}`);
    }
  },
  listAll: async () => {
    try {
      return await apiList<Types.Contact>('contacts', { limit: 1000 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'contacts-all');
      return [];
    }
  }
};

export const branches = {
  listByCustomer: async (customerId: string) => {
    try {
      return await apiList<Types.Branch>('branches', { customerId, limit: 1000 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `customers/${customerId}/branches`);
      return [];
    }
  },
  create: async (customerId: string, data: Omit<Types.Branch, 'id' | 'customerId' | 'createdAt'>) => {
    try {
      return await apiCreate<Types.Branch>('branches', {
        ...data,
        customerId,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `customers/${customerId}/branches`);
    }
  },
  update: async (customerId: string, branchId: string, data: Partial<Types.Branch>) => {
    try {
      await apiUpdate<Types.Branch>('branches', branchId, cleanData(data as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${customerId}/branches/${branchId}`);
    }
  },
  delete: async (customerId: string, branchId: string) => {
    try {
      await apiDelete('branches', branchId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${customerId}/branches/${branchId}`);
    }
  }
};

export const projects = {
  list: async (
    userId?: string,
    customerId?: string,
    forceFetch = false,
    memberRole?: Types.ProjectUserAssignment['role'],
  ) => {
    if (!forceFetch && !userId && !customerId && !memberRole && cache.projects && Date.now() - (cache.lastFetch.projects || 0) < CACHE_TTL) {
      return cache.projects;
    }
    try {
      if (userId) {
        const assignmentQuery: Record<string, string | number> = { userId, limit: 100 };
        if (memberRole) assignmentQuery.role = memberRole;
        const assignments = await apiList<Types.ProjectUserAssignment>(
          'projectUserAssignments',
          assignmentQuery,
        );
        const projectIds = assignments.map(d => d.projectId);
        
        let localProjects: Types.Project[] = [];

        if (projectIds.length > 0) {
          localProjects = await apiList<Types.Project>('projects', { ids: projectIds.join(','), limit: 100 });
        }

        if (customerId && !memberRole) {
          const customerProjects = await apiList<Types.Project>('projects', { customerId, limit: 100 });
          
          const combined = [...localProjects, ...customerProjects];
          return Array.from(new Map(combined.map(p => [p.id, p])).values())
            .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        }

        return localProjects;
      }

      if (customerId) {
        return await apiList<Types.Project>('projects', { customerId, limit: 100 });
      }

      const data = await apiList<Types.Project>('projects', { limit: 100 });
      
      if (!userId && !customerId) {
        cache.projects = data;
        cache.lastFetch.projects = Date.now();
        setSessionCache('projects', data);
      }
      return data;
    } catch (error) {
      if (!userId && !customerId && cache.projects) return cache.projects;
      handleFirestoreError(error, OperationType.LIST, 'projects');
      return [];
    }
  },
  get: async (id: string, forceFetch = false) => {
    const cacheKey = `projects/${id}`;
    if (!forceFetch && cache.documents.has(cacheKey)) {
      const entry = cache.documents.get(cacheKey)!;
      if (Date.now() - entry.ts < CACHE_TTL) return entry.data;
    }
    try {
      const data = await apiGet<Types.Project>('projects', id);
      if (!data) return null;
      cache.documents.set(cacheKey, { data, ts: Date.now() });
      return data;
    } catch (error) {
      if (cache.documents.has(cacheKey)) return cache.documents.get(cacheKey)!.data;
      handleFirestoreError(error, OperationType.GET, `projects/${id}`);
      return null;
    }
  },
  update: async (id: string, data: Partial<Types.Project>) => {
    try {
      const res = await apiUpdate<Types.Project>('projects', id, cleanData(data as any));
      cache.projects = null;
      sessionStorage.removeItem('cache_projects');
      cache.documents.delete(`projects/${id}`);
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${id}`);
    }
  },
  listPages: async (projectId: string) => {
    try {
      return await apiList<Types.ProjectPage>('projectPages', { projectId, limit: 100 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/pages`);
      return [];
    }
  },
  listAnswers: async (projectId: string) => {
    try {
      const items = await apiList<Types.Answer>('answers', { projectId, limit: 5000 });
      return items.map((answer) => {
        const legacy = answer.legacyFirebaseId?.trim();
        return legacy ? { ...answer, id: legacy } : answer;
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/answers`);
      return [];
    }
  },
  addAnswerReviewComment: async (
    projectId: string,
    answerId: string,
    payload: {
      text: string;
      authorId: string;
      authorName: string;
    },
  ): Promise<Types.Answer> => {
    try {
      const saved = await apiRequest<Types.Answer & { legacyFirebaseId?: string }>(
        `/api/db/answers/${encodeURIComponent(answerId)}/review-comments`,
        {
          method: 'POST',
          body: JSON.stringify({
            projectId,
            text: payload.text,
            authorId: payload.authorId,
            authorName: payload.authorName,
          }),
        },
      );
      return mapAnswerApiResponse(saved);
    } catch (err) {
      if (!isMissingDedicatedAnswerRoute(err)) throw err;
    }

    const existing = await fetchAnswerByExternalId(answerId);
    if (!existing) {
      throw new ApiClientError('Answer not found', 404, 'db/not-found');
    }

    const entry: Types.AnswerReviewComment = {
      id: `rc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      authorId: payload.authorId,
      authorName: payload.authorName,
      text: payload.text,
      createdAt: Date.now(),
    };
    const nextComments = [...(existing.reviewComments || []), entry];

    const patched = await apiRequest<Types.Answer & { legacyFirebaseId?: string }>(
      `/api/db/answers/${encodeURIComponent(answerId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ reviewComments: nextComments }),
      },
    );
    return mapAnswerApiResponse(patched);
  },
  /** MongoDB upsert by projectId + questionId + contactId (Görevler Kaydet). */
  saveAnswer: async (
    projectId: string,
    _answerId: string | undefined,
    data: {
      assignmentId: string;
      questionId: string;
      contactId: string;
      latestAnswer?: string;
      comment?: string;
      answerNotes?: Types.AnswerAssigneeNote[];
      evidenceName?: string;
      submittedByUserId?: string;
      onBehalfOfUserId?: string;
      workflowStatus?: Types.QuestionWorkflowStatus;
      submittedAt?: number;
    },
  ): Promise<Types.Answer> => upsertAnswerRecord(projectId, data),
  addAnswerAssigneeNote: async (
    projectId: string,
    answerId: string,
    payload: {
      text: string;
      insertAfterIndex: number;
      assignmentId?: string;
      questionId?: string;
      contactId?: string;
    },
  ): Promise<Types.Answer> => {
    try {
      const saved = await apiRequest<Types.Answer & { legacyFirebaseId?: string }>(
        `/api/db/answers/${encodeURIComponent(answerId)}/assignee-notes`,
        {
          method: 'POST',
          body: JSON.stringify({
            projectId,
            text: payload.text,
            insertAfterIndex: payload.insertAfterIndex,
            assignmentId: payload.assignmentId,
            questionId: payload.questionId,
            contactId: payload.contactId,
          }),
        },
      );
      return mapAnswerApiResponse(saved);
    } catch (err) {
      if (!isMissingDedicatedAnswerRoute(err)) throw err;
    }

    const { assignmentId, questionId, contactId } = payload;
    if (!assignmentId || !questionId || !contactId) {
      throw new ApiClientError(
        'assignmentId, questionId, and contactId are required',
        400,
        'db/validation-error',
      );
    }

    const existing = await fetchAnswerByExternalId(answerId);
    const currentNotes = normalizeAnswerAssigneeNotes(existing || {});
    const nextNotes = insertAssigneeNoteAfterIndex(
      currentNotes,
      payload.insertAfterIndex,
      payload.text,
    );

    return upsertAnswerRecord(projectId, {
      assignmentId,
      questionId,
      contactId,
      latestAnswer: existing?.latestAnswer ?? '',
      comment: existing?.comment ?? '',
      answerNotes: nextNotes,
      evidenceName: existing?.evidenceName,
      submittedByUserId: existing?.submittedByUserId,
      onBehalfOfUserId: existing?.onBehalfOfUserId,
      workflowStatus: existing?.workflowStatus,
    });
  },
  listAssignments: async (projectId: string) => {
    try {
      return await apiList<Types.Assignment>('assignments', { projectId, limit: 200 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `projects/${projectId}/assignments`);
      return [];
    }
  },
  listUserAssignments: async (projectId: string) => {
    try {
      return await apiList<Types.ProjectUserAssignment>('projectUserAssignments', { projectId, limit: 100 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `projectUserAssignments`);
      return [];
    }
  },
  listAllUserAssignments: async (userId: string) => {
    try {
      return await apiList<Types.ProjectUserAssignment>('projectUserAssignments', { userId, limit: 100 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `projectUserAssignments`);
      return [];
    }
  },
  assignUser: async (projectId: string, userId: string, role: Types.ProjectUserAssignment['role'] = 'contributor') => {
    try {
      const existing = (await apiList<Types.ProjectUserAssignment>('projectUserAssignments', { projectId, userId, limit: 1 }))[0];
      if (existing) {
        await apiUpdate<Types.ProjectUserAssignment>('projectUserAssignments', existing.id, { role });
        return existing.id;
      }

      const assignment = await apiCreate<Types.ProjectUserAssignment>('projectUserAssignments', {
        projectId,
        userId,
        role,
        assignedAt: Date.now()
      });
      return assignment.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'projectUserAssignments');
    }
  },
  updateUserRole: async (assignmentId: string, role: Types.ProjectUserAssignment['role']) => {
    try {
      await apiUpdate<Types.ProjectUserAssignment>('projectUserAssignments', assignmentId, { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projectUserAssignments/${assignmentId}`);
    }
  },
  unassignUser: async (assignmentId: string) => {
    try {
      await apiDelete('projectUserAssignments', assignmentId);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projectUserAssignments/${assignmentId}`);
    }
  },
  createFromTemplate: async (customerId: string, templateId: string | undefined, name: string, creatorId?: string, category: Types.Project['category'] = 'Project', allowMultipleAssignments: boolean = false) => {
    try {
      const result = await apiRequest<{ id: string }>('/api/db/projects/create-from-template', {
        method: 'POST',
        body: JSON.stringify({
        customerId,
          templateId,
        name,
          creatorId,
        category,
        allowMultipleAssignments,
        }),
      });
      return result.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'projects');
    }
  },
  clearData: async (projectId: string, includeUsers: boolean) => {
    try {
      await apiRequest(`/api/db/projects/${projectId}/clear-data`, {
        method: 'POST',
        body: JSON.stringify({ includeUsers }),
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/clearData`);
      return false;
    }
  },
  rebuildFromTemplate: async (projectId: string, templateId: string) => {
    try {
      await apiRequest(`/api/db/projects/${projectId}/rebuild-from-template`, {
        method: 'POST',
        body: JSON.stringify({ templateId }),
      });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `projects/${projectId}/rebuild`);
      return false;
    }
  },
};

export const assignments = {
  listByRecipient: async (recipientId: string) => {
    try {
      return await apiList<Types.Assignment>('assignments', { recipientId, limit: 50 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'assignments-group');
      return [];
    }
  },
  listAll: async () => {
    try {
      return await apiList<Types.Assignment>('assignments', { limit: 500 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'assignments-all');
      return [];
    }
  },
  delete: async (projectId: string, assignmentId: string) => {
    try {
      await apiDelete('assignments', assignmentId);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${projectId}/assignments/${assignmentId}`);
      return false;
    }
  }
};

export const knowledgeBases = {
  list: async (customerId?: string, projectId?: string) => {
    try {
      return await apiList<Types.KnowledgeBase>('knowledgeBases', { customerId, projectId, limit: 500 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'knowledgeBases');
      return [];
    }
  },
  get: async (id: string) => {
    try {
      return await apiGet<Types.KnowledgeBase>('knowledgeBases', id);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `knowledgeBases/${id}`);
      return null;
    }
  },
  create: async (data: Types.KnowledgeBaseWritePayload) => {
    try {
      return await apiCreate<Types.KnowledgeBase>('knowledgeBases', data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'knowledgeBases');
    }
  },
  update: async (id: string, data: Partial<Types.KnowledgeBaseWritePayload>) => {
    try {
      return await apiUpdate<Types.KnowledgeBase>('knowledgeBases', id, cleanData(data as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `knowledgeBases/${id}`);
    }
  },
  delete: async (id: string) => {
    try {
      const docs = await knowledgeBases.listDocuments(id);
      await Promise.all(docs.map((d) => apiDelete('kbDocuments', d.id)));
      await apiDelete('knowledgeBases', id);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `knowledgeBases/${id}`);
      return false;
    }
  },
  listDocuments: async (kbId: string) => {
    try {
      return await apiList<Types.KBDocument>('kbDocuments', { kbId, limit: 1000 });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `knowledgeBases/${kbId}/documents`);
      return [];
    }
  },
  addDocument: async (kbId: string, data: Omit<Types.KBDocument, 'id' | 'kbId' | 'createdAt'>) => {
    try {
      return await apiCreate<Types.KBDocument>('kbDocuments', {
        ...data,
        kbId,
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `knowledgeBases/${kbId}/documents`);
    }
  },
  deleteDocument: async (kbId: string, docId: string) => {
    try {
      await apiDelete('kbDocuments', docId);
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `knowledgeBases/${kbId}/documents/${docId}`);
      return false;
    }
  }
};

export const platformUsers = {
  getByEmail: async (email: string) => {
    try {
      const users = await apiList<Types.PlatformUser>('platformUsers', { email, limit: 1 });
      return users[0] || null;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'platformUsers-byEmail');
      return null;
    }
  },
  list: async (forceFetch = false) => {
    if (!forceFetch && cache.platformUsers && Date.now() - (cache.lastFetch.platformUsers || 0) < CACHE_TTL) {
      return cache.platformUsers;
    }
    try {
      const data = await apiList<Types.PlatformUser>('platformUsers', { limit: 100 });
      cache.platformUsers = data;
      cache.lastFetch.platformUsers = Date.now();
      setSessionCache('platformUsers', data);
      return data;
    } catch (error) {
      if (cache.platformUsers) return cache.platformUsers;
      handleFirestoreError(error, OperationType.LIST, 'platformUsers');
      return [];
    }
  },
  get: async (userId: string, forceFetch = false) => {
    const cacheKey = `platformUsers/${userId}`;
    if (!forceFetch && cache.documents.has(cacheKey)) {
      const entry = cache.documents.get(cacheKey)!;
      if (Date.now() - entry.ts < CACHE_TTL) return entry.data;
    }

    // Check list cache too
    if (!forceFetch && cache.platformUsers) {
      const cached = cache.platformUsers.find(u => u.id === userId);
      if (cached) return cached;
    }
    try {
      const data = await apiGet<Types.PlatformUser>('platformUsers', userId);
      if (!data) return null;
      cache.documents.set(cacheKey, { data, ts: Date.now() });
      return data;
    } catch (error) {
      if (cache.documents.has(cacheKey)) return cache.documents.get(cacheKey)!.data;
      handleFirestoreError(error, OperationType.GET, `platformUsers/${userId}`);
      return null;
    }
  },
  createWithId: async (userId: string, data: Omit<Types.PlatformUser, 'id' | 'createdAt'>) => {
    try {
      const existing = await apiGet<Types.PlatformUser>('platformUsers', userId);
      if (existing) {
        await apiUpdate<Types.PlatformUser>('platformUsers', userId, {
          ...cleanData(data as any),
          language: data.language || 'en',
        });
      } else {
        await apiCreate<Types.PlatformUser>('platformUsers', {
          ...cleanData(data as any),
          legacyFirebaseId: userId,
          ownerId: userId,
        language: data.language || 'en',
        });
      }
      return userId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `platformUsers/${userId}`);
    }
  },
  create: async (data: Omit<Types.PlatformUser, 'id' | 'createdAt'>) => {
    try {
      const res = await apiCreate<Types.PlatformUser>('platformUsers', { 
        ...cleanData(data as any), 
        language: data.language || 'en',
      });
      return res.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'platformUsers');
    }
  },
  createPendingFromContact: async (contact: Types.Contact) => {
    try {
      const email = contact.email?.trim();
      if (email) {
        const existing = await platformUsers.getByEmail(email);
        if (existing) {
          if (!existing.contactId && contact.id) {
            await platformUsers.update(existing.id, { contactId: contact.id });
          }
          return existing.id;
        }
      }

      const user = await apiCreate<Types.PlatformUser>('platformUsers', {
        name: contact.name,
        email: contact.email,
        role: 'customer',
        department: contact.department || 'Customer',
        language: 'en',
        isConfirmed: false,
        contactId: contact.id
      });
      cache.platformUsers = null;
      sessionStorage.removeItem('cache_platformUsers');
      return user.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'platformUsers');
    }
  },
  update: async (userId: string, data: Partial<Types.PlatformUser>) => {
    try {
      const res = await apiUpdate<Types.PlatformUser>('platformUsers', userId, cleanData(data as any));
      cache.platformUsers = null;
      sessionStorage.removeItem('cache_platformUsers');
      cache.documents.delete(`platformUsers/${userId}`);
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `platformUsers/${userId}`);
    }
  },
  delete: async (userId: string) => {
    try {
      const res = await apiDelete('platformUsers', userId);
      cache.platformUsers = null;
      sessionStorage.removeItem('cache_platformUsers');
      cache.documents.delete(`platformUsers/${userId}`);
      return res;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `platformUsers/${userId}`);
    }
  },
  migrateRoles: async () => {
    try {
      const users = await platformUsers.list(true);
      const updates = users.map(async (u) => {
        const normalized = normalizePlatformRole(u.role as string);
        const newRole = normalized ?? u.role;
        const newLanguage = u.language || 'en';

        if (newRole !== u.role || !u.language) {
          return platformUsers.update(u.id, { role: newRole, language: newLanguage });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      return true;
    } catch (error) {
      console.error("Migration failed:", error);
      return false;
    }
  }
};

export const auditLogs = {
  list: async (projectId?: string, userId?: string, limitCount: number = 100) => {
    try {
      return await apiList<Types.AuditLog>('auditLogs', { projectId, userId, limit: limitCount });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
      return [];
    }
  },
  listPaged: async (options: {
    projectId?: string;
    userId?: string;
    since?: number;
    skip?: number;
    limit?: number;
  } = {}) => {
    try {
      const result = await apiRequest<{ items: Types.AuditLog[]; total: number }>(
        `/api/db/auditLogs${queryString({
          projectId: options.projectId,
          userId: options.userId,
          timestampGte: options.since,
          skip: options.skip ?? 0,
          limit: options.limit ?? 25,
          countTotal: true,
        })}`,
      );
      return {
        items: result?.items ?? [],
        total: typeof result?.total === 'number' ? result.total : 0,
      };
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'auditLogs');
      return { items: [], total: 0 };
    }
  },
  create: async (data: Omit<Types.AuditLog, 'id' | 'timestamp'>) => {
    try {
      return await apiCreate<Types.AuditLog>('auditLogs', { 
        ...cleanData(data as any), 
        timestamp: Date.now() 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'auditLogs');
    }
  }
};

export const translations = {
  list: async () => {
    try {
      if (cache.translations) return cache.translations;
      const cached = getSessionCache('translations');
      if (cached) {
        cache.translations = cached;
        return cached;
      }

      const data = await apiList<Types.Translation>('translations', { limit: 1000 });
      
      cache.translations = data;
      setSessionCache('translations', data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'translations');
      return [];
    }
  },
  create: async (data: Omit<Types.Translation, 'id' | 'updatedAt'>) => {
    try {
      const res = await apiCreate<Types.Translation>('translations', { 
        ...data, 
        updatedAt: Date.now() 
      });
      cache.translations = null;
      sessionStorage.removeItem('cache_translations');
      return res.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'translations');
    }
  },
  bulkCreate: async (items: Omit<Types.Translation, 'id' | 'updatedAt'>[]) => {
    try {
      await apiBulkCreate<Types.Translation>('translations', items.map((item) => ({
        ...item,
        updatedAt: Date.now(),
      })));
      cache.translations = null;
      sessionStorage.removeItem('cache_translations');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'translations');
    }
  },
  update: async (id: string, data: Partial<Types.Translation>) => {
    try {
      await apiUpdate<Types.Translation>('translations', id, {
        ...data,
        updatedAt: Date.now()
      });
      cache.translations = null;
      sessionStorage.removeItem('cache_translations');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `translations/${id}`);
    }
  },
  delete: async (id: string) => {
    try {
      await apiDelete('translations', id);
      cache.translations = null;
      sessionStorage.removeItem('cache_translations');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `translations/${id}`);
    }
  }
};

export const logActivity = async (
  user: { uid: string, displayName?: string | null, email?: string | null },
  action: 'create' | 'update' | 'delete',
  collection: string,
  recordId: string,
  details: string,
  projectId?: string
) => {
  try {
    const logData: any = {
      userId: user.uid,
      userName: user.displayName || 'Unknown User',
      userEmail: user.email || 'N/A',
      action,
      collection,
      recordId,
      details
    };
    if (projectId) logData.projectId = projectId;
    
    await auditLogs.create(logData);
  } catch (error) {
    console.error("Activity logging failed:", error);
  }
};
