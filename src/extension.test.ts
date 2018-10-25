import * as sinon from 'sinon'
import * as sourcegraph from 'sourcegraph'

const API_REQUESTS: { args: any[]; resolve: (...args: any[]) => void }[] = []

const getNextRequest = () => API_REQUESTS.pop()!

const SOURCEGRAPH = {
    languages: {
        registerHoverProvider: sinon.spy(),
        registerReferenceProvider: sinon.spy(),
    },
    commands: {
        executeCommand: sinon.stub(),
    },
    Position: sinon.spy(),
    Range: sinon.spy(),
    Uri: sinon.spy(),
}

SOURCEGRAPH.commands.executeCommand.callsFake((...args) => {
    const p = new Promise<any>(resolve => {
        API_REQUESTS.push({ args, resolve })
    })
    return p
})

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
    let hoverProvider: null | sourcegraph.HoverProvider = null
    let referenceProvider: null | sourcegraph.ReferenceProvider = null

    context('on activation', () => {
        before(() => activate())

        it('should register a hover provider', () => {
            assert(SOURCEGRAPH.languages.registerHoverProvider.called)
            const [selector, provider] = SOURCEGRAPH.languages.registerHoverProvider.getCalls()[0].args
            assert.strictEqual(typeof provider.provideHover, 'function')
            assert.deepStrictEqual(selector, ['*'])
            hoverProvider = provider
        })

        it('should register a reference provider', () => {
            assert(SOURCEGRAPH.languages.registerReferenceProvider.called)
            const [selector, provider] = SOURCEGRAPH.languages.registerReferenceProvider.getCalls()[0].args
            assert.strictEqual(typeof provider.provideReferences, 'function')
            assert.deepStrictEqual(selector, ['*'])
            referenceProvider = provider
        })
    })
    context('when the hover provider is called', () => {
        it('should show a hover', () => {
            if (!hoverProvider) {
                throw new Error('hoverProvider not set')
            }
            const document: any = {
                text: `the quick brown fox
                jumped 'over'
                the lazy dog`,
            }
            const position: any = {
                line: 1,
                character: 27,
            }
            const hover = hoverProvider.provideHover(document, position)
            assert.deepEqual(hover, {
                contents: {
                    value: '**string literal** `"over"`',
                    kind: 'markdown',
                    range: {},
                },
            })
        })
    })
    context('when the reference provider is called', () => {
        const callReferenceProvider = () => {
            if (referenceProvider === null) {
                throw new Error('Reference provider is not set')
            }
            const document: any = {
                text: `the quick brown fox
                jumped 'over'
                the lazy dog`,
                uri: 'git://github.com/foo/bar?537cc64231b9ac0bce8e221deaaf397260fe9d48#/blob/src/Message.ts',
            }
            const position: any = {
                line: 1,
                character: 27,
            }
            return referenceProvider.provideReferences(document, position, { includeDeclaration: true })
        }

        context('on a private Sourcegraph instance', () => {
            before(() => {
                callReferenceProvider()
            })

            it('should send a graphQL query to determine whether the instance is private', () => {
                const request = getNextRequest()
                const [method, query] = request!.args
                assert.equal(method, 'queryGraphQL')
                assert(query.indexOf('localExtensionIDPrefix') > -1)
                request!.resolve({
                    data: {
                        extensionRegistry: {
                            localExtensionIDPrefix: 'sourcegraph.sgdev.org',
                        },
                    },
                })
            })

            it('should send a search query to find the string across all repositories', () => {
                const request = getNextRequest()
                const [method, query, variables] = request!.args
                assert.equal(method, 'queryGraphQL')
                assert(query.indexOf('search') > -1)
                assert.equal(variables.query, '/(\\"over\\"|\'over\'|`over`)/')
            })

            it('should return a list of locations')
        })

        context('on the public Sourcegraph instance', () => {
            it('should send a graphQL query to determine whether the instance is private')
            it('should send a search query to find the string in the current repository')
            it('should return a list of locations')
        })
    })
})
