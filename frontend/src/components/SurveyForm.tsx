import type { HouseholdType } from '../api/analyze'
import MetricSlider from './MetricSlider'
import SearchIcon from './icons/SearchIcon'
import { toTitle } from '../utils/format'
import type { HousingMode } from '../types/app'

const HOUSEHOLD_OPTIONS: HouseholdType[] = ['single', 'couple', 'family', 'with pets']

const SurveyForm = ({
  isResults,
  housingMode,
  onHousingModeChange,
  anchorInput,
  onAnchorChange,
  budget,
  onBudgetChange,
  maxHomePrice,
  onMaxHomePriceChange,
  commute,
  onCommuteChange,
  radius,
  onRadiusChange,
  radiusSummaryLabel,
  household,
  onHouseholdChange,
  lifestyle,
  onLifestyleChange,
}: {
  isResults: boolean
  housingMode: HousingMode
  onHousingModeChange: (value: HousingMode) => void
  anchorInput: string
  onAnchorChange: (value: string) => void
  budget: number
  onBudgetChange: (value: number) => void
  maxHomePrice: number
  onMaxHomePriceChange: (value: number) => void
  commute: number
  onCommuteChange: (value: number) => void
  radius: number
  onRadiusChange: (value: number) => void
  radiusSummaryLabel: string | null
  household: HouseholdType
  onHouseholdChange: (value: HouseholdType) => void
  lifestyle: string
  onLifestyleChange: (value: string) => void
}) => (
  <form
    className={`survey-form ${!isResults ? 'survey-form--landing' : ''}`}
    onSubmit={(event) => event.preventDefault()}
  >
    <div className={`mode-toggle mode-toggle--${housingMode}`} role="group" aria-label="Housing mode">
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

    <div className="field-group">
      <label htmlFor="anchor">Where will you work or study?</label>
      <div className="search-field">
        <span className="search-field__icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          id="anchor"
          type="text"
          value={anchorInput}
          onChange={(event) => onAnchorChange(event.target.value)}
          placeholder="e.g. Stripe, UCI, Google SF"
        />
      </div>
    </div>

    <div className={`slider-grid ${!isResults ? 'slider-grid--split' : ''}`}>
      {housingMode === 'rent' ? (
        <MetricSlider
          id="budget"
          label="Monthly Rent Budget"
          value={budget}
          min={1200}
          max={7000}
          step={50}
          suffix="$"
          onChange={onBudgetChange}
        />
      ) : (
        <MetricSlider
          id="max-home-price"
          label="Total House Cost"
          value={maxHomePrice}
          min={200000}
          max={5000000}
          step={25000}
          suffix="$"
          onChange={onMaxHomePriceChange}
        />
      )}
    </div>

    <MetricSlider
      id="commute"
      label="Max Commute Time"
      value={commute}
      min={5}
      max={90}
      step={1}
      suffix="min"
      onChange={onCommuteChange}
    />

    <MetricSlider
      id="radius"
      label="Search Radius"
      value={radius}
      min={1}
      max={30}
      step={1}
      suffix="miles"
      onChange={onRadiusChange}
    />
    <p className="caption">We&apos;ll find communities within this range</p>
    {radiusSummaryLabel ? <p className="caption caption--secondary">{radiusSummaryLabel}</p> : null}

    <div className="field-group">
      <label>Household Type</label>
      <div className="chip-row">
        {HOUSEHOLD_OPTIONS.map((option) => (
          <button
            key={option}
            className={`chip ${household === option ? 'chip--active' : ''}`}
            type="button"
            onClick={() => onHouseholdChange(option)}
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
        onChange={(event) => onLifestyleChange(event.target.value)}
        placeholder="e.g. walkable, quiet, food scene, nightlife, outdoors..."
      />
    </div>
  </form>
)

export default SurveyForm
