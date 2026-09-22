import { BadgeCheck, CircleAlert } from 'lucide-react';
import type { ChatResponse } from '../../types/chat';

interface ChatResultsProps {
  response: ChatResponse;
  darkMode: boolean;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export default function ChatResults({ response, darkMode }: ChatResultsProps) {
  return (
    <div className="space-y-4">
      <p className="whitespace-pre-wrap leading-7">{response.answer}</p>
      {response.products.length > 0 && (
        <ul className={`divide-y border ${darkMode ? 'divide-gray-700 border-gray-700' : 'divide-gray-200 border-gray-200'}`} aria-label="Matching products">
          {response.products.map((product) => {
            const discountedPrice = product.discount
              ? product.price * (1 - product.discount)
              : product.price;
            return (
              <li key={product.productId} className={`flex gap-3 p-3 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
                <img src={`/${product.imgName}`} alt="" className="h-20 w-20 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold">{product.name}</h3>
                    <strong className="tabular-nums text-primary">{formatCurrency(discountedPrice)}</strong>
                  </div>
                  <p className={`mt-1 line-clamp-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{product.description}</p>
                  <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span>{product.supplierName}</span>
                    <span className="inline-flex items-center gap-1">
                      {product.supplierVerified ? <BadgeCheck size={14} className="text-primary" /> : <CircleAlert size={14} />}
                      {product.supplierVerified ? 'Verified supplier' : 'Not verified'}
                    </span>
                    {product.discount ? <span>{product.discount * 100}% discount</span> : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {response.citations.length > 0 && (
        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Sources: {response.citations.map((citation) => citation.title).join(', ')}
        </p>
      )}
    </div>
  );
}