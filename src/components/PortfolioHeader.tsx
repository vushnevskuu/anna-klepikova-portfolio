type PortfolioHeaderProps = {
  layout: 'desktop' | 'mobile'
}

export function PortfolioHeader({ layout }: PortfolioHeaderProps) {
  const contactsNodeId = layout === 'desktop' ? '1898:42' : '1898:48'

  return (
    <aside className="portfolio-info">
      <h1 className="portfolio-name">Anna Klepikova</h1>
      <div
        className="portfolio-contacts"
        data-node-id={contactsNodeId}
      >
        <a
          className="portfolio-contacts__item portfolio-contacts__item--instagram"
          href="https://instagram.com/aaklepi"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="portfolio-contacts__at" aria-hidden="true">
            @
          </span>
          aaklepi
        </a>
        <a className="portfolio-contacts__item" href="mailto:aklepi1122@gmail.com">
          aklepi1122@gmail.com
        </a>
      </div>
    </aside>
  )
}
