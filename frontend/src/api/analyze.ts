export type HouseholdType = 'single' | 'couple' | 'family' | 'with pets'
export type Region = 'sf' | 'seattle' | 'irvine' | 'la' | 'nyc' | 'custom'

export type AnalyzeRequestPayload = {
  anchor_input: string
  anchor_label?: string
  anchor_latitude?: number
  anchor_longitude?: number
  budget: number
  salary: number
  commute_limit: number
  radius: number
  household: HouseholdType
  lifestyle_preferences: string
}

export type RankedCommunityApi = {
  id: string
  name: string
  region: Region
  latitude: number
  longitude: number
  distance_miles: number
  commute_score: number
  affordability_score: number
  lifestyle_score: number
  overall_score: number
  avg_rent: number
}

export type AnalyzeResponseApi = {
  anchor_label: string
  anchor_region: Region
  anchor_latitude: number
  anchor_longitude: number
  candidate_count: number
  communities: RankedCommunityApi[]
}

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

export async function analyzeCommunities(payload: AnalyzeRequestPayload): Promise<AnalyzeResponseApi> {
  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Analyze failed with status ${response.status}`)
  }

  return response.json() as Promise<AnalyzeResponseApi>
}
