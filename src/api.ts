import * as sourcegraph from 'sourcegraph'

function queryGraphQL<T>(query: string, variables: {}): Promise<T> {
    return sourcegraph.commands.executeCommand('queryGraphQL', query, variables)
}

const queryVariables = (s: string, repo?: string): { query: string } => {
    const vars = [`(\\"${s}\\"|'${s}')`]
    if (repo) {
        vars.push(`r:${repo}`)
    }
    return {
        query: vars.join(' '),
    }
}

const STRING_REFERENCES_QUERY = `query Search($query: String!) {
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

interface StringReferencesResponseObject {
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

export async function findStringReferences(s: string, repo?: string): Promise<sourcegraph.Location[]> {
    const response = await queryGraphQL<StringReferencesResponseObject>(
        STRING_REFERENCES_QUERY,
        queryVariables(s, repo)
    )
    const { results } = response.data.search.results
    const locations: sourcegraph.Location[] = []
    for (const { file, repository, lineMatches } of results) {
        for (const { lineNumber, offsetAndLengths } of lineMatches) {
            for (const [offset, length] of offsetAndLengths) {
                const start = new sourcegraph.Position(lineNumber, offset)
                const end = new sourcegraph.Position(lineNumber, offset + length)
                const range = new sourcegraph.Range(start, end)
                const uri = new sourcegraph.URI(`git://${repository.name}?${file.commit.oid}#${file.path}`)
                const location = new sourcegraph.Location(uri, range)
                locations.push(location)
            }
        }
    }
    return locations
}

const PRIVATE_INSTANCE_QUERY = `{
    extensionRegistry {
        localExtensionIDPrefix
    }
}`

interface PrivateInstanceResponseObject {
    data: {
        extensionRegistry: {
            localExtensionIDPrefix: string | null
        }
    }
}

export async function isPrivateInstance(): Promise<boolean> {
    const response = await queryGraphQL<PrivateInstanceResponseObject>(PRIVATE_INSTANCE_QUERY, {})
    return response.data.extensionRegistry.localExtensionIDPrefix !== null
}
