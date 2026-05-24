# Hero Section — Installation & Setup

## Install dependencies

```bash
cd amex-portfolio

npm install @prismicio/client@^7 @prismicio/next@^2 @prismicio/react@^3 gsap clsx react-icons

npm install -D @slicemachine/adapter-next slice-machine-ui @tailwindcss/typography
```

## Prismic & Slice Machine

1. Create a Prismic repository at [prismic.io](https://prismic.io).
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_PRISMIC_ENVIRONMENT` to your repo name.
3. Update `repositoryName` in `slicemachine.config.json` to match.
4. Push models:

```bash
npx start-slicemachine
```

In Slice Machine: push the **Homepage** custom type and **Hero** slice to Prismic.

5. In Prismic, create a **Homepage** document with a Hero slice using the default content values.

## Run locally

```bash
npm run dev
```

- Homepage: http://localhost:3000 (uses Prismic content, or Hero mock in dev if CMS is empty)
- Slice Simulator: http://localhost:3000/slice-simulator

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Next.js dev server |
| `npm run slicemachine` | Slice Machine UI |
| `npm run build` | Production build |
