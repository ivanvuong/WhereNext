import type { Region } from '../api/analyze'

export type HousingMode = 'buy' | 'rent'

export type ResolvedAnchor = {
  label: string
  latitude: number
  longitude: number
  region: Region
}

export type RankedCommunity = {
  id: string
  name: string
  region: Region
  latitude: number
  longitude: number
  avgRent: number
  distanceMiles: number
  commuteScore: number
  affordabilityScore: number
  lifestyleScore: number
  overallScore: number
}

export type TopCard = {
  homes: number
  estimate: number
  age: string
}

export type PropertyListing = {
  id: string
  address: string
  status: string
  listPrice: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  latitude: number | null
  longitude: number | null
  primaryPhoto: string | null
  detailUrl: string | null
}
