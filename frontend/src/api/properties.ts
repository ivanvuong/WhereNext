import type { HouseholdType } from './analyze'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

export type PropertySearchRequestPayload = {
  neighborhood: string
  city?: string
  state_code?: string
  anchor_latitude?: number
  anchor_longitude?: number
  neighborhood_latitude?: number
  neighborhood_longitude?: number
  budget: number
  salary: number
  commute_limit: number
  radius: number
  household: HouseholdType
  limit?: number
}

export type PropertyListingApi = {
  id: string
  address: string
  status: string
  list_price: number | null
  beds: number | null
  baths: number | null
  sqft: number | null
  latitude: number | null
  longitude: number | null
  primary_photo: string | null
  detail_url: string | null
}

export type PropertySearchResponseApi = {
  neighborhood: string
  total: number
  listings: PropertyListingApi[]
}

export async function searchProperties(payload: PropertySearchRequestPayload): Promise<PropertySearchResponseApi> {
  const response = await fetch(`${API_BASE_URL}/properties/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Property search failed with status ${response.status}`)
  }

  return response.json() as Promise<PropertySearchResponseApi>
}
