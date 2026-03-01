import type { Region } from '../api/analyze'
import type { ResolvedAnchor } from '../types/app'

const inferRegionFromText = (value: string): Region => {
  const normalized = value.toLowerCase()
  if (normalized.includes('uci') || normalized.includes('irvine') || normalized.includes('tustin') || normalized.includes('orange county')) {
    return 'irvine'
  }

  if (normalized.includes('seattle') || normalized.includes('wa') || normalized.includes('washington')) {
    return 'seattle'
  }

  if (normalized.includes('san francisco') || normalized.includes('sf') || normalized.includes('google') || normalized.includes('stripe')) {
    return 'sf'
  }

  return 'custom'
}

export const resolveAnchor = (input: string): ResolvedAnchor => {
  const value = input.toLowerCase().trim()

  if (inferRegionFromText(value) === 'irvine') {
    return {
      label: 'Irvine Anchor',
      latitude: 33.6405,
      longitude: -117.8443,
      region: 'irvine',
    }
  }

  if (inferRegionFromText(value) === 'seattle') {
    return {
      label: 'Seattle Anchor',
      latitude: 47.6062,
      longitude: -122.3321,
      region: 'seattle',
    }
  }

  if (inferRegionFromText(value) === 'sf') {
    return {
      label: 'San Francisco Anchor',
      latitude: 37.7897,
      longitude: -122.3942,
      region: 'sf',
    }
  }

  return {
    label: 'Default SF Anchor',
    latitude: 37.7897,
    longitude: -122.3942,
    region: 'sf',
  }
}

export const geocodeAnchor = async (query: string, token: string): Promise<ResolvedAnchor | null> => {
  const trimmed = query.trim()
  if (!trimmed) {
    return null
  }

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(trimmed)}.json`)
  url.searchParams.set('access_token', token)
  url.searchParams.set('limit', '1')

  const response = await fetch(url.toString())
  if (!response.ok) {
    return null
  }
  const data = (await response.json()) as {
    features?: Array<{ center: [number, number]; place_name?: string }>
  }
  const feature = data.features?.[0]
  if (!feature) {
    return null
  }

  const [longitude, latitude] = feature.center
  const inferred = inferRegionFromText(`${trimmed} ${feature.place_name ?? ''}`)
  return {
    label: feature.place_name || trimmed,
    latitude,
    longitude,
    region: inferred,
  }
}

export const haversineMiles = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadiusMiles = 3958.8

  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.asin(Math.sqrt(a))
  return earthRadiusMiles * c
}

export const estimateCommuteMinutesFromMiles = (distanceMiles: number): number =>
  Math.max(1, Math.round(distanceMiles * 3.4 + 5))

export const estimateMilesFromCommuteMinutes = (minutes: number): number =>
  Math.max(0.15, (minutes - 5) / 3.4)
