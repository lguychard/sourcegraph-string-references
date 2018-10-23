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

// from https://github.com/sourcegraph/sourcegraph-langserver-http/blob/5feb512c8bb289ab49d1f0172935fbf3fd2c8489/src/util/memoizeAsync.ts
/**
 * Creates a function that memoizes the async result of func. If the Promise is rejected, the result will not be
 * cached.
 *
 * @param toKey etermines the cache key for storing the result based on the first argument provided to the memoized
 * function
 */
export function memoizeAsync<P, T>(
    func: (params: P) => Promise<T>,
    toKey: (params: P) => string
): (params: P) => Promise<T> {
    const cache = new Map<string, Promise<T>>()
    return (params: P) => {
        const key = toKey(params)
        const hit = cache.get(key)
        if (hit) {
            return hit
        }
        const p = func(params)
        p.then(null, () => cache.delete(key))
        cache.set(key, p)
        return p
    }
}
