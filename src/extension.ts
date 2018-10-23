import 'babel-polyfill'
import * as sourcegraph from 'sourcegraph'
import { parseUri, memoizeAsync } from './util'

export const stringAtPosition = (
    text: string,
    position: sourcegraph.Position
): { value: string; range: sourcegraph.Range } | null => {
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
                range: new sourcegraph.Range(
                    new sourcegraph.Position(position.line, stringStart),
                    new sourcegraph.Position(position.line, stringEnd)
                ),
            }
        }
    }
    return null
}

const getQueryVars = (s: string, repo?: string): { query: string } => {
    const re = `(\\"${s}\\"|'${s}')` // avoid searching for "query' / 'query"
    const repositoryFilter = repo ? ` r:${repo}` : ''
    return {
        query: re + repositoryFilter,
    }
}

const GRAPHQL_QUERY = `query Search($query: String!) {
    search(query: $query) {
        results {
            results {
                __typename
                ... on FileMatch {
                    file {
                        externalURLs {
                            url
                        }
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
                results: {
                    file: {
                        externalUrls: {
                            url: string
                        }[]
                    }
                    lineMatches: {
                        lineNumber: number
                        offsetAndLengths: [number, number][]
                    }[]
                }[]
            }
        }
    }
}

async function findStringReferences(s: string, repo?: string): Promise<sourcegraph.Location[]> {
    const response: ResponseObject = await sourcegraph.commands.executeCommand(
        'queryGraphQL',
        GRAPHQL_QUERY,
        getQueryVars(s, repo)
    )
    const { results } = response.data.search
    const locations: sourcegraph.Location[] = []
    results.results.forEach(({ file, lineMatches }) => {
        lineMatches.forEach(({ lineNumber, offsetAndLengths }) => {
            offsetAndLengths.forEach(([offset, length]) => {
                const start = new sourcegraph.Position(lineNumber, offset)
                const end = new sourcegraph.Position(lineNumber, offset + length)
                const range = new sourcegraph.Range(start, end)
                const uri = new sourcegraph.URI(file.externalUrls[0].url)
                const location = new sourcegraph.Location(uri, range)
                locations.push(location)
            })
        })
    })
    return locations
}

const findStringReferencesMemo = memoizeAsync(findStringReferences, s => s)

export function activate(): void {
    sourcegraph.languages.registerHoverProvider(['*'], {
        provideHover: (document, position) => {
            const hoveredString = stringAtPosition(document.text, position)
            if (hoveredString) {
                return {
                    contents: {
                        value: '\n    string',
                        range: hoveredString.range,
                    },
                }
            }
            return null
        },
    })

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
                return findStringReferencesMemo(hoveredString.value)
            } else {
                // If no private instance is setup,
                // limit results to the current repository
                const repo = parseUri(document.uri).repo
                return findStringReferencesMemo(hoveredString.value, repo)
            }
        },
    })
}
