import { useState, useRef } from 'react';
import { Settings, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  COLUMN_LABELS,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_COLUMN_ORDER,
  reorderColumns,
} from '../../lib/columnState';
import { UI_HIDDEN_QUESTION_COLUMNS } from '../../lib/questionKayitLog';

interface ColumnSettingsPanelProps {
  columnOrder: string[];
  columnVisibility: Record<string, boolean>;
  onColumnOrderChange: (order: string[]) => void;
  onColumnVisibilityChange: (visibility: Record<string, boolean>) => void;
}

export function ColumnSettingsPanel({
  columnOrder,
  columnVisibility,
  onColumnOrderChange,
  onColumnVisibilityChange,
}: ColumnSettingsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleResetColumns = () => {
    onColumnOrderChange(DEFAULT_COLUMN_ORDER);
    onColumnVisibilityChange(DEFAULT_COLUMN_VISIBILITY);
  };

  const handleToggleVisibility = (columnId: string) => {
    const newVis = !columnVisibility[columnId];
    onColumnVisibilityChange({
      ...columnVisibility,
      [columnId]: newVis,
    });
  };

  const handleDragStart = (columnId: string) => {
    setDraggedId(columnId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      return;
    }
    onColumnOrderChange(reorderColumns(columnOrder, draggedId, targetId));
    setDraggedId(null);
  };

  const visibleCount = Object.values(columnVisibility).filter(Boolean).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        title="Column settings"
      >
        <Settings size={16} />
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
          {visibleCount} visible
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900">Column Settings</h3>
            <button
              onClick={handleResetColumns}
              className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors"
              title="Reset to defaults"
            >
              <RotateCcw size={14} />
              Reset
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {columnOrder
              .filter((columnId) => !UI_HIDDEN_QUESTION_COLUMNS.has(columnId))
              .map((columnId) => (
              <div
                key={columnId}
                draggable
                onDragStart={() => handleDragStart(columnId)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDrop(columnId);
                }}
                className={cn(
                  'flex items-center gap-3 p-2 rounded-lg cursor-move hover:bg-slate-50 transition-colors',
                  draggedId === columnId && 'bg-blue-50 border border-blue-200'
                )}
              >
                {/* Drag Handle */}
                <div className="text-slate-400 cursor-grab active:cursor-grabbing flex-shrink-0">
                  ⋮⋮
                </div>

                {/* Column Label */}
                <span className="flex-1 text-sm text-slate-700 font-medium">
                  {COLUMN_LABELS[columnId] || columnId}
                </span>

                {/* Visibility Toggle */}
                <button
                  onClick={() => handleToggleVisibility(columnId)}
                  className="inline-flex items-center justify-center p-1 text-slate-600 hover:text-slate-900 transition-colors"
                  title={columnVisibility[columnId] ? 'Hide column' : 'Show column'}
                >
                  {columnVisibility[columnId] ? (
                    <Eye size={16} />
                  ) : (
                    <EyeOff size={16} className="opacity-50" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-500">
            Drag ⋮⋮ to reorder • Click eye icon to show/hide
          </div>
        </div>
      )}
    </div>
  );
}
