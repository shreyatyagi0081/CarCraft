# CarCraft - Comprehensive Automotive Inventory & Dealership Management Suite

A full-stack enterprise automotive ecosystem integrating vehicle dealership management, auto parts e-commerce, and vehicle service & maintenance scheduling.

## 📂 Project Architecture

```
mcaproject/
├── .vscode/                  # Workspace-level VS Code settings
├── README.md
├── backend/                  # Django 4.2 + Django REST Framework API
│   ├── apps/
│   │   ├── accounts/         # Users, profiles, authentication and permissions
│   │   ├── analytics/        # Dealer dashboard and reporting APIs
│   │   ├── communications/   # Messages and customer reminders
│   │   ├── ecommerce/        # Parts catalog, cart, checkout and orders
│   │   ├── reviews/          # Vehicle, parts and service reviews
│   │   ├── sales/            # Leads, quotations and vehicle orders
│   │   ├── services/         # Appointments, technicians and service history
│   │   └── vehicles/         # Makes, models and vehicle inventory
│   ├── carcraft/             # Django settings, root URLs, ASGI and WSGI
│   ├── tests/                # Project-level API tests
│   ├── postman/              # Postman API collection
│   ├── manage.py             # Django command-line entry point
│   ├── seed_data.py          # Optional demo-data loader
│   ├── requirements.txt      # Python dependencies
│   ├── pytest.ini            # Pytest configuration
│   ├── .env                  # Local backend configuration
│   ├── .env.example          # Local environment configuration template
│   ├── db.sqlite3            # Local database file when SQLite is active
│   └── README.md             # Backend setup and API documentation
├── frontend/                 # React 18 + Vite application
│   ├── public/                # Public static assets
│   ├── src/
│   │   ├── api/               # Axios client, endpoints and media helpers
│   │   ├── assets/            # Frontend assets
│   │   ├── components/
│   │   │   ├── common/        # Shared UI components
│   │   │   └── layout/        # Navigation, layout and footer
│   │   ├── context/           # Authentication and shopping-cart state
│   │   ├── pages/             # analytics, auth, communications, reviews,
│   │   │                       # sales, service, shop and vehicles
│   │   ├── App.jsx            # Routes and application providers
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx           # React entry point
│   ├── index.html
│   ├── .env                  # Local frontend configuration
│   ├── package.json           # Frontend dependencies and scripts
│   ├── package-lock.json
│   ├── vite.config.js         # Vite server and API proxy configuration
│   └── README.md              # Frontend setup and build instructions
```

Generated/runtime directories such as `backend\venv`, `frontend\node_modules`,
and build/cache output are omitted from this source overview.

## Run CarCraft Locally (Windows)

Start the backend and frontend in **separate PowerShell terminals**. Run the
commands from the project root (`mcaproject`).

### 1. Start the backend

```powershell
Set-Location .\backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
```

To load the demo records, run this once when setting up a demo database:

```powershell
python seed_data.py
```

Seeding can create records and resets the documented demo-account passwords;
back up any database you want to keep before running it.

Start Django:

```powershell
python manage.py runserver 127.0.0.1:8000
```

### 2. Start the frontend

Open another PowerShell terminal at the project root:

```powershell
Set-Location .\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open **http://127.0.0.1:5173/**. The backend API documentation is at
**http://127.0.0.1:8000/api/docs/**. Stop either server with `Ctrl+C` in its
terminal.

The backend uses **PostgreSQL** as its primary database. Database configuration is managed through environment variables. See the [backend instructions](backend/README.md) and [frontend instructions](frontend/README.md) for database setup, testing, and build details.
