/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReactNode } from 'react';

type EsgSectionCardProps = {
  sectionNumber: number;
  title: string;
  children: ReactNode;
};

export function EsgSectionCard({ sectionNumber, title, children }: EsgSectionCardProps) {
  return (
    <section className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
      <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
        {sectionNumber}. {title}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}
