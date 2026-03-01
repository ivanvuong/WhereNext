import { useEffect, useMemo, useRef, useState } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { analyzeCommunities, type HouseholdType } from './api/analyze'
import SurveyPanel from './components/SurveyPanel'
import ResultsView from './components/ResultsView'
import type { RankedCommunity, ResolvedAnchor, TopCard } from './types/app'
import { geocodeAnchor, resolveAnchor } from './utils/geo'
import {
  buildReason,
  buildTradeoff,
  scoreCommunitiesLocally,
  toCommunity,
} from './utils/scoring'
import { searchNearbyCommunities } from './utils/communitySearch'

const DEFAULT_ANCHOR = ''
const DEFAULT_PREFS = ''

function App() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markerRefs = useRef<mapboxgl.Marker[]>([])
  const [anchorInput, setAnchorInput] = useState(DEFAULT_ANCHOR)
  const [budget, setBudget] = useState(2500)
  const [salary, setSalary] = useState(80000)
  const [commute, setCommute] = useState(20)
  const [radius, setRadius] = useState(15)
  const [household, setHousehold] = useState<HouseholdType>('single')
  const [lifestyle, setLifestyle] = useState(DEFAULT_PREFS)
  const [results, setResults] = useState<RankedCommunity[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [activeAnchorLabel, setActiveAnchorLabel] = useState<string | null>(null)
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

  const anchor = useMemo(() => resolvedAnchor ?? resolveAnchor(anchorInput), [anchorInput, resolvedAnchor])
  const envMapboxToken = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim()
  const mapboxToken = runtimeMapboxToken.trim() || envMapboxToken || ''

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
          salary,
          commuteLimit: commute,
          radius,
          lifestyleInput: lifestyle,
          household,
          communities: dynamicCommunities,
        })
        setResults(ranked)
        setSelectedId(ranked[0]?.id ?? null)
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
        salary,
        commute_limit: commute,
        radius,
        household,
        lifestyle_preferences: lifestyle,
      })

      const ranked = response.communities.map(toCommunity)
      setResults(ranked)
      setSelectedId(ranked[0]?.id ?? null)
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
        salary,
        commuteLimit: commute,
        radius,
        lifestyleInput: lifestyle,
        household,
      })

      setResults(ranked)
      setSelectedId(ranked[0]?.id ?? null)
      setActiveAnchorLabel(fallbackAnchor.label)
      setNotice('Backend unavailable. Showing local mock scoring results.')
    } finally {
      setIsLoading(false)
    }
  }

  const showSidebar = () => {
    navigate('/results')
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
  }, [isResults, anchorInput, budget, salary, commute, radius, household, lifestyle])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [location.pathname])

  const topCard: TopCard | null = selected
    ? {
        homes: Math.max(8, Math.round(selected.overallScore / 6)),
        estimate: selected.avgRent * 1420,
        age: `${Math.max(4, Math.round(26 - selected.distanceMiles))}Y`,
      }
    : null

  const hasResults = results.length > 0

  useEffect(() => {
    if (!isResults) {
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
  }, [anchor.latitude, anchor.longitude, isResults, mapboxToken])

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

    results.forEach((result) => {
      const el = document.createElement('button')
      el.type = 'button'
      el.className = `mapbox-marker ${selected?.id === result.id ? 'mapbox-marker--active' : ''}`
      el.addEventListener('click', () => setSelectedId(result.id))

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([result.longitude, result.latitude])
        .addTo(map)
      markerRefs.current.push(marker)
      bounds.extend([result.longitude, result.latitude])
    })

    if (results.length > 0) {
      map.fitBounds(bounds, { padding: 70, duration: 600, maxZoom: 12.5 })
    } else {
      map.setCenter([anchor.longitude, anchor.latitude])
      map.setZoom(10.5)
    }
    map.resize()
  }, [activeAnchorLabel, anchor.label, anchor.latitude, anchor.longitude, isResults, mapboxToken, results, selected?.id])

  return (
    <main className={`app app--${isResults ? 'results' : 'survey'}`}>
      <SurveyPanel
        isResults={isResults}
        anchorInput={anchorInput}
        onAnchorChange={setAnchorInput}
        budget={budget}
        onBudgetChange={setBudget}
        salary={salary}
        onSalaryChange={setSalary}
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
              topCard={topCard}
              anchorLabel={activeAnchorLabel}
              anchor={anchor}
              results={results}
              selectedId={selectedId}
              onSelect={setSelectedId}
              buildReason={buildReason}
              buildTradeoff={buildTradeoff}
            />
          }
        />
      </Routes>
    </main>
  )
}

export default App
