import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
});

const EMPTY_FORM = { id: "", name: "", description: "", price: "", quantity: "" };
const LOW_STOCK_LIMIT = 20;
const NOTICE_DURATION_MS = 5000;

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function SortHeader({ field, label, sort, onSort, numeric = false }) {
  const isActive = sort.field === field;
  const ariaSort = sort.direction === "asc" ? "ascending" : "descending";

  return (
    <th className={numeric ? "numeric" : undefined} aria-sort={isActive ? ariaSort : undefined}>
      <button
        type="button"
        className={`sort-button ${isActive ? "is-active" : ""}`}
        onClick={() => onSort(field)}
      >
        {label}
        <span aria-hidden="true" className="sort-arrow">
          {isActive && sort.direction === "desc" ? "↓" : "↑"}
        </span>
      </button>
    </th>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState({ field: "id", direction: "asc" });
  const nameInputRef = useRef(null);

  const isEditing = editId !== null;

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/products/");
      setProducts(data);
    } catch {
      setNotice({ type: "error", text: "Could not load products. Is the API running?" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const stats = useMemo(
    () => ({
      units: products.reduce((sum, p) => sum + p.quantity, 0),
      value: products.reduce((sum, p) => sum + p.price * p.quantity, 0),
      lowStock: products.filter((p) => p.quantity <= LOW_STOCK_LIMIT).length,
    }),
    [products]
  );

  const visibleProducts = useMemo(() => {
    const query = filter.trim().toLowerCase();
    const matches = query
      ? products.filter(
          (p) =>
            String(p.id).includes(query) ||
            p.name.toLowerCase().includes(query) ||
            p.description.toLowerCase().includes(query)
        )
      : products;

    const { field, direction } = sort;
    return matches.toSorted((a, b) => {
      const order =
        typeof a[field] === "number"
          ? a[field] - b[field]
          : String(a[field]).localeCompare(String(b[field]));
      return direction === "asc" ? order : -order;
    });
  }, [products, filter, sort]);

  const handleSort = (field) => {
    setSort((current) => ({
      field,
      direction: current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleChange = ({ target }) => {
    setForm((current) => ({ ...current, [target.name]: target.value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      ...form,
      id: Number(form.id),
      price: Number(form.price),
      quantity: Number(form.quantity),
    };

    setLoading(true);
    try {
      if (isEditing) {
        await api.put(`/products/${editId}`, payload);
      } else {
        await api.post("/products/", payload);
      }
      setNotice({
        type: "success",
        text: isEditing ? "Product updated successfully" : "Product created successfully",
      });
      resetForm();
      await fetchProducts();
    } catch (err) {
      const detail = err.response?.data?.detail;
      setNotice({
        type: "error",
        text: typeof detail === "string" ? detail : "Could not save the product.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product) => {
    setForm(product);
    setEditId(product.id);
    setNotice(null);
    nameInputRef.current?.focus();
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"?`)) return;

    setLoading(true);
    try {
      await api.delete(`/products/${product.id}`);
      setNotice({ type: "success", text: "Product deleted successfully" });
      if (editId === product.id) resetForm();
      await fetchProducts();
    } catch {
      setNotice({ type: "error", text: "Could not delete the product." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
              <path d="M16 4l10 5.6v12.8L16 28 6 22.4V9.6z" />
              <path d="M6 9.6l10 5.6 10-5.6M16 15.2V28" />
            </svg>
            <div>
              <h1>StockSphere</h1>
              <p>Track. Manage. Grow.</p>
            </div>
          </div>

          <dl className="stats">
            <div>
              <dt>Products</dt>
              <dd>{products.length}</dd>
            </div>
            <div>
              <dt>Units in stock</dt>
              <dd>{stats.units.toLocaleString("en-US")}</dd>
            </div>
            <div>
              <dt>Inventory value</dt>
              <dd>{money.format(stats.value)}</dd>
            </div>
            <div>
              <dt>Low stock</dt>
              <dd className={stats.lowStock > 0 ? "is-warning" : undefined}>{stats.lowStock}</dd>
            </div>
          </dl>
        </div>
      </header>

      <main className="workspace">
        <section className="panel inventory" aria-labelledby="inventory-title">
          <div className="panel-header">
            <h2 id="inventory-title">Inventory</h2>
            <div className="toolbar">
              <input
                type="search"
                className="search"
                aria-label="Search products"
                placeholder="Search products"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <button type="button" className="btn btn-ghost" onClick={fetchProducts} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="product-table">
              <thead>
                <tr>
                  <SortHeader field="id" label="ID" sort={sort} onSort={handleSort} />
                  <SortHeader field="name" label="Product" sort={sort} onSort={handleSort} />
                  <th>Description</th>
                  <SortHeader field="price" label="Price" sort={sort} onSort={handleSort} numeric />
                  <SortHeader field="quantity" label="Stock" sort={sort} onSort={handleSort} numeric />
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => (
                  <tr key={product.id} className={editId === product.id ? "is-editing" : undefined}>
                    <td className="id-cell">{String(product.id).padStart(3, "0")}</td>
                    <td className="name-cell">{product.name}</td>
                    <td className="desc-cell" title={product.description}>
                      {product.description}
                    </td>
                    <td className="numeric mono">{money.format(product.price)}</td>
                    <td className="numeric">
                      <span className={`stock ${product.quantity <= LOW_STOCK_LIMIT ? "stock-low" : ""}`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td className="row-actions">
                      <button type="button" className="link-btn" onClick={() => handleEdit(product)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className="link-btn link-btn-danger"
                        onClick={() => handleDelete(product)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {visibleProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="empty">
                      {loading ? "Loading products..." : "No products found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className={`panel editor ${isEditing ? "editor-active" : ""}`}>
          <div className="panel-header">
            <h2>{isEditing ? `Editing #${String(editId).padStart(3, "0")}` : "New product"}</h2>
          </div>
          <form onSubmit={handleSubmit} className="product-form">
            <label>
              Product ID
              <input
                type="number"
                name="id"
                min="1"
                value={form.id}
                onChange={handleChange}
                required
                disabled={isEditing}
              />
            </label>
            <label>
              Name
              <input
                ref={nameInputRef}
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <label>
              Description
              <input
                type="text"
                name="description"
                value={form.description}
                onChange={handleChange}
                required
              />
            </label>
            <div className="field-row">
              <label>
                Price
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Quantity
                <input
                  type="number"
                  name="quantity"
                  min="0"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {isEditing ? "Save changes" : "Add product"}
              </button>
              {isEditing && (
                <button type="button" className="btn btn-ghost" onClick={resetForm}>
                  Cancel
                </button>
              )}
            </div>
          </form>
        </aside>
      </main>

      {notice && (
        <div className={`notice notice-${notice.type}`} role={notice.type === "error" ? "alert" : "status"}>
          {notice.text}
        </div>
      )}
    </div>
  );
}

export default App;
