from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from database import Base, Product, SessionLocal, engine, get_db
from schemas import ProductSchema

SAMPLE_PRODUCTS = [
    {"id": 1, "name": "Phone", "description": "A smartphone", "price": 699.99, "quantity": 50},
    {"id": 2, "name": "Laptop", "description": "A powerful laptop", "price": 999.99, "quantity": 30},
    {"id": 3, "name": "Pen", "description": "A blue ink pen", "price": 1.99, "quantity": 100},
    {"id": 4, "name": "Table", "description": "A wooden table", "price": 199.99, "quantity": 20},
]


def seed_sample_products() -> None:
    with SessionLocal() as db:
        if db.scalar(select(func.count()).select_from(Product)) == 0:
            db.add_all(Product(**item) for item in SAMPLE_PRODUCTS)
            db.commit()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    Base.metadata.create_all(bind=engine)
    seed_sample_products()
    yield


app = FastAPI(title="StockSphere API", lifespan=lifespan)

# Allow the React dev server to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DbSession = Annotated[Session, Depends(get_db)]


def get_product_or_404(product_id: int, db: Session) -> Product:
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@app.get("/products/")
def get_all_products(db: DbSession) -> list[ProductSchema]:
    return db.scalars(select(Product)).all()


@app.get("/products/{product_id}")
def get_product_by_id(product_id: int, db: DbSession) -> ProductSchema:
    return get_product_or_404(product_id, db)


@app.post("/products/", status_code=status.HTTP_201_CREATED)
def create_product(product: ProductSchema, db: DbSession) -> dict:
    if db.get(Product, product.id) is not None:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail=f"A product with ID {product.id} already exists",
        )
    db.add(Product(**product.model_dump()))
    db.commit()
    return {"message": "Product created successfully", "product": product}


@app.put("/products/{product_id}")
def update_product(product_id: int, product: ProductSchema, db: DbSession) -> dict:
    db_product = get_product_or_404(product_id, db)
    for field, value in product.model_dump(exclude={"id"}).items():
        setattr(db_product, field, value)
    db.commit()
    db.refresh(db_product)
    return {
        "message": "Product updated successfully",
        "product": ProductSchema.model_validate(db_product),
    }


@app.delete("/products/{product_id}")
def delete_product(product_id: int, db: DbSession) -> dict:
    db.delete(get_product_or_404(product_id, db))
    db.commit()
    return {"message": "Product deleted successfully"}
