const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || 'http://127.0.0.1:8000'

export type NeighborhoodSummaryResponse = {
  location: string
  title: string
  bullets: string[]
}

export async function fetchNeighborhoodSummary(payload: {
  neighborhood: string
  anchor_label?: string | null
}): Promise<NeighborhoodSummaryResponse> {
  const response = await fetch(`${API_BASE_URL}/neighborhood/summary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Summary failed (${response.status}): ${detail}`)
  }

  return response.json() as Promise<NeighborhoodSummaryResponse>
}
