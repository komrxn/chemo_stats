import type { MetadataColumn } from '@/types'

/**
 * Robustly extracts and resolves the group label for a given row and variable name.
 * Handles:
 * 1. Fuzzy key matching (if column name in code differs slightly from row key).
 * 2. Backend-provided metadata mappings.
 * 3. Inline header parsing (e.g., "Season 1=Spring") if lookup fails.
 * 
 * @param row The data row object.
 * @param variableName The name of the grouping variable (column header).
 * @param metadataColumns Array of metadata columns from FilePreview.
 * @returns The resolved label (string) or 'Undefined' if not found.
 */
export function resolveGroupValue(
    row: any,
    variableName: string,
    metadataColumns: MetadataColumn[]
): string {
    if (!variableName) return 'All'

    // 1. Find the correct key in the row data
    let rowKey = variableName
    if (row[rowKey] === undefined) {
        // Fuzzy match: find key that contains variableName or vice versa (ignoring whitespace)
        const normalizedVar = variableName.trim()
        const potentialKey = Object.keys(row).find(k =>
            k.trim() === normalizedVar ||
            normalizedVar.startsWith(k) ||
            k.startsWith(normalizedVar)
        )
        if (potentialKey) rowKey = potentialKey
    }

    // 2. Get raw value
    const rawVal = row[rowKey]
    if (rawVal === undefined || rawVal === null || rawVal === '') return 'Undefined'

    // 3. Try to resolve mapping
    // Priority A: Backend provided mapping
    const meta = metadataColumns.find(c => c.name === variableName)
    if (meta?.mapping && meta.mapping[String(rawVal)]) {
        return meta.mapping[String(rawVal)]
    }

    // Priority B: Parse mapping from the column name itself (e.g., "Season 1=Spring; 2=Summer")
    if (variableName.includes('=')) {
        try {
            const matches = variableName.matchAll(/(\d+)\s*=\s*([^;,]+)/g)
            for (const match of matches) {
                const [_, val, label] = match
                if (String(rawVal).trim() === val) return label.trim()
            }
        } catch (e) {
            // Parsing failed, fallback to raw value
        }
    }

    return String(rawVal)
}
