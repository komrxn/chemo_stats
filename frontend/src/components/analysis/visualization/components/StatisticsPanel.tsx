import { useMemo } from 'react'

interface StatisticsPanelProps {
    data: number[] // Raw values to calculate stats from
}

export function StatisticsPanel({ data }: StatisticsPanelProps) {
    const stats = useMemo(() => {
        if (!data || data.length === 0) return null

        const sorted = [...data].sort((a, b) => a - b)
        const n = sorted.length
        const sum = sorted.reduce((a, b) => a + b, 0)
        const mean = sum / n
        const min = sorted[0]
        const max = sorted[n - 1]

        // Median calculation
        const mid = Math.floor(n / 2)
        const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2

        const zeros = data.filter(v => v === 0).length

        return {
            mean,
            median,
            min,
            max,
            zeros,
            n
        }
    }, [data])

    if (!stats) return null

    return (
        <div className="border-t border-border p-4 bg-surface-raised/50">
            <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-3 pb-2 border-b border-border/50">
                Statistics
            </h4>
            <div className="space-y-2">
                <StatRow label="Mean" value={stats.mean.toFixed(2)} />
                <StatRow label="Median" value={stats.median.toFixed(2)} />
                <StatRow label="Min / Max" value={`${stats.min.toFixed(2)} / ${stats.max.toFixed(2)}`} />
                <StatRow
                    label="Zeros"
                    value={`${stats.zeros} (${(stats.zeros / stats.n * 100).toFixed(1)}%)`}
                />
            </div>
        </div>
    )
}


function StatRow({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex justify-between items-end text-sm">
            <span className="text-text-secondary">{label}</span>
            <span className="font-mono text-text-primary font-medium">{value}</span>
        </div>
    )
}
