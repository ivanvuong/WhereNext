const Logo = ({
  clickable = false,
  onClick,
}: {
  clickable?: boolean
  onClick?: () => void
}) => (
  <div
    className={`brand ${clickable ? 'brand--clickable' : ''}`}
    role={clickable ? 'button' : undefined}
    tabIndex={clickable ? 0 : undefined}
    onClick={clickable ? onClick : undefined}
    onKeyDown={clickable ? (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onClick?.()
      }
    } : undefined}
  >
    <div className="brand__mark" aria-hidden>
      <svg
        className="brand__icon"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="m16.24 7.76-1.804 5.411a2 2 0 0 1-1.265 1.265L7.76 16.24l1.804-5.411a2 2 0 0 1 1.265-1.265z" />
      </svg>
    </div>
    <span className="brand__name">WhereNext</span>
  </div>
)

export default Logo
