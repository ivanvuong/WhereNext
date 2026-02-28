import { useMemo, useState, type CSSProperties } from 'react'
import './App.css'
import { COMMUNITIES } from './data/communities'
import {
  analyzeCommunities,
  type HouseholdType,
  type RankedCommunityApi,
  type Region,
} from './api/analyze'

type ResolvedAnchor = {
  label: string
  latitude: number
  longitude: number
  region: Region
}

type RankedCommunity = {
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

type PreferenceDimension = keyof (typeof COMMUNITIES)[number]['lifestyle']

const HOUSEHOLD_OPTIONS: HouseholdType[] = ['single', 'couple', 'family', 'with pets']

const DEFAULT_ANCHOR = 'Google SF'
const DEFAULT_PREFS = 'walkable, food scene, quiet'

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

const toTitle = (value: string) => value.replace(/(^|\s)\w/g, (m) => m.toUpperCase())

const parsePreferenceDimensions = (input: string): PreferenceDimension[] => {
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

const resolveAnchor = (input: string): ResolvedAnchor => {
  const value = input.toLowerCase()

  if (value.includes('uci') || value.includes('irvine') || value.includes('tustin') || value.includes('orange')) {
    return {
      label: 'Irvine Anchor',
      latitude: 33.6405,
      longitude: -117.8443,
      region: 'irvine',
    }
  }

  if (value.includes('san francisco') || value.includes('sf') || value.includes('google') || value.includes('stripe')) {
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

const haversineMiles = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
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

const scoreCommunitiesLocally = ({
  anchor,
  budget,
  salary,
  commuteLimit,
  radius,
  lifestyleInput,
  household,
}: {
  anchor: ResolvedAnchor
  budget: number
  salary: number
  commuteLimit: number
  radius: number
  lifestyleInput: string
  household: HouseholdType
}): RankedCommunity[] => {
  const dims = parsePreferenceDimensions(lifestyleInput)
  const householdWeight =
    household === 'family' ? 'family' : household === 'with pets' ? 'pets' : household === 'couple' ? 'quiet' : 'nightlife'

  const monthlyAffordableFromSalary = (salary / 12) * 0.34
  const effectiveBudget = Math.max(budget, monthlyAffordableFromSalary)

  const candidates = COMMUNITIES.filter((community) => community.region === anchor.region)
    .map((community) => {
      const distanceMiles = haversineMiles(anchor.latitude, anchor.longitude, community.latitude, community.longitude)
      if (distanceMiles > radius) {
        return null
      }

      const estimatedCommute = distanceMiles * 3.4 + 5
      const commuteGap = Math.abs(estimatedCommute - commuteLimit)
      const commuteScore = clamp(100 - commuteGap * 3.2, 0, 100)

      const affordabilityDelta = community.avgRent - effectiveBudget
      const affordabilityScore = clamp(100 - Math.max(affordabilityDelta, 0) / 14, 12, 100)

      const lifestyleBase = dims.reduce((sum, key) => sum + community.lifestyle[key], 0) / dims.length
      const weightedLifestyle = clamp(
        lifestyleBase * 0.84 + community.lifestyle[householdWeight] * 0.16,
        0,
        100,
      )

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

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const toCommunity = (item: RankedCommunityApi): RankedCommunity => ({
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

const buildReason = (item: RankedCommunity): string => {
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

const buildTradeoff = (item: RankedCommunity): string => {
  const weakest = Math.min(item.commuteScore, item.affordabilityScore, item.lifestyleScore)
  if (weakest === item.affordabilityScore) {
    return 'Tradeoff: rent pressure is higher than your ideal level'
  }

  if (weakest === item.commuteScore) {
    return 'Tradeoff: commute may run longer during peak traffic'
  }

  return 'Tradeoff: fewer high-density amenities than core districts'
}

const Logo = () => (
  <div className="brand">
    <div className="brand__mark" aria-hidden>
      <div className="brand__mark-inner" />
    </div>
    <span className="brand__name">LandRight</span>
  </div>
)

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M15.5 14h-.79l-.28-.27A6.5 6.5 0 1 0 14 15.5l.27.28v.79L20 21.49 21.49 20l-5.99-6zM10 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"
      fill="currentColor"
    />
  </svg>
)

const MetricSlider = ({
  id,
  label,
  value,
  min,
  max,
  step,
  suffix,
  optional,
  onChange,
}: {
  id: string
  label: string
  value: number
  min: number
  max: number
  step: number
  suffix?: string
  optional?: boolean
  onChange: (value: number) => void
}) => (
  <div className="metric-slider">
    <div className="metric-slider__header">
      <label htmlFor={id}>
        {label}
        {optional ? <span className="muted"> (optional)</span> : null}
      </label>
      <strong>
        {suffix === '$' ? formatCurrency(value) : `${value}${suffix ? ` ${suffix}` : ''}`}
      </strong>
    </div>
    <input
      id={id}
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      style={{ '--fill': `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  </div>
)

function App() {
  const [mode, setMode] = useState<'survey' | 'results'>('survey')
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

  const selected = useMemo(
    () => results.find((item) => item.id === selectedId) ?? results[0] ?? null,
    [results, selectedId],
  )

  const anchor = useMemo(() => resolveAnchor(anchorInput), [anchorInput])

  const updateResults = async () => {
    setHasSearched(true)
    setIsLoading(true)
    setNotice(null)

    try {
      const response = await analyzeCommunities({
        anchor_input: anchorInput,
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
      if (ranked.length === 0) {
        setNotice('No communities match the current radius and budget constraints. Try widening filters.')
      }
    } catch {
      const ranked = scoreCommunitiesLocally({
        anchor,
        budget,
        salary,
        commuteLimit: commute,
        radius,
        lifestyleInput: lifestyle,
        household,
      })

      setResults(ranked)
      setSelectedId(ranked[0]?.id ?? null)
      setActiveAnchorLabel(anchor.label)
      setNotice('Backend unavailable. Showing local mock scoring results.')
    } finally {
      setIsLoading(false)
    }
  }

  const showSidebar = () => {
    setMode('results')
  }

  const topCard = selected
    ? {
        homes: Math.max(8, Math.round(selected.overallScore / 6)),
        estimate: selected.avgRent * 1420,
        age: `${Math.max(4, Math.round(26 - selected.distanceMiles))}Y`,
      }
    : null

  const hasResults = results.length > 0

  const latitudes = results.map((result) => result.latitude)
  const longitudes = results.map((result) => result.longitude)
  const minLat = Math.min(...latitudes, anchor.latitude) - 0.02
  const maxLat = Math.max(...latitudes, anchor.latitude) + 0.02
  const minLng = Math.min(...longitudes, anchor.longitude) - 0.03
  const maxLng = Math.max(...longitudes, anchor.longitude) + 0.03

  const getMapPosition = (latitude: number, longitude: number) => {
    const x = ((longitude - minLng) / (maxLng - minLng || 1)) * 100
    const y = ((maxLat - latitude) / (maxLat - minLat || 1)) * 100
    return { left: `${clamp(x, 3, 97)}%`, top: `${clamp(y, 3, 97)}%` }
  }

  const anchorPoint = getMapPosition(anchor.latitude, anchor.longitude)

  return (
    <main className={`app app--${mode}`}>
      <section className={`survey ${mode === 'results' ? 'survey--sidebar' : ''}`}>
        <div className="survey__inner">
          <div className="survey__header">
            <Logo />
            {mode === 'survey' ? (
              <>
                <h1>Find the best place to live based on your life</h1>
                <p>From job or school to neighborhood recommendations in seconds</p>
              </>
            ) : null}
          </div>

          <form className={`survey-form ${mode === 'survey' ? 'survey-form--landing' : ''}`}>
            <div className="field-group">
              <label htmlFor="anchor">Where will you work or study?</label>
              <div className="search-field">
                <SearchIcon />
                <input
                  id="anchor"
                  type="text"
                  value={anchorInput}
                  onChange={(event) => setAnchorInput(event.target.value)}
                  placeholder="e.g. Stripe, UCI, Google SF"
                />
              </div>
            </div>

            <div className={`slider-grid ${mode === 'survey' ? 'slider-grid--split' : ''}`}>
              <MetricSlider
                id="budget"
                label="Monthly Rent Budget"
                value={budget}
                min={1200}
                max={7000}
                step={50}
                suffix="$"
                onChange={setBudget}
              />
              <MetricSlider
                id="salary"
                label="Annual Salary"
                value={salary}
                min={35000}
                max={350000}
                step={1000}
                suffix="$"
                optional
                onChange={setSalary}
              />
            </div>

            <MetricSlider
              id="commute"
              label="Max commute time"
              value={commute}
              min={5}
              max={90}
              step={1}
              suffix="min"
              onChange={setCommute}
            />

            <MetricSlider
              id="radius"
              label="Search radius"
              value={radius}
              min={1}
              max={30}
              step={1}
              suffix="miles"
              onChange={setRadius}
            />
            <p className="caption">We&apos;ll find communities within this range</p>

            <div className="field-group">
              <label>Household Type</label>
              <div className="chip-row">
                {HOUSEHOLD_OPTIONS.map((option) => (
                  <button
                    key={option}
                    className={`chip ${household === option ? 'chip--active' : ''}`}
                    type="button"
                    onClick={() => setHousehold(option)}
                  >
                    {toTitle(option)}
                  </button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="lifestyle">Lifestyle Preferences</label>
              <textarea
                id="lifestyle"
                value={lifestyle}
                onChange={(event) => setLifestyle(event.target.value)}
                placeholder="e.g. walkable, quiet, food scene, nightlife, outdoors..."
              />
            </div>
          </form>
        </div>

        <div className="survey__footer">
          {mode === 'survey' ? (
            <button className="cta" type="button" onClick={showSidebar}>
              Find Communities
            </button>
          ) : (
            <button className="cta" type="button" onClick={updateResults} disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Results'}
            </button>
          )}
        </div>
      </section>

      {mode === 'results' ? (
        <section className="workspace">
          {notice ? <p className="workspace-notice">{notice}</p> : null}

          {!hasResults ? (
            <div className="workspace-empty">
              <div className="spinner-badge" aria-hidden>
                <div className="spinner" />
              </div>
              <h2>{hasSearched ? 'No communities found' : 'Map will appear here'}</h2>
              <p>
                {hasSearched
                  ? 'Adjust commute, radius, or budget and update results again.'
                  : 'Click "Update Results" to continue'}
              </p>
              <button className="ghost-cta" type="button" onClick={updateResults} disabled={isLoading}>
                {isLoading ? 'Loading...' : 'View Map Example'}
              </button>
            </div>
          ) : (
            <div className="workspace-results">
              <article className="map-panel">
                <div className="map-controls">
                  <div className="map-search">
                    <SearchIcon />
                    <span>Search</span>
                  </div>
                  <div className="map-pill">Insurance Type</div>
                  <div className="map-pill">State</div>
                  <div className="map-pill">City</div>
                  <div className="map-pill">District</div>
                </div>

                <div className="map-canvas" role="img" aria-label="Community recommendation map">
                  <div className="anchor-pin" style={anchorPoint}>
                    <span>{activeAnchorLabel ?? anchor.label}</span>
                  </div>

                  {results.map((result) => {
                    const isActive = selected?.id === result.id
                    const pos = getMapPosition(result.latitude, result.longitude)
                    return (
                      <button
                        key={result.id}
                        type="button"
                        className={`map-marker ${isActive ? 'map-marker--active' : ''}`}
                        style={pos}
                        onClick={() => setSelectedId(result.id)}
                        aria-label={`View ${result.name}`}
                      >
                        <span />
                      </button>
                    )
                  })}

                  {selected && topCard ? (
                    <div className="summary-floats">
                      <div>
                        <strong>{topCard.homes}</strong>
                        <span>House Number</span>
                      </div>
                      <div>
                        <strong>{formatCurrency(topCard.estimate)}</strong>
                        <span>Estimate House Price</span>
                      </div>
                      <div>
                        <strong>{topCard.age}</strong>
                        <span>Average Age</span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>

              <section className="recommendation-list">
                {results.slice(0, 4).map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    className={`recommendation-item ${selected?.id === result.id ? 'recommendation-item--active' : ''}`}
                    onClick={() => setSelectedId(result.id)}
                  >
                    <div>
                      <h4>{result.name}</h4>
                      <p>{buildReason(result)}</p>
                      <p className="recommendation-tradeoff">{buildTradeoff(result)}</p>
                    </div>
                    <strong>{Math.round(result.overallScore)}</strong>
                  </button>
                ))}
              </section>

              {selected ? (
                <section className="detail-grid">
                  <article className="location-card">
                    <header>
                      <div>
                        <h3>Location</h3>
                        <p>
                          {selected.name}, near {activeAnchorLabel ?? anchor.label}
                        </p>
                        <p className="code-line">HO-1, HO-3, HO-7</p>
                        <div className="score-strip">
                          <span>Match {Math.round(selected.overallScore)}</span>
                          <span>Commute {Math.round(selected.commuteScore)}</span>
                          <span>Cost {Math.round(selected.affordabilityScore)}</span>
                          <span>Lifestyle {Math.round(selected.lifestyleScore)}</span>
                        </div>
                      </div>
                      <div className="heart">❤</div>
                    </header>

                    <div className="stat-row">
                      <div className="stat-box">
                        <span>Building Age</span>
                        <strong>{Math.max(4, Math.round(29 - selected.distanceMiles))}Y</strong>
                      </div>
                      <div className="stat-box">
                        <span>Daily Visitors</span>
                        <strong>{(9800 + Math.round(selected.overallScore * 8)).toLocaleString()}</strong>
                      </div>
                      <div className="stat-box">
                        <span>Temperature</span>
                        <strong>{selected.region === 'sf' ? '61°F' : '79°F'}</strong>
                      </div>
                    </div>
                  </article>

                  <article className="property-card" aria-label="Property preview">
                    <div className="property-card__image" />
                  </article>

                  <article className="tenants-card">
                    <h3>Tenants</h3>
                    <p>Join our growing community of active members.</p>
                    <div className="gauge">
                      <div className="gauge__arc" />
                      <div className="gauge__value">
                        <strong>8.5k</strong>
                        <span>members</span>
                      </div>
                    </div>
                  </article>
                </section>
              ) : null}
            </div>
          )}
        </section>
      ) : null}
    </main>
  )
}

export default App
