# InteractionDesign

Accessible transit watch prototype with mouse-wheel navigation, spoken guidance, and low-vision display options.

## Deploy to Vercel

Import `kayldote/InteractionDesign` into Vercel and keep **Root Directory** at the repository root (`./`). The root `vercel.json` configures the **Other** framework preset, skips installation and building, and serves `watch-app/dist`.

No dependencies or environment variables are required. If an existing Vercel project uses a different Root Directory, change it to `./` before redeploying.

## Run locally

```sh
python3 -m http.server 5173 --directory watch-app/dist
```

Open http://localhost:5173. See [watch app instructions](watch-app/README.md) for controls and prototype limitations.
