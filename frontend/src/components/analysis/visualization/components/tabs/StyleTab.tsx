import { PlotConfig } from '../../types'
import { ControlGroup } from '../ControlGroup'
import { Type, Maximize2, Activity, Sliders, RefreshCw, Palette } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface StyleTabProps {
    config: PlotConfig
    updateConfig: (key: keyof PlotConfig, value: any) => void
}

export function StyleTab({ config, updateConfig }: StyleTabProps) {
    return (
        <div className="space-y-4">
            {/* --- BOX PLOT SPECIFIC --- */}
            {config.type === 'box' && (
                <ControlGroup label="Box Options" icon={Sliders}>
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={config.boxNotch} onChange={e => updateConfig('boxNotch', e.target.checked)} id="notch" />
                            <label htmlFor="notch" className="text-sm text-text-secondary select-none">Notched (Median Confidence)</label>
                        </div>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" checked={config.showOutliers} onChange={e => updateConfig('showOutliers', e.target.checked)} id="outliers" />
                            <label htmlFor="outliers" className="text-sm text-text-secondary select-none">Show Outliers</label>
                        </div>
                    </div>
                </ControlGroup>
            )}

            {/* --- PIE CHART SPECIFIC --- */}
            {config.type === 'pie' && (
                <ControlGroup label="Pie Options" icon={Activity}>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <label className="text-xs text-text-secondary">Hole Size (Donut)</label>
                            <span className="text-xs text-text-muted">{config.pieHole}</span>
                        </div>
                        <input type="range" min="0" max="0.8" step="0.1" value={config.pieHole} onChange={e => updateConfig('pieHole', Number(e.target.value))} className="w-full" />
                    </div>
                </ControlGroup>
            )}

            {/* SCATTER / LINE / STEM / BOX CONTROLS */}
            {(['scatter', 'line', 'stem', 'box'].includes(config.type)) && (
                <>
                    <ControlGroup label="Marker Symbol" icon={Type}>
                        <select className="input-select" value={config.markerSymbol} onChange={e => updateConfig('markerSymbol', e.target.value)}>
                            <option value="circle">Circle (o)</option>
                            <option value="square">Square (s)</option>
                            <option value="diamond">Diamond (d)</option>
                            <option value="cross">Cross (x)</option>
                            <option value="triangle-up">Triangle Up (^)</option>
                            <option value="triangle-down">Triangle Down (v)</option>
                            {/* Line can have none, others usually need markers except box outliers which might be controlled elsewise but we reuse this */}
                            <option value="none">None</option>
                        </select>
                    </ControlGroup>

                    <ControlGroup label="Marker Size" icon={Maximize2}>
                        <div className="flex items-center gap-2">
                            <input type="range" min="1" max="25" value={config.markerSize} onChange={e => updateConfig('markerSize', Number(e.target.value))} className="flex-1" />
                            <span className="text-xs w-8 text-right">{config.markerSize}</span>
                        </div>
                    </ControlGroup>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" checked={config.markerFilled} onChange={e => updateConfig('markerFilled', e.target.checked)} id="filled" />
                        <label htmlFor="filled" className="text-sm text-text-secondary select-none">Filled Markers</label>
                    </div>
                </>
            )}

            {/* LINE / STEM SPECIFIC */}
            {['line', 'stem'].includes(config.type) && (
                <>
                    <ControlGroup label="Line Style" icon={Activity}>
                        <select className="input-select" value={config.lineStyle} onChange={e => updateConfig('lineStyle', e.target.value)}>
                            <option value="solid">Solid (-)</option>
                            <option value="dash">Dashed (--)</option>
                            <option value="dot">Dotted (:)</option>
                            <option value="dashdot">Dash-Dot (-.)</option>
                        </select>
                    </ControlGroup>
                    <ControlGroup label="Line Width" icon={Sliders}>
                        <div className="flex items-center gap-2">
                            <input type="range" min="0.5" max="10" step="0.5" value={config.lineWidth} onChange={e => updateConfig('lineWidth', Number(e.target.value))} className="flex-1" />
                            <span className="text-xs w-8 text-right">{config.lineWidth}</span>
                        </div>
                    </ControlGroup>
                </>
            )}

            {/* HISTOGRAM SPECIFIC */}
            {config.type === 'histogram' && (
                <>
                    <ControlGroup label="Normalization" icon={RefreshCw}>
                        <select className="input-select" value={config.normalization} onChange={e => updateConfig('normalization', e.target.value)}>
                            <option value="">Count</option>
                            <option value="probability">Probability</option>
                            <option value="percent">Percent</option>
                            <option value="probability density">PDF</option>
                        </select>
                    </ControlGroup>
                    <ControlGroup label="Bins" icon={Sliders}>
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={config.bins}
                                onChange={e => updateConfig('bins', e.target.value === 'auto' ? 'auto' : Number(e.target.value) || 'auto')}
                                className="input-text w-full"
                                placeholder="auto or number"
                            />
                        </div>
                    </ControlGroup>
                    <ControlGroup label="Orientation" icon={RefreshCw}>
                        <div className="flex gap-2">
                            <Button size="sm" variant={config.orientation === 'v' ? 'default' : 'secondary'} onClick={() => updateConfig('orientation', 'v')}>Vertical</Button>
                            <Button size="sm" variant={config.orientation === 'h' ? 'default' : 'secondary'} onClick={() => updateConfig('orientation', 'h')}>Horizontal</Button>
                        </div>
                    </ControlGroup>
                </>
            )}

            {/* GLOBAL COLOR / ALPHA */}
            <ControlGroup label="Color Override" icon={Palette}>
                <select className="input-select" value={config.markerColor} onChange={e => updateConfig('markerColor', e.target.value)}>
                    <option value="auto">Auto (Grouped)</option>
                    <option value="#6366f1">Indigo</option>
                    <option value="#ec4899">Pink</option>
                    <option value="#10b981">Emerald</option>
                    <option value="#f59e0b">Amber</option>
                    <option value="#ffffff">White</option>
                    <option value="#000000">Black</option>
                </select>
            </ControlGroup>

            <ControlGroup label="Transparency" icon={Sliders}>
                <div className="flex items-center gap-2">
                    <input type="range" min="0" max="1" step="0.1" value={config.alpha} onChange={e => updateConfig('alpha', Number(e.target.value))} className="flex-1" />
                    <span className="text-xs w-8 text-right">{config.alpha}</span>
                </div>
            </ControlGroup>
        </div>
    )
}
