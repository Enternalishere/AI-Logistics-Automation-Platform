import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const tabs = ['dashboard', 'orders', 'customers']
const STATUS_LABELS = {
  pending: 'Pending',
  in_transit: 'In Transit',
  delivered: 'Delivered',
  canceled: 'Canceled',
  returned: 'Returned'
}

function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [orders, setOrders] = useState([])
  const [customers, setCustomers] = useState([])
  const [summary, setSummary] = useState(null)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchJson = async (url) => {
    const response = await fetch(url)
    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      const message = body.message || response.statusText || 'Request failed'
      throw new Error(message)
    }
    return response.json()
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  useEffect(() => {
    setError('')
    if (activeTab === 'dashboard') {
      fetchSummary()
    }
    if (activeTab === 'orders') {
      fetchOrders()
    }
    if (activeTab === 'customers') {
      fetchCustomers()
    }
  }, [activeTab])

  const fetchHealth = async () => {
    try {
      const data = await fetchJson(`${API_BASE}/health`)
      setHealth(data)
    } catch (err) {
      setHealth({ status: 'offline', message: err.message })
    }
  }

  const fetchSummary = async () => {
    try {
      setLoading(true)
      const [ordersRes, customersRes, analyticsRes] = await Promise.all([
        fetchJson(`${API_BASE}/api/orders?limit=6`),
        fetchJson(`${API_BASE}/api/customers?limit=6`),
        fetchJson(`${API_BASE}/api/orders/analytics/summary`)
      ])
      setOrders(ordersRes.data || [])
      setCustomers(customersRes.data || [])
      setSummary(analyticsRes.data || null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const data = await fetchJson(`${API_BASE}/api/orders?limit=20`)
      setOrders(data.data || [])
    } catch (err) {
      setError(err.message)
      setOrders([])
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const data = await fetchJson(`${API_BASE}/api/customers?limit=20`)
      setCustomers(data.data || [])
    } catch (err) {
      setError(err.message)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const activeOrders = useMemo(() => orders.filter((order) => order.status !== 'delivered' && order.status !== 'canceled'), [orders])
  const totalOrders = orders.length
  const totalCustomers = customers.length

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">📦</div>
          <div>
            <h1>Logistics</h1>
            <p>Management Dashboard</p>
          </div>
        </div>

        <nav>
          {tabs.map((tab) => (
            <button
              key={tab}
              className={tab === activeTab ? 'nav-button active' : 'nav-button'}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'dashboard' ? 'Dashboard' : tab === 'orders' ? 'Orders' : 'Customers'}
            </button>
          ))}
        </nav>

        <div className="status-panel">
          <strong>API status</strong>
          <p className={health?.status === 'OK' ? 'status-ok' : 'status-error'}>
            {health?.status || 'Unknown'}
          </p>
          <p>{health?.message || 'Waiting for backend...'}</p>
        </div>
      </aside>

      <main className="content">
        <header className="header-row">
          <div>
            <h2>{activeTab === 'dashboard' ? 'Overview' : activeTab === 'orders' ? 'Orders' : 'Customers'}</h2>
            <p>Connected to {API_BASE}</p>
          </div>
          <button className="refresh-button" onClick={() => setActiveTab(activeTab)}>Refresh</button>
        </header>

        {error && <div className="alert">{error}</div>}

        {activeTab === 'dashboard' && (
          <>
            <section className="stat-grid">
              <article className="stat-card">
                <h3>Total customers</h3>
                <strong>{totalCustomers || summary?.summary?.totalCustomers || '-'}</strong>
              </article>
              <article className="stat-card">
                <h3>Total orders</h3>
                <strong>{summary?.summary?.totalOrders ?? totalOrders ?? '-'}</strong>
              </article>
              <article className="stat-card">
                <h3>Average delivery</h3>
                <strong>{summary?.summary?.avgDeliveryTime ? `${summary.summary.avgDeliveryTime.toFixed(1)} d` : '-'}</strong>
              </article>
              <article className="stat-card">
                <h3>Recent active</h3>
                <strong>{activeOrders.length}</strong>
              </article>
            </section>

            <section className="panel">
              <div className="panel-header">
                <h3>Latest orders</h3>
                <span>{orders.length} loaded</span>
              </div>
              {loading ? (
                <p>Loading orders...</p>
              ) : orders.length === 0 ? (
                <p className="empty-state">No orders found. Seed the backend or create orders to populate data.</p>
              ) : (
                <div className="table">{orders.slice(0, 6).map((order) => (
                  <div key={order._id || order.id} className="table-row">
                    <div>{order.customerId?.name || order.customerId || 'Unknown'}</div>
                    <div>{order.status ? STATUS_LABELS[order.status] || order.status : '-'}</div>
                    <div>{order.deliveryType || order.orderType || 'Standard'}</div>
                    <div>{new Date(order.createdAt || order.timestamps?.createdAt || order.createdAt).toLocaleDateString()}</div>
                  </div>
                ))}</div>
              )}
            </section>
          </>
        )}

        {activeTab === 'orders' && (
          <section className="panel">
            <div className="panel-header">
              <h3>Orders</h3>
              <span>{totalOrders}</span>
            </div>
            {loading ? (
              <p>Loading orders...</p>
            ) : orders.length === 0 ? (
              <p className="empty-state">No orders available yet.</p>
            ) : (
              <div className="table table-head">
                <div>Customer</div>
                <div>Status</div>
                <div>Type</div>
                <div>Date</div>
              </div>
            )}
            {orders.map((order) => (
              <div key={order._id || order.id} className="table-row">
                <div>{order.customerId?.name || order.customerId || 'Unknown'}</div>
                <div>{STATUS_LABELS[order.status] || order.status || 'Pending'}</div>
                <div>{order.deliveryType || order.orderType || 'Standard'}</div>
                <div>{new Date(order.createdAt || order.timestamps?.createdAt || Date.now()).toLocaleDateString()}</div>
              </div>
            ))}
          </section>
        )}

        {activeTab === 'customers' && (
          <section className="panel">
            <div className="panel-header">
              <h3>Customers</h3>
              <span>{totalCustomers}</span>
            </div>
            {loading ? (
              <p>Loading customers...</p>
            ) : customers.length === 0 ? (
              <p className="empty-state">No customer records returned.</p>
            ) : (
              <div className="table table-head">
                <div>Name</div>
                <div>Email</div>
                <div>Phone</div>
                <div>Created</div>
              </div>
            )}
            {customers.map((customer) => (
              <div key={customer._id || customer.id} className="table-row">
                <div>{customer.name || 'Unnamed'}</div>
                <div>{customer.email || '-'}</div>
                <div>{customer.phone || '-'}</div>
                <div>{new Date(customer.createdAt || customer.registeredAt || Date.now()).toLocaleDateString()}</div>
              </div>
            ))}
          </section>
        )}

        <footer className="footer">
          <p>Powered by the AI Logistics backend.</p>
        </footer>
      </main>
    </div>
  )
}

export default App
