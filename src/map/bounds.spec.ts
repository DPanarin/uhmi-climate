import { describe, expect, it } from 'vitest'
import { boundsOf } from './controller'

describe('boundsOf', () => {
  it('covers points, polygons and multipolygons', () => {
    expect(
      boundsOf({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [30, 50] } },
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'MultiPolygon',
              coordinates: [
                [
                  [
                    [22, 44],
                    [40, 44],
                    [40, 56],
                    [22, 44],
                  ],
                ],
              ],
            },
          },
        ],
      }),
    ).toEqual([22, 44, 40, 56])
    expect(boundsOf({ type: 'FeatureCollection', features: [] })).toBeNull()
  })
})
