import { useRef } from 'react';
import { Paperclip, Trash2 } from 'lucide-react';
import { cn } from '../../../lib/utils';

type TasksEvidenceAttachProps = {
  evidenceName?: string;
  readonly?: boolean;
  saving?: boolean;
  attachLabel: string;
  manageLabel: string;
  onAttach: (fileName: string) => void;
  onRemove: () => void;
};

export function TasksEvidenceAttach({
  evidenceName,
  readonly = false,
  saving = false,
  attachLabel,
  manageLabel,
  onAttach,
  onRemove,
}: TasksEvidenceAttachProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (readonly || saving) return;
    inputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        disabled={readonly || saving}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onAttach(file.name);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={readonly || saving}
        onClick={openPicker}
        className={cn(
          'flex items-center gap-2 rounded-lg border px-3 py-2 text-[10px] font-bold uppercase tracking-widest',
          evidenceName
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
            : 'border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700',
          'disabled:cursor-not-allowed disabled:opacity-60',
        )}
      >
        <Paperclip size={14} />
        {evidenceName ? manageLabel : attachLabel}
      </button>
      {evidenceName ? (
        <div className="flex items-center justify-between gap-3 border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="min-w-0 truncate text-sm font-medium text-slate-800">{evidenceName}</span>
          {!readonly ? (
            <button
              type="button"
              disabled={saving}
              onClick={onRemove}
              className="shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-60"
              aria-label="Remove file"
            >
              <Trash2 size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
