import type { CSSProperties } from 'react'
import { formatCurrency } from '../utils/format'

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
        {optional ? <span className="muted"></span> : null}
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

export default MetricSlider
