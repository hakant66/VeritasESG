/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Question, QuestionAnswerFormat } from '../../types';
import { HelpMarkdown } from '../ui/HelpMarkdown';
import { QuestionGuidanceMaterials } from './QuestionGuidanceMaterials';
import { useTranslation } from '../../hooks/useTranslation';

export type QuestionGuidancePreviewFields = {
  soru: string;
  aciklama: string;
  ornekYanit: string;
  aciklamaVideoUrl: string;
  answerFormat: QuestionAnswerFormat;
};

type QuestionGuidancePreviewProps = {
  question: Pick<Question, 'kod' | 'baslik'>;
  fields: QuestionGuidancePreviewFields;
  className?: string;
};

export function QuestionGuidancePreview({
  question,
  fields,
  className,
}: QuestionGuidancePreviewProps) {
  const { t } = useTranslation();
  const answerFormat = fields.answerFormat ?? 'textarea';

  return (
    <div className={className}>
      <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {question.baslik?.trim() ? (
          <div className="space-y-1">
            {question.kod?.trim() && (
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{question.kod}</p>
            )}
            <p className="text-base font-bold leading-snug text-slate-900">{question.baslik}</p>
          </div>
        ) : null}

        <div className="min-w-0 max-w-none">
          <HelpMarkdown>{fields.soru || ''}</HelpMarkdown>
        </div>

        <QuestionGuidanceMaterials
          questionId="guidance-preview"
          aciklama={fields.aciklama}
          ornekYanit={fields.ornekYanit}
          videoUrl={fields.aciklamaVideoUrl}
          defaultOpen
          labels={{
            sectionTitle: t.projectDetail.helpMaterialsSectionTitle,
            guidance: t.projectDetail.guidance,
            example: t.projectDetail.example,
            videoTitle: t.templates.aciklamaVideoUrlLabel,
            noContent: t.projectDetail.formsHelpNoExtraContent,
          }}
        />

        <div className="space-y-2 border-t border-slate-100 pt-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
            {t.templates.questionDataType}
          </p>
          {answerFormat === 'textarea' ? (
            <div className="min-h-[4.5rem] rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm italic text-slate-400">
              {t.templates.answerFormatTextarea}
            </div>
          ) : (
            <input
              type="number"
              readOnly
              disabled
              step={answerFormat === 'integer' ? 1 : 'any'}
              placeholder={
                answerFormat === 'integer'
                  ? t.tasks.answerIntegerPlaceholder
                  : t.tasks.answerDecimalPlaceholder
              }
              className="h-12 w-full max-w-md rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-400"
            />
          )}
        </div>
      </div>
    </div>
  );
}
