import 'babel-polyfill'
import * as sourcegraph from 'sourcegraph'
import { parseUri, stringAtPosition } from './util'

const queryVariables = (s: string, repo?: string): { query: string } => {
    const vars = [`(\\"${s}\\"|'${s}')`]
    if (repo) {
        vars.push(`r:${repo}`)
    }
    return {
        query: vars.join(' '),
    }
}

const GRAPHQL_QUERY = `query Search($query: String!) {
    search(query: $query) {
        results {
            results {
                __typename
                ... on FileMatch {
                    repository {
                        name
                    }
                    file {
                        path
                        commit {
                            oid
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
                    repository: {
                        name: string
                    }
                    file: {
                        path: string
                        commit: {
                            oid: string
                        }
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
        queryVariables(s, repo)
    )
    const { results } = response.data.search
    const locations: sourcegraph.Location[] = []
    results.results.forEach(({ file, repository, lineMatches }) => {
        lineMatches.forEach(({ lineNumber, offsetAndLengths }) => {
            offsetAndLengths.forEach(([offset, length]) => {
                const start = new sourcegraph.Position(lineNumber, offset)
                const end = new sourcegraph.Position(lineNumber, offset + length)
                const range = new sourcegraph.Range(start, end)
                const uri = new sourcegraph.URI(`git://${repository.name}?${file.commit.oid}#${file.path}`)
                const location = new sourcegraph.Location(uri, range)
                locations.push(location)
            })
        })
    })
    return locations
}

export function activate(): void {
    sourcegraph.languages.registerHoverProvider(['*'], {
        provideHover: (document, position) => {
            const hoveredString = stringAtPosition(document.text, position)
            if (hoveredString) {
                return {
                    contents: {
                        value: `**string literal** \`"${hoveredString.value}"\``,
                        range: new sourcegraph.Range(
                            new sourcegraph.Position(hoveredString.position.line, hoveredString.position.start),
                            new sourcegraph.Position(hoveredString.position.line, hoveredString.position.end)
                        ),
                        kind: sourcegraph.MarkupKind.Markdown,
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
                return findStringReferences(hoveredString.value)
            } else {
                // If no private instance is setup,
                // limit results to the current repository
                const repo = parseUri(document.uri).repo
                return findStringReferences(hoveredString.value, repo)
            }
        },
    })
}
