import React from 'react'

interface ControlGroupProps {
    label: string
    icon?: React.ElementType
    children: React.ReactNode
}

export function ControlGroup({ label, icon: Icon, children }: ControlGroupProps) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary flex items-center gap-2 uppercase tracking-wide">
                {Icon && <Icon className="h-3 w-3" />} {label}
            </label>
            {children}
        </div>
    )
}
