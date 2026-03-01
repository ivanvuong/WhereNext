import { useEffect, useMemo, useRef, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { type HouseholdType } from './api/analyze'
import { fetchNeighborhoodCopy, type NeighborhoodCopy } from './api/neighborhoodCopy'
import { searchProperties } from './api/properties'
import { getCommunitiesForRegion } from './data/communities'
import SurveyPanel from './components/SurveyPanel'
import ResultsView from './components/ResultsView'
import type { HousingMode, PropertyListing, RankedCommunity, ResolvedAnchor } from './types/app'
import {
  estimateCommuteMinutesFromMiles,
  geocodeAnchor,
  haversineMiles,
  resolveAnchor,
} from './utils/geo'
import { buildReason, buildTradeoff, scoreCommunitiesLocally } from './utils/scoring'
import { searchNearbyCommunities } from './utils/communitySearch'
import { toPropertyListing } from './utils/properties'

const DEFAULT_ANCHOR = ''
const DEFAULT_PREFS = ''
const DEFAULT_RENT_SALARY = 80_000
const AI_COPY_DEBOUNCE_MS = 450

const buildNeighborhoodOverview = (selected: RankedCommunity | null): string => {
  if (!selected) {
    return ''
  }

  const dimensions = [
    { key: 'commute', score: selected.commuteScore, good: 'short commute', bad: 'longer commute times' },
    { key: 'cost', score: selected.affordabilityScore, good: 'solid affordability', bad: 'higher rent pressure' },
    { key: 'lifestyle', score: selected.lifestyleScore, good: 'great lifestyle fit', bad: 'fewer lifestyle matches' },
  ].sort((a, b) => b.score - a.score)

  const top = dimensions[0]
  const second = dimensions[1]
  const weakest = dimensions[2]
  const includeSecond = second.score >= 70 && top.score - second.score <= 12

  const strengths = includeSecond ? `${top.good} and ${second.good}` : top.good
  const tradeoff = weakest.score < 68 ? `; ${weakest.bad}.` : '.'
  const summary = `${strengths}${tradeoff}`
  return summary.length > 120 ? summary.slice(0, 117).trimEnd() + '...' : summary
}

const serializeAiCopyKey = ({
  neighborhoodId,
  neighborhood,
  budget,
  salary,
  commute,
  lifestyle,
  household,
  anchorLabel,
}: {
  neighborhoodId: string
  neighborhood: RankedCommunity
  budget: number
  salary: number
  commute: number
  lifestyle: string
  household: HouseholdType
  anchorLabel: string
}) =>
  JSON.stringify({
    neighborhoodId,
    neighborhoodScore: [
      neighborhood.overallScore,
      neighborhood.commuteScore,
      neighborhood.affordabilityScore,
      neighborhood.lifestyleScore,
      neighborhood.avgRent,
      neighborhood.distanceMiles,
    ],
    inputs: { budget, salary, commute, lifestyle, household, anchorLabel },
  })

function App() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRefs = useRef<mapboxgl.Marker[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const [anchorInput, setAnchorInput] = useState(DEFAULT_ANCHOR)
  const [housingMode, setHousingMode] = useState<HousingMode>('buy')
  const [budget, setBudget] = useState(2500)
  const [maxHomePrice, setMaxHomePrice] = useState(1_200_000)
  const [commute, setCommute] = useState(20)
  const [radius, setRadius] = useState(15)
  const [household, setHousehold] = useState<HouseholdType>('single')
  const [lifestyle, setLifestyle] = useState(DEFAULT_PREFS)
  const [results, setResults] = useState<RankedCommunity[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null)
  const [aiNeighborhoodCopy, setAiNeighborhoodCopy] = useState<Record<string, NeighborhoodCopy>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [propertyNotice, setPropertyNotice] = useState<string | null>(null)
  const [activeAnchorLabel, setActiveAnchorLabel] = useState<string | null>(null)
  const [properties, setProperties] = useState<PropertyListing[]>([])
  const [isPropertiesLoading, setIsPropertiesLoading] = useState(false)
  const [resolvedAnchor, setResolvedAnchor] = useState<ResolvedAnchor | null>(null)
  const [runtimeMapboxToken, setRuntimeMapboxToken] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return ''
    }
    return window.localStorage.getItem('wherenext:mapboxToken') ?? ''
  })
  const [mapboxTokenInput, setMapboxTokenInput] = useState('')
  const updateTimer = useRef<number | null>(null)
  const aiCopyTimer = useRef<number | null>(null)
  const aiCopyCache = useRef<Map<string, NeighborhoodCopy>>(new Map())
  const navigate = useNavigate()
  const location = useLocation()
  const isResults = location.pathname === '/results'

  const selected = useMemo(
    () => results.find((item) => item.id === selectedId) ?? null,
    [results, selectedId],
  )
  const selectedProperty = useMemo(
    () => properties.find((item) => item.id === selectedPropertyId) ?? null,
    [properties, selectedPropertyId],
  )
  const selectedNeighborhoodOverview = useMemo(() => buildNeighborhoodOverview(selected), [selected])
  const selectedCopy = selected ? aiNeighborhoodCopy[selected.id] ?? null : null

  const anchor = useMemo(() => resolvedAnchor ?? resolveAnchor(anchorInput), [anchorInput, resolvedAnchor])
  const envMapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()
  const mapboxToken = runtimeMapboxToken.trim() || envMapboxToken || ''
  const affordabilityInput = housingMode === 'buy' ? maxHomePrice : budget
  const salaryForAnalysis = housingMode === 'buy' ? Math.round(maxHomePrice / 12) : DEFAULT_RENT_SALARY
  const radiusSummaryLabel = `~${estimateCommuteMinutesFromMiles(radius)} min from anchor at ${radius} miles`
  const isNeighborhoodFocused = selectedId !== null

  useEffect(() => {
    window.localStorage.removeItem('wherenext:lastResults')
  }, [])

  const updateResults = async () => {
    setHasSearched(true)
    setIsLoading(true)
    setNotice(null)

    try {
      let anchorOverride: ResolvedAnchor | null = null
      if (mapboxToken) {
        anchorOverride = await geocodeAnchor(anchorInput, mapboxToken)
        if (anchorOverride) {
          setResolvedAnchor(anchorOverride)
        }
      }

      const anchorPayload = anchorOverride ?? resolveAnchor(anchorInput)

      if (anchorPayload.region === 'sf' || anchorPayload.region === 'seattle' || anchorPayload.region === 'irvine') {
        const ranked = scoreCommunitiesLocally({
          anchor: anchorPayload,
          budget,
          salary: salaryForAnalysis,
          commuteLimit: commute,
          radius,
          lifestyleInput: lifestyle,
          household,
          communities: getCommunitiesForRegion(anchorPayload.region),
        })

        setResults(ranked)
        setSelectedId(null)
        setSelectedPropertyId(null)
        setProperties([])
        setPropertyNotice(null)
        setActiveAnchorLabel(anchorPayload.label)
        setResolvedAnchor(anchorPayload)

        if (ranked.length === 0) {
          setNotice('No communities match the current radius and commute constraints. Try expanding filters.')
        }
        return
      }

      if (anchorPayload.region === 'custom') {
        if (!mapboxToken) {
          setNotice('Add a Mapbox token to search cities outside SF/Seattle/Irvine.')
          setResults([])
          setSelectedId(null)
          return
        }

        const dynamicCommunities = await searchNearbyCommunities(anchorPayload, radius, mapboxToken)
        const ranked = scoreCommunitiesLocally({
          anchor: anchorPayload,
          budget,
          salary: salaryForAnalysis,
          commuteLimit: commute,
          radius,
          lifestyleInput: lifestyle,
          household,
          communities: dynamicCommunities,
        })

        setResults(ranked)
        setSelectedId(null)
        setSelectedPropertyId(null)
        setProperties([])
        setPropertyNotice(null)
        setActiveAnchorLabel(anchorPayload.label)
        setResolvedAnchor(anchorPayload)

        if (ranked.length === 0) {
          setNotice('No nearby communities found for this location. Try expanding the radius.')
        }
      }
    } catch {
      const fallbackAnchor = resolvedAnchor ?? resolveAnchor(anchorInput)
      const fallbackCommunities =
        fallbackAnchor.region === 'sf' || fallbackAnchor.region === 'seattle' || fallbackAnchor.region === 'irvine'
          ? getCommunitiesForRegion(fallbackAnchor.region)
          : undefined

      const ranked = scoreCommunitiesLocally({
        anchor: fallbackAnchor,
        budget,
        salary: salaryForAnalysis,
        commuteLimit: commute,
        radius,
        lifestyleInput: lifestyle,
        household,
        communities: fallbackCommunities,
      })

      setResults(ranked)
      setSelectedId(null)
      setSelectedPropertyId(null)
      setProperties([])
      setPropertyNotice(null)
      setActiveAnchorLabel(fallbackAnchor.label)
      setNotice('Network unavailable. Showing local scoring results.')
    } finally {
      setIsLoading(false)
    }
  }

  const showSidebar = () => {
    navigate('/results')
  }

  const handleNeighborhoodSelect = (id: string) => {
    setSelectedId(id)
    setSelectedPropertyId(null)
  }

  const handleCloseNeighborhood = () => {
    setSelectedId(null)
    setSelectedPropertyId(null)
    setProperties([])
    setPropertyNotice(null)
  }

  const handleClosePropertyDetail = () => {
    setSelectedPropertyId(null)
  }

  const handleSaveMapboxToken = () => {
    const cleaned = mapboxTokenInput.trim()
    if (!cleaned) {
      return
    }
    window.localStorage.setItem('wherenext:mapboxToken', cleaned)
    setRuntimeMapboxToken(cleaned)
    setMapboxTokenInput('')
  }

  const getFallbackReason = (item: RankedCommunity) => buildReason(item)
  const getFallbackTradeoff = (item: RankedCommunity) => buildTradeoff(item)
  const getCommunityReason = (item: RankedCommunity) => aiNeighborhoodCopy[item.id]?.good ?? getFallbackReason(item)
  const getCommunityTradeoff = (item: RankedCommunity) => aiNeighborhoodCopy[item.id]?.tradeoff ?? getFallbackTradeoff(item)

  useEffect(() => {
    if (!isResults || results.length === 0) {
      return
    }

    if (aiCopyTimer.current) {
      window.clearTimeout(aiCopyTimer.current)
    }

    aiCopyTimer.current = window.setTimeout(() => {
      const topCommunities = results.slice(0, 8)
      topCommunities.forEach(async (community) => {
        const cacheKey = serializeAiCopyKey({
          neighborhoodId: community.id,
          neighborhood: community,
          budget,
          salary: salaryForAnalysis,
          commute,
          lifestyle,
          household,
          anchorLabel: activeAnchorLabel ?? anchor.label,
        })

        const cached = aiCopyCache.current.get(cacheKey)
        if (cached) {
          setAiNeighborhoodCopy((previous) => ({ ...previous, [community.id]: cached }))
          return
        }

        try {
          const copy = await fetchNeighborhoodCopy({
            neighborhoodId: community.id,
            neighborhood: community,
            anchorLabel: activeAnchorLabel ?? anchor.label,
            household,
            lifestylePreferences: lifestyle,
            budget,
            salary: salaryForAnalysis,
            commuteLimit: commute,
          })
          aiCopyCache.current.set(cacheKey, copy)
          setAiNeighborhoodCopy((previous) => ({ ...previous, [community.id]: copy }))
        } catch {
          // Fallback text is computed by heuristics in UI getters.
        }
      })
    }, AI_COPY_DEBOUNCE_MS)

    return () => {
      if (aiCopyTimer.current) {
        window.clearTimeout(aiCopyTimer.current)
      }
    }
  }, [
    isResults,
    results,
    budget,
    salaryForAnalysis,
    commute,
    lifestyle,
    household,
    anchor.label,
    activeAnchorLabel,
  ])

  useEffect(() => {
    if (!isResults) {
      return
    }

    if (updateTimer.current) {
      window.clearTimeout(updateTimer.current)
    }

    updateTimer.current = window.setTimeout(() => {
      updateResults()
    }, 550)

    return () => {
      if (updateTimer.current) {
        window.clearTimeout(updateTimer.current)
      }
    }
  }, [isResults, anchorInput, housingMode, affordabilityInput, commute, radius, household, lifestyle])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  useEffect(() => {
    if (!isResults || !selected || !isNeighborhoodFocused) {
      setProperties([])
      setPropertyNotice(null)
      setIsPropertiesLoading(false)
      return
    }

    const inferCityAndState = (): { city?: string; state_code?: string } => {
      if (selected.region === 'sf') {
        return { city: 'San Francisco', state_code: 'CA' }
      }
      if (selected.region === 'seattle') {
        return { city: 'Seattle', state_code: 'WA' }
      }
      if (selected.region === 'irvine') {
        return { city: 'Irvine', state_code: 'CA' }
      }
      return {}
    }

    let cancelled = false
    const run = async () => {
      setIsPropertiesLoading(true)
      setPropertyNotice(null)
      try {
        const region = inferCityAndState()
        const response = await searchProperties({
          neighborhood: selected.name,
          city: region.city,
          state_code: region.state_code,
          anchor_latitude: anchor.latitude,
          anchor_longitude: anchor.longitude,
          neighborhood_latitude: selected.latitude,
          neighborhood_longitude: selected.longitude,
          budget,
          salary: salaryForAnalysis,
          commute_limit: commute,
          radius: Math.min(radius, 6),
          household,
          housing_mode: housingMode,
          max_home_price: housingMode === 'buy' ? maxHomePrice : undefined,
          lifestyle_preferences: lifestyle,
          limit: 20,
        })
        if (cancelled) {
          return
        }

        const mapped = response.listings.map((raw) => {
          const listing = toPropertyListing(raw)
          if (listing.latitude === null || listing.longitude === null) {
            return listing
          }

          const distanceMiles = haversineMiles(anchor.latitude, anchor.longitude, listing.latitude, listing.longitude)
          return {
            ...listing,
            estimatedCommuteMinutes: estimateCommuteMinutesFromMiles(distanceMiles),
          }
        })

        setProperties(mapped)
        setSelectedPropertyId(null)
        if (mapped.length === 0) {
          setPropertyNotice('No matching homes found for this neighborhood and filter mix.')
        }
      } catch {
        if (!cancelled) {
          setProperties([])
          setSelectedPropertyId(null)
          setPropertyNotice('Could not load homes right now. Check backend API key/config.')
        }
      } finally {
        if (!cancelled) {
          setIsPropertiesLoading(false)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [
    isResults,
    selected?.id,
    housingMode,
    budget,
    maxHomePrice,
    household,
    commute,
    radius,
    lifestyle,
    anchor.latitude,
    anchor.longitude,
    isNeighborhoodFocused,
  ])

  const hasResults = results.length > 0

  useEffect(() => {
    if (!isResults || !hasResults) {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        setIsMapReady(false)
      }
      return
    }
    if (!mapContainerRef.current) {
      return
    }
    if (!mapboxToken) {
      return
    }

    const container = mapContainerRef.current
    if (mapRef.current && mapRef.current.getContainer() !== container) {
      mapRef.current.remove()
      mapRef.current = null
      setIsMapReady(false)
    }

    if (!mapRef.current) {
      mapboxgl.accessToken = mapboxToken
      mapRef.current = new mapboxgl.Map({
        container,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [anchor.longitude, anchor.latitude],
        zoom: 10.5,
      })

      mapRef.current.addControl(new mapboxgl.NavigationControl({ showZoom: true }), 'top-right')
      mapRef.current.on('load', () => {
        setIsMapReady(true)
        mapRef.current?.resize()
      })
    } else {
      mapRef.current.resize()
    }

    return () => {
      if (mapRef.current && mapRef.current.getContainer() !== container) {
        mapRef.current.remove()
        mapRef.current = null
        setIsMapReady(false)
      }
    }
  }, [anchor.latitude, anchor.longitude, hasResults, isResults, mapboxToken])

  useEffect(() => {
    if (!isResults || !mapRef.current || !mapboxToken || !isMapReady) {
      return
    }

    const map = mapRef.current
    markerRefs.current.forEach((marker) => marker.remove())
    markerRefs.current = []

    const bounds = new mapboxgl.LngLatBounds()

    const anchorEl = document.createElement('div')
    anchorEl.className = 'mapbox-anchor'
    anchorEl.textContent = activeAnchorLabel ?? anchor.label
    const anchorMarker = new mapboxgl.Marker({ element: anchorEl, anchor: 'bottom' })
      .setLngLat([anchor.longitude, anchor.latitude])
      .addTo(map)
    markerRefs.current.push(anchorMarker)
    bounds.extend([anchor.longitude, anchor.latitude])

    results.forEach((result) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `mapbox-marker ${selected?.id === result.id ? 'mapbox-marker--active' : ''}`
      el.addEventListener('click', () => handleNeighborhoodSelect(result.id))

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([result.longitude, result.latitude])
        .addTo(map)
      markerRefs.current.push(marker)
      bounds.extend([result.longitude, result.latitude])
    })

    const mapReadyHomes = isNeighborhoodFocused
      ? properties.filter((home) => home.latitude !== null && home.longitude !== null)
      : []
    const homeBounds = new mapboxgl.LngLatBounds()

    mapReadyHomes.forEach((home) => {
      if (home.longitude === null || home.latitude === null) {
        return
      }

      const el = document.createElement('button')
      el.type = 'button'
      el.className = `mapbox-home-marker ${selectedPropertyId === home.id ? 'mapbox-home-marker--active' : ''}`
      el.addEventListener('click', () => setSelectedPropertyId(home.id))

      if (selectedPropertyId === home.id && home.primaryPhoto) {
        const preview = document.createElement('div')
        preview.className = 'mapbox-home-marker__preview'

        const image = document.createElement('img')
        image.src = home.primaryPhoto
        image.alt = home.address
        image.loading = 'lazy'
        preview.appendChild(image)

        el.appendChild(preview)
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([home.longitude, home.latitude])
        .addTo(map)
      markerRefs.current.push(marker)
      homeBounds.extend([home.longitude, home.latitude])
    })

    if (isNeighborhoodFocused && selected) {
      if (!homeBounds.isEmpty()) {
        homeBounds.extend([selected.longitude, selected.latitude])
        map.fitBounds(homeBounds, { padding: 90, duration: 700, maxZoom: 14.2 })
      } else {
        map.flyTo({
          center: [selected.longitude, selected.latitude],
          zoom: 13.3,
          speed: 0.8,
        })
      }
    } else if (results.length > 0) {
      map.fitBounds(bounds, { padding: 70, duration: 600, maxZoom: 12.5 })
    } else {
      map.setCenter([anchor.longitude, anchor.latitude])
      map.setZoom(10.5)
    }

    map.resize()
  }, [
    activeAnchorLabel,
    anchor.label,
    anchor.latitude,
    anchor.longitude,
    isResults,
    isMapReady,
    mapboxToken,
    results,
    selected?.id,
    isNeighborhoodFocused,
    properties,
    selectedPropertyId,
  ])

  return (
    <main className={`app app--${isResults ? 'results' : 'survey'}`}>
      <SurveyPanel
        isResults={isResults}
        housingMode={housingMode}
        onHousingModeChange={setHousingMode}
        anchorInput={anchorInput}
        onAnchorChange={setAnchorInput}
        budget={budget}
        onBudgetChange={setBudget}
        maxHomePrice={maxHomePrice}
        onMaxHomePriceChange={setMaxHomePrice}
        commute={commute}
        onCommuteChange={setCommute}
        radius={radius}
        onRadiusChange={setRadius}
        radiusSummaryLabel={radiusSummaryLabel}
        household={household}
        onHouseholdChange={setHousehold}
        lifestyle={lifestyle}
        onLifestyleChange={setLifestyle}
        onFindCommunities={showSidebar}
      />

      <Routes>
        <Route
          path="/results"
          element={
            <ResultsView
              notice={notice}
              hasResults={hasResults}
              hasSearched={hasSearched}
              isLoading={isLoading}
              onUpdateResults={updateResults}
              mapboxToken={mapboxToken}
              mapboxTokenInput={mapboxTokenInput}
              onMapboxTokenInput={setMapboxTokenInput}
              onSaveMapboxToken={handleSaveMapboxToken}
              mapContainerRef={mapContainerRef}
              selected={selected}
              selectedOverview={selectedCopy?.overview ?? selectedNeighborhoodOverview}
              selectedGood={selectedCopy?.good ?? (selected ? getCommunityReason(selected) : '')}
              selectedTradeoff={selectedCopy?.tradeoff ?? (selected ? getCommunityTradeoff(selected) : '')}
              anchorLabel={activeAnchorLabel}
              anchor={anchor}
              results={results}
              selectedId={selectedId}
              onSelectNeighborhood={handleNeighborhoodSelect}
              getReason={getCommunityReason}
              getTradeoff={getCommunityTradeoff}
              properties={properties}
              isPropertiesLoading={isPropertiesLoading}
              propertyNotice={propertyNotice}
              isNeighborhoodFocused={isNeighborhoodFocused}
              onCloseNeighborhood={handleCloseNeighborhood}
              selectedProperty={selectedProperty}
              selectedPropertyId={selectedPropertyId}
              onSelectProperty={setSelectedPropertyId}
              onClosePropertyDetail={handleClosePropertyDetail}
            />
          }
        />
      </Routes>
    </main>
  )
}

export default App
