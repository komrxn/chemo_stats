import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { FilePreview } from '@/types'
import { PlotConfig } from '../types'
import { DataTab } from './tabs/DataTab'
import { StyleTab } from './tabs/StyleTab'
import { LayoutTab } from './tabs/LayoutTab'

import { StatisticsPanel } from './StatisticsPanel'

interface PropertyInspectorProps {
    preview: FilePreview
    config: PlotConfig
    updateConfig: (key: keyof PlotConfig | string, value: any) => void
    statsData?: number[]
}

export function PropertyInspector({ preview, config, updateConfig, statsData }: PropertyInspectorProps) {
    const [activeTab, setActiveTab] = useState<'data' | 'style' | 'layout'>('data')

    const TabButton = ({ id, label }: { id: typeof activeTab, label: string }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={cn(
                "flex-1 py-3 text-xs font-medium border-b-2 transition-colors",
                activeTab === id ? "border-violet-500 text-violet-500" : "border-transparent text-text-muted hover:text-text-primary"
            )}
        >
            {label}
        </button>
    )

    return (
        <div className="w-full lg:w-80 border-r border-border bg-surface-raised flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-border shrink-0">
                <TabButton id="data" label="Data" />
                <TabButton id="style" label="Appearance" />
                <TabButton id="layout" label="Layout" />
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {activeTab === 'data' && <DataTab preview={preview} config={config} updateConfig={updateConfig} />}
                {activeTab === 'style' && <StyleTab config={config} updateConfig={updateConfig} />}
                {activeTab === 'layout' && <LayoutTab config={config} updateConfig={updateConfig} />}
            </div>

            {/* Statistics at Bottom */}
            {statsData && <StatisticsPanel data={statsData} />}
        </div>
    )
}
