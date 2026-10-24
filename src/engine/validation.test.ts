import { validateReading } from './validation'

describe('validateReading', () => {
  it('accepts a finite reading with no previous timestamp', () => {
    const result = validateReading({ pitch: 1.5, roll: -2, timestamp: 0 }, null)
    expect(result).toEqual({ ok: true, reading: { pitch: 1.5, roll: -2, timestamp: 0 } })
  })

  it.each([
    ['NaN pitch', { pitch: Number.NaN, roll: 0, timestamp: 0 }],
    ['infinite roll', { pitch: 0, roll: Number.POSITIVE_INFINITY, timestamp: 0 }],
    ['missing roll', { pitch: 0, timestamp: 0 }],
    ['string pitch', { pitch: '5', roll: 0, timestamp: 0 }],
    ['NaN timestamp', { pitch: 0, roll: 0, timestamp: Number.NaN }],
    ['null', null],
  ])('rejects %s as an invalid value', (_label, input) => {
    expect(validateReading(input, null)).toEqual({ ok: false, reason: 'INVALID_VALUE' })
  })

  it('rejects a reading whose timestamp equals the previous one', () => {
    expect(validateReading({ pitch: 0, roll: 0, timestamp: 100 }, 100)).toEqual({
      ok: false,
      reason: 'NON_MONOTONIC_TIMESTAMP',
    })
  })

  it('rejects a reading whose timestamp goes backwards', () => {
    expect(validateReading({ pitch: 0, roll: 0, timestamp: 50 }, 100)).toEqual({
      ok: false,
      reason: 'NON_MONOTONIC_TIMESTAMP',
    })
  })
})
