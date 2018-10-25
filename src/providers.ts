import * as sourcegraph from 'sourcegraph'
import { findStringReferences, isPrivateInstance } from './api'
import { Entity } from './types'
import { getEntityAtPosition, interpolate, parseUri } from './util'

type ProviderType = 'implementations' | 'definitions' | 'references'

interface FindEntityOccurencesOptions {
    document: sourcegraph.TextDocument
    position: sourcegraph.Position
    entities: Entity[]
    type: ProviderType
}

async function findEntityOccurences({
    document,
    position,
    entities,
    type,
}: FindEntityOccurencesOptions): Promise<Location[] | null> {
    const entityAtPosition = getEntityAtPosition(entities, document.text, position)
    if (entityAtPosition === null) {
        return Promise.resolve(null)
    }
    const privateInstance = await isPrivateInstance()
    let repo: string | null = null
    if (!privateInstance) {
        repo = parseUri(document.uri).repo
    }
    const searchStrings = entityAtPosition.entity[type]
        .filter(p => p.search)
        .map(({ search }) => interpolate(search, entityAtPosition.groups))
    const searchRequests = searchStrings.map(s => findStringReferences(s, repo as string))
    const results = await Promise.all(searchRequests)
    return [].concat(...(results as any)) as any
}

function registerHoverProvider(entities: Entity[]): void {
    sourcegraph.languages.registerHoverProvider(['*'], {
        provideHover: (document, position) => {
            const entityAtPosition = getEntityAtPosition(entities, document.text, position)
            if (entityAtPosition === null) {
                return null
            }
            const { range, entity } = entityAtPosition
            const preview = entity.preview ? interpolate(entity.preview, entityAtPosition.groups) : ''
            return {
                contents: {
                    value: `**${entity.name}**${preview}`,
                    range,
                    kind: sourcegraph.MarkupKind.Markdown,
                },
            }
        },
    })
}

export function registerProviders(entities: Entity[]): void {
    registerHoverProvider(entities)
    const provider = (type: ProviderType) => (document: sourcegraph.TextDocument, position: sourcegraph.Position) =>
        findEntityOccurences({ document, position, entities, type }) as any
    sourcegraph.languages.registerDefinitionProvider(['*'], {
        provideDefinition: provider('definitions'),
    })
    sourcegraph.languages.registerImplementationProvider(['*'], {
        provideImplementation: provider('implementations'),
    })
    sourcegraph.languages.registerReferenceProvider(['*'], {
        provideReferences: provider('references'),
    })
}
