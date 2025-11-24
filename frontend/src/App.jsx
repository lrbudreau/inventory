import React, { useState, useEffect } from "react";
import { apiGet, apiPost } from "./auth";

export default function App() {
  const [parts, setParts] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const p = await apiGet("parts");
    const pr = await apiGet("products");

    // get product parts for each product
    const withParts = await Promise.all(
      pr.map(async (prod) => {
        const pp = await apiGet("productParts", { productID: prod.id });
        return { ...prod, parts: pp };
      })
    );

    setParts(p);
    setProducts(withParts);
  }

  async function addPart(e) {
    e.preventDefault();
    const body = {
      resource: "parts",
      action: "create",
      data: {
        name: e.target.name.value,
        barcode: e.target.barcode.value,
        quantity: Number(e.target.quantity.value)
      }
    };
    await apiPost(body);
    e.target.reset();
    refresh();
  }

  async function addProduct(e) {
    e.preventDefault();

    const name = e.target.name.value;

    const productResp = await apiPost({
      resource: "products",
      action: "create",
      data: { name }
    });

    const newProductId = productResp.id;

    const lines = e.target.parts.value.trim().split("\n");
    for (const line of lines) {
      const [partID, qty] = line.split(":").map(s => s.trim());
      await apiPost({
        resource: "productParts",
        action: "create",
        data: {
          productID: newProductId,
          partID,
          quantity: Number(qty)
        }
      });
    }

    e.target.reset();
    refresh();
  }

  async function buildProduct(productId) {
    const count = Number(prompt("How many to build?", "1")) || 1;

    await apiPost({
      resource: "build",
      action: "build",
      adminUsername: "admin",
      adminPassword: "password",
      data: { productId, count }
    });

    refresh();
  }

  return (
    <div className="container">
      <header>
        <h1>Inventory Dashboard</h1>
      </header>

      {/* ==============================
          PARTS
      =============================== */}
      <section>
        <h2>Parts (Inventory)</h2>
        <table>
          <thead><tr><th>Name</th><th>Barcode</th><th>Qty</th></tr></thead>
          <tbody>
            {parts.map(p =>
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.barcode}</td>
                <td>{p.quantity}</td>
              </tr>
            )}
          </tbody>
        </table>

        <form onSubmit={addPart}>
          <input name="name" placeholder="Part name" required />
          <input name="barcode" placeholder="Barcode" />
          <input name="quantity" type="number" placeholder="Quantity" defaultValue={0} />
          <button>Add Part</button>
        </form>
      </section>

      {/* ==============================
          PRODUCTS
      =============================== */}
      <section>
        <h2>Products</h2>
        <ul>
          {products.map(prod =>
            <li key={prod.id}>
              <strong>{prod.name}</strong>
              <button onClick={() => buildProduct(prod.id)}>Build</button>
              <ul>
                {prod.parts.map(pp =>
                  <li key={pp.partID}>
                    Part {pp.partID} — {pp.quantity}
                  </li>
                )}
              </ul>
            </li>
          )}
        </ul>

        <form onSubmit={addProduct}>
          <input name="name" placeholder="Product name" required />
          <textarea name="parts" placeholder="partID:qty (one per line)" rows={4} />
          <button>Create Product</button>
        </form>
      </section>
    </div>
  );
}
