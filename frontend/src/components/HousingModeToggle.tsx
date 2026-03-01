import type { HousingMode } from '../types/app'

const HousingModeToggle = ({
  housingMode,
  onHousingModeChange,
  className = '',
}: {
  housingMode: HousingMode
  onHousingModeChange: (value: HousingMode) => void
  className?: string
}) => (
  <div className={`mode-toggle mode-toggle--${housingMode} ${className}`.trim()} role="group" aria-label="Housing mode">
    <button
      type="button"
      className={`mode-toggle__button ${housingMode === 'buy' ? 'mode-toggle__button--active' : ''}`}
      onClick={() => onHousingModeChange('buy')}
    >
      BUY
    </button>
    <button
      type="button"
      className={`mode-toggle__button ${housingMode === 'rent' ? 'mode-toggle__button--active' : ''}`}
      onClick={() => onHousingModeChange('rent')}
    >
      RENT
    </button>
  </div>
)

export default HousingModeToggle
