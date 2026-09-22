import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { cartQueryKey, fetchCart, removeCartItem, updateCartItem } from '../../api/cart';
import type { CartItem } from '../../types/cart';
import { useTheme } from '../../context/ThemeContext';
import CartItemRow from './CartItemRow';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function Cart() {
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();
  const { data: cart, isLoading, isError, refetch } = useQuery(cartQueryKey, fetchCart);
  const updateMutation = useMutation(
    ({ itemId, quantity }: { itemId: number; quantity: number }) => updateCartItem(itemId, quantity),
    {
      onSuccess: (updatedCart) => {
        queryClient.setQueryData(cartQueryKey, updatedCart);
      },
    },
  );
  const removeMutation = useMutation(removeCartItem, {
    onSuccess: () => queryClient.invalidateQueries(cartQueryKey),
  });
  const pendingItemId = updateMutation.variables?.itemId ?? removeMutation.variables;
  const mutationError = updateMutation.isError || removeMutation.isError;

  const changeQuantity = (item: CartItem, quantity: number) => {
    updateMutation.mutate({ itemId: item.orderDetailId, quantity });
  };

  const pageClass = `min-h-screen pt-24 pb-16 px-4 ${darkMode ? 'bg-dark text-light' : 'bg-gray-100 text-gray-900'}`;

  if (isLoading) {
    return <main className={pageClass}><p className="mx-auto max-w-5xl" role="status">Loading cart...</p></main>;
  }

  if (isError || !cart) {
    return (
      <main className={pageClass}>
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-3xl font-bold">Cart unavailable</h1>
          <p className="mt-3">The cart could not be loaded. Check the API connection and try again.</p>
          <button type="button" onClick={() => refetch()} className="mt-6 rounded-md bg-primary px-4 py-2 font-semibold text-white hover:bg-accent">Try again</button>
        </div>
      </main>
    );
  }

  return (
    <main className={pageClass}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-b border-primary pb-4">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Branch order</p>
            <h1 className="text-3xl font-bold">Shopping cart</h1>
          </div>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            {cart.items.length} {cart.items.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {mutationError && <p className="mb-4 text-red-600" role="alert">The cart could not be updated. Try again.</p>}

        {cart.items.length === 0 ? (
          <section className={`border py-16 text-center ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
            <h2 className="text-xl font-semibold">Your cart is empty</h2>
            <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Add products to build the next branch order.</p>
            <Link to="/products" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 font-semibold text-white hover:bg-accent">Browse products</Link>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start">
            <ul className={`overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              {cart.items.map((item) => (
                <CartItemRow
                  key={item.orderDetailId}
                  item={item}
                  darkMode={darkMode}
                  pending={pendingItemId === item.orderDetailId}
                  onQuantityChange={changeQuantity}
                  onRemove={(cartItem) => removeMutation.mutate(cartItem.orderDetailId)}
                />
              ))}
            </ul>
            <aside className={`border-t-4 border-primary p-5 ${darkMode ? 'bg-gray-800' : 'bg-white'}`} aria-label="Cart total">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-semibold">Total</span>
                <strong className="text-2xl tabular-nums">{formatCurrency(cart.total)}</strong>
              </div>
              <p className={`mt-3 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Prices reflect product discounts when each item was added.</p>
              <Link to="/checkout" className="mt-5 block rounded-md bg-primary px-5 py-2.5 text-center font-semibold text-white hover:bg-accent">Proceed to payment</Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}