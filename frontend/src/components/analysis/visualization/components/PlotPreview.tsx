import Plot from 'react-plotly.js'
import type { Data, Layout as PlotlyLayout } from 'plotly.js'

interface PlotPreviewProps {
    plotData: Data[]
    layout: Partial<PlotlyLayout>
}

export function PlotPreview({ plotData, layout }: PlotPreviewProps) {
    return (
        <div className="flex-1 bg-surface-base relative flex items-center justify-center p-4">
            <Plot
                data={plotData}
                layout={layout}
                useResizeHandler
                className="w-full h-full"
                config={{
                    displayModeBar: true,
                    displaylogo: false,
                    responsive: true,
                    modeBarButtonsToRemove: ['lasso2d', 'select2d'],
                    toImageButtonOptions: {
                        format: 'png',
                        filename: 'matlab_style_plot',
                        height: 800,
                        width: 1200,
                        scale: 3
                    }
                }}
            />
            {plotData.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-text-muted bg-surface-base/80 z-10">
                    <p>Configure Data to View Plot</p>
                </div>
            )}
        </div>
    )
}
