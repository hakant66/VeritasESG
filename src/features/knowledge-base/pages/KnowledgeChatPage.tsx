/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Send,
  Bot,
  Loader2,
  Database,
  Sparkles,
  MessageCircle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { knowledgeBases } from '../../../services/db';
import {
  generateChatSampleQuestions,
  type ChatSampleQuestionsContext,
} from '../../../services/gemini';
import { chatKnowledgeBase, type KnowledgeChatSource } from '../api/kbRag';
import { buildContextualFallbackSampleQuestions } from '../../../lib/chatSampleQuestions';
import {
  buildSampleQuestionsCacheKey,
  buildSampleQuestionsLookupKey,
  cacheSampleQuestions,
  getCachedSampleQuestions,
} from '../../../lib/chatSampleQuestionsCache';
import {
  inferKnowledgeBaseSpecification,
  type KnowledgeBase,
  type KnowledgeBaseSpecification,
} from '../../../types';
import { useAuth } from '../../../lib/AuthContext';
import { useSettings } from '../../../lib/SettingsContext';
import { useTranslation } from '../../../hooks/useTranslation';
import type { TranslationKey } from '../../../lib/i18n';
import { cn } from '../../../lib/utils';
import { HelpMarkdown } from '../../../components/ui/HelpMarkdown';
import { motion } from 'motion/react';
import {
  PageHelpFullModal,
  PageHelpHeaderButton,
} from '../../../components/admin/PageHelpGuidance';
import { useKnowledgeChatPageData } from '../hooks/useKnowledgeChatPageData';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: KnowledgeChatSource[];
}

function httpStatusFromError(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const s = (error as { status: unknown }).status;
    if (typeof s === 'number' && !Number.isNaN(s)) return s;
  }
  return undefined;
}

/** User-facing text plus optional raw API payload in dev (Vite `npm run dev`). */
function withDevTechnicalDetail(userFacing: string, raw: string): string {
  if (!import.meta.env.DEV) return userFacing;
  const clip = raw.trim().slice(0, 420);
  if (!clip) return userFacing;
  return `${userFacing}\n\n_${clip}_`;
}

function errorMessageRaw(error: unknown): string {
  const status = httpStatusFromError(error);
  const base =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message: unknown }).message)
        : String(error);
  return status !== undefined ? `[HTTP ${status}] ${base}` : base;
}

function chatAssistantErrorText(error: unknown, c: TranslationKey['chat']): string {
  const raw = errorMessageRaw(error);
  const msg = raw.toLowerCase();
  const status = httpStatusFromError(error);
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code: unknown }).code ?? '')
      : '';

  if (code === 'kb-rag/gemini-not-configured' || /gemini_api_key is not configured/.test(msg)) {
    return withDevTechnicalDetail(c.errorServerApiKeyMissing, raw);
  }
  if (/vite_gemini_api_key|not configured|gemini api key is not configured/.test(msg)) {
    return withDevTechnicalDetail(c.errorApiKeyMissing, raw);
  }
  if (
    status === 401 ||
    status === 403 ||
    /\b401\b|\b403\b|invalid api key|api_key_invalid|permission_denied|unauthenticated|api key not valid/.test(msg)
  ) {
    return withDevTechnicalDetail(c.errorAuth, raw);
  }
  if (
    status === 429 ||
    /\b429\b|quota|resource_exhausted|resourceexhausted|rate limit|too many requests|requests per minute|requests per day|limit exceeded|exceeded your quota/i.test(
      msg,
    )
  ) {
    return withDevTechnicalDetail(c.errorModelOrQuota, raw);
  }
  // Avoid bare "not found" — it mislabels unrelated API errors as model/quota.
  const modelOrEndpointHint =
    /model|gemini|generatecontent|publisher|generativelanguage|google\.ai/.test(msg) ||
    /models\/|\/models\b/.test(msg);
  if (
    (status === 404 && modelOrEndpointHint) ||
    /models\/[^/\s]+.*not found|model[`'"]?\s+(is\s+)?not found|unsupported model|unknown model|not supported for use|is not found for api version/i.test(
      msg,
    )
  ) {
    return withDevTechnicalDetail(c.errorModelOrQuota, raw);
  }
  if (/empty text response|blocked|finish_reason|safety|no content parts/i.test(msg)) {
    return withDevTechnicalDetail(c.errorEmptyGeminiResponse, raw);
  }
  if (/token|max.?tokens|length|too long|payload|entity too large|total size|maximum/.test(msg)) {
    return withDevTechnicalDetail(c.errorContextTooLarge, raw);
  }
  return withDevTechnicalDetail(c.requestFailed, raw);
}

function displayInitials(name?: string, email?: string): string {
  const source = name?.trim() || email?.trim() || 'U';
  return source
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function KnowledgeChatPage() {
  const { user, profile } = useAuth();
  const { settings } = useSettings();
  const { t, lang } = useTranslation();
  const chatQuery = useKnowledgeChatPageData(user?.uid, profile);
  const availableKbs = chatQuery.data?.availableKbs ?? [];
  const userProjects = chatQuery.data?.userProjects ?? [];
  const pageLoading = chatQuery.isLoading;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedKbId, setSelectedKbId] = useState<string>('all');
  const [expandedSourceIds, setExpandedSourceIds] = useState<Set<string>>(new Set());
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [sampleQuestions, setSampleQuestions] = useState<string[]>([]);
  const [sampleQuestionsLoading, setSampleQuestionsLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const contextKbGroups = useMemo(() => {
    const groups: Record<KnowledgeBaseSpecification, KnowledgeBase[]> = {
      domain: [],
      customer: [],
      project: [],
    };
    for (const kb of availableKbs) {
      groups[inferKnowledgeBaseSpecification(kb)].push(kb);
    }
    const sortByName = (a: KnowledgeBase, b: KnowledgeBase) =>
      a.name.localeCompare(b.name, lang, { sensitivity: 'base' });
    groups.domain.sort(sortByName);
    groups.customer.sort(sortByName);
    groups.project.sort(sortByName);
    return groups;
  }, [availableKbs, lang]);

  const contextCategoryOrder: KnowledgeBaseSpecification[] = [
    'domain',
    'customer',
    'project',
  ];

  const contextCategoryLabels: Record<KnowledgeBaseSpecification, string> = {
    domain: t.chat.contextCategoryDomain,
    customer: t.chat.contextCategoryCustomer,
    project: t.chat.contextCategoryProject,
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (pageLoading) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const kbs =
        selectedKbId === 'all'
          ? availableKbs
          : availableKbs.filter((kb) => kb.id === selectedKbId);

      const projectName = userProjects[0]?.name;
      const lookupKey = buildSampleQuestionsLookupKey(lang, selectedKbId, kbs, projectName);
      const cachedLookup = getCachedSampleQuestions(lookupKey);
      if (cachedLookup) {
        if (!cancelled) {
          setSampleQuestions(cachedLookup);
          setSampleQuestionsLoading(false);
        }
        return;
      }

      setSampleQuestionsLoading(true);

      const ctx: ChatSampleQuestionsContext = {
        scope: selectedKbId === 'all' ? 'all' : 'single',
        knowledgeBaseNames: kbs.map((k) => k.name),
        knowledgeBaseDescriptions: kbs.map((k) => k.description).filter(Boolean),
        documentNames: [],
        projectName,
      };

      try {
        const docNames: string[] = [];
        for (const kb of kbs.slice(0, 5)) {
          const docs = await knowledgeBases.listDocuments(kb.id);
          for (const d of docs.filter((x) => x.processed)) {
            if (d.name && !docNames.includes(d.name)) docNames.push(d.name);
            if (docNames.length >= 12) break;
          }
          if (docNames.length >= 12) break;
        }
        ctx.documentNames = docNames.slice(0, 12);
      } catch (err) {
        console.warn('Sample question context: document names unavailable', err);
      }

      const kbIds = kbs.map((k) => k.id);
      const fullKey = buildSampleQuestionsCacheKey(lang, selectedKbId, kbIds, ctx);
      const cachedFull = getCachedSampleQuestions(fullKey);
      if (cachedFull) {
        cacheSampleQuestions(lookupKey, fullKey, cachedFull);
        if (!cancelled) {
          setSampleQuestions(cachedFull);
          setSampleQuestionsLoading(false);
        }
        return;
      }

      const staticDefaults = t.chat.sampleQuestions;
      try {
        const generated = await generateChatSampleQuestions(ctx, lang);
        if (!cancelled) {
          setSampleQuestions(generated);
          cacheSampleQuestions(lookupKey, fullKey, generated);
        }
      } catch (err) {
        console.warn('Sample question generation failed, using fallback', err);
        if (!cancelled) {
          setSampleQuestions(buildContextualFallbackSampleQuestions(lang, ctx, staticDefaults));
        }
      } finally {
        if (!cancelled) setSampleQuestionsLoading(false);
      }
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [selectedKbId, availableKbs, lang, userProjects, pageLoading, t.chat.sampleQuestions]);

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim() || loading) return;

    const userMessage: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const scopedKbs =
        selectedKbId === 'all'
          ? availableKbs
          : availableKbs.filter((kb) => kb.id === selectedKbId);

      if (scopedKbs.length === 0) {
        throw new Error(t.chat.noKbs);
      }

      const activeProject = userProjects[0];
      const selectedKb = selectedKbId === 'all' ? null : scopedKbs[0];
      const result = await chatKnowledgeBase({
        query: text,
        kbIds: scopedKbs.map((kb) => kb.id),
        lang,
        userContext: {
          projectName: activeProject?.name,
          customerName: profile?.customerId ? 'Your Organization' : undefined,
          domains: Array.from(new Set(userProjects.flatMap((p) => p.domainIds || []))),
        },
        customerId: selectedKb?.customerId,
        projectId: selectedKb?.projectId,
      });

      const botMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        role: 'assistant',
        content: result.answer,
        timestamp: Date.now(),
        sources: result.sources.length > 0 ? result.sources : undefined,
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: chatAssistantErrorText(error, t.chat),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-80px)] space-y-4">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-medium">{t.chat.initializing}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] md:h-screen bg-slate-50 overflow-hidden relative">
      <div className="w-full max-w-none shrink-0 space-y-4 px-8 pt-8">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-100 pb-4 md:flex-row md:items-start">
          <div>
            <div className="mb-2 flex items-center gap-4">
              <MessageCircle
                className="text-blue-600"
                size={36}
                strokeWidth={2.5}
              />
              <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                {t.nav.chat}
              </h1>
            </div>
            <p className="mt-1 text-lg font-light text-slate-500">
              {t.chat.subGreeting}
            </p>
          </div>

          {(settings.helpDashboardUrl || settings.helpDashboardMd) && (
            <div className="ml-auto flex shrink-0 flex-wrap items-start gap-3">
              <PageHelpHeaderButton
                helpUrl={settings.helpDashboardUrl || ''}
                helpMd={settings.helpDashboardMd || ''}
                isHelpModalOpen={isHelpModalOpen}
                setIsHelpModalOpen={setIsHelpModalOpen}
                title={t.chat.helpGuidanceTitle}
              />
            </div>
          )}
        </header>

      </div>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="w-full max-w-none space-y-6 pb-24 min-w-0">
          {messages.length === 0 ? (
              <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               className="text-center py-12"
            >
              <div className="w-20 h-20 bg-white border border-slate-200 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                <Sparkles size={40} className="text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4 font-display">{t.chat.greeting}</h2>
              <p className="text-slate-500 max-w-lg mx-auto mb-10 text-lg">
                {t.chat.subGreeting}
              </p>

              <div
                className={cn(
                  'grid grid-cols-1 md:grid-cols-2 gap-4 text-left transition-opacity',
                  sampleQuestionsLoading && sampleQuestions.length === 0 && 'opacity-70',
                )}
              >
                {sampleQuestionsLoading && sampleQuestions.length === 0
                  ? Array.from({ length: 4 }, (_, idx) => (
                      <div
                        key={`sq-skel-${idx}`}
                        className="h-[52px] rounded-2xl border border-slate-200 bg-slate-100 animate-pulse"
                        aria-hidden
                      />
                    ))
                  : (sampleQuestions.length > 0 ? sampleQuestions : t.chat.sampleQuestions).map(
                      (q, idx) => (
                        <button
                          key={`sq-${selectedKbId}-${lang}-${idx}`}
                          type="button"
                          onClick={() => handleSend(q)}
                          disabled={loading}
                          className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all text-sm font-medium text-slate-700 flex items-center justify-between group disabled:opacity-50"
                        >
                          {q}
                          <ChevronRight
                            size={16}
                            className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 ml-2"
                          />
                        </button>
                      ),
                    )}
              </div>
            </motion.div>
          ) : (
            messages.map((message) => (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={message.id}
                className={cn(
                  "flex gap-4",
                  message.role === 'user' ? "flex-row-reverse" : "flex-row"
                )}
              >
                <motion.div
                  className={cn(
                    'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm overflow-hidden',
                    message.role === 'user'
                      ? 'bg-slate-900 text-white text-xs font-bold'
                      : 'bg-blue-600 text-white',
                  )}
                >
                  {message.role === 'user' ? (
                    profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={profile.name || profile.email}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span aria-hidden>{displayInitials(profile?.name, profile?.email)}</span>
                    )
                  ) : (
                    <Bot size={20} aria-hidden />
                  )}
                </motion.div>
                <div className={cn(
                  "max-w-[85%] md:max-w-[75%] p-5 rounded-3xl shadow-sm",
                  message.role === 'user' 
                    ? "bg-slate-900 text-white rounded-tr-none" 
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                )}>
                  <HelpMarkdown variant="chat">{message.content}</HelpMarkdown>
                  {message.role === 'assistant' && message.sources && message.sources.length > 0 ? (
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedSourceIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(message.id)) next.delete(message.id);
                            else next.add(message.id);
                            return next;
                          });
                        }}
                        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700"
                      >
                        {expandedSourceIds.has(message.id) ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                        {expandedSourceIds.has(message.id)
                          ? t.chat.sourcesHide
                          : t.chat.sourcesToggle.replace(
                              '{count}',
                              String(message.sources.length),
                            )}
                      </button>
                      {expandedSourceIds.has(message.id) ? (
                        <ul className="mt-3 space-y-2">
                          {message.sources.map((source, idx) => (
                            <li
                              key={`${message.id}-src-${idx}`}
                              className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600"
                            >
                              <div className="mb-1 font-semibold text-slate-800">
                                {source.documentName} #{source.chunkIndex + 1}
                                <span className="ml-2 font-normal text-slate-400">
                                  ({source.score.toFixed(2)})
                                </span>
                              </div>
                              <p className="leading-relaxed">{source.textPreview}</p>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                  <div className={cn(
                    "mt-2 text-[10px] font-bold uppercase tracking-wider",
                    message.role === 'user' ? "text-slate-500" : "text-slate-400"
                  )}>
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </motion.div>
            ))
          )}
          {loading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <Bot size={20} className="text-white" />
              </div>
              <div className="bg-white border border-slate-200 p-5 rounded-3xl rounded-tl-none shadow-sm flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-blue-600" />
                <span className="text-sm font-medium text-slate-500">{t.chat.searching}</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white border-t border-slate-200 p-4 md:p-6 pb-8 md:pb-10 shrink-0">
        <div className="w-full max-w-none relative group min-w-0">
          <div className="absolute inset-0 bg-blue-500/5 blur-xl -z-10 opacity-0 group-focus-within:opacity-100 transition-opacity" />
          <textarea
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={t.chat.inputPlaceholder}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-14 pr-24 py-4 md:py-5 focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 focus:bg-white transition-all text-slate-900 font-medium resize-none overflow-hidden"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 bg-blue-50 text-blue-600 rounded-xl">
             <MessageCircle size={20} />
          </div>
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-slate-900 text-white rounded-xl hover:bg-blue-600 disabled:bg-slate-300 disabled:shadow-none transition-all shadow-lg active:scale-95"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={24} />}
          </button>
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="min-w-0 flex-1 shrink text-left text-[11px] leading-snug text-slate-500 sm:text-xs sm:pr-2">
            {t.chat.aiDisclaimer}
          </p>
          <div className="relative group w-full min-w-0 sm:w-auto sm:min-w-[240px] sm:max-w-[min(100%,320px)] sm:shrink-0 sm:self-auto self-end">
            <Database className="pointer-events-none absolute left-4 top-1/2 z-[1] -translate-y-1/2 text-slate-400" size={14} />
            <select
              value={selectedKbId}
              onChange={(e) => setSelectedKbId(e.target.value)}
              className="w-full cursor-pointer appearance-none rounded-2xl border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="all">{t.chat.contextAll}</option>
              {contextCategoryOrder.map((spec) =>
                contextKbGroups[spec].length > 0 ? (
                  <optgroup key={spec} label={contextCategoryLabels[spec]}>
                    {contextKbGroups[spec].map((kb) => (
                      <option key={`kb-opt-${kb.id}`} value={kb.id}>
                        {kb.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null,
              )}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-hover:text-slate-900">
              <ChevronDown size={14} />
            </div>
          </div>
        </div>
      </div>

      <PageHelpFullModal
        helpUrl={settings.helpDashboardUrl || ''}
        helpMd={settings.helpDashboardMd || ''}
        isOpen={isHelpModalOpen}
        onClose={() => setIsHelpModalOpen(false)}
        labels={{
          guidance: t.chat.helpGuidanceTitle,
          interactiveTutorial: t.dashboard.interactiveTutorial,
          noVideo: t.dashboard.noVideo,
          dontShowOnFirstOpen: t.dashboard.dontShowOnFirstOpen,
        }}
      />
    </div>
  );
}
