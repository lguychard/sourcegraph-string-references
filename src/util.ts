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
        path,
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

const isQuote = (s: string) => s === '"' || s === "'" || s === '`'

export const stringAtPosition = (
    text: string,
    position: { line: number; character: number }
): StringAtPositionResult | null => {
    const line = text.split(`\n`)[position.line]
    let quote = null
    let start = -1
    for (let i = 0; i < line.length; i++) {
        if (!quote && i > position.character) {
            return null
        }
        if (!quote && isQuote(line[i])) {
            quote = line[i]
            start = i + 1
            continue
        }
        if (line[i] === quote && line[i - 1] !== '\\') {
            if (i >= position.character) {
                return {
                    value: line.slice(start, i),
                    position: {
                        line: position.line,
                        start,
                        end: i,
                    },
                }
            } else {
                quote = null
            }
        }
    }
    return null
}
