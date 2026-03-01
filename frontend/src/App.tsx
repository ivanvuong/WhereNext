import { useEffect, useMemo, useRef, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { type HouseholdType, type Region } from './api/analyze'
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
import { scoreCommunitiesLocally } from './utils/scoring'
import { searchNearbyCommunities } from './utils/communitySearch'
import { toPropertyListing } from './utils/properties'

const DEFAULT_ANCHOR = ''
const DEFAULT_PREFS = ''
const DEFAULT_RENT_SALARY = 80_000
const AI_COPY_DEBOUNCE_MS = 450
const AI_COPY_CACHE_KEY = 'wherenext:aiNeighborhoodCopyCache:v1'
const NEIGHBORHOOD_RADIUS_SOURCE_ID = 'wherenext-neighborhood-radius-source'
const NEIGHBORHOOD_RADIUS_FILL_LAYER_ID = 'wherenext-neighborhood-radius-fill'
const NEIGHBORHOOD_RADIUS_LINE_LAYER_ID = 'wherenext-neighborhood-radius-line'

const isLocalRegion = (region: RankedCommunity['region'] | ResolvedAnchor['region']) =>
  region === 'sf' || region === 'seattle' || region === 'irvine' || region === 'la' || region === 'nyc'

const serializeAiCopyKey = ({
  neighborhood,
  budget,
  salary,
  commuteLimit,
  lifestyle,
  household,
  anchorLabel,
  anchorRegion,
}: {
  neighborhood: RankedCommunity
  budget: number
  salary: number
  commuteLimit: number
  lifestyle: string
  household: HouseholdType
  anchorLabel: string
  anchorRegion: Region
}) =>
  JSON.stringify({
    neighborhoodId: neighborhood.id,
    budget,
    salary,
    commuteLimit,
    lifestyle,
    household,
    anchorLabel,
    anchorRegion,
    scores: [
      neighborhood.commuteScore,
      neighborhood.affordabilityScore,
      neighborhood.lifestyleScore,
      neighborhood.overallScore,
      neighborhood.avgRent,
      neighborhood.distanceMiles,
    ],
  })

const buildCircleRing = (latitude: number, longitude: number, radiusMiles: number): [number, number][] => {
  const points = 56
  const ring: [number, number][] = []
  const latitudeMiles = 69
  const latitudeRadius = radiusMiles / latitudeMiles
  const longitudeRadius = radiusMiles / (latitudeMiles * Math.max(Math.cos((latitude * Math.PI) / 180), 0.2))

  for (let index = 0; index <= points; index += 1) {
    const angle = (index / points) * Math.PI * 2
    ring.push([longitude + Math.cos(angle) * longitudeRadius, latitude + Math.sin(angle) * latitudeRadius])
  }

  return ring
}

const computeNeighborhoodCircleRadiusMiles = (
  target: RankedCommunity,
  neighborhoods: RankedCommunity[],
): number => {
  if (neighborhoods.length <= 1) {
    return 0.5
  }

  let nearestMiles = Number.POSITIVE_INFINITY
  neighborhoods.forEach((candidate) => {
    if (candidate.id === target.id) {
      return
    }

    const miles = haversineMiles(target.latitude, target.longitude, candidate.latitude, candidate.longitude)
    if (miles < nearestMiles) {
      nearestMiles = miles
    }
  })

  if (!Number.isFinite(nearestMiles)) {
    return 0.5
  }

  // Keep circles visibly present while avoiding overlap in dense clusters.
  return Math.min(0.5, Math.max(0.12, nearestMiles * 0.45))
}

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
  const [isNeighborhoodFocused, setIsNeighborhoodFocused] = useState(false)
  const [aiNeighborhoodCopy, setAiNeighborhoodCopy] = useState<Record<string, NeighborhoodCopy>>({})
  const [aiCopyLoadingById, setAiCopyLoadingById] = useState<Record<string, boolean>>({})
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
  const aiCopyRequestVersion = useRef<Record<string, number>>({})
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

  const anchor = useMemo(() => resolvedAnchor ?? resolveAnchor(anchorInput), [anchorInput, resolvedAnchor])
  const envMapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()
  const mapboxToken = runtimeMapboxToken.trim() || envMapboxToken || ''
  const affordabilityInput = housingMode === 'buy' ? maxHomePrice : budget
  const salaryForAnalysis = housingMode === 'buy' ? Math.round(maxHomePrice / 12) : DEFAULT_RENT_SALARY
  const selectedCopy = selected ? aiNeighborhoodCopy[selected.id] ?? null : null
  const selectedGood = selectedCopy?.good ?? ''
  const selectedTradeoff = selectedCopy?.tradeoff ?? ''
  const isSelectedCopyLoading = !!selected && !selectedCopy && (aiCopyLoadingById[selected.id] ?? true)

  useEffect(() => {
    window.localStorage.removeItem('wherenext:lastResults')
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AI_COPY_CACHE_KEY)
      if (!raw) {
        return
      }
      const parsed = JSON.parse(raw) as Array<[string, NeighborhoodCopy]>
      aiCopyCache.current = new Map(parsed)
    } catch {
      aiCopyCache.current = new Map()
    }
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

      if (isLocalRegion(anchorPayload.region)) {
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
        setSelectedId(ranked[0]?.id ?? null)
        setSelectedPropertyId(null)
        setIsNeighborhoodFocused(false)
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
          setNotice('Add a Mapbox token to search cities outside the built-in metro sets.')
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
        setSelectedId(ranked[0]?.id ?? null)
        setSelectedPropertyId(null)
        setIsNeighborhoodFocused(false)
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
        isLocalRegion(fallbackAnchor.region)
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
      setSelectedId(ranked[0]?.id ?? null)
      setSelectedPropertyId(null)
      setIsNeighborhoodFocused(false)
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
    setIsNeighborhoodFocused(true)
    setProperties([])
    setPropertyNotice(null)
  }

  const handleCloseNeighborhood = () => {
    setIsNeighborhoodFocused(false)
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

  const getCommunityReason = (community: RankedCommunity) =>
    aiNeighborhoodCopy[community.id]?.good ?? ''

  const getCommunityTradeoff = (community: RankedCommunity) =>
    aiNeighborhoodCopy[community.id]?.tradeoff ?? ''

  useEffect(() => {
    if (!isResults || results.length === 0) {
      return
    }

    if (aiCopyTimer.current) {
      window.clearTimeout(aiCopyTimer.current)
    }

    aiCopyTimer.current = window.setTimeout(() => {
      const targetNeighborhoods = results.slice(0, 10)
      targetNeighborhoods.forEach(async (neighborhood) => {
        const cacheKey = serializeAiCopyKey({
          neighborhood,
          budget,
          salary: salaryForAnalysis,
          commuteLimit: commute,
          lifestyle,
          household,
          anchorLabel: activeAnchorLabel ?? anchor.label,
          anchorRegion: anchor.region,
        })

        const cached = aiCopyCache.current.get(cacheKey)
        if (cached) {
          setAiNeighborhoodCopy((previous) => ({ ...previous, [neighborhood.id]: cached }))
          setAiCopyLoadingById((previous) => ({ ...previous, [neighborhood.id]: false }))
          return
        }

        setAiCopyLoadingById((previous) => ({ ...previous, [neighborhood.id]: true }))
        const nextVersion = (aiCopyRequestVersion.current[neighborhood.id] ?? 0) + 1
        aiCopyRequestVersion.current[neighborhood.id] = nextVersion

        try {
          const copy = await fetchNeighborhoodCopy({
            neighborhoodId: neighborhood.id,
            neighborhood,
            anchorLabel: activeAnchorLabel ?? anchor.label,
            anchorRegion: anchor.region,
            household,
            lifestylePreferences: lifestyle,
            budget,
            salary: salaryForAnalysis,
            commuteLimit: commute,
          })
          if ((aiCopyRequestVersion.current[neighborhood.id] ?? 0) !== nextVersion) {
            return
          }
          const cleanedCopy = {
            overview: (copy.overview ?? '').replace(/\.{2,}/g, '.').trim(),
            good: (copy.good ?? '').replace(/^good:\s*/i, '').replace(/\.{2,}/g, '.').trim(),
            tradeoff: (copy.tradeoff ?? '').replace(/^tradeoff:\s*/i, '').replace(/\.{2,}/g, '.').trim(),
          }
          aiCopyCache.current.set(cacheKey, cleanedCopy)
          try {
            window.localStorage.setItem(AI_COPY_CACHE_KEY, JSON.stringify(Array.from(aiCopyCache.current.entries())))
          } catch {
            // Ignore cache persistence errors.
          }
          setAiNeighborhoodCopy((previous) => ({ ...previous, [neighborhood.id]: cleanedCopy }))
          setAiCopyLoadingById((previous) => ({ ...previous, [neighborhood.id]: false }))
        } catch {
          if ((aiCopyRequestVersion.current[neighborhood.id] ?? 0) !== nextVersion) {
            return
          }
          setAiCopyLoadingById((previous) => ({ ...previous, [neighborhood.id]: false }))
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
    activeAnchorLabel,
    anchor.label,
    anchor.region,
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
      if (selected.region === 'la') {
        return { city: 'Los Angeles', state_code: 'CA' }
      }
      if (selected.region === 'nyc') {
        return { city: 'New York', state_code: 'NY' }
      }
      return {}
    }

    let cancelled = false
    const run = async () => {
      setIsPropertiesLoading(true)
      setPropertyNotice(null)
      setProperties([])
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
          radius,
          household,
          housing_mode: housingMode,
          max_home_price: housingMode === 'buy' ? maxHomePrice : undefined,
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
        setSelectedPropertyId((previous) => {
          if (previous && mapped.some((home) => home.id === previous)) {
            return previous
          }
          return null
        })
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

    const visibleNeighborhoods =
      isNeighborhoodFocused && selected ? results.filter((result) => result.id === selected.id) : results

    const removeNeighborhoodRadiusLayers = () => {
      if (map.getLayer(NEIGHBORHOOD_RADIUS_LINE_LAYER_ID)) {
        map.removeLayer(NEIGHBORHOOD_RADIUS_LINE_LAYER_ID)
      }
      if (map.getLayer(NEIGHBORHOOD_RADIUS_FILL_LAYER_ID)) {
        map.removeLayer(NEIGHBORHOOD_RADIUS_FILL_LAYER_ID)
      }
      if (map.getSource(NEIGHBORHOOD_RADIUS_SOURCE_ID)) {
        map.removeSource(NEIGHBORHOOD_RADIUS_SOURCE_ID)
      }
    }

    removeNeighborhoodRadiusLayers()

    if (!isNeighborhoodFocused && visibleNeighborhoods.length > 0) {
      const radiusGeoJson = {
        type: 'FeatureCollection' as const,
        features: visibleNeighborhoods.map((item) => {
          const markerRadiusMiles = computeNeighborhoodCircleRadiusMiles(item, visibleNeighborhoods)
          return {
            type: 'Feature' as const,
            properties: { id: item.id },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [buildCircleRing(item.latitude, item.longitude, markerRadiusMiles)],
            },
          }
        }),
      }

      map.addSource(NEIGHBORHOOD_RADIUS_SOURCE_ID, {
        type: 'geojson',
        data: radiusGeoJson,
      })

      map.addLayer({
        id: NEIGHBORHOOD_RADIUS_FILL_LAYER_ID,
        type: 'fill',
        source: NEIGHBORHOOD_RADIUS_SOURCE_ID,
        paint: {
          'fill-color': '#f2b114',
          'fill-opacity': 0.14,
        },
      })

      map.addLayer({
        id: NEIGHBORHOOD_RADIUS_LINE_LAYER_ID,
        type: 'line',
        source: NEIGHBORHOOD_RADIUS_SOURCE_ID,
        paint: {
          'line-color': '#f2b114',
          'line-width': 1.2,
          'line-opacity': 0.52,
        },
      })
    }

    visibleNeighborhoods.forEach((result) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `mapbox-marker ${isNeighborhoodFocused && selected?.id === result.id ? 'mapbox-marker--active' : ''}`
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

    mapReadyHomes.forEach((home) => {
      if (home.longitude === null || home.latitude === null) {
        return
      }

      const el = document.createElement('button')
      el.type = 'button'
      el.className = `mapbox-home-marker ${selectedPropertyId === home.id ? 'mapbox-home-marker--active' : ''}`
      el.addEventListener('click', () => setSelectedPropertyId(home.id))

      const houseIcon = document.createElement('span')
      houseIcon.className = 'mapbox-home-marker__icon'
      el.appendChild(houseIcon)

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
    })

    if (isNeighborhoodFocused && selected) {
      if (selectedProperty && selectedProperty.latitude !== null && selectedProperty.longitude !== null) {
        map.flyTo({
          center: [selectedProperty.longitude, selectedProperty.latitude],
          zoom: 15.3,
          speed: 0.85,
        })
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
    radius,
    properties,
    selectedPropertyId,
    selectedProperty,
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
              selectedOverview={selectedCopy?.overview ?? ''}
              selectedGood={selectedGood}
              selectedTradeoff={selectedTradeoff}
              housingMode={housingMode}
              isSelectedCopyLoading={isSelectedCopyLoading}
              results={results}
              selectedId={selectedId}
              onSelect={handleNeighborhoodSelect}
              buildReason={getCommunityReason}
              buildTradeoff={getCommunityTradeoff}
              isCopyLoading={(item) => !aiNeighborhoodCopy[item.id] && (aiCopyLoadingById[item.id] ?? true)}
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
