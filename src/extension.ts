import 'babel-polyfill'
import * as sourcegraph from 'sourcegraph'
import { findStringReferences, isPrivateInstance } from './api'
import { parseUri, stringAtPosition } from './util'

export function activate(): void {
    /**
     * When hovering a string ("foo"/'foo'), display a tooltip
     */
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

    /**
     * When requested to provide references for a hovered string,
     * find references to the string (as "foo"/'foo').
     *
     * Search is conducted:
     * - across all repositories when using a private Sourcegraph instance
     * - on the current repository when using the public Sourcegraph instance
     */
    sourcegraph.languages.registerReferenceProvider(['*'], {
        provideReferences: async (document, position) => {
            const hoveredString = stringAtPosition(document.text, position)

            // We're not hovering a string: nothing to do here
            if (!hoveredString) {
                return null
            }

            const privateInstance = await isPrivateInstance()
            if (privateInstance) {
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
