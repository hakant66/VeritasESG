/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { 
  CheckCircle2, 
  HelpCircle, 
  Lightbulb, 
  Loader2, 
  Save,
  MessageSquare,
  AlertCircle,
  FileUp,
  Trash2,
  Paperclip
} from 'lucide-react';
import * as DB from '../../services/db';
import { Question, Answer, Contact, Project, QuestionAnswerFormat, Assignment } from '../../types';
import { cn } from '../../lib/utils';
import { resolveStatusAfterAssigneeComplete } from '../../../lib/assignmentApproval';
import { motion, AnimatePresence } from 'motion/react';
import { SpeechButton } from '../../components/ui/SpeechButton';
import { useTranslation } from '../../hooks/useTranslation';
import {
  QuestionGuidanceLightbulbButton,
  QuestionGuidanceMaterialsModal,
  countQuestionGuidanceMaterials,
} from '../../components/project/QuestionGuidanceMaterials';
import { HelpMarkdown } from '../../components/ui/HelpMarkdown';

function responseAnswerFormat(q: Question): QuestionAnswerFormat {
  return q.answerFormat ?? 'textarea';
}

export default function ContactResponsePage() {
  const { t } = useTranslation();
  const { token } = useParams();
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [tokenData, setTokenData] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [project, setProject] = useState<Project | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [assignmentMeta, setAssignmentMeta] = useState<Pick<
    Assignment,
    'approverId' | 'status'
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);
  const [guidanceModalQuestion, setGuidanceModalQuestion] = useState<Question | null>(null);
  const guidanceMaterialsLabels = useMemo(
    () => ({
      sectionTitle: t.projectDetail.helpMaterialsSectionTitle,
      guidance: t.projectDetail.guidance,
      example: t.projectDetail.example,
      videoTitle: t.templates.aciklamaVideoUrlLabel,
      noContent: t.projectDetail.formsHelpNoExtraContent,
    }),
    [t],
  );

  useEffect(() => {
    if (token) {
      console.log(`[CLIENT] Starting validation for token: ${token.substring(0, 15)}...`);
      validate();
    } else {
      console.warn('[CLIENT] No token found in URL params');
      setIsValid(false);
      setValidationError('Access token is missing from the URL.');
    }
  }, [token]);

  async function validate() {
    setLoading(true);
    try {
      console.log('[CLIENT] Fetching /api/auth/validate-token...');
      const res = await fetch('/api/auth/validate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      const data = await res.json();
      console.log('[CLIENT] Validation response:', data);
      
      if (data.valid) {
        setIsValid(true);
        setTokenData(data.decoded);
        await loadData(data.decoded);
      } else {
        setIsValid(false);
        setValidationError(data.error || 'The link signature is invalid or expired.');
      }
    } catch (err) {
      console.error('[CLIENT] Validation fetch error:', err);
      setIsValid(false);
      setValidationError('Could not connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  }

  async function loadData(decoded: any) {
    const { projectId, contactId } = decoded;

    // Load Project & Contact Info
    const pSnap = await DB.getDoc(DB.doc(DB.db, 'projects', projectId));
    if (!pSnap.exists()) return;
    const pData = pSnap.data();

    const cSnap = await DB.getDoc(DB.doc(DB.db, `customers/${pData.customerId}/contacts`, contactId));
    
    // Load Assignment status
    const assignSnap = await DB.getDoc(DB.doc(DB.db, `projects/${projectId}/assignments`, contactId));
    if (assignSnap.exists()) {
      const aData = assignSnap.data() as Assignment;
      setAssignmentMeta({
        approverId: aData.approverId,
        status: aData.status,
      });
      if (aData.status === 'completed' || aData.status === 'awaiting_approval') {
        setIsCompleted(true);
      }
    }

    if (pSnap.exists()) {
      const p = { id: pSnap.id, ...pSnap.data() } as Project;
      setProject(p);
      
      // Load all questions for this project template
      const qList = await DB.questions.listForProject(projectId, p.templateId);
      setQuestions(qList);

      // Load existing answers for this contact+project
      const aSnap = await DB.getDocs(DB.query(
        DB.collection(DB.db, `projects/${projectId}/answers`),
        DB.where('contactId', '==', contactId)
      ));
      
      const ansMap: Record<string, any> = {};
      aSnap.docs.forEach(d => {
        const data = d.data();
        ansMap[data.questionId] = {
          text: data.latestAnswer,
          comment: data.comment || '',
          evidenceName: data.evidenceName || '',
          evidenceUrl: data.evidenceUrl || '',
        };
      });
      setAnswers(ansMap as any);
    }
  }

  const handleUpdateAnswer = async (qId: string, val: string, field: 'text' | 'comment' | 'evidenceName' = 'text') => {
    setAnswers(prev => {
      const current = (prev[qId] as any) || { text: '', comment: '', evidenceName: '' };
      return { ...prev, [qId]: { ...current, [field]: val } };
    });
    setSavingId(qId);
    
    try {
      const ansId = `${tokenData.contactId}_${qId}`;
      const currentVal = (answers[qId] as any) || { text: '', comment: '', evidenceName: '' };
      
      const respondentId = tokenData.contactId;
      const now = Date.now();
      const updateData: Record<string, unknown> = {
        projectId: tokenData.projectId,
        contactId: respondentId,
        questionId: qId,
        updatedAt: now,
        submittedByUserId: respondentId,
        onBehalfOfUserId: respondentId,
      };

      if (field === 'text') {
        updateData.latestAnswer = val;
        updateData.submittedAt = now;
      }
      if (field === 'comment') updateData.comment = val;
      if (field === 'evidenceName') updateData.evidenceName = val;

      await DB.setDoc(DB.doc(DB.db, `projects/${tokenData.projectId}/answers`, ansId), updateData, { merge: true });
      setSaveErrors(prev => { const n = { ...prev }; delete n[qId]; return n; });
    } catch (err) {
      console.error('[ContactResponsePage] save error:', err);
      setSaveErrors(prev => ({ ...prev, [qId]: 'Failed to save. Please try again.' }));
    } finally {
      setTimeout(() => setSavingId(null), 1000);
    }
  };

  const handleEvidenceUpload = async (qId: string, file: File) => {
    if (!tokenData || !token) return;
    setUploadingId(qId);
    setSaveErrors(prev => { const n = { ...prev }; delete n[qId]; return n; });
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads/evidence', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveErrors(prev => ({ ...prev, [qId]: data.error || 'Upload failed. Please try again.' }));
        return;
      }
      const evidenceUrl: string = data.data?.url || data.url || '';
      const evidenceName: string = data.data?.filename || file.name;
      setAnswers(prev => ({
        ...prev,
        [qId]: { ...(prev[qId] || {}), evidenceName, evidenceUrl },
      }));
      setSavingId(qId);
      const ansId = `${tokenData.contactId}_${qId}`;
      await DB.setDoc(
        DB.doc(DB.db, `projects/${tokenData.projectId}/answers`, ansId),
        {
          projectId: tokenData.projectId,
          contactId: tokenData.contactId,
          questionId: qId,
          updatedAt: Date.now(),
          evidenceName,
          evidenceUrl,
        },
        { merge: true },
      );
      setSaveErrors(prev => { const n = { ...prev }; delete n[qId]; return n; });
    } catch (err) {
      console.error('[ContactResponsePage] evidence upload error:', err);
      setSaveErrors(prev => ({ ...prev, [qId]: 'Upload failed. Please try again.' }));
    } finally {
      setUploadingId(null);
      setTimeout(() => setSavingId(null), 1000);
    }
  };

  const handleMarkAsComplete = async () => {
    if (!tokenData) return;
    const hasAnswer = questions.some(q => (answers[q.id] as any)?.text?.trim());
    if (!hasAnswer) {
      setSubmitError(t.contactResponse.validationNoAnswers);
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const nextStatus = resolveStatusAfterAssigneeComplete({
        approverId: assignmentMeta?.approverId,
      });
      await DB.setDoc(DB.doc(DB.db, `projects/${tokenData.projectId}/assignments`, tokenData.contactId), {
        status: nextStatus,
        ...(nextStatus === 'completed'
          ? { completedAt: Date.now() }
          : { submittedForApprovalAt: Date.now() }),
      }, { merge: true });
      setIsCompleted(true);
      setSubmitError(null);
    } catch (err) {
      console.error('[ContactResponsePage] submit error:', err);
      setSubmitError('Submission failed. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex-1 flex items-center justify-center h-96"><Loader2 className="animate-spin text-blue-600" /></div>;
  
  if (!isValid) return (
    <div className="w-full max-w-none p-12 notion-card text-center space-y-6 mt-12 border-red-50 px-4 sm:px-12">
      <div className="p-4 bg-red-50 text-red-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
        <AlertCircle size={32} />
      </div>
      <h2 className="text-2xl font-bold font-display text-gray-900">{validationError || t.contactResponse.linkExpiredTitle}</h2>
      <p className="text-gray-500">{t.contactResponse.linkExpiredDesc}</p>

      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="text-[10px] font-bold text-gray-300 uppercase tracking-widest bg-gray-50 py-2 rounded">
          {t.contactResponse.errorLogLabel} {validationError || 'Token Verification Failed'}
        </div>
        <p className="text-xs text-gray-400">{t.contactResponse.consultantNote}</p>
      </div>
    </div>
  );

  if (isCompleted) {
    return (
      <div className="w-full max-w-none p-12 notion-card text-center space-y-6 mt-12 border-emerald-50 px-4 sm:px-12">
        <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold font-display text-gray-900">{t.contactResponse.submissionReceivedTitle}</h2>
        <p className="text-gray-500">{t.contactResponse.submissionReceivedDesc.replace('{project}', project?.name || '')}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsCompleted(false)}
            className="text-blue-600 font-bold hover:underline"
          >
            {t.contactResponse.reviewEditAnswers}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none space-y-12 pb-24 min-w-0">
      <header className="space-y-4">
        <div>
          <h2 className="text-4xl font-bold font-display text-gray-900">{project?.name}</h2>
          <p className="text-gray-500 text-lg">{t.contactResponse.subtitle}</p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <span>{t.contactResponse.progressLabel}</span>
            <span>{questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${questions.length > 0 ? Math.round((Object.keys(answers).length / questions.length) * 100) : 0}%` }}
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
            />
          </div>
          <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
            {t.contactResponse.questionsAnswered
              .replace('{answered}', String(Object.keys(answers).length))
              .replace('{total}', String(questions.length))}
          </p>
        </div>
      </header>

      {/* Thematic Groups */}
      <section className="space-y-16">
        {Array.from(new Set(questions.map(q => q.thematicGroup || t.contactResponse.generalGroup))).map((group, gIdx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            key={`contact-group-${group}-${gIdx}`} 
            className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden"
          >
            <div className="px-10 py-8 border-b border-slate-50 bg-slate-50/30">
              <h3 className="text-xs font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-4">
                <span className="w-12 h-1.5 bg-blue-600 rounded-full" />
                {group}
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              {questions
                .filter(q => (q.thematicGroup || t.contactResponse.generalGroup) === group)
                .map((q, index) => {
                  return (
                <div 
                  key={`contact-q-${q.id}`}
                  className="space-y-6 p-10 hover:bg-slate-50/50 transition-colors"
                >
                  <header className="flex justify-between items-start gap-6">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-blue-500/40 mb-1">
                              #{index + 1}
                            </p>
                            <HelpMarkdown>{q.soru || ''}</HelpMarkdown>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <QuestionGuidanceLightbulbButton
                              count={countQuestionGuidanceMaterials(
                                q.aciklama,
                                q.ornekYanit,
                                q.aciklamaVideoUrl,
                              )}
                              active={guidanceModalQuestion?.id === q.id}
                              onClick={() => setGuidanceModalQuestion(q)}
                              title={t.projectDetail.formsQuestionShowGuidance}
                              icon="info"
                              showWhenEmpty
                              className="border-slate-200 text-slate-600"
                            />
                            <SpeechButton text={q.soru} />
                          </div>
                        </div>
                      </div>
                    {savingId === q.id || uploadingId === q.id ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-green-600 animate-pulse uppercase tracking-wider">
                        <Save size={12} /> {t.contactResponse.saving}
                      </span>
                    ) : saveErrors[q.id] ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase tracking-wider" title={saveErrors[q.id]}>
                        <AlertCircle size={12} /> {t.contactResponse.saveFailed}
                      </span>
                    ) : (answers[q.id] as any)?.text || (answers[q.id] as any)?.evidenceName ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                        <CheckCircle2 size={12} /> {t.contactResponse.saved}
                      </span>
                    ) : null}
                  </header>

                  {responseAnswerFormat(q) === 'textarea' ? (
                    <textarea
                      rows={4}
                      aria-label={q.soru || q.baslik || String(index + 1)}
                      value={(answers[q.id] as any)?.text || ''}
                      onChange={(e) =>
                        handleUpdateAnswer(q.id, e.target.value, 'text')
                      }
                      placeholder={t.contactResponse.answerPlaceholder}
                      className="notion-input h-32 text-base shadow-inner focus:ring-2 focus:ring-blue-100"
                    />
                  ) : (
                    <input
                      type="number"
                      aria-label={q.soru || q.baslik || String(index + 1)}
                      step={responseAnswerFormat(q) === 'integer' ? 1 : 'any'}
                      value={(answers[q.id] as any)?.text ?? ''}
                      onChange={(e) =>
                        handleUpdateAnswer(q.id, e.target.value, 'text')
                      }
                      placeholder={
                        responseAnswerFormat(q) === 'integer'
                          ? t.tasks.answerIntegerPlaceholder
                          : t.tasks.answerDecimalPlaceholder
                      }
                      className="notion-input h-14 w-full max-w-md rounded-xl border border-slate-200 px-4 text-base shadow-inner focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                  
                  <div className="space-y-4">
                    <footer className="flex justify-between items-center pt-2">
                      <button 
                        onClick={() => setActiveCommentId(activeCommentId === q.id ? null : q.id)}
                        className={cn(
                          "flex items-center gap-2 text-xs font-bold transition-colors uppercase tracking-widest",
                          (answers[q.id] as any)?.comment || activeCommentId === q.id ? "text-blue-600" : "text-gray-400 hover:text-blue-600"
                        )}
                      >
                        <MessageSquare size={14} /> {(answers[q.id] as any)?.comment ? t.contactResponse.updateComment : t.contactResponse.addComment}
                      </button>
                      <button 
                        onClick={() => setActiveEvidenceId(activeEvidenceId === q.id ? null : q.id)}
                        className={cn(
                          "flex items-center gap-2 text-xs font-bold transition-colors uppercase tracking-widest",
                          (answers[q.id] as any)?.evidenceName || activeEvidenceId === q.id ? "text-emerald-600" : "text-gray-400 hover:text-emerald-600"
                        )}
                      >
                        <Save size={14} /> {(answers[q.id] as any)?.evidenceName ? t.contactResponse.updateEvidence : t.contactResponse.attachEvidence}
                      </button>
                    </footer>

                    <AnimatePresence>
                      {activeCommentId === q.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-3">
                            <textarea
                              className="w-full p-4 bg-blue-50/30 border border-blue-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-blue-300 min-h-[100px]"
                              placeholder="Add a comment or question for the consultant..."
                              value={(answers[q.id] as any)?.comment || ''}
                              onChange={(e) => {
                                setAnswers(prev => ({
                                  ...prev,
                                  [q.id]: { ...(prev[q.id] || {}), comment: e.target.value }
                                }));
                              }}
                            />
                            <div className="flex justify-end">
                              <button 
                                onClick={() => handleUpdateAnswer(q.id, (answers[q.id] as any)?.comment || '', 'comment')}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                {savingId === q.id ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                                {t.contactResponse.saveComment}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeEvidenceId === q.id && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }} 
                          animate={{ height: 'auto', opacity: 1 }} 
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-xl space-y-4">
                            <div className="flex justify-between items-center">
                              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">{t.contactResponse.evidenceSectionTitle}</p>
                            </div>
                            
                            {(answers[q.id] as any)?.evidenceName ? (
                              <div className="flex items-center justify-between p-4 bg-white border border-emerald-100 rounded-lg shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded">
                                    <Paperclip size={18} />
                                  </div>
                                  <div>
                                    {(answers[q.id] as any)?.evidenceUrl ? (
                                      <a
                                        href={(answers[q.id] as any).evidenceUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm font-bold text-blue-600 hover:underline"
                                      >
                                        {(answers[q.id] as any).evidenceName}
                                      </a>
                                    ) : (
                                      <p className="text-sm font-bold text-gray-900">{(answers[q.id] as any)?.evidenceName}</p>
                                    )}
                                    <p className="text-[10px] text-gray-400">{t.contactResponse.attachedSuccessfully}</p>
                                  </div>
                                </div>
                                <button
                                  onClick={() => {
                                    setAnswers(prev => ({
                                      ...prev,
                                      [q.id]: { ...(prev[q.id] || {}), evidenceName: '', evidenceUrl: '' },
                                    }));
                                    handleUpdateAnswer(q.id, '', 'evidenceName');
                                  }}
                                  className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : uploadingId === q.id ? (
                              <div className="border-2 border-dashed border-emerald-100 rounded-xl p-8 text-center bg-white">
                                <Loader2 size={24} className="animate-spin text-emerald-500 mx-auto" />
                                <p className="text-xs text-gray-400 mt-2">{t.contactResponse.uploading}</p>
                              </div>
                            ) : (
                              <div className="relative">
                                <input
                                  type="file"
                                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleEvidenceUpload(q.id, file);
                                  }}
                                />
                                <div className="border-2 border-dashed border-emerald-100 rounded-xl p-8 text-center space-y-2 hover:border-emerald-300 transition-colors bg-white">
                                  <div className="mx-auto w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                                    <FileUp size={20} />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-sm font-bold text-gray-700">{t.contactResponse.uploadDropzone}</p>
                                    <p className="text-xs text-gray-400">{t.contactResponse.uploadFormats}</p>
                                  </div>
                                </div>
                              </div>
                            )}
                            {saveErrors[q.id] && (
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertCircle size={12} /> {saveErrors[q.id]}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              )})}
            </div>
          </motion.div>
        ))}
      </section>

      <footer className="notion-card p-10 bg-gray-900 text-white text-center space-y-4">
        <div className="p-3 bg-green-500 rounded-full w-12 h-12 mx-auto flex items-center justify-center">
          <CheckCircle2 size={24} />
        </div>
        <h3 className="text-2xl font-bold font-display">{t.contactResponse.allFinishedTitle}</h3>
        <p className="text-gray-400 max-w-sm mx-auto">{t.contactResponse.allFinishedDesc}</p>
        {submitError && (
          <div className="flex items-center gap-2 bg-red-500/20 text-red-200 rounded-lg px-4 py-2 text-sm max-w-sm mx-auto">
            <AlertCircle size={16} className="shrink-0" />
            {submitError}
          </div>
        )}
        <button
          onClick={handleMarkAsComplete}
          disabled={isSubmitting}
          className="bg-white text-gray-900 px-8 py-3 rounded-xl font-bold hover:bg-gray-100 transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
        >
          {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : t.contactResponse.markAsComplete}
        </button>
      </footer>

      <QuestionGuidanceMaterialsModal
        isOpen={guidanceModalQuestion !== null}
        onClose={() => setGuidanceModalQuestion(null)}
        questionTitle={
          guidanceModalQuestion?.baslik?.trim() ||
          (guidanceModalQuestion?.kod ? `#${guidanceModalQuestion.kod}` : null)
        }
        questionText={guidanceModalQuestion?.soru}
        aciklama={guidanceModalQuestion?.aciklama}
        ornekYanit={guidanceModalQuestion?.ornekYanit}
        videoUrl={guidanceModalQuestion?.aciklamaVideoUrl}
        labels={guidanceMaterialsLabels}
      />
    </div>
  );
}
