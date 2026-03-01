import type { Community, LifestyleScore } from '../data/communities'
import type { ResolvedAnchor } from '../types/app'

const hashString = (value: string) => {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

const scoreFromHash = (hash: number, min: number, max: number, offset: number) => {
  const range = max - min
  return min + ((hash + offset) % range)
}

const lifestyleFromHash = (hash: number): LifestyleScore => ({
  walkable: scoreFromHash(hash, 45, 95, 3),
  quiet: scoreFromHash(hash, 35, 95, 17),
  food: scoreFromHash(hash, 40, 95, 29),
  nightlife: scoreFromHash(hash, 30, 95, 41),
  outdoors: scoreFromHash(hash, 35, 95, 53),
  family: scoreFromHash(hash, 40, 95, 67),
  pets: scoreFromHash(hash, 45, 95, 71),
  academic: scoreFromHash(hash, 35, 95, 83),
  wellness: scoreFromHash(hash, 40, 95, 97),
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')

export const searchNearbyCommunities = async (
  anchor: ResolvedAnchor,
  radiusMiles: number,
  token: string,
): Promise<Community[]> => {
  const milesPerLat = 69
  const latDelta = radiusMiles / milesPerLat
  const lngDelta = radiusMiles / (milesPerLat * Math.cos((anchor.latitude * Math.PI) / 180))

  const minLat = anchor.latitude - latDelta
  const maxLat = anchor.latitude + latDelta
  const minLng = anchor.longitude - lngDelta
  const maxLng = anchor.longitude + lngDelta

  const url = new URL(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(anchor.label)}.json`,
  )
  url.searchParams.set('access_token', token)
  url.searchParams.set('types', 'neighborhood,locality,place')
  url.searchParams.set('limit', '20')
  url.searchParams.set('proximity', `${anchor.longitude},${anchor.latitude}`)
  url.searchParams.set('bbox', `${minLng},${minLat},${maxLng},${maxLat}`)

  const response = await fetch(url.toString())
  if (!response.ok) {
    return []
  }

  const data = (await response.json()) as {
    features?: Array<{
      center: [number, number]
      text: string
      place_name?: string
    }>
  }

  const features = data.features ?? []
  return features.map((feature, index) => {
    const [longitude, latitude] = feature.center
    const name = feature.text || feature.place_name || `Community ${index + 1}`
    const hash = hashString(`${name}-${longitude}-${latitude}`)

    return {
      id: `custom-${slugify(name)}-${hash % 9999}`,
      name,
      region: 'custom',
      latitude,
      longitude,
      avgRent: scoreFromHash(hash, 1800, 4500, 11),
      lifestyle: lifestyleFromHash(hash),
    }
  })
}
