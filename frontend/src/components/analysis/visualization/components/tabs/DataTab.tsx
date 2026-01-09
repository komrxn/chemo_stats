import type { FilePreview } from '@/types'
import { PlotConfig } from '../../types'
import { ControlGroup } from '../ControlGroup'
import { Layout, Code, Settings2 } from 'lucide-react'

interface DataTabProps {
    preview: FilePreview
    config: PlotConfig
    updateConfig: (key: keyof PlotConfig, value: any) => void
}

export function DataTab({ preview, config, updateConfig }: DataTabProps) {
    return (
        <div className="space-y-4">
            <ControlGroup label="Plot Type" icon={Layout}>
                <select
                    className="input-select"
                    value={config.type}
                    onChange={e => updateConfig('type', e.target.value)}
                >
                    <option value="scatter">Scatter</option>
                    <option value="line">Line</option>
                    <option value="histogram">Histogram</option>
                    <option value="box">Box Plot</option>
                    <option value="pie">Pie Chart</option>
                    <option value="stem">Stem Plot</option>
                </select>
            </ControlGroup>

            <ControlGroup label="X Variable" icon={Code}>
                <select className="input-select" value={config.xVariable} onChange={e => updateConfig('xVariable', e.target.value)}>
                    {preview.variableNames.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </ControlGroup>

            {config.type !== 'histogram' && (
                <ControlGroup label="Y Variable" icon={Code}>
                    <select className="input-select" value={config.yVariable} onChange={e => updateConfig('yVariable', e.target.value)}>
                        {preview.variableNames.map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </ControlGroup>
            )}

            <ControlGroup label="Group By" icon={Settings2}>
                <select className="input-select" value={config.groupVariable} onChange={e => updateConfig('groupVariable', e.target.value)}>
                    <option value="">None</option>
                    {preview.metadataColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
            </ControlGroup>
        </div>
    )
}
