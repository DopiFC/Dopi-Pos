import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  ShoppingBag,
  Split,
  X,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  UtensilsCrossed,
  Wifi,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getProducts,
  getCategories,
  getTables,
  getCustomers,
  createOrderWithInventory,
  subscribeToOrders,
  subscribeToTables,
  subscribeToProducts,
  saveTableOrder
} from '../../services/storeService';
import {
  Product,
  Category,
  Table,
  Customer,
  CartItem,
  Order,
  PaymentMethod,
  OrderType,
  ProductTopping
} from '../../types';
import { formatCurrency, generateOrderNumber } from '../../utils/format';
import { Modal } from '../../components/common/Modal';
import { ReceiptModal } from '../../components/common/ReceiptModal';

export const POS: React.FC = () => {
  const { user, store } = useAuth();
  const { success, error, info } = useToast();
  const [searchParams] = useSearchParams();

  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [surcharge, setSurcharge] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState<string>('');

  // Mobile Drawer State
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  // Order meta states
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [selectedTableId, setSelectedTableId] = useState<string>(searchParams.get('tableId') || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Payment Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Topping Selection Modal state
  const [toppingModalProduct, setToppingModalProduct] = useState<Product | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<ProductTopping[]>([]);

  // Receipt & Checkout Success Modal state
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Web Audio chime for new order notification
  const playOrderChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch {
      // Audio autoplay policy notice - safe to ignore
    }
  };

  // Load initial data and connect Realtime multi-device synchronization
  const loadData = async () => {
    if (!user) return;
    const storeId = store?.id || user.uid;
    try {
      setLoading(true);
      const [prodList, catList, tblList, custList] = await Promise.all([
        getProducts(storeId),
        getCategories(storeId),
        getTables(storeId),
        getCustomers(storeId)
      ]);
      setProducts(prodList.filter((p) => p.status === 'active'));
      setCategories(catList);
      setTables(tblList);
      setCustomers(custList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const initialOrdersLoaded = useRef(false);
  const knownOrderIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const storeId = store?.id || user.uid;
    loadData();

    // 1. Realtime Products stock listener across all devices
    const unsubProds = subscribeToProducts(storeId, (liveProds) => {
      setProducts(liveProds.filter((p) => p.status === 'active'));
    });

    // 2. Realtime Tables status listener across all waiter devices
    const unsubTables = subscribeToTables(storeId, (liveTables) => {
      setTables(liveTables);
    });

    // 3. Realtime Orders sync across devices
    const unsubOrders = subscribeToOrders(storeId, (liveOrders) => {
      if (!initialOrdersLoaded.current) {
        liveOrders.forEach((o) => knownOrderIds.current.add(o.id));
        initialOrdersLoaded.current = true;
        return;
      }

      // Check if new order arrived from another device
      const newlyAdded = liveOrders.filter((o) => !knownOrderIds.current.has(o.id));
      if (newlyAdded.length > 0) {
        newlyAdded.forEach((o) => knownOrderIds.current.add(o.id));
        const latest = newlyAdded[0];
        // If created by another device or user
        playOrderChime();
        info(`🛎️ [Đơn mới] ${latest.orderNumber}${latest.tableName ? ` (${latest.tableName})` : ''} - Đã đồng bộ realtime!`);
      }
    });

    return () => {
      unsubProds();
      unsubTables();
      unsubOrders();
    };
  }, [user, store?.id]);

  // Handle URL tableId param
  useEffect(() => {
    const tableParam = searchParams.get('tableId');
    if (tableParam) {
      setSelectedTableId(tableParam);
      setOrderType('dine_in');
    }
  }, [searchParams]);

  // Product fast-lookup map
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategoryId === 'all' || p.categoryId === selectedCategoryId;
      const matchSearch =
        !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, selectedCategoryId, searchQuery]);

  // Cart totals calculations
  const totalItemsCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discount + surcharge);
  }, [cartSubtotal, discount, surcharge]);

  // Change given calculation
  const changeGiven = useMemo(() => {
    if (paymentMethod === 'cash') {
      return Math.max(0, amountReceived - cartTotal);
    }
    return 0;
  }, [paymentMethod, amountReceived, cartTotal]);

  // Add product to cart handler
  const handleProductClick = (product: Product) => {
    if (product.toppings && product.toppings.length > 0) {
      setToppingModalProduct(product);
      setSelectedToppings([]);
      return;
    }
    addToCart(product, []);
  };

  const addToCart = (product: Product, toppings: ProductTopping[]) => {
    const toppingTotal = toppings.reduce((sum, t) => sum + t.price, 0);
    const unitPrice = product.sellingPrice + toppingTotal;
    const toppingKey = toppings
      .map((t) => t.name)
      .sort()
      .join('|');
    const cartItemId = `${product.id}__${toppingKey}`;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const nextCart = [...prevCart];
        const item = nextCart[existingIndex];
        const nextQty = item.quantity + 1;
        nextCart[existingIndex] = {
          ...item,
          quantity: nextQty,
          subtotal: nextQty * unitPrice
        };
        return nextCart;
      } else {
        return [
          ...prevCart,
          {
            cartItemId,
            product,
            quantity: 1,
            selectedToppings: toppings,
            unitPrice,
            subtotal: unitPrice
          }
        ];
      }
    });

    info(`+1 ${product.name}`);
  };

  const addToCartWithToppings = (product: Product, toppings: ProductTopping[]) => {
    const toppingTotal = toppings.reduce((sum, t) => sum + t.price, 0);
    const unitPrice = product.sellingPrice + toppingTotal;
    const toppingKey = toppings
      .map((t) => t.name)
      .sort()
      .join('|');
    const cartItemId = `${product.id}__${toppingKey}`;

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const nextCart = [...prevCart];
        const item = nextCart[existingIndex];
        const nextQty = item.quantity + 1;
        nextCart[existingIndex] = {
          ...item,
          quantity: nextQty,
          subtotal: nextQty * unitPrice
        };
        return nextCart;
      } else {
        return [
          ...prevCart,
          {
            cartItemId,
            product,
            quantity: 1,
            selectedToppings: toppings,
            unitPrice,
            subtotal: unitPrice
          }
        ];
      }
    });

    setToppingModalProduct(null);
    setSelectedToppings([]);
  };

  // Modify Cart Item quantity
  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? {
                  ...item,
                  quantity: newQty,
                  subtotal: newQty * item.unitPrice
                }
              : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (cartItemId: string) => {
    setCart((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSurcharge(0);
    setOrderNotes('');
  };

  // Auto-load existing table items if another waiter placed orders on this table
  useEffect(() => {
    if (!selectedTableId) return;
    const tableObj = tables.find((t) => t.id === selectedTableId);
    if (tableObj && tableObj.currentCartItems && tableObj.currentCartItems.length > 0 && cart.length === 0) {
      const restoredItems: CartItem[] = tableObj.currentCartItems.map((item) => {
        const prod = productMap.get(item.productId) || {
          id: item.productId,
          storeId: tableObj.storeId,
          name: item.productName,
          sku: item.sku,
          categoryId: '',
          categoryName: '',
          unit: item.unit,
          costPrice: 0,
          sellingPrice: item.unitPrice,
          stock: 999,
          minStockAlert: 5,
          status: 'active' as const,
          createdAt: ''
        };
        return {
          cartItemId: `${item.productId}__${Math.random().toString(36).substring(2, 6)}`,
          product: prod,
          quantity: item.quantity,
          selectedToppings: item.selectedToppings || [],
          note: item.note,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal
        };
      });
      setCart(restoredItems);
      info(`Đã tải ${restoredItems.length} món đang gọi của ${tableObj.name} từ thiết bị khác.`);
    }
  }, [selectedTableId, tables, productMap]);

  // Open Payment Modal
  const handleOpenPayment = () => {
    if (cart.length === 0) {
      error('Giỏ hàng đang trống. Vui lòng chọn sản phẩm.');
      return;
    }
    setAmountReceived(cartTotal);
    setCashAmount(Math.round(cartTotal / 2));
    setTransferAmount(cartTotal - Math.round(cartTotal / 2));
    setIsMobileCartOpen(false);
    setIsPaymentModalOpen(true);
  };

  // Save current order to Table (Gửi gọi món vào bàn để nhân viên khác cùng thấy và cập nhật)
  const handleSaveTableOrder = async () => {
    if (!selectedTableId) {
      error('Vui lòng chọn bàn để lưu gọi món.');
      return;
    }
    if (cart.length === 0) {
      error('Giỏ hàng trống. Vui lòng chọn món trước khi lưu bàn.');
      return;
    }
    const activeStoreId = store?.id || user?.uid;
    if (!activeStoreId) return;

    try {
      setIsSubmitting(true);
      await saveTableOrder(selectedTableId, activeStoreId, cart, cartSubtotal);
      const tableObj = tables.find((t) => t.id === selectedTableId);
      success(`Đã lưu gọi món cho ${tableObj?.name || 'bàn'}! Đồng bộ ngay lập tức tới mọi thiết bị.`);
      setIsMobileCartOpen(false);
    } catch (err) {
      error('Không thể lưu gọi món vào bàn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Execute Order Submission
  const handleCompleteOrder = async () => {
    if (isSubmitting || !user) return;

    if (paymentMethod === 'cash' && amountReceived < cartTotal) {
      error('Số tiền khách đưa chưa đủ để thanh toán.');
      return;
    }

    if (paymentMethod === 'split' && cashAmount + transferAmount !== cartTotal) {
      error('Tổng tiền mặt và chuyển khoản phải bằng đúng tổng tiền đơn hàng.');
      return;
    }

    setIsSubmitting(true);

    try {
      const activeStoreId = store?.id || user.uid;
      const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const orderNumber = generateOrderNumber();
      const currentTable = tables.find((t) => t.id === selectedTableId);
      const currentCustomer = customers.find((c) => c.id === selectedCustomerId);

      const newOrder: Order = {
        id: orderId,
        storeId: activeStoreId,
        orderNumber,
        items: cart.map((item) => ({
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku || '',
          unit: item.product.unit || 'Phần',
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          selectedToppings: item.selectedToppings,
          note: item.note,
          subtotal: item.subtotal
        })),
        subtotal: cartSubtotal,
        discount,
        surcharge,
        total: cartTotal,
        paymentMethod,
        cashAmount: paymentMethod === 'split' ? cashAmount : paymentMethod === 'cash' ? cartTotal : 0,
        transferAmount: paymentMethod === 'split' ? transferAmount : paymentMethod === 'transfer' ? cartTotal : 0,
        amountReceived: paymentMethod === 'cash' ? amountReceived : cartTotal,
        changeGiven: paymentMethod === 'cash' ? changeGiven : 0,
        customerId: selectedCustomerId || undefined,
        customerName: currentCustomer ? currentCustomer.name : undefined,
        tableId: orderType === 'dine_in' ? selectedTableId || undefined : undefined,
        tableName: orderType === 'dine_in' && currentTable ? currentTable.name : undefined,
        orderType,
        status: 'completed',
        notes: orderNotes.trim() || undefined,
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      };

      await createOrderWithInventory(newOrder, cart, productMap);

      success(`Thanh toán đơn ${orderNumber} thành công!`);
      setCompletedOrder(newOrder);
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);

      // Reset cart
      clearCart();
      // Reload products to update real-time stock
      loadData();
    } catch (err: any) {
      console.error('Order creation error:', err);
      error(err.message || 'Đã xảy ra lỗi khi tạo đơn hàng. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reusable Clean Cart Panel Content
  const renderCartContent = () => (
    <div className="flex flex-col h-full bg-white">
      {/* 1. Service Type & Table/Customer Bar */}
      <div className="p-3 border-b border-slate-200 bg-slate-50 space-y-2 shrink-0">
        {/* Order Type Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-200 p-1 rounded-lg text-xs font-semibold">
          <button
            type="button"
            onClick={() => setOrderType('dine_in')}
            className={`py-1.5 rounded-md transition-colors ${
              orderType === 'dine_in' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Tại quán
          </button>
          <button
            type="button"
            onClick={() => setOrderType('takeaway')}
            className={`py-1.5 rounded-md transition-colors ${
              orderType === 'takeaway' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Mang đi
          </button>
          <button
            type="button"
            onClick={() => setOrderType('delivery')}
            className={`py-1.5 rounded-md transition-colors ${
              orderType === 'delivery' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
            }`}
          >
            Giao hàng
          </button>
        </div>

        {/* Table & Customer dropdowns */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {orderType === 'dine_in' ? (
            <select
              value={selectedTableId}
              onChange={(e) => setSelectedTableId(e.target.value)}
              className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Chọn Bàn / Phòng</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.areaName})
                </option>
              ))}
            </select>
          ) : (
            <div className="py-1.5 px-2 bg-slate-100 border border-slate-200 rounded-lg text-center text-slate-400 font-medium truncate">
              Không dùng bàn
            </div>
          )}

          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Khách lẻ</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `(${c.phone})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Cart Items Table/List */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-3 divide-y divide-slate-100 min-h-0">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-12">
            <ShoppingBag className="w-10 h-10 text-slate-300 mb-2 stroke-1" />
            <p className="text-xs font-semibold text-slate-600">Đơn hàng đang trống</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-[200px]">
              Chạm vào món bên thực đơn để thêm vào hóa đơn
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.cartItemId} className="py-2 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-xs text-slate-900 truncate">
                  {item.product.name}
                </div>
                {item.selectedToppings && item.selectedToppings.length > 0 && (
                  <div className="text-[10px] text-blue-600 truncate">
                    +{item.selectedToppings.map((t) => t.name).join(', ')}
                  </div>
                )}
                <div className="text-xs font-bold text-blue-600 mt-0.5">
                  {formatCurrency(item.subtotal)}
                </div>
              </div>

              {/* Quantity buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.cartItemId, -1)}
                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-6 text-center text-xs font-bold text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.cartItemId, 1)}
                  className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(item.cartItemId)}
                  className="w-7 h-7 text-slate-400 hover:text-rose-600 flex items-center justify-center transition-colors ml-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 3. Summary & Action Bar */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 space-y-2 shrink-0">
        {/* Discount & Surcharge */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[11px] text-slate-500 block mb-0.5">Giảm giá (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={discount || ''}
              onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0 ₫"
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-right font-medium text-rose-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 block mb-0.5">Phụ thu (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={surcharge || ''}
              onChange={(e) => setSurcharge(Math.max(0, Number(e.target.value) || 0))}
              placeholder="0 ₫"
              className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-right font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Note Input */}
        <input
          type="text"
          value={orderNotes}
          onChange={(e) => setOrderNotes(e.target.value)}
          placeholder="Ghi chú đơn hàng..."
          className="w-full px-2.5 py-1 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
        />

        {/* Line totals */}
        <div className="space-y-1 pt-1 border-t border-slate-200 text-xs">
          <div className="flex justify-between text-slate-600">
            <span>Tạm tính ({totalItemsCount} món):</span>
            <span className="font-semibold">{formatCurrency(cartSubtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span>Giảm giá:</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {surcharge > 0 && (
            <div className="flex justify-between text-slate-600">
              <span>Phụ thu:</span>
              <span>+{formatCurrency(surcharge)}</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-1 border-t border-slate-200">
            <span>TỔNG TIỀN:</span>
            <span className="text-base font-black text-blue-600">{formatCurrency(cartTotal)}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={clearCart}
            className="px-3 py-2.5 border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-600 rounded-lg text-xs font-semibold transition-colors min-h-[44px]"
          >
            Hủy
          </button>
          {orderType === 'dine_in' && selectedTableId && (
            <button
              type="button"
              disabled={cart.length === 0 || isSubmitting}
              onClick={handleSaveTableOrder}
              className="px-3.5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
              title="Lưu gọi món vào bàn để các nhân viên khác cùng xem và cập nhật realtime"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Lưu bàn</span>
            </button>
          )}
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={handleOpenPayment}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            <CreditCard className="w-4 h-4" />
            <span>Thanh toán ({formatCurrency(cartTotal)})</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-3 -m-3 sm:-m-6 h-[calc(100vh-4rem)] overflow-hidden bg-slate-100">
      {/* ============================================================== */}
      {/* LEFT COLUMN: Menu, Catalog & Search */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border-r border-slate-200 overflow-hidden">
        {/* Top Bar: Search & Category Navigation */}
        <div className="p-3 border-b border-slate-200 bg-white space-y-2 shrink-0">
          {/* Mobile Top Bar with Cart Indicator & Realtime status */}
          <div className="flex lg:hidden items-center justify-between pb-1 gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-bold text-slate-900 text-sm truncate">
                {store?.name || 'DopiPOS'}
              </span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-50 text-[10px] text-emerald-700 border border-emerald-200 shrink-0 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Realtime
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileCartOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-full text-xs font-bold shrink-0 min-h-[36px]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{totalItemsCount} món</span>
              <span>•</span>
              <span>{formatCurrency(cartTotal)}</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên sản phẩm hoặc mã SKU..."
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-slate-300 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Categories Tab Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`px-3 py-1.5 rounded-md font-semibold shrink-0 transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tất cả ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`px-3 py-1.5 rounded-md font-medium shrink-0 transition-colors ${
                    selectedCategoryId === cat.id
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Grid (Simple, Clean, Aligned Cards) */}
        <div className="flex-1 overflow-y-auto p-3 pb-24 lg:pb-3">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-xs font-semibold text-slate-600">Không tìm thấy sản phẩm</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Hãy thử tìm với từ khóa khác hoặc danh mục khác.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleProductClick(p)}
                  className="group flex flex-col justify-between p-2.5 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 bg-white text-left transition-all active:scale-[0.99] select-none h-32"
                >
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                      {p.name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                      <span className="truncate">{p.categoryName}</span>
                      {p.toppings && p.toppings.length > 0 && (
                        <span className="text-blue-600 font-medium shrink-0">+Topping</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span className="font-bold text-blue-600 text-xs sm:text-sm">
                      {formatCurrency(p.sellingPrice)}
                    </span>
                    <span className="w-6 h-6 rounded bg-slate-100 group-hover:bg-blue-600 text-slate-600 group-hover:text-white flex items-center justify-center transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* DESKTOP RIGHT COLUMN: Cart Panel */}
      {/* ============================================================== */}
      <div className="hidden lg:flex w-96 flex-col bg-white border-l border-slate-200 shadow-sm shrink-0">
        {renderCartContent()}
      </div>

      {/* ============================================================== */}
      {/* MOBILE FLOATING CART BUTTON */}
      {/* ============================================================== */}
      <div className="lg:hidden fixed bottom-18 left-3 right-3 z-20">
        <button
          type="button"
          onClick={() => setIsMobileCartOpen(true)}
          className="w-full py-3 px-4 bg-blue-600 active:bg-blue-700 text-white rounded-xl shadow-lg flex items-center justify-between transition-transform active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4" />
            <span className="text-xs font-bold">
              {totalItemsCount > 0 ? `${totalItemsCount} món trong giỏ` : 'Giỏ hàng'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-bold text-sm">
            <span>{formatCurrency(cartTotal)}</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </button>
      </div>

      {/* ============================================================== */}
      {/* MOBILE CART BOTTOM DRAWER */}
      {/* ============================================================== */}
      {isMobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileCartOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 h-[88vh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-blue-600" />
                <h2 className="font-bold text-slate-900 text-sm">
                  Đơn hàng ({totalItemsCount} món)
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileCartOpen(false)}
                className="w-7 h-7 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              {renderCartContent()}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TOOPING MODAL */}
      {/* ============================================================== */}
      {toppingModalProduct && (
        <Modal
          isOpen={Boolean(toppingModalProduct)}
          onClose={() => setToppingModalProduct(null)}
          title={`Chọn Topping cho ${toppingModalProduct.name}`}
          maxWidth="sm"
        >
          <div className="space-y-3">
            <div className="text-xs text-slate-500">
              Giá gốc: <span className="font-bold text-blue-600">{formatCurrency(toppingModalProduct.sellingPrice)}</span>
            </div>

            <div className="space-y-1.5">
              {toppingModalProduct.toppings?.map((t) => {
                const isSelected = selectedToppings.some((item) => item.name === t.name);
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedToppings((prev) => prev.filter((item) => item.name !== t.name));
                      } else {
                        setSelectedToppings((prev) => [...prev, t]);
                      }
                    }}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 font-semibold text-blue-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span>{t.name}</span>
                    <span className="font-bold text-slate-900">+{formatCurrency(t.price)}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setToppingModalProduct(null)}
                className="flex-1 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Bỏ qua
              </button>
              <button
                type="button"
                onClick={() => addToCartWithToppings(toppingModalProduct, selectedToppings)}
                className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Thêm vào giỏ
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* PAYMENT MODAL (Clean, Aligned, Robust) */}
      {/* ============================================================== */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Xác nhận thanh toán"
        maxWidth="md"
      >
        <div className="space-y-3.5">
          {/* Total display */}
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-center">
            <span className="text-xs uppercase font-bold text-blue-700 block">
              Tổng tiền cần thanh toán
            </span>
            <span className="text-2xl sm:text-3xl font-black text-blue-900 tracking-tight">
              {formatCurrency(cartTotal)}
            </span>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-700 block mb-1.5">
              Phương thức thanh toán
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'cash'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Tiền mặt
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('transfer')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'transfer'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4 text-purple-600" />
                Chuyển khoản
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('split')}
                className={`py-2 px-2 rounded-lg border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                  paymentMethod === 'split'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 ring-1 ring-blue-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Split className="w-4 h-4 text-amber-600" />
                Kết hợp
              </button>
            </div>
          </div>

          {/* 1. Cash Calculation Area */}
          {paymentMethod === 'cash' && (
            <div className="space-y-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tiền khách đưa (₫)
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={amountReceived || ''}
                  onChange={(e) => setAmountReceived(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-right font-mono font-bold text-lg bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5">
                {[cartTotal, 50000, 100000, 200000, 500000].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountReceived(val)}
                    className="px-2.5 py-1 text-xs font-medium bg-white hover:bg-blue-50 border border-slate-200 rounded text-slate-700 transition-colors"
                  >
                    {formatCurrency(val)}
                  </button>
                ))}
              </div>

              {/* Change calculation */}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-xs sm:text-sm">
                <span className="font-semibold text-slate-700">Tiền thừa trả khách:</span>
                <span className="font-black text-lg text-emerald-600">
                  {formatCurrency(changeGiven)}
                </span>
              </div>
            </div>
          )}

          {/* 2. Transfer Area */}
          {paymentMethod === 'transfer' && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-1 text-xs">
              <p className="text-slate-600">
                Số tiền chuyển khoản: <span className="font-bold text-slate-900">{formatCurrency(cartTotal)}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Vui lòng xác nhận giao dịch qua thông báo ngân hàng trước khi lưu đơn.
              </p>
            </div>
          )}

          {/* 3. Split Area */}
          {paymentMethod === 'split' && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-medium block mb-0.5">Tiền mặt (₫)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={cashAmount || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setCashAmount(val);
                      setTransferAmount(Math.max(0, cartTotal - val));
                    }}
                    className="w-full px-2 py-1.5 text-right font-mono font-semibold bg-white border border-slate-300 rounded"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-0.5">Chuyển khoản (₫)</label>
                  <input
                    type="number"
                    min="0"
                    step="5000"
                    value={transferAmount || ''}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 0;
                      setTransferAmount(val);
                      setCashAmount(Math.max(0, cartTotal - val));
                    }}
                    className="w-full px-2 py-1.5 text-right font-mono font-semibold bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>
              <div className="text-[11px] text-slate-500 text-right">
                Đã nhập: {formatCurrency(cashAmount + transferAmount)} / {formatCurrency(cartTotal)}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsPaymentModalOpen(false)}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCompleteOrder}
              className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                'Đang lưu đơn...'
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận thanh toán
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* ============================================================== */}
      {/* RECEIPT MODAL */}
      {/* ============================================================== */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        order={completedOrder}
        store={store}
      />
    </div>
  );
};
