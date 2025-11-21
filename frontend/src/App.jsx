import React, { useState, useEffect } from "react";
import { api } from "./auth";

export default function App() {
  const [view, setView] = useState("dashboard");
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => { refresh(); }, []);

  async function refresh() {
    const inv = await api("inventory", { method: "GET" });
    const prods = await api("products", { method: "GET" });
    setInventory(inv);
    setProducts(prods);
  }

  async function addInventory(e) {
    e.preventDefault();
    const body = { name: e.target.name.value, quantity: Number(e.target.quantity.value) };
    await api("", { method: "POST", body: JSON.stringify({ path:"inventory", data: body }) });
    e.target.reset(); refresh();
  }

  async function addProduct(e) {
    e.preventDefault();
    const name = e.target.name.value;
    const parts = e.target.parts.value.trim().split("\n").map(line => {
      const [inventoryId, qty] = line.split(":").map(s=>s.trim());
      return { inventoryId, qty: Number(qty) };
    });
    await api("", { method: "POST", body: JSON.stringify({ path:"products", data:{ name, parts } }) });
    e.target.reset(); refresh();
  }

  async function buildProduct(productId) {
    const count = Number(prompt("How many to build?", "1")) || 1;
    await api("", { method:"POST", body: JSON.stringify({ path:"build", data:{ productId, count }}) });
    refresh();
  }

  return (
    <div className="container">
      <header>
        <h1>Inventory Dashboard</h1>
      </header>

      <section>
        <h2>Inventory</h2>
        <table>
          <thead><tr><th>Name</th><th>Qty</th></tr></thead>
          <tbody>{inventory.map(i => <tr key={i.id}><td>{i.name}</td><td>{i.quantity}</td></tr>)}</tbody>
        </table>
        <form onSubmit={addInventory}>
          <input name="name" placeholder="Item name" required/>
          <input name="quantity" type="number" placeholder="Quantity" defaultValue={0}/>
          <button>Add Inventory</button>
        </form>
      </section>

      <section>
        <h2>Products</h2>
        <ul>
          {products.map(p => <li key={p.id}><strong>{p.name}</strong> <button onClick={()=>buildProduct(p.id)}>Build</button>
            <ul>{p.parts.map(part => <li key={part.inventoryId}>{part.inventoryId} — {part.qty}</li>)}</ul>
          </li>)}
        </ul>
        <form onSubmit={addProduct}>
          <input name="name" placeholder="Product name" required/>
          <textarea name="parts" placeholder="inventoryId:qty (one per line)" rows={4}/>
          <button>Create Product</button>
        </form>
      </section>
    </div>
  );
}
