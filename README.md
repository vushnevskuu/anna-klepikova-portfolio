# Anna Klepikova — Photographer Portfolio

One-page scroll-controlled photography portfolio built with React 18, TypeScript, and Vite. The active photograph changes as you scroll — faster scrolling advances through images more quickly.

## Local development

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

### Other scripts

```bash
npm run typecheck   # TypeScript check without emit
npm run build       # Production build to dist/
npm run preview     # Preview production build locally
```

## Adding, removing, and reordering photographs

1. Place image files in [`public/photos/`](public/photos/). Use lowercase Latin characters, numbers, and hyphens in filenames (e.g. `004.webp`).
2. Edit the manifest at [`src/data/photos.ts`](src/data/photos.ts).

```ts
export const photos: PortfolioPhoto[] = [
  { id: '001', src: 'photos/001.webp', alt: 'Description of photo 1' },
  { id: '002', src: 'photos/002.webp', alt: 'Description of photo 2' },
  // add, remove, or reorder entries here
]
```

- **Add:** copy a file into `public/photos/` and append an entry to the array.
- **Remove:** delete the file and remove its entry from the array.
- **Reorder:** change the order of entries in the array — scroll sequence follows this order.

Optional fields:

- `width` / `height` — explicit dimensions to reduce layout shift.
- `orientation: 'horizontal' | 'vertical'` — skip auto-detection if you know the orientation.

Recommended formats: AVIF or WebP. JPEG is acceptable as a fallback.

**Important:** Images are never cropped. They scale to fit within the layout area while preserving aspect ratio and Figma margins.

## Figma-derived design tokens

Exact spacing, typography, and layout values from Figma nodes `1898:5`, `1898:39`, and `1898:46` are stored as CSS custom properties in [`src/styles/portfolio.css`](src/styles/portfolio.css) under `:root`.

Key tokens include:

- Font: `"transat", sans-serif` via [Adobe Typekit](https://use.typekit.net/avp5fpz.css)
- Desktop frame reference: 1280×832
- Mobile frame reference: 402×874
- Image bounding boxes (max size, scale-only): horizontal 954×480, vertical 474×712, mobile full width

## GitHub Pages deployment

1. Create a GitHub repository and push this project to the `main` branch.
2. In the repository settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main` — the workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs typecheck, build, and deploys `dist/` automatically.

You can also trigger deployment manually from the **Actions** tab via **workflow_dispatch**.

The Vite config uses `base: './'` so assets resolve correctly on project pages (`https://<user>.github.io/<repo>/`).

### Enable Pages (first time)

1. Repository → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions**
3. After the first successful workflow run, the site URL appears in the workflow summary

## Project structure

```
src/
  components/     Portfolio UI
  hooks/          Scroll, touch, and image preloading
  data/photos.ts  Photo manifest
  styles/         global.css + portfolio.css (Figma tokens)
  utils/          getAssetUrl.ts for GitHub Pages paths
public/photos/    Your image files
```

## TODO

- Replace placeholder Open Graph image at `public/og-image.jpg` when a preview image is available.
- If Transat Light (Figma node `1898:6`) does not match Typekit weight 400 visually, verify the correct Typekit variant.
