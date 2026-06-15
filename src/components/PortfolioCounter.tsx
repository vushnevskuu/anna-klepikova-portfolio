type PortfolioCounterProps = {
  current: number
  total: number
}

export function PortfolioCounter({ current, total }: PortfolioCounterProps) {
  return (
    <p className="sr-only" aria-live="polite" aria-atomic="true">
      Photo {current} of {total}
    </p>
  )
}
