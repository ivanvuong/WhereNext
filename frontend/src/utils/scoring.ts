import type { HouseholdType, RankedCommunityApi } from '../api/analyze'
import { COMMUNITIES, type Community } from '../data/communities'
import type { RankedCommunity, ResolvedAnchor } from '../types/app'
import { clamp } from './format'
import { haversineMiles } from './geo'

export type PreferenceDimension = keyof Community['lifestyle']

export const parsePreferenceDimensions = (input: string): PreferenceDimension[] => {
  const normalized = input.toLowerCase()
  const matches: PreferenceDimension[] = []

  const keywordMap: Array<{ key: PreferenceDimension; words: string[] }> = [
    { key: 'walkable', words: ['walkable', 'walk', 'transit', 'dense'] },
    { key: 'quiet', words: ['quiet', 'calm', 'peaceful'] },
    { key: 'food', words: ['food', 'restaurant', 'foodie', 'coffee'] },
    { key: 'nightlife', words: ['nightlife', 'bar', 'club', 'party'] },
    { key: 'outdoors', words: ['outdoors', 'hiking', 'beach', 'park', 'nature'] },
    { key: 'family', words: ['family', 'kids', 'schools', 'child'] },
    { key: 'pets', words: ['pet', 'pets', 'dog', 'cat'] },
    { key: 'academic', words: ['academic', 'study', 'campus', 'student', 'university'] },
    { key: 'wellness', words: ['wellness', 'fitness', 'gym', 'health'] },
  ]

  keywordMap.forEach(({ key, words }) => {
    if (words.some((word) => normalized.includes(word))) {
      matches.push(key)
    }
  })

  return matches.length > 0 ? matches : ['walkable', 'food', 'quiet']
}

export const scoreCommunitiesLocally = ({
  anchor,
  budget,
  salary,
  commuteLimit,
  radius,
  lifestyleInput,
  household,
  communities = COMMUNITIES,
}: {
  anchor: ResolvedAnchor
  budget: number
  salary: number
  commuteLimit: number
  radius: number
  lifestyleInput: string
  household: HouseholdType
  communities?: Community[]
}): RankedCommunity[] => {
  const dims = parsePreferenceDimensions(lifestyleInput)
  const householdWeight =
    household === 'family' ? 'family' : household === 'with pets' ? 'pets' : household === 'couple' ? 'quiet' : 'nightlife'

  const monthlyAffordableFromSalary = (salary / 12) * 0.34
  const effectiveBudget = Math.max(budget, monthlyAffordableFromSalary)

  const candidates = communities
    .filter((community) => community.region === anchor.region || anchor.region === 'custom')
    .map((community) => {
      const distanceMiles = haversineMiles(anchor.latitude, anchor.longitude, community.latitude, community.longitude)
      if (distanceMiles > radius) {
        return null
      }

      const estimatedCommute = distanceMiles * 3.4 + 5
      if (estimatedCommute > commuteLimit) {
        return null
      }
      const commuteGap = Math.abs(estimatedCommute - commuteLimit)
      const commuteScore = clamp(100 - commuteGap * 3.2, 0, 100)

      const affordabilityDelta = community.avgRent - effectiveBudget
      if (affordabilityDelta > 0) {
        return null
      }
      const affordabilityScore = clamp(100 - Math.max(affordabilityDelta, 0) / 14, 12, 100)

      const lifestyleBase = dims.reduce((sum, key) => sum + community.lifestyle[key], 0) / dims.length
      const weightedLifestyle = clamp(lifestyleBase * 0.84 + community.lifestyle[householdWeight] * 0.16, 0, 100)

      const overallScore = commuteScore * 0.4 + affordabilityScore * 0.3 + weightedLifestyle * 0.3

      return {
        id: community.id,
        name: community.name,
        region: community.region,
        latitude: community.latitude,
        longitude: community.longitude,
        avgRent: community.avgRent,
        distanceMiles,
        commuteScore,
        affordabilityScore,
        lifestyleScore: weightedLifestyle,
        overallScore,
      }
    })
    .filter((community): community is RankedCommunity => community !== null)
    .sort((a, b) => b.overallScore - a.overallScore)

  return candidates.slice(0, 8)
}

export const toCommunity = (item: RankedCommunityApi): RankedCommunity => ({
  id: item.id,
  name: item.name,
  region: item.region,
  latitude: item.latitude,
  longitude: item.longitude,
  avgRent: item.avg_rent,
  distanceMiles: item.distance_miles,
  commuteScore: item.commute_score,
  affordabilityScore: item.affordability_score,
  lifestyleScore: item.lifestyle_score,
  overallScore: item.overall_score,
})

export const buildReason = (item: RankedCommunity): string => {
  if (item.lifestyleScore > 82) {
    return 'Strong lifestyle match for your stated preferences'
  }

  if (item.affordabilityScore > 82) {
    return 'Good cost fit relative to budget and salary'
  }

  if (item.commuteScore > 82) {
    return 'Commute window aligns closely with your target time'
  }

  return 'Balanced fit across commute, cost, and lifestyle factors'
}

export const buildTradeoff = (item: RankedCommunity): string => {
  const weakest = Math.min(item.commuteScore, item.affordabilityScore, item.lifestyleScore)
  if (weakest === item.affordabilityScore) {
    return 'Tradeoff: rent pressure is higher than your ideal level'
  }

  if (weakest === item.commuteScore) {
    return 'Tradeoff: commute may run longer during peak traffic'
  }

  return 'Tradeoff: fewer high-density amenities than core districts'
}
