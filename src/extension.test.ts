const intercept = require('intercept-require')
intercept(
    (moduleExport: {}, info: { moduleId: string }): {} => {
        if (info.moduleId === 'sourcegraph') {
            return {}
        }
        return moduleExport
    }
)

import * as assert from 'assert'
import { stringAtPosition } from './extension'

describe('stringAtPosition', () => {
    it('should find the hovered string', () => {
        const txt = ['the quick brown fox', 'jumped "over"', 'the lazy dog'].join('\n')
        const s = stringAtPosition(txt, {
            line: 1,
            character: 9,
        } as any)
        assert.equal('over', s)
    })
})
