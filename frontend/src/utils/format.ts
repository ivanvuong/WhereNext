export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export const toTitle = (value: string) => value.replace(/(^|\s)\w/g, (m) => m.toUpperCase())

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
