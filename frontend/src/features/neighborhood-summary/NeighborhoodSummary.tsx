import { useEffect, useMemo, useState } from 'react'
import { fetchNeighborhoodSummary, type NeighborhoodSummaryResponse } from './api'

const NeighborhoodSummary = ({
  neighborhood,
  anchorLabel,
}: {
  neighborhood: string
  anchorLabel: string | null
}) => {
  const cacheKey = useMemo(() => {
    const anchor = (anchorLabel || '').trim()
    return `v2::${neighborhood}::${anchor}`.toLowerCase()
  }, [neighborhood, anchorLabel])

  const [summary, setSummary] = useState<NeighborhoodSummaryResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasRequested, setHasRequested] = useState(false)

  useEffect(() => {
    const cached = window.localStorage.getItem(`neighborhood-summary:${cacheKey}`)
    if (cached) {
      try {
        setSummary(JSON.parse(cached) as NeighborhoodSummaryResponse)
        setHasRequested(true)
      } catch {
        window.localStorage.removeItem(`neighborhood-summary:${cacheKey}`)
      }
    } else {
      setSummary(null)
      setHasRequested(false)
    }
    setError(null)
  }, [cacheKey])

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetchNeighborhoodSummary({
        neighborhood,
        anchor_label: anchorLabel,
      })
      setSummary(response)
      window.localStorage.setItem(`neighborhood-summary:${cacheKey}`, JSON.stringify(response))
      setHasRequested(true)
    } catch (error) {
      setSummary(null)
      const detail = error instanceof Error ? error.message : 'Unknown error'
      setError(`Could not generate area overview right now. ${detail}`)
      setHasRequested(true)
    } finally {
      setIsLoading(false)
    }
  }
 
  useEffect(() => {
    if (summary || isLoading || hasRequested) {
      return
    }
    void handleGenerate()
  }, [summary, isLoading, hasRequested, cacheKey])

  return (
    <section className="neighborhood-summary">
      <h4>Neighborhood Overview</h4>
      {isLoading ? <p className="neighborhood-summary__meta">Generating summary...</p> : null}
      {error ? <p className="neighborhood-summary__meta">{error}</p> : null}
      {summary ? (
        <>
          <p className="neighborhood-summary__title">{summary.title}</p>
          <ul>
            {summary.bullets.map((bullet, idx) => (
              <li key={`${summary.location}-${idx}`}>{bullet}</li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  )
}

export default NeighborhoodSummary
