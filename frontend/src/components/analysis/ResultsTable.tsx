import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpDown, CheckCircle2, XCircle } from 'lucide-react'
import type { AnovaRow } from '@/types'
import { useTranslation } from '@/lib/i18n'
import { formatPValue } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ResultsTableProps {
  results: AnovaRow[]
}

type SortKey = keyof AnovaRow
type SortOrder = 'asc' | 'desc'

export function ResultsTable({ results }: ResultsTableProps) {
  const { t } = useTranslation()
  const [sortKey, setSortKey] = useState<SortKey>('pValue')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
      }
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal)
      }
      return 0
    })
  }, [results, sortKey, sortOrder])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('asc')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card overflow-hidden"
    >
      <div className="card-header">
        <h3 className="font-semibold text-text-primary">{t('results.anova')}</h3>
        <p className="text-sm text-text-secondary mt-1">
          {results.length} {t('results.analyzed')}
        </p>
      </div>

      <div className="overflow-auto max-h-[400px]">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-accent/5">
              <SortableHeader
                label={t('results.variable')}
                sortKey="variable"
                currentSortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label={t('results.pValue')}
                sortKey="pValue"
                currentSortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label={t('results.fdr')}
                sortKey="fdr"
                currentSortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <SortableHeader
                label={t('results.bonferroniSig')}
                sortKey="bonferroni"
                currentSortKey={sortKey}
                sortOrder={sortOrder}
                onSort={handleSort}
              />
              <th className="px-4 py-3 text-left font-semibold text-text-secondary bg-accent/5 border-b border-border uppercase tracking-wider text-2xs">
                {t('results.significant')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((row, i) => (
              <motion.tr
                key={row.variable}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  'border-b border-border-subtle transition-colors',
                  row.benjamini && 'bg-accent/5'
                )}
              >
                <td className="px-4 py-3 font-medium text-text-primary">
                  {row.variable}
                </td>
                <td className="px-4 py-3 font-mono text-text-primary tabular-nums">
                  {formatPValue(row.pValue)}
                </td>
                <td className="px-4 py-3 font-mono text-text-primary tabular-nums">
                  {formatPValue(row.fdr)}
                </td>
                <td className="px-4 py-3 font-mono text-text-primary tabular-nums">
                  {formatPValue(row.bonferroni)}
                </td>
                <td className="px-4 py-3">
                  {row.benjamini ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('results.significant')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface-overlay text-text-muted">
                      <XCircle className="h-3.5 w-3.5" />
                      {t('results.notSignificant')}
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

function SortableHeader({
  label,
  sortKey,
  currentSortKey,
  onSort,
}: {
  label: string
  sortKey: SortKey
  currentSortKey: SortKey
  sortOrder: SortOrder
  onSort: (key: SortKey) => void
}) {
  const isActive = currentSortKey === sortKey

  return (
    <th
      className={cn(
        'px-4 py-3 text-left font-semibold border-b border-border uppercase tracking-wider text-2xs cursor-pointer select-none transition-colors',
        'bg-accent/5',
        isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary'
      )}
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={cn(
            'h-3.5 w-3.5 transition-opacity',
            isActive ? 'opacity-100' : 'opacity-30'
          )}
        />
      </div>
    </th>
  )
}
