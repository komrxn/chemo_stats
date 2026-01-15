import type { FilePreview, MetadataColumn } from '@/types'

/**
 * Parses raw 2D string array data into a FilePreview object.
 * This is used when data is edited in the TableEditor and needs to be re-parsed locally.
 */
export function parseRawDataToPreview(rawData: string[][]): FilePreview {
    // Defensive: ensure we have valid data
    if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
        return {
            triggerFound: false,
            triggerColumn: null,
            metadataColumns: [],
            variableNames: [],
            numSamples: 0,
            numVariables: 0,
            previewRows: [],
            rawPreview: [],
        }
    }

    // First row is headers
    const headers = rawData[0] || []
    const dataRows = rawData.slice(1)

    // Defensive: if no headers, return empty
    if (headers.length === 0) {
        return {
            triggerFound: false,
            triggerColumn: null,
            metadataColumns: [],
            variableNames: [],
            numSamples: dataRows.length,
            numVariables: 0,
            previewRows: [],
            rawPreview: rawData,
        }
    }

    // Categorize columns
    const metadataColumns: MetadataColumn[] = []
    const variableNames: string[] = []
    let triggerColumn: string | null = null

    headers.forEach((header, colIndex) => {
        // Skip empty headers
        if (!header || header.trim() === '') return

        // Check if column is numeric or categorical
        const values = dataRows.map(row => row?.[colIndex] ?? '')
        const nonEmptyValues = values.filter(v => v !== '' && v !== null && v !== undefined)

        // Avoid division by zero
        if (nonEmptyValues.length === 0) {
            // Empty column - treat as metadata
            metadataColumns.push({
                name: header,
                uniqueCount: 0,
                sampleValues: [],
            })
            return
        }

        // Try to determine if it's numeric
        const numericCount = nonEmptyValues.filter(v => {
            const parsed = parseFloat(String(v))
            return !isNaN(parsed) && isFinite(parsed)
        }).length
        const isNumeric = numericCount / nonEmptyValues.length > 0.9

        // Check for trigger column (usually named 'Trigger' or 'DATA')
        const headerLower = header.toLowerCase()
        if (headerLower.includes('trigger') || headerLower === 'data') {
            triggerColumn = header
        }

        if (isNumeric) {
            variableNames.push(header)
        } else {
            // It's a categorical/metadata column
            const uniqueValues = [...new Set(values.filter(v => v !== '' && v !== null))]
            metadataColumns.push({
                name: header,
                uniqueCount: uniqueValues.length,
                sampleValues: uniqueValues.slice(0, 5),
            })
        }
    })

    // Convert to previewRows format (object array)
    const previewRows: Record<string, string>[] = dataRows.map(row => {
        const obj: Record<string, string> = {}
        headers.forEach((header, idx) => {
            if (header && header.trim() !== '') {
                obj[header] = row?.[idx] ?? ''
            }
        })
        return obj
    })

    return {
        triggerFound: triggerColumn !== null,
        triggerColumn,
        metadataColumns,
        variableNames,
        numSamples: dataRows.length,
        numVariables: variableNames.length,
        previewRows,
        rawPreview: rawData,
    }
}

