import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Workbook, WorkbookInstance } from '@fortune-sheet/react'
import '@fortune-sheet/react/dist/index.css'
import { Save, X, Table2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useTranslation } from '@/lib/i18n'
import './TableEditor.css'

const STORAGE_KEY = 'tableEditorData'

/**
 * Converts a 2D string array to FortuneSheet cell data format.
 */
function toFortuneSheetData(data: string[][]) {
    const celldata: any[] = []

    data.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell !== '' && cell !== null && cell !== undefined) {
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

    let maxRow = 0
    let maxCol = 0

    if (sheet.data) {
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

        for (let r = 0; r <= maxRow; r++) {
            const row: string[] = []
            for (let c = 0; c <= maxCol; c++) {
                const cell = sheet.data[r]?.[c]
                row.push(cell?.m ?? cell?.v?.toString() ?? '')
            }
            data.push(row)
        }
    } else if (sheet.celldata) {
        sheet.celldata.forEach((cell: any) => {
            maxRow = Math.max(maxRow, cell.r)
            maxCol = Math.max(maxCol, cell.c)
        })

        for (let r = 0; r <= maxRow; r++) {
            data.push(new Array(maxCol + 1).fill(''))
        }

        sheet.celldata.forEach((cell: any) => {
            const val = cell.v?.m ?? cell.v?.v?.toString() ?? ''
            data[cell.r][cell.c] = val
        })
    }

    return data
}

/**
 * Table Editor Page - Opens in a separate window
 */
export function TableEditorPage() {
    const { t } = useTranslation()
    const workbookRef = useRef<WorkbookInstance>(null)
    const [hasChanges, setHasChanges] = useState(false)
    const [loading, setLoading] = useState(true)
    const [initialData, setInitialData] = useState<string[][] | null>(null)
    const [tableId, setTableId] = useState<string | null>(null)

    // Load data from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                setInitialData(parsed.data)
                setTableId(parsed.tableId)
            } catch (e) {
                console.error('Failed to parse editor data:', e)
            }
        }
        setLoading(false)
    }, [])

    // Convert initial data to FortuneSheet format
    const sheetData = useMemo(() => {
        if (!initialData) return null
        return toFortuneSheetData(initialData)
    }, [initialData])

    // Track changes
    const handleOp = useCallback(() => {
        setHasChanges(true)
    }, [])

    // Handle save
    const handleSave = useCallback(() => {
        if (workbookRef.current && tableId) {
            const sheets = workbookRef.current.getAllSheets()
            const extractedData = fromFortuneSheetData(sheets)

            // Store result for parent window
            localStorage.setItem(STORAGE_KEY + '_result', JSON.stringify({
                tableId,
                data: extractedData,
                saved: true
            }))

            // Notify opener window
            if (window.opener) {
                window.opener.postMessage({ type: 'TABLE_EDITOR_SAVE', tableId, data: extractedData }, '*')
            }

            setHasChanges(false)
            window.close()
        }
    }, [tableId])

    // Handle close
    const handleClose = useCallback(() => {
        if (hasChanges) {
            const confirmed = window.confirm(t('data.unsavedChangesDesc'))
            if (!confirmed) return
        }

        // Clear storage
        localStorage.removeItem(STORAGE_KEY)
        localStorage.removeItem(STORAGE_KEY + '_result')
        window.close()
    }, [hasChanges, t])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault()
                handleSave()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [handleSave])

    // Warn before closing with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasChanges) {
                e.preventDefault()
                e.returnValue = ''
            }
        }

        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [hasChanges])

    if (loading) {
        return (
            <div className="table-editor-loading">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <span>Loading editor...</span>
            </div>
        )
    }

    if (!sheetData) {
        return (
            <div className="table-editor-error">
                <Table2 className="h-12 w-12 text-text-muted" />
                <h2>No data to edit</h2>
                <p>Please open the editor from the main application.</p>
                <Button variant="secondary" onClick={() => window.close()}>
                    Close Window
                </Button>
            </div>
        )
    }

    return (
        <div className="table-editor-page">
            {/* Header */}
            <div className="table-editor-page-header">
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
            <div className="table-editor-page-content">
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
    )
}

/**
 * Opens the TableEditor in a new browser window.
 */
export function openTableEditor(tableId: string, data: string[][]) {
    // Store data in localStorage for the new window to access
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tableId, data }))

    // Open new window
    const width = Math.min(1400, window.screen.width - 100)
    const height = Math.min(900, window.screen.height - 100)
    const left = (window.screen.width - width) / 2
    const top = (window.screen.height - height) / 2

    const editorWindow = window.open(
        '/table-editor',
        'TableEditor',
        `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no`
    )

    return editorWindow
}

/**
 * Gets the result from the table editor if available.
 */
export function getTableEditorResult(): { tableId: string, data: string[][], saved: boolean } | null {
    const stored = localStorage.getItem(STORAGE_KEY + '_result')
    if (stored) {
        try {
            const result = JSON.parse(stored)
            localStorage.removeItem(STORAGE_KEY + '_result')
            return result
        } catch {
            return null
        }
    }
    return null
}
