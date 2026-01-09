import { PlotConfig } from '../../types'
import { ControlGroup } from '../ControlGroup'

interface LayoutTabProps {
    config: PlotConfig
    updateConfig: (key: keyof PlotConfig, value: any) => void
}

export function LayoutTab({ config, updateConfig }: LayoutTabProps) {
    return (
        <div className="space-y-4">
            <ControlGroup label="Plot Title">
                <input className="input-text" value={config.title} onChange={e => updateConfig('title', e.target.value)} />
            </ControlGroup>
            <ControlGroup label="X Axis Label">
                <input className="input-text" value={config.xLabel} onChange={e => updateConfig('xLabel', e.target.value)} />
            </ControlGroup>
            <ControlGroup label="Y Axis Label">
                <input className="input-text" value={config.yLabel} onChange={e => updateConfig('yLabel', e.target.value)} />
            </ControlGroup>

            <div className="flex items-center gap-2 mt-4">
                <input type="checkbox" checked={config.showGrid} onChange={e => updateConfig('showGrid', e.target.checked)} id="grid" />
                <label htmlFor="grid" className="text-sm text-text-secondary select-none">Show Grid</label>
            </div>
            <div className="flex items-center gap-2">
                <input type="checkbox" checked={config.showLegend} onChange={e => updateConfig('showLegend', e.target.checked)} id="legend" />
                <label htmlFor="legend" className="text-sm text-text-secondary select-none">Show Legend</label>
            </div>
        </div>
    )
}
