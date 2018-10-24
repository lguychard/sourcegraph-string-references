import * as assert from 'assert'
import { stringAtPosition } from './util'

describe('stringAtPosition', () => {
    it('should find a single-quoted hovered string', () => {
        const txt = ['the quick brown fox', "jumped 'over'", 'the lazy dog'].join('\n')
        assert.deepStrictEqual(
            {
                position: {
                    end: 12,
                    line: 1,
                    start: 8,
                },
                value: 'over',
            },
            stringAtPosition(txt, {
                line: 1,
                character: 9,
            } as any)
        )
    })

    it('should find a double-quoted hovered string', () => {
        const txt = ['the quick brown fox', 'jumped "over"', 'the lazy dog'].join('\n')
        assert.deepStrictEqual(
            {
                position: {
                    end: 12,
                    line: 1,
                    start: 8,
                },
                value: 'over',
            },
            stringAtPosition(txt, {
                line: 1,
                character: 9,
            } as any)
        )
    })

    it('should return null in case of mismatched quotes', () => {
        const txt = ['the quick brown fox', `jumped "over'`, 'the lazy dog'].join('\n')
        assert.deepStrictEqual(
            null,
            stringAtPosition(txt, {
                line: 1,
                character: 9,
            } as any)
        )
    })
})
