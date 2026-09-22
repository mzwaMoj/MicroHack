import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { cartQueryKey, fetchCart } from '../../api/cart';
import {
  fetchPaymentSetup,
  getPaymentErrorMessage,
  paymentSetupQueryKey,
  submitCheckout,
} from '../../api/payment';
import { orderHistoryQueryKey } from '../../api/orders';
import type { PaymentConfirmation, SimulatedPaymentMethod } from '../../types/payment';
import { useTheme } from '../../context/ThemeContext';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function Checkout() {
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();
  const [cardholderName, setCardholderName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SimulatedPaymentMethod>('demo-card-approved');
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState<PaymentConfirmation | null>(null);
  const { data: cart, isLoading: cartLoading } = useQuery(cartQueryKey, fetchCart);
  const { data: setup, isLoading: setupLoading, isError: setupError } = useQuery(
    paymentSetupQueryKey,
    fetchPaymentSetup,
  );
  const paymentMutation = useMutation(submitCheckout, {
    onSuccess: (result) => {
      setConfirmation(result);
      queryClient.invalidateQueries(cartQueryKey);
      queryClient.invalidateQueries(orderHistoryQueryKey);
    },
  });
  const pageClass = `min-h-screen px-4 pb-16 pt-24 ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-900'}`;

  if (cartLoading || setupLoading) {
    return <main className={pageClass}><p className="mx-auto max-w-5xl" role="status">Loading checkout...</p></main>;
  }

  if (confirmation) {
    return (
      <main className={pageClass}>
        <section className={`mx-auto max-w-2xl border-t-4 border-primary p-8 text-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <p className="text-sm font-semibold uppercase text-primary">Payment approved</p>
          <h1 className="mt-2 text-3xl font-bold">Order confirmed</h1>
          <p className={`mt-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Order {confirmation.orderId} was submitted for {formatCurrency(confirmation.amount)}.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/orders" className="rounded-md bg-primary px-5 py-2.5 font-semibold text-white hover:bg-accent">View order history</Link>
            <Link to="/products" className={`rounded-md border px-5 py-2.5 font-semibold ${darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}>Continue shopping</Link>
          </div>
        </section>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className={pageClass}>
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold">Nothing to check out</h1>
          <p className="mt-3">Add products to the cart before starting payment.</p>
          <Link to="/products" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 font-semibold text-white hover:bg-accent">Browse products</Link>
        </section>
      </main>
    );
  }

  if (setupError || !setup) {
    return (
      <main className={pageClass}>
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-bold">Payment unavailable</h1>
          <p className="mt-3">The payment simulator is not configured on the API.</p>
          <Link to="/cart" className="mt-6 inline-block font-semibold text-primary hover:text-accent">Return to cart</Link>
        </section>
      </main>
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    paymentMutation.mutate({ cardholderName, paymentMethod, otp });
  };

  return (
    <main className={pageClass}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 border-b border-primary pb-4">
          <p className="text-sm font-semibold uppercase text-primary">Secure demo checkout</p>
          <h1 className="text-3xl font-bold">Payment</h1>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
          <form onSubmit={handleSubmit} className={`space-y-6 border p-6 ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <div>
              <label htmlFor="cardholder-name" className="mb-2 block font-medium">Cardholder name</label>
              <input id="cardholder-name" value={cardholderName} onChange={(event) => setCardholderName(event.target.value)} minLength={2} maxLength={100} required className={`w-full rounded-md border px-3 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`} />
            </div>

            <fieldset>
              <legend className="mb-2 font-medium">Simulated card response</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['demo-card-approved', 'Approve payment'],
                  ['demo-card-declined', 'Decline payment'],
                ] as const).map(([value, label]) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${paymentMethod === value ? 'border-primary ring-1 ring-primary' : darkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                    <input type="radio" name="payment-method" value={value} checked={paymentMethod === value} onChange={() => setPaymentMethod(value)} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className={`grid gap-5 border-t pt-6 sm:grid-cols-[240px_1fr] ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <img src={setup.qrCodeDataUrl} alt={`QR code for ${setup.issuer} in Google Authenticator`} width="240" height="240" className="bg-white" />
              <div>
                <h2 className="text-lg font-semibold">Google Authenticator</h2>
                <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Scan the QR code, then enter the current six-digit code. This setup is for simulation only.</p>
                <p className={`mt-3 break-all font-mono text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Manual key: {setup.manualEntryKey}</p>
                <label htmlFor="payment-otp" className="mb-2 mt-5 block font-medium">Authentication code</label>
                <input id="payment-otp" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required className={`w-full max-w-48 rounded-md border px-3 py-2 font-mono text-xl tracking-widest focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-white'}`} />
              </div>
            </div>

            {paymentMutation.isError && <p className="text-red-600" role="alert">{getPaymentErrorMessage(paymentMutation.error)}</p>}
            <button type="submit" disabled={paymentMutation.isLoading || otp.length !== 6} className="w-full rounded-md bg-primary px-5 py-3 font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50">
              {paymentMutation.isLoading ? 'Processing...' : `Pay ${formatCurrency(cart.total)}`}
            </button>
          </form>

          <aside className={`border-t-4 border-primary p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} aria-label="Order summary">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {cart.items.map((item) => (
                <li key={item.orderDetailId} className="flex justify-between gap-4 text-sm">
                  <span>{item.quantity} x {item.name}</span>
                  <span className="tabular-nums">{formatCurrency(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <div className={`mt-5 flex justify-between border-t pt-4 text-lg font-bold ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <span>Total</span>
              <span className="tabular-nums">{formatCurrency(cart.total)}</span>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}