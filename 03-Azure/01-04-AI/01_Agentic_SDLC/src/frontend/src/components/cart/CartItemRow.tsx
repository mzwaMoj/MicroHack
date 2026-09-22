import type { CartItem } from '../../types/cart';

interface CartItemRowProps {
  item: CartItem;
  darkMode: boolean;
  pending: boolean;
  onQuantityChange: (item: CartItem, quantity: number) => void;
  onRemove: (item: CartItem) => void;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function CartItemRow({
  item,
  darkMode,
  pending,
  onQuantityChange,
  onRemove,
}: CartItemRowProps) {
  return (
    <li
      className={`grid gap-4 p-4 sm:grid-cols-[96px_1fr_auto] sm:items-center ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border-b last:border-b-0`}
    >
      <img
        src={`/${item.imgName}`}
        alt=""
        className={`h-24 w-24 object-contain ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded-md p-2`}
      />
      <div className="min-w-0">
        <h2 className={`text-lg font-semibold ${darkMode ? 'text-light' : 'text-gray-900'}`}>
          {item.name}
        </h2>
        <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
          {formatCurrency(item.unitPrice)} per {item.unit}
        </p>
        <button
          type="button"
          onClick={() => onRemove(item)}
          disabled={pending}
          className="mt-2 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          Remove
        </button>
      </div>
      <div className="flex items-center justify-between gap-6 sm:justify-end">
        <div
          className={`flex h-10 items-center rounded-md border ${darkMode ? 'border-gray-600' : 'border-gray-300'}`}
        >
          <button
            type="button"
            onClick={() => onQuantityChange(item, item.quantity - 1)}
            disabled={pending || item.quantity === 1}
            className="h-10 w-10 text-lg hover:text-primary disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`Decrease ${item.name} quantity`}
          >
            -
          </button>
          <span className="w-10 text-center tabular-nums" aria-label={`${item.name} quantity`}>
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => onQuantityChange(item, item.quantity + 1)}
            disabled={pending}
            className="h-10 w-10 text-lg hover:text-primary disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-primary"
            aria-label={`Increase ${item.name} quantity`}
          >
            +
          </button>
        </div>
        <p className="w-24 text-right text-lg font-bold tabular-nums">
          {formatCurrency(item.lineTotal)}
        </p>
      </div>
    </li>
  );
}