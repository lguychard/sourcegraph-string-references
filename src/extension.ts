import * as sourcegraph from 'sourcegraph'

export const stringAtPosition = (text: string, position: sourcegraph.Position): string | null => {
    const line = text.split(`\n`)[position.line]
    const re = /("[^"]+"|'[^']+')/g
    const matches = line.match(re)
    const match =
        matches &&
        matches.find(s => {
            const idx = line.indexOf(s)
            return idx < position.character && idx + s.length > position.character
        })
    if (match) {
        return match.slice(1, match.length - 1)
    } else {
        return null
    }
}

const getQueryVars = (s: string, repo?: string): { query: string } => {
    const re = `(\"${s}\"|'${s}')` // avoid searching for "query' / 'query"
    const repositoryFilter = repo ? ` r:${repo}` : ''
    return {
        query: re + repositoryFilter,
    }
}

const GRAPHQL_QUERY = `{
    search(query: $query) {
        results {
            results {
                __typename
                ... on FileMatch {
                    file {
                        url
                    }
                    lineMatches {
                        lineNumber
                        offsetAndLengths
                    }
                }
            }
        }
    }
}`

interface ResponseObject {
    data: {
        search: {
            results: {
                file: {
                    url: string
                }
                lineMatches: {
                    lineNumber: number
                    offsetAndLengths: [number, number][]
                }[]
            }[]
        }
    }
}

async function findStringReferences(s: string, repo?: string): Promise<sourcegraph.Location[]> {
    const response: ResponseObject = await sourcegraph.commands.executeCommand(
        'queryGraph',
        GRAPHQL_QUERY,
        getQueryVars(s, repo)
    )
    const { results } = response.data.search
    const locations: sourcegraph.Location[] = []
    results.forEach(({ file, lineMatches }) => {
        lineMatches.forEach(({ lineNumber, offsetAndLengths }) => {
            offsetAndLengths.forEach(([offset, length]) => {
                const start = new sourcegraph.Position(lineNumber, offset)
                const end = new sourcegraph.Position(lineNumber, offset + length)
                const range = new sourcegraph.Range(start, end)
                const uri = new sourcegraph.URI(file.url)
                const location = new sourcegraph.Location(uri, range)
                locations.push(location)
            })
        })
    })
    return locations
}

export function activate(): void {
    sourcegraph.languages.registerReferenceProvider(['*'], {
        provideReferences: async (document, position) => {
            const hoveredString = stringAtPosition(document.text, position)

            // We're not hovering a string: nothing to do here
            if (!hoveredString) {
                return null
            }

            // @todo: check if the instance is private (using sourcegraph.configuration?)
            const isPrivateInstance = false
            if (isPrivateInstance) {
                return findStringReferences(hoveredString)
            } else {
                // If no private instance is setup, the user should provide
                // a repository to filter the search
                if (sourcegraph.app.activeWindow) {
                    const repo = await sourcegraph.app.activeWindow.showInputBox({
                        prompt: 'Repository to search (ex: sourcegraph/sourcegraph)',
                    })
                    return findStringReferences(hoveredString, repo)
                } else {
                    return null
                }
            }
        },
    })
}
