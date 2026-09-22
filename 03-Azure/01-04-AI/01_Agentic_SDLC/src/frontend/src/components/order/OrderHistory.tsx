import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { fetchOrderHistory, orderHistoryQueryKey } from '../../api/orders';
import { useTheme } from '../../context/ThemeContext';
import type { OrderHistoryItem } from '../../types/order';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

const statusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);

export default function OrderHistory() {
  const { darkMode } = useTheme();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const { data: orders, isLoading, isError, refetch } = useQuery(orderHistoryQueryKey, fetchOrderHistory);
  const pageClass = `min-h-screen pt-24 pb-16 px-4 ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-900'}`;

  const selectedOrder = orders?.find((order) => order.orderId === selectedOrderId) ?? null;

  if (isLoading) {
    return <main className={pageClass}><p className="mx-auto max-w-5xl" role="status">Loading order history...</p></main>;
  }

  if (isError || !orders) {
    return (
      <main className={pageClass}>
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-3xl font-bold">Order history unavailable</h1>
          <p className="mt-3">Past orders could not be loaded. Check the API connection and try again.</p>
          <button type="button" onClick={() => refetch()} className="mt-6 rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-accent">Try again</button>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClass}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-primary pb-4">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Branch purchases</p>
            <h1 className="text-3xl font-bold">Order History</h1>
          </div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </p>
        </div>

        {orders.length === 0 ? (
          <section className={`border py-16 text-center ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`} role="status">
            <h2 className="text-xl font-semibold">No orders yet</h2>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Completed branch orders will appear here after checkout.</p>
            <Link to="/products" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 font-semibold text-white hover:bg-accent">Browse products</Link>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            <ul className={`overflow-hidden border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`} aria-label="Past orders">
              {orders.map((order) => (
                <li key={order.orderId} className={`border-b p-5 last:border-b-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <button
                    type="button"
                    onClick={() => setSelectedOrderId(order.orderId)}
                    className="w-full text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-pressed={selectedOrderId === order.orderId}
                  >
                    <span className="flex flex-wrap items-start justify-between gap-4">
                      <span>
                        <span className="block text-lg font-semibold">{order.name}</span>
                        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{formatDate(order.orderDate)}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-xl font-bold text-primary">{formatCurrency(order.total)}</span>
                        <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>{statusLabel(order.status)}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <OrderDetailsPanel order={selectedOrder ?? orders[0]} darkMode={darkMode} />
          </div>
        )}
      </div>
    </main>
  );
}

function OrderDetailsPanel({ order, darkMode }: { order: OrderHistoryItem; darkMode: boolean }) {
  return (
    <aside className={`border-t-4 border-primary p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} aria-label="Order details">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase text-primary">Selected order</p>
        <h2 className="text-xl font-bold">{order.name}</h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>{formatDate(order.orderDate)}</p>
      </div>

      <ul className="space-y-4">
        {order.details.map((detail) => (
          <li key={detail.orderDetailId} className={`border-b pb-4 last:border-b-0 last:pb-0 ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex justify-between gap-4">
              <div>
                <p className="font-semibold">{detail.productName}</p>
                <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                  {detail.quantity} x {formatCurrency(detail.unitPrice)}
                </p>
              </div>
              <strong className="tabular-nums">{formatCurrency(detail.lineTotal)}</strong>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex justify-between border-t border-primary pt-4 text-lg">
        <span className="font-semibold">Total</span>
        <strong>{formatCurrency(order.total)}</strong>
      </div>
    </aside>
  );
}