# CarCraft Frontend

The frontend is a React 18 application built with Vite. Start the Django backend
before using pages that load or submit API data.

## Run locally (Windows)

Open PowerShell in the repository root, then:

```powershell
Set-Location .\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open **http://127.0.0.1:5173/** in a browser. The backend should be running at
**http://127.0.0.1:8000/**. Stop the Vite server with `Ctrl+C`.

## Build and lint

```powershell
npm run build
npm run lint
```
