import type { HouseholdType } from './analyze'
import type { RankedCommunity } from '../types/app'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

export type NeighborhoodCopy = {
  overview: string
  good: string
  tradeoff: string
}

export type NeighborhoodCopyRequest = {
  neighborhoodId: string
  neighborhood: RankedCommunity
  anchorLabel: string
  household: HouseholdType
  lifestylePreferences: string
  budget: number
  salary: number
  commuteLimit: number
}

export async function fetchNeighborhoodCopy(payload: NeighborhoodCopyRequest): Promise<NeighborhoodCopy> {
  const response = await fetch(`${API_BASE_URL}/neighborhood/copy`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      neighborhood_id: payload.neighborhoodId,
      neighborhood: payload.neighborhood.name,
      anchor_label: payload.anchorLabel,
      household: payload.household,
      lifestyle_preferences: payload.lifestylePreferences,
      budget: payload.budget,
      salary: payload.salary,
      commute_limit: payload.commuteLimit,
      avg_rent: payload.neighborhood.avgRent,
      distance_miles: payload.neighborhood.distanceMiles,
      overall_score: payload.neighborhood.overallScore,
      commute_score: payload.neighborhood.commuteScore,
      affordability_score: payload.neighborhood.affordabilityScore,
      lifestyle_score: payload.neighborhood.lifestyleScore,
    }),
  })

  if (!response.ok) {
    throw new Error(`Neighborhood copy failed with status ${response.status}`)
  }

  const data = (await response.json()) as NeighborhoodCopy
  return {
    overview: String(data.overview ?? '').slice(0, 140),
    good: String(data.good ?? '').slice(0, 120),
    tradeoff: String(data.tradeoff ?? '').slice(0, 120),
  }
}
