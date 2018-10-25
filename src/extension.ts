import 'babel-polyfill'
import * as sourcegraph from 'sourcegraph'
import { registerProviders } from './providers'
import { Entity } from './types'

const getEntities = (): Entity[] => {
    const config = sourcegraph.configuration.get()
    const entities = config.get('entities') as Entity[]
    return entities || []
}

export function activate(): void {
    let providersRegistered = false
    sourcegraph.workspace.onDidOpenTextDocument.subscribe(() => {
        if (!providersRegistered) {
            registerProviders(getEntities())
            providersRegistered = true
        }
    })
}
