import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';

import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const isAvailableonStock = async (product: Product) => {
    const { data: productStock } = await api.get<Stock>(`/stock/${product.id}`);

    return productStock.amount >= product.amount
  }

  const addProduct = async (productId: number) => {
    try {    
      const productOnCartIndex = cart.findIndex(product => product.id === productId);

      if(productOnCartIndex >= 0) {
        const product = {
          ...cart[productOnCartIndex],
          amount:  cart[productOnCartIndex].amount + 1
        }

        if(!(await isAvailableonStock(product))) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        cart[productOnCartIndex].amount += 1
        setCart([...cart]);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      } else {
        const { data } = await api.get(`/products/${productId}`);

        const newCart = [...cart, { ...data, amount: 1 }];

        setCart(newCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      } 
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if(!product) {
        throw new Error();
      }

      const newCart = cart.filter(item => item.id !== productId)
      setCart(newCart); 
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));     
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) return;

      const productOnCartIndex = cart.findIndex(product => product.id === productId);

      if(productOnCartIndex < 0) {
        throw new Error();
      }

      const product = {
        ...cart[productOnCartIndex],
        amount
      }

      if(!(await isAvailableonStock(product))) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      cart[productOnCartIndex].amount = amount;

      setCart([...cart]);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
