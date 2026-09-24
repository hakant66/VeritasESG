/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { Segment, Template } from '../../types';
import { buildClonedTemplateName } from '../../lib/cloneTemplate';

export interface CloneTemplateModalLabels {
  title: string;
  segmentLabel: string;
  selectSegmentPlaceholder: string;
  templateNameLabel: string;
  submit: string;
  cancel: string;
}

export interface CloneTemplateModalProps {
  template: Template;
  segments: Segment[];
  defaultSectorId: string;
  labels: CloneTemplateModalLabels;
  isSubmitting?: boolean;
  onClose: () => void;
  onConfirm: (name: string, sectorId: string) => void | Promise<void>;
}

export function CloneTemplateModal({
  template,
  segments,
  defaultSectorId,
  labels,
  isSubmitting = false,
  onClose,
  onConfirm,
}: CloneTemplateModalProps) {
  const [name, setName] = useState(() => buildClonedTemplateName(template.name));
  const [sectorId, setSectorId] = useState(
    defaultSectorId || template.sectorId || '',
  );

  useEffect(() => {
    setName(buildClonedTemplateName(template.name));
    setSectorId(defaultSectorId || template.sectorId || '');
  }, [template.id, template.name, template.sectorId, defaultSectorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !sectorId) return;
    await onConfirm(trimmedName, sectorId);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
      >
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {labels.title}
          </h2>
          <p className="text-sm text-slate-500 mt-2">{template.name}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="clone-template-segment"
              className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
            >
              {labels.segmentLabel}
            </label>
            <select
              id="clone-template-segment"
              value={sectorId}
              onChange={(e) => setSectorId(e.target.value)}
              required
              disabled={isSubmitting || segments.length === 0}
              className="minimal-input w-full"
            >
              <option value="" disabled>
                {labels.selectSegmentPlaceholder}
              </option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="clone-template-name"
              className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5"
            >
              {labels.templateNameLabel}
            </label>
            <input
              id="clone-template-name"
              autoFocus
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className="minimal-input"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="minimal-button-secondary flex-1"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim() || !sectorId}
              className="minimal-button-primary flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-3 w-3 mx-auto" />
              ) : (
                labels.submit
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
