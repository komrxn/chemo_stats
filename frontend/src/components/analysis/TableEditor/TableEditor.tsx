import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Workbook, WorkbookInstance } from '@fortune-sheet/react'
import '@fortune-sheet/react/dist/index.css'
import { X, Save, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { UnsavedChangesDialog } from './UnsavedChangesDialog'
import { useTranslation } from '@/lib/i18n'
import './TableEditor.css'

interface TableEditorProps {
    initialData: string[][]
    onSave: (data: string[][]) => void
    onClose: () => void
}

/**
 * Converts a 2D string array to FortuneSheet cell data format.
 * Each cell has { r: rowIndex, c: colIndex, v: { v: value, m: displayValue } }
 */
function toFortuneSheetData(data: string[][]) {
    const celldata: any[] = []

    data.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell !== '' && cell !== null && cell !== undefined) {
                // Try to parse as number for proper display
                const numVal = parseFloat(cell)
                const isNum = !isNaN(numVal) && isFinite(numVal)

                celldata.push({
                    r,
                    c,
                    v: {
                        v: isNum ? numVal : cell,
                        m: cell,
                        ct: isNum ? { fa: 'General', t: 'n' } : { fa: '@', t: 's' }
                    }
                })
            }
        })
    })

    return [{
        name: 'Sheet1',
        celldata,
        row: Math.max(data.length, 100),
        column: Math.max(data[0]?.length || 0, 26),
        config: {}
    }]
}

/**
 * Extracts a 2D string array from FortuneSheet workbook data.
 */
function fromFortuneSheetData(sheets: any[]): string[][] {
    if (!sheets || sheets.length === 0) return []

    const sheet = sheets[0]
    const data: string[][] = []

    // Find dimensions
    let maxRow = 0
    let maxCol = 0

    if (sheet.data) {
        // Handle data array format
        sheet.data.forEach((row: any[], r: number) => {
            if (row) {
                row.forEach((cell: any, c: number) => {
                    if (cell && (cell.v !== undefined && cell.v !== null && cell.v !== '')) {
                        maxRow = Math.max(maxRow, r)
                        maxCol = Math.max(maxCol, c)
                    }
                })
            }
        })

        // Build 2D array
        for (let r = 0; r <= maxRow; r++) {
            const row: string[] = []
            for (let c = 0; c <= maxCol; c++) {
                const cell = sheet.data[r]?.[c]
                row.push(cell?.m ?? cell?.v?.toString() ?? '')
            }
            data.push(row)
        }
    } else if (sheet.celldata) {
        // Handle celldata format
        sheet.celldata.forEach((cell: any) => {
            maxRow = Math.max(maxRow, cell.r)
            maxCol = Math.max(maxCol, cell.c)
        })

        // Initialize empty grid
        for (let r = 0; r <= maxRow; r++) {
            data.push(new Array(maxCol + 1).fill(''))
        }

        // Fill in values
        sheet.celldata.forEach((cell: any) => {
            const val = cell.v?.m ?? cell.v?.v?.toString() ?? ''
            data[cell.r][cell.c] = val
        })
    }

    return data
}

export function TableEditor({ initialData, onSave, onClose }: TableEditorProps) {
    const { t } = useTranslation()
    const workbookRef = useRef<WorkbookInstance>(null)
    const [hasChanges, setHasChanges] = useState(false)
    const [showUnsavedDialog, setShowUnsavedDialog] = useState(false)

    // Convert initial data to FortuneSheet format
    const sheetData = useMemo(() => toFortuneSheetData(initialData), [initialData])

    // Track changes via onOp callback
    const handleOp = useCallback(() => {
        setHasChanges(true)
    }, [])

    // Handle save
    const handleSave = useCallback(() => {
        if (workbookRef.current) {
            const sheets = workbookRef.current.getAllSheets()
            const extractedData = fromFortuneSheetData(sheets)
            onSave(extractedData)
            setHasChanges(false)
        }
    }, [onSave])

    // Handle close with unsaved changes check
    const handleClose = useCallback(() => {
        if (hasChanges) {
            setShowUnsavedDialog(true)
        } else {
            onClose()
        }
    }, [hasChanges, onClose])

    // Handle discard
    const handleDiscard = useCallback(() => {
        setShowUnsavedDialog(false)
        onClose()
    }, [onClose])

    // Handle continue editing
    const handleContinue = useCallback(() => {
        setShowUnsavedDialog(false)
    }, [])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Cmd/Ctrl + S to save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
            // Escape to close
            if (e.key === 'Escape') {
                e.preventDefault()
                handleClose()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleSave, handleClose])

    return (
        <div className="table-editor-overlay">
            <div className="table-editor-container">
                {/* Header */}
                <div className="table-editor-header">
                    <div className="table-editor-title">
                        <Table2 className="h-5 w-5 text-accent" />
                        <span>{t('data.editTable')}</span>
                        {hasChanges && (
                            <span className="table-editor-unsaved-badge">
                                {t('data.unsavedChanges')}
                            </span>
                        )}
                    </div>

                    <div className="table-editor-actions">
                        <Button
                            variant="default"
                            size="sm"
                            onClick={handleSave}
                            disabled={!hasChanges}
                        >
                            <Save className="h-4 w-4" />
                            {t('data.saveChanges')}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={handleClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Spreadsheet */}
                <div className="table-editor-content">
                    <Workbook
                        ref={workbookRef}
                        data={sheetData}
                        onOp={handleOp}
                        showToolbar={true}
                        showFormulaBar={true}
                        showSheetTabs={false}
                    />
                </div>
            </div>

            {/* Unsaved Changes Dialog */}
            <UnsavedChangesDialog
                open={showUnsavedDialog}
                onDiscard={handleDiscard}
                onContinue={handleContinue}
            />
        </div>
    )
}
