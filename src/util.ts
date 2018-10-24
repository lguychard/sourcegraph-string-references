// from https://github.com/sourcegraph/sourcegraph-basic-code-intel/blob/7f1a7a9f8588f80a2eb4991f61f2d5ece4ea17c9/src/handler.ts#L87
export function parseUri(uri: string): { repo: string; version: string; path: string } {
    if (!uri.startsWith('git://')) {
        throw new Error('unexpected uri format: ' + uri)
    }
    const repoRevPath = uri.substr('git://'.length)
    const i = repoRevPath.indexOf('?')
    if (i < 0) {
        throw new Error('unexpected uri format: ' + uri)
    }
    const revPath = repoRevPath.substr(i + 1)
    const j = revPath.indexOf('#')
    if (j < 0) {
        throw new Error('unexpected uri format: ' + uri)
    }
    const path = revPath.substr(j + 1)
    return {
        repo: repoRevPath.substring(0, i),
        version: revPath.substring(0, j),
        path: path,
    }
}

export interface StringAtPositionResult {
    value: string
    position: {
        line: number
        start: number
        end: number
    }
}

export const stringAtPosition = (
    text: string,
    position: { line: number; character: number }
): StringAtPositionResult | null => {
    const line = text.split(`\n`)[position.line]
    let quote = null
    let stringEnd = -1
    for (let i = position.character; i < line.length; i++) {
        if (line[i] === '"' || line[i] === "'") {
            quote = line[i]
            stringEnd = i
            break
        }
    }
    if (!quote) {
        return null
    }
    for (let i = position.character - 1; i >= 0; i--) {
        if (line[i] === quote) {
            const stringStart = i + 1
            return {
                value: line.slice(stringStart, stringEnd),
                position: {
                    line: position.line,
                    start: stringStart,
                    end: stringEnd,
                },
            }
        }
    }
    return null
}
