import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
} from '../api/endpoints';
import { getApiErrorMessage } from '../api/errors';
import { useAuth } from './AuthContext';

const EMPTY_CART = { items: [], total_items: 0, subtotal: '0.00' };
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, setCart] = useState(EMPTY_CART);
  const [loading, setLoading] = useState(false);
  const [cartError, setCartError] = useState('');

  const fetchCart = useCallback(async () => {
    if (!user) {
      setCart(EMPTY_CART);
      setCartError('');
      return EMPTY_CART;
    }

    setLoading(true);
    try {
      const { data } = await getCart();
      setCart(data);
      setCartError('');
      return data;
    } catch (error) {
      setCartError(getApiErrorMessage(error, 'Could not load your cart.'));
      throw error;
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart().catch(() => {});
  }, [fetchCart]);

  const addItem = async (productId, quantity = 1) => {
    if (!user) throw new Error('Sign in before adding items to your cart.');
    setLoading(true);
    try {
      await addToCart({ product_id: productId, quantity });
      return await fetchCart();
    } finally {
      setLoading(false);
    }
  };

  const updateItem = async (productId, quantity) => {
    await updateCartItem({ product_id: productId, quantity });
    return fetchCart();
  };

  const removeItem = async (productId) => {
    await removeCartItem(productId);
    return fetchCart();
  };

  const emptyCart = async () => {
    await clearCart();
    setCart(EMPTY_CART);
  };

  return (
    <CartContext.Provider value={{ cart, cartError, loading, addItem, updateItem, removeItem, emptyCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
