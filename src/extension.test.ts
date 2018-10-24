import * as sinon from 'sinon'

const SOURCEGRAPH = {
    languages: {
        registerHoverProvider: sinon.spy(),
        registerReferenceProvider: sinon.spy(),
    },
    Position: sinon.spy(),
    Range: sinon.spy(),
    Uri: sinon.spy(),
}

const intercept = require('intercept-require')
intercept(
    (moduleExport: {}, info: { moduleId: string }): {} => {
        if (info.moduleId === 'sourcegraph') {
            return SOURCEGRAPH
        }
        return moduleExport
    }
)

import * as assert from 'assert'
import { activate } from './extension'

describe('extension lifetime', () => {
    let hoverProvider: Function | null = null
    // let referenceProvider: Function | null = null

    context('on activation', () => {
        before(() => activate())

        it('should register a hover provider', () => {
            assert(SOURCEGRAPH.languages.registerHoverProvider.called)
            const [selector, provider] = SOURCEGRAPH.languages.registerHoverProvider.getCalls()[0].args
            assert.strictEqual(typeof provider.provideHover, 'function')
            assert.deepStrictEqual(selector, ['*'])
            hoverProvider = provider.provideHover
        })

        it('should register a reference provider', () => {
            assert(SOURCEGRAPH.languages.registerReferenceProvider.called)
            const [selector, provider] = SOURCEGRAPH.languages.registerReferenceProvider.getCalls()[0].args
            assert.strictEqual(typeof provider.provideReferences, 'function')
            assert.deepStrictEqual(selector, ['*'])
            // referenceProvider = provider.provideReferences
        })
    })
    context('on hover', () => {
        it('should show a hover', () => {
            if (!hoverProvider) {
                throw new Error('hoverProvider not set')
            }
            const document = {
                text: `the quick brown fox
                jumped 'over'
                the lazy dog`,
            }
            const position = {
                line: 1,
                character: 27,
            }
            const hover = hoverProvider(document, position)
            assert.deepStrictEqual(hover, {
                contents: {
                    value: '**string literal** `"over"`',
                    kind: 'markdown',
                    range: {},
                },
            })
        })
    })
    context('on find references request', () => {
        it('should execute a graphQL query command')
        it('should return references results based on the result of the command')
    })
})
