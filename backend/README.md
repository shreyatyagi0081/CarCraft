# CarCraft - Comprehensive Automotive Inventory & Dealership Management Suite (Backend)

CarCraft is an enterprise-grade automotive dealership, parts e-commerce, and service workshop backend built with **Python 3.11**, **Django 4.2 LTS**, **Django REST Framework**, and **MySQL 8.0 Community Server**.

---

## 🏆 Project Modules Covered

| # | Module | App | Description |
|---|---|---|---|
| **1** | **Vehicle Inventory Management** | `apps/vehicles` | Makes, models, trims, VINs, technical specs, gallery images, pricing, and status lifecycle (Available, Reserved, Sold, In-Service). |
| **2** | **Sales Lead & Opportunity Tracking** | `apps/sales` | Inquiry tracking, lead scoring (1-100), pipeline stages (New, Contacted, Test Drive, Negotiation, Won, Lost), and staff activity logs. |
| **3** | **Quotation & Order Processing** | `apps/sales` | Automated price breakdown (base, discounts, taxes, registration, insurance), financing options, and vehicle delivery tracking. |
| **4** | **Dealer Performance Analytics** | `apps/analytics` | Real-time dashboard KPI metrics: gross revenue, inventory asset valuation, lead conversion funnel, and sales-by-make reporting. |
| **5** | **Product Catalog & Parts Inventory** | `apps/ecommerce` | Auto parts & accessories catalog, SKU management, compatibility mapping with vehicle models, stock levels & low-stock alerts. |
| **6** | **Shopping Cart & Checkout** | `apps/ecommerce` | Multi-item customer cart, automated stock verification, tax calculation, and order placement transaction. |
| **7** | **Order Fulfillment & Shipping** | `apps/ecommerce` | Carrier tracking (FedEx, BlueDart, DHL, UPS), tracking number management, delivery estimation, and fulfillment states. |
| **8** | **Customer Reviews & Ratings** | `apps/reviews` | 1-5 star verified reviews for vehicles, auto parts, and dealership service with dealer response and moderation capabilities. |
| **9** | **Service Appointment Scheduling** | `apps/services` | Online workshop booking, service package selection, odometer tracking, and automated cost estimation. |
| **10** | **Technician Availability & Skills** | `apps/services` | Technician skill matrix (Diagnostics, Brakes, EV, Transmission), daily workload capacity, and live availability tracking. |
| **11** | **Service History & Recommendations** | `apps/services` | Comprehensive repair logs, parts used, labor hours, next service mileage, and preventive maintenance alerts. |
| **12** | **Customer Communication & Reminders** | `apps/communications` | Direct messaging between customers and dealership staff, and automated reminders for periodic services and quotation follow-ups. |

---

## 🛠️ Technology Stack

- **Language:** Python 3.11+
- **Backend Framework:** Django 4.2 LTS (`django>=4.2,<5.0`)
- **API Engine:** Django REST Framework (DRF 3.14+)
- **Database:** MySQL 8.0 Community Server (with resilient SQLite auto-fallback)
- **Database Driver:** `mysqlclient` and `PyMySQL`
- **Authentication:** JWT (JSON Web Tokens) via `djangorestframework-simplejwt`
- **API Documentation:** OpenAPI 3.0 via `drf-spectacular` (Interactive Swagger UI & ReDoc)
- **Testing:** Pytest & `pytest-django`
- **CORS:** `django-cors-headers` (Configured for React Vite frontend at `http://localhost:5173`)

---

## Quick Setup & Execution (Windows)

Run these commands in PowerShell from the repository root:

```powershell
Set-Location .\backend
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
```

The backend reads its local configuration from `backend\.env`. MySQL is used
when its configured server is available; otherwise the application falls back
to SQLite at `backend\db.sqlite3`. Set `USE_SQLITE=True` in your local
configuration to force SQLite. Keep local secrets out of source control.

### Load demo data (optional)

```powershell
python seed_data.py
```

Run this for a fresh demo database. It creates demo records and resets the
seeded demo accounts' passwords, so back up an existing database first.

### Start the backend

```powershell
python manage.py runserver 127.0.0.1:8000
```

The API is available at **http://127.0.0.1:8000/**. Open
**http://127.0.0.1:8000/api/docs/** for Swagger, or
**http://127.0.0.1:8000/admin/** for Django Admin (requires a staff/superuser
account). Press `Ctrl+C` to stop the server.

The current SQLite database file, when SQLite is active, is
`backend\db.sqlite3`. Avoid editing it directly; use the application, Django
Admin, or Django ORM instead.

---

## 🔑 Demo Login Credentials

The `seed_data.py` script provisions demo users with specific role privileges:

| Role | Username | Password | Access Capabilities |
|---|---|---|---|
| **Dealer Admin** | `dealer_admin` | `admin123` | Full showroom & inventory control, sales analytics, staff management |
| **Dealer Sales Staff** | `dealer_sales` | `sales123` | Manage leads, send quotations, update order delivery statuses |
| **Technician** | `tech_john` | `tech123` | Workshop appointments, diagnostic notes, complete service history |
| **Customer** | `customer_alice` | `pass123` | Vehicle inquiries, parts shopping cart & checkout, service booking |

---

## 📖 Interactive API Documentation

Once the server is running, explore and test the endpoints directly in your browser:
- **Swagger UI:** [http://127.0.0.1:8000/api/docs/](http://127.0.0.1:8000/api/docs/)
- **ReDoc Documentation:** [http://127.0.0.1:8000/api/redoc/](http://127.0.0.1:8000/api/redoc/)
- **OpenAPI 3.0 Schema (JSON):** [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/)
- **Django Admin Portal:** [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)

---

## Run Backend Tests

From the `backend` directory with the virtual environment activated:

```powershell
python manage.py test
```

To run the separate pytest suite:

```powershell
pytest
```

---

## 📬 Postman Collection

Import the included collection located at:
`backend/postman/CarCraft_API_Collection.json`

Features ready-to-test requests across all 12 modules with pre-filled test payloads and environment variables.
