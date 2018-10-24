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

    it('should return references to the outermost string', () => {
        const txt = ['the quick brown fox', `lorem 'jumped "over"' ipsum`, 'the lazy dog'].join('\n')
        assert.deepStrictEqual(
            {
                value: 'jumped "over"',
                position: { line: 1, start: 7, end: 20 },
            },
            stringAtPosition(txt, {
                line: 1,
                character: 16,
            } as any)
        )
    })

    it('should handle escaped double quotes', () => {
        const txt = ['the quick brown fox', 'jumped "o\\"ver"', 'the lazy dog'].join('\n')
        assert.deepStrictEqual(
            { value: 'o\\"ver', position: { line: 1, start: 8, end: 14 } },
            stringAtPosition(txt, {
                line: 1,
                character: 13,
            } as any)
        )
    })

    it('should handle escaped single quotes', () => {
        const txt = ['the quick brown fox', "jumped 'o\\'ver'", 'the lazy dog'].join('\n')
        assert.deepStrictEqual(
            { value: "o\\'ver", position: { line: 1, start: 8, end: 14 } },
            stringAtPosition(txt, {
                line: 1,
                character: 13,
            } as any)
        )
    })

    it('should find the hovered string in a line containig several strings', () => {
        const txt = ['the quick brown fox', "'jumped' 'over'", 'the lazy dog'].join('\n')
        assert.deepStrictEqual(
            { value: 'over', position: { line: 1, start: 10, end: 14 } },
            stringAtPosition(txt, {
                line: 1,
                character: 13,
            } as any)
        )
    })
})
