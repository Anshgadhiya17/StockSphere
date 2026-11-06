# StockSphere

A product inventory manager with a FastAPI and PostgreSQL backend and a React frontend. Add, edit, delete, search and sort products, and see total stock, inventory value and low-stock counts at a glance.

## Tech stack

| Layer    | Tools                                       |
| -------- | ------------------------------------------- |
| Backend  | FastAPI, SQLAlchemy 2, Pydantic 2, Uvicorn  |
| Database | PostgreSQL (with the psycopg 3 driver)      |
| Frontend | React 19, Vite, Axios                       |

## Project structure

```
.
├── main.py            # FastAPI app and routes
├── database.py        # Engine, session and the Product table
├── schemas.py         # Pydantic schema for request and response data
├── requirements.txt   # Python dependencies
├── .env.example       # Template for your local .env file
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── main.jsx   # React entry point
        ├── App.jsx    # Inventory screen
        └── App.css    # Styles
```

## Getting started

You'll need Python 3.11+, Node.js 22+ and a running PostgreSQL server.

### 1. Create the database

```bash
psql -U postgres -c "CREATE DATABASE stocksphere;"
```

### 2. Start the backend

Run these from the project root:

```bash
python -m venv .venv

# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

Copy `.env.example` to `.env` and put your PostgreSQL password in `DATABASE_URL`. Then start the server:

```bash
uvicorn main:app --reload
```

The API runs at http://localhost:8000, with interactive docs at http://localhost:8000/docs. On first start it creates the `products` table and adds four sample products if the table is empty.

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000.

The frontend calls `http://localhost:8000` by default. To use a different API address, set `VITE_API_URL` in `frontend/.env`.

## API reference

| Method   | Endpoint         | Description         | Errors                  |
| -------- | ---------------- | ------------------- | ----------------------- |
| `GET`    | `/products/`     | List all products   |                         |
| `GET`    | `/products/{id}` | Get one product     | `404` if not found      |
| `POST`   | `/products/`     | Create a product    | `409` if the ID exists  |
| `PUT`    | `/products/{id}` | Update a product    | `404` if not found      |
| `DELETE` | `/products/{id}` | Delete a product    | `404` if not found      |

### Example: create a product

```bash
curl -X POST http://localhost:8000/products/ \
  -H "Content-Type: application/json" \
  -d '{"id": 5, "name": "Monitor", "description": "4K monitor", "price": 299.99, "quantity": 15}'
```

### Product fields

| Field         | Type    |
| ------------- | ------- |
| `id`          | integer |
| `name`        | string  |
| `description` | string  |
| `price`       | float   |
| `quantity`    | integer |
