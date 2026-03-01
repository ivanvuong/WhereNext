import { useEffect, useMemo, useRef, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { analyzeCommunities, type HouseholdType } from './api/analyze'
import { searchProperties } from './api/properties'
import SurveyPanel from './components/SurveyPanel'
import ResultsView from './components/ResultsView'
import type { HousingMode, PropertyListing, RankedCommunity, ResolvedAnchor } from './types/app'
import { geocodeAnchor, resolveAnchor } from './utils/geo'
import {
  buildReason,
  buildTradeoff,
  scoreCommunitiesLocally,
  toCommunity,
} from './utils/scoring'
import { searchNearbyCommunities } from './utils/communitySearch'
import { toPropertyListing } from './utils/properties'

const DEFAULT_ANCHOR = ''
const DEFAULT_PREFS = ''
const DEFAULT_RENT_SALARY = 80_000

function App() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRefs = useRef<mapboxgl.Marker[]>([])
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
  const navigate = useNavigate()
  const location = useLocation()
  const isResults = location.pathname === '/results'

  const selected = useMemo(
    () => results.find((item) => item.id === selectedId) ?? results[0] ?? null,
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

      if (anchorPayload.region === 'custom') {
        if (!mapboxToken) {
          setNotice('Add a Mapbox token to search cities outside the demo regions.')
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
        return
      }

      const response = await analyzeCommunities({
        anchor_input: anchorInput,
        anchor_label: anchorPayload.label,
        anchor_latitude: anchorPayload.latitude,
        anchor_longitude: anchorPayload.longitude,
        budget,
        salary: salaryForAnalysis,
        commute_limit: commute,
        radius,
        household,
        lifestyle_preferences: lifestyle,
      })

      const ranked = response.communities.map(toCommunity)
      setResults(ranked)
      setSelectedId(ranked[0]?.id ?? null)
      setSelectedPropertyId(null)
      setIsNeighborhoodFocused(false)
      setProperties([])
      setPropertyNotice(null)
      setActiveAnchorLabel(response.anchor_label)
      setResolvedAnchor({
        label: response.anchor_label,
        latitude: response.anchor_latitude,
        longitude: response.anchor_longitude,
        region: response.anchor_region,
      })
      if (ranked.length === 0) {
        setNotice('No communities match the current radius and budget constraints. Try widening filters.')
      }
    } catch {
      const fallbackAnchor = resolvedAnchor ?? resolveAnchor(anchorInput)
      const ranked = scoreCommunitiesLocally({
        anchor: fallbackAnchor,
        budget,
        salary: salaryForAnalysis,
        commuteLimit: commute,
        radius,
        lifestyleInput: lifestyle,
        household,
      })

      setResults(ranked)
      setSelectedId(ranked[0]?.id ?? null)
      setSelectedPropertyId(null)
      setIsNeighborhoodFocused(false)
      setProperties([])
      setPropertyNotice(null)
      setActiveAnchorLabel(fallbackAnchor.label)
      setNotice('Backend unavailable. Showing local mock scoring results.')
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
  }

  const handleCloseNeighborhood = () => {
    setIsNeighborhoodFocused(false)
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
          radius,
          household,
          housing_mode: housingMode,
          max_home_price: housingMode === 'buy' ? maxHomePrice : undefined,
          limit: 20,
        })
        if (cancelled) {
          return
        }
        const mapped = response.listings.map(toPropertyListing)
        setProperties(mapped)
        setSelectedPropertyId((previous) => {
          if (previous && mapped.some((home) => home.id === previous)) {
            return previous
          }
          return mapped[0]?.id ?? null
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
        mapRef.current?.resize()
      })
    } else {
      mapRef.current.resize()
    }
    return () => {
      if (mapRef.current && mapRef.current.getContainer() !== container) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [anchor.latitude, anchor.longitude, hasResults, isResults, mapboxToken])

  useEffect(() => {
    if (!isResults || !mapRef.current || !mapboxToken) {
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

    visibleNeighborhoods.forEach((result) => {
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

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([home.longitude, home.latitude])
        .addTo(map)
      markerRefs.current.push(marker)
      homeBounds.extend([home.longitude, home.latitude])
    })

    if (isNeighborhoodFocused && selected) {
      if (!homeBounds.isEmpty()) {
        homeBounds.extend([selected.longitude, selected.latitude])
        map.fitBounds(homeBounds, { padding: 90, duration: 700, maxZoom: 15 })
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
              anchorLabel={activeAnchorLabel}
              anchor={anchor}
              results={results}
              selectedId={selectedId}
              onSelect={handleNeighborhoodSelect}
              buildReason={buildReason}
              buildTradeoff={buildTradeoff}
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
