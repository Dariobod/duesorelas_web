import { useEffect, useState } from 'react'

type AdminProduct = { id: number; title: string; price_ars: number; category_name: string; active: number }

export default function Admin() {
  const [password, setPassword] = useState('')
  const [loggedIn, setLoggedIn] = useState(false)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [error, setError] = useState('')

  const loadProducts = () => fetch('/api/admin/products').then((response) => response.ok ? response.json() : Promise.reject()).then(setProducts).catch(() => setLoggedIn(false))
  useEffect(() => { loadProducts() }, [])

  async function login(event: React.FormEvent) {
    event.preventDefault(); setError('')
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) })
    if (!response.ok) { setError('Contraseña incorrecta'); return }
    setLoggedIn(true); setPassword(''); loadProducts()
  }

  if (!loggedIn) return <main className="catalog-page admin-page"><section className="catalog-heading"><p className="eyebrow">Due Sorelas / Administración</p><h1>Backoffice</h1><p>Ingresá para administrar el catálogo.</p></section><form className="admin-login" onSubmit={login}><label>Contraseña<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>{error && <p role="alert">{error}</p>}<button className="button" type="submit">Ingresar</button></form></main>

  return <main className="catalog-page admin-page"><section className="catalog-heading"><p className="eyebrow">Due Sorelas / Administración</p><h1>Productos</h1><p>{products.length} productos cargados en D1.</p></section><div className="admin-toolbar"><button className="button" onClick={() => fetch('/api/admin/logout', { method: 'POST' }).then(() => setLoggedIn(false))}>Cerrar sesión</button></div><div className="admin-table"><div className="admin-row admin-head"><span>Producto</span><span>Categoría</span><span>Precio</span><span>Estado</span></div>{products.map((product) => <div className="admin-row" key={product.id}><span>{product.title}</span><span>{product.category_name}</span><span>${product.price_ars.toLocaleString('es-AR')}</span><span>{product.active ? 'Activo' : 'Inactivo'}</span></div>)}</div></main>
}
