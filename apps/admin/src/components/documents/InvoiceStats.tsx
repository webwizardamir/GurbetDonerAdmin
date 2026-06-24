// Statistics cards shown at the top of the Invoices/Documents page.
// Displays total documents, invoices, credit notes, and other document counts.

import { Files, FileCheck, FileMinus, FileText } from 'lucide-react'
import StatCard from '../StatCard'

export interface InvoiceStatsData {
  total: number
  invoices: number
  creditNotes: number
  other: number
}

interface InvoiceStatsProps {
  stats: InvoiceStatsData
  t: (key: string) => string
}

export default function InvoiceStats({ stats, t }: InvoiceStatsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard
        label={t('documents.stats.totalDocuments')}
        value={stats.total}
        icon={Files}
        iconColor="text-slate-600 dark:text-slate-400"
        iconBg="bg-slate-100 dark:bg-slate-700"
      />
      <StatCard
        label={t('documents.stats.invoices')}
        value={stats.invoices}
        icon={FileCheck}
        iconColor="text-green-600 dark:text-green-400"
        iconBg="bg-green-50 dark:bg-green-900/20"
      />
      <StatCard
        label={t('documents.stats.creditNotes')}
        value={stats.creditNotes}
        icon={FileMinus}
        iconColor="text-purple-600 dark:text-purple-400"
        iconBg="bg-purple-50 dark:bg-purple-900/20"
      />
      <StatCard
        label={t('documents.stats.other')}
        value={stats.other}
        icon={FileText}
        iconColor="text-blue-600 dark:text-blue-400"
        iconBg="bg-blue-50 dark:bg-blue-900/20"
      />
    </div>
  )
}
