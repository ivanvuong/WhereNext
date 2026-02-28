import { useMemo, useState, type CSSProperties } from 'react'
import './App.css'
import { COMMUNITIES, type Community } from './data/communities'

type HouseholdType = 'single' | 'couple' | 'family' | 'with pets'
type Region = 'sf' | 'irvine'

type ResolvedAnchor = {
  label: string
  latitude: number
  longitude: number
  region: Region
}

type RankedCommunity = {
  community: Community
  distanceMiles: number
  commuteScore: number
  affordabilityScore: number
  lifestyleScore: number
  overallScore: number
}

type PreferenceDimension = keyof Community['lifestyle']

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

const scoreCommunities = ({
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

      const lifestyleBase =
        dims.reduce((sum, key) => sum + community.lifestyle[key], 0) / dims.length
      const weightedLifestyle = clamp(
        lifestyleBase * 0.84 + community.lifestyle[householdWeight] * 0.16,
        0,
        100,
      )

      const overallScore =
        commuteScore * 0.4 + affordabilityScore * 0.3 + weightedLifestyle * 0.3

      return {
        community,
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

  const selected = useMemo(
    () => results.find((item) => item.community.id === selectedId) ?? results[0] ?? null,
    [results, selectedId],
  )

  const anchor = useMemo(() => resolveAnchor(anchorInput), [anchorInput])

  const updateResults = () => {
    const ranked = scoreCommunities({
      anchor,
      budget,
      salary,
      commuteLimit: commute,
      radius,
      lifestyleInput: lifestyle,
      household,
    })

    setResults(ranked)
    setSelectedId(ranked[0]?.community.id ?? null)
  }

  const showSidebar = () => {
    setMode('results')
  }

  const topCard = selected
    ? {
        homes: Math.max(8, Math.round(selected.overallScore / 6)),
        estimate: selected.community.avgRent * 1420,
        age: `${Math.max(4, Math.round(26 - selected.distanceMiles))}Y`,
      }
    : null

  const hasResults = results.length > 0

  const latitudes = results.map((result) => result.community.latitude)
  const longitudes = results.map((result) => result.community.longitude)
  const minLat = Math.min(...latitudes, anchor.latitude) - 0.02
  const maxLat = Math.max(...latitudes, anchor.latitude) + 0.02
  const minLng = Math.min(...longitudes, anchor.longitude) - 0.03
  const maxLng = Math.max(...longitudes, anchor.longitude) + 0.03

  const getMarkerPosition = (community: Community) => {
    const x = ((community.longitude - minLng) / (maxLng - minLng || 1)) * 100
    const y = ((maxLat - community.latitude) / (maxLat - minLat || 1)) * 100
    return { left: `${clamp(x, 3, 97)}%`, top: `${clamp(y, 3, 97)}%` }
  }

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
            <button className="cta" type="button" onClick={updateResults}>
              Update Results
            </button>
          )}
        </div>
      </section>

      {mode === 'results' ? (
        <section className="workspace">
          {!hasResults ? (
            <div className="workspace-empty">
              <div className="spinner-badge" aria-hidden>
                <div className="spinner" />
              </div>
              <h2>Map will appear here</h2>
              <p>Click &quot;Update Results&quot; to continue</p>
              <button
                className="ghost-cta"
                type="button"
                onClick={updateResults}
              >
                View Map Example
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
                  <div className="anchor-pin" style={{ left: '57%', top: '47%' }}>
                    <span>Anchor</span>
                  </div>

                  {results.map((result) => {
                    const isActive = selected?.community.id === result.community.id
                    const pos = getMarkerPosition(result.community)
                    return (
                      <button
                        key={result.community.id}
                        type="button"
                        className={`map-marker ${isActive ? 'map-marker--active' : ''}`}
                        style={pos}
                        onClick={() => setSelectedId(result.community.id)}
                        aria-label={`View ${result.community.name}`}
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

              {selected ? (
                <section className="detail-grid">
                  <article className="location-card">
                    <header>
                      <div>
                        <h3>Location</h3>
                        <p>
                          {selected.community.name}, near {anchor.label}
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
                        <strong>{selected.community.region === 'sf' ? '61°F' : '79°F'}</strong>
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
