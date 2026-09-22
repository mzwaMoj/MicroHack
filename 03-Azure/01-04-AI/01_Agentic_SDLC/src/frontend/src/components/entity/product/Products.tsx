import { useState } from 'react';
import axios from 'axios';
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { api } from '../../../api/config';
import { addCartItem, cartQueryKey } from '../../../api/cart';
import { useTheme } from '../../../context/ThemeContext';

interface Product {
  productId: number;
  name: string;
  description: string;
  price: number;
  imgName: string;
  sku: string;
  unit: string;
  supplierId: number;
  discount?: number;
}

interface Supplier {
  supplierId: number;
  name: string;
}

interface ProductFilters {
  search: string;
  supplierId: string;
  minPrice: string;
  maxPrice: string;
}

const fetchProducts = async (filters: ProductFilters): Promise<Product[]> => {
  const params = new URLSearchParams();

  if (filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.supplierId) {
    params.set('supplierId', filters.supplierId);
  }

  if (filters.minPrice) {
    params.set('minPrice', filters.minPrice);
  }

  if (filters.maxPrice) {
    params.set('maxPrice', filters.maxPrice);
  }

  const queryString = params.toString();
  const { data } = await axios.get(
    `${api.baseURL}${api.endpoints.products}${queryString ? `?${queryString}` : ''}`,
  );
  return data;
};

const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data } = await axios.get(`${api.baseURL}${api.endpoints.suppliers}`);
  return data;
};

export default function Products() {
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [addingProductId, setAddingProductId] = useState<number | null>(null);
  const [cartMessage, setCartMessage] = useState('');
  const { darkMode } = useTheme();
  const queryClient = useQueryClient();
  const addToCartMutation = useMutation(addCartItem, {
    onSuccess: (cart, variables) => {
      queryClient.setQueryData(cartQueryKey, cart);
      setQuantities((previous) => ({ ...previous, [variables.productId]: 0 }));
      setCartMessage('Product added to cart.');
    },
    onError: () => setCartMessage('The product could not be added. Try again.'),
    onSettled: () => setAddingProductId(null),
  });

  const parsedMinPrice = minPrice === '' ? undefined : Number(minPrice);
  const parsedMaxPrice = maxPrice === '' ? undefined : Number(maxPrice);
  const hasInvalidPriceRange =
    parsedMinPrice !== undefined &&
    parsedMaxPrice !== undefined &&
    Number.isFinite(parsedMinPrice) &&
    Number.isFinite(parsedMaxPrice) &&
    parsedMinPrice > parsedMaxPrice;

  const productFilters = { search: searchTerm, supplierId, minPrice, maxPrice };
  const {
    data: products,
    isLoading,
    error,
  } = useQuery(['products', productFilters], () => fetchProducts(productFilters), {
    enabled: !hasInvalidPriceRange,
    keepPreviousData: true,
  });
  const { data: suppliers = [] } = useQuery('suppliers', fetchSuppliers);
  const hasActiveFilters = Boolean(searchTerm || supplierId || minPrice || maxPrice);
  const displayedProducts = products?.filter((product) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.sku.toLowerCase().includes(normalizedSearch) ||
      product.description.toLowerCase().includes(normalizedSearch);
    const matchesSupplier = !supplierId || product.supplierId === Number(supplierId);
    const matchesMinPrice = parsedMinPrice === undefined || product.price >= parsedMinPrice;
    const matchesMaxPrice = parsedMaxPrice === undefined || product.price <= parsedMaxPrice;

    return matchesSearch && matchesSupplier && matchesMinPrice && matchesMaxPrice;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSupplierId('');
    setMinPrice('');
    setMaxPrice('');
  };

  const handleQuantityChange = (productId: number, change: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + change),
    }));
  };

  const handleAddToCart = (productId: number) => {
    const quantity = quantities[productId] || 0;
    if (quantity > 0) {
      setAddingProductId(productId);
      setCartMessage('');
      addToCartMutation.mutate({ productId, quantity });
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div
        className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4 transition-colors duration-300`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 px-4 transition-colors duration-300`}
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-red-500 text-center">Failed to fetch products</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen ${darkMode ? 'bg-dark' : 'bg-gray-100'} pt-20 pb-16 px-4 transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col space-y-6">
          <h1
            className={`text-3xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} transition-colors duration-300`}
          >
            Products
          </h1>

          {cartMessage && (
            <p
              className={addToCartMutation.isError ? 'text-red-600' : 'text-primary'}
              role={addToCartMutation.isError ? 'alert' : 'status'}
            >
              {cartMessage}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_1fr_1fr_auto] lg:items-end">
            <div className="relative">
              <label htmlFor="product-search" className="sr-only">
                Search products
              </label>
              <input
                id="product-search"
                type="text"
                placeholder="Search products or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full px-4 py-2 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-300'} rounded-lg border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors duration-300`}
                aria-label="Search products"
              />
              <svg
                className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'} transition-colors duration-300`}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>

            <div>
              <label
                htmlFor="supplier-filter"
                className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Supplier
              </label>
              <select
                id="supplier-filter"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-300'} rounded-lg border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors duration-300`}
                aria-label="Filter by supplier"
              >
                <option value="">All suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.supplierId} value={supplier.supplierId}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="min-price-filter"
                className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Min price
              </label>
              <input
                id="min-price-filter"
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-300'} rounded-lg border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors duration-300`}
                aria-label="Minimum price"
              />
            </div>

            <div>
              <label
                htmlFor="max-price-filter"
                className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              >
                Max price
              </label>
              <input
                id="max-price-filter"
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800 text-light border-gray-700' : 'bg-white text-gray-800 border-gray-300'} rounded-lg border focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-colors duration-300`}
                aria-label="Maximum price"
              />
            </div>

            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className={`px-4 py-2 rounded-lg transition-colors ${hasActiveFilters
                ? 'bg-primary hover:bg-accent text-white'
                : darkMode
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
            >
              Clear
            </button>
          </div>

          {hasInvalidPriceRange && (
            <p className="text-red-500" role="alert">
              Minimum price cannot be greater than maximum price.
            </p>
          )}

          {/* Empty state when no products match */}
          {(!displayedProducts || displayedProducts.length === 0) && !hasInvalidPriceRange && (
            <div
              className={`flex flex-col items-center justify-center text-center py-20 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'
                } shadow-sm border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}
              role="status"
              aria-live="polite"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-12 w-12 mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h7l2 3h9v13a2 2 0 01-2 2H5a2 2 0 01-2-2V3zm3 7h12" />
              </svg>
              <p className={`${darkMode ? 'text-light' : 'text-gray-800'} text-lg font-medium`}>
                No products found
              </p>
              {hasActiveFilters && (
                <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mt-2`}>
                  Try clearing or changing your search filters.
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedProducts?.map((product) => {
              const hasDiscount = product.discount != null && product.discount > 0;
              return (
                <div
                  key={product.productId}
                  className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg overflow-hidden shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_rgba(118,184,82,0.3)] flex flex-col`}
                >
                  <div
                    className={`relative h-56 ${darkMode ? 'bg-gradient-to-t from-gray-700 to-gray-800' : 'bg-gradient-to-t from-gray-100 to-white'} transition-colors duration-300 cursor-pointer`}
                    onClick={() => handleProductClick(product)}
                  >
                    <img
                      src={`/${product.imgName}`}
                      alt={product.name}
                      className="w-full h-full object-contain p-2"
                    />
                    {hasDiscount && (
                      <div className="absolute top-8 left-0 bg-primary text-white px-3 py-1 -rotate-90 transform -translate-x-5 shadow-md">
                        {Math.round(product.discount! * 100)}% OFF
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                  <h3
                    className={`text-xl font-semibold ${darkMode ? 'text-light' : 'text-gray-800'} mb-2 transition-colors duration-300`}
                  >
                    {product.name}
                  </h3>
                  <p
                    className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4 flex-grow transition-colors duration-300`}
                  >
                    {product.description}
                  </p>
                  <div className="space-y-4 mt-auto">
                    <div className="flex justify-between items-center">
                      {hasDiscount ? (
                        <div>
                          <span className="text-gray-500 line-through text-sm mr-2">
                            ${product.price.toFixed(2)}
                          </span>
                          <span className="text-primary text-xl font-bold">
                            ${(product.price * (1 - product.discount!)).toFixed(2)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-primary text-xl font-bold">
                          ${product.price.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div
                        className={`flex items-center space-x-3 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-lg p-1 transition-colors duration-300`}
                      >
                        <button
                          onClick={() => handleQuantityChange(product.productId, -1)}
                          className={`w-8 h-8 flex items-center justify-center ${darkMode ? 'text-light' : 'text-gray-700'} hover:text-primary transition-colors duration-300`}
                          aria-label={`Decrease quantity of ${product.name}`}
                          id={`decrease-qty-${product.productId}`}
                        >
                          <span aria-hidden="true">-</span>
                        </button>
                        <span
                          className={`${darkMode ? 'text-light' : 'text-gray-800'} min-w-[2rem] text-center transition-colors duration-300`}
                          aria-label={`Quantity of ${product.name}`}
                          id={`qty-${product.productId}`}
                        >
                          {quantities[product.productId] || 0}
                        </span>
                        <button
                          onClick={() => handleQuantityChange(product.productId, 1)}
                          className={`w-8 h-8 flex items-center justify-center ${darkMode ? 'text-light' : 'text-gray-700'} hover:text-primary transition-colors duration-300`}
                          aria-label={`Increase quantity of ${product.name}`}
                          id={`increase-qty-${product.productId}`}
                        >
                          <span aria-hidden="true">+</span>
                        </button>
                      </div>
                      <button
                        onClick={() => handleAddToCart(product.productId)}
                        className={`px-4 py-2 rounded-lg transition-colors ${quantities[product.productId]
                          ? 'bg-primary hover:bg-accent text-white'
                          : `${darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'} cursor-not-allowed`
                          }`}
                        disabled={!quantities[product.productId] || addingProductId === product.productId}
                        aria-label={`Add ${quantities[product.productId] || 0} ${product.name} to cart`}
                        id={`add-to-cart-${product.productId}`}
                      >
                        {addingProductId === product.productId ? 'Adding...' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Modal */}
      {showModal && selectedProduct && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transition-colors duration-300`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-black'} transition-colors duration-300`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div
              className={`${darkMode ? 'bg-gradient-to-t from-gray-700 to-gray-800' : 'bg-gradient-to-t from-gray-100 to-white'} rounded-lg mb-6 p-4`}
            >
              <img
                src={`/${selectedProduct.imgName}`}
                alt={selectedProduct.name}
                className="w-full h-auto object-contain max-h-[400px]"
              />
            </div>
            <h2
              className={`text-2xl font-bold ${darkMode ? 'text-light' : 'text-gray-800'} mb-4 transition-colors duration-300`}
            >
              {selectedProduct.name}
            </h2>
            <p
              className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} text-lg transition-colors duration-300`}
            >
              {selectedProduct.description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
