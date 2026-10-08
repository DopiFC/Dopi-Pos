import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firebaseError';
import {
  Product,
  Category,
  Order,
  Customer,
  InventoryTransaction,
  Table,
  TableArea,
  CartItem,
  Invoice,
  InvoiceTemplate,
  RawIngredient,
  ExpenseRecord
} from '../types';

// ==========================================
// 1. PRODUCTS SERVICE (ROBUST & FOOLPROOF)
// ==========================================
export async function getProducts(storeId: string): Promise<Product[]> {
  const safeStoreId = storeId || auth.currentUser?.uid;
  if (!safeStoreId) return [];

  try {
    // 1. Try backend endpoint
    const res = await fetch(`/api/products?storeId=${encodeURIComponent(safeStoreId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        return data.products as Product[];
      }
    }
  } catch (e) {
    // Fallback to client Firestore query if network fails
  }

  try {
    const q = query(collection(db, 'products'), where('storeId', '==', safeStoreId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Product);
  } catch (error) {
    console.warn('Fallback products query failed:', error);
    return [];
  }
}

export async function saveProduct(product: Product): Promise<void> {
  if (!product || !product.name || !product.storeId) {
    throw new Error('Dữ liệu sản phẩm chưa đầy đủ (thiếu Tên hoặc Cửa hàng).');
  }

  // Sanitize to prevent undefined fields
  const cleanProduct = {
    ...product,
    name: product.name.trim(),
    sku: (product.sku || '').trim(),
    categoryId: product.categoryId || '',
    categoryName: product.categoryName || 'Khác',
    unit: (product.unit || 'Phần').trim(),
    costPrice: Number(product.costPrice) || 0,
    sellingPrice: Number(product.sellingPrice) || 0,
    stock: Number(product.stock) || 0,
    minStockAlert: Number(product.minStockAlert) || 10,
    status: product.status || 'active',
    imageUrl: product.imageUrl ? product.imageUrl.trim() : '',
    toppings: Array.isArray(product.toppings) ? product.toppings : [],
    updatedAt: new Date().toISOString()
  };

  try {
    // Call server API route first which executes with full server database access
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanProduct)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return;
    }
    throw new Error(data.message || 'Không thể lưu sản phẩm.');
  } catch (apiErr: any) {
    // If backend unavailable, try direct client Firestore write
    try {
      const ref = doc(db, 'products', cleanProduct.id);
      await setDoc(ref, cleanProduct, { merge: true });
    } catch (fsErr: any) {
      console.error('Firestore saveProduct error:', fsErr);
      if (fsErr.code === 'permission-denied') {
        throw new Error('Bạn không có quyền tạo hoặc chỉnh sửa sản phẩm này.');
      }
      throw new Error(apiErr.message || 'Lỗi khi lưu sản phẩm vào cơ sở dữ liệu.');
    }
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  try {
    const res = await fetch(`/api/products/${productId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      return;
    }
  } catch (e) {
    // Fallback to client Firestore delete
  }

  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      throw new Error('Bạn không có quyền xóa sản phẩm này.');
    }
    handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
  }
}

// ==========================================
// 2. CATEGORIES SERVICE
// ==========================================
export async function getCategories(storeId: string): Promise<Category[]> {
  try {
    const q = query(collection(db, 'categories'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as Category);
    return list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'categories');
  }
}

export async function saveCategory(category: Category): Promise<void> {
  try {
    const cleanCat = {
      ...category,
      name: category.name.trim(),
      sortOrder: Number(category.sortOrder) || 1
    };
    const ref = doc(db, 'categories', category.id);
    await setDoc(ref, cleanCat, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `categories/${category.id}`);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `categories/${categoryId}`);
  }
}

// ==========================================
// 3. ORDERS & INVOICES SERVICE (ATOMIC POS CHECKOUT)
// ==========================================
export async function getOrders(storeId: string, maxLimit = 1000): Promise<Order[]> {
  const safeStoreId = storeId || auth.currentUser?.uid;
  if (!safeStoreId) return [];

  try {
    const res = await fetch(`/api/orders?storeId=${encodeURIComponent(safeStoreId)}&limit=${maxLimit}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        return data.orders as Order[];
      }
    }
  } catch (e) {
    // Network fallback
  }

  try {
    const q = query(
      collection(db, 'orders'),
      where('storeId', '==', safeStoreId),
      limit(maxLimit)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as Order);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    console.warn('Fallback orders query failed:', error);
    return [];
  }
}

export async function createOrderWithInventory(
  order: Order,
  cartItems: CartItem[],
  currentProducts: Map<string, Product>
): Promise<{ order: Order; invoice: Invoice }> {
  try {
    // Submit via backend endpoint which recalculates totals from database,
    // deducts stock atomically, and creates the linked invoice!
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order,
        cartItems,
        storeId: order.storeId,
        userId: order.createdBy
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { order: data.order, invoice: data.invoice };
    }
    throw new Error(data.message || 'Lỗi khi xử lý đơn hàng.');
  } catch (apiErr: any) {
    // If backend unavailable, perform client Firestore fallback
    console.warn('Fallback to client order write:', apiErr);
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    const invoiceId = `INV-${order.orderNumber.replace('DP-', '')}`;

    const finalOrder = { ...order, invoiceId };
    batch.set(doc(db, 'orders', order.id), finalOrder);

    // Create Invoice
    const invoice: Invoice = {
      id: invoiceId,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: order.createdBy,
      storeId: order.storeId,
      customerId: order.customerId,
      customerName: order.customerName,
      tableId: order.tableId,
      tableName: order.tableName,
      items: order.items,
      subtotal: order.subtotal,
      discount: order.discount,
      surcharge: order.surcharge,
      total: order.total,
      paymentMethod: order.paymentMethod,
      amountReceived: order.amountReceived,
      changeGiven: order.changeGiven,
      customerPaid: order.amountReceived,
      changeAmount: order.changeGiven,
      status: 'paid',
      createdAt: nowIso
    };
    batch.set(doc(db, 'invoices', invoiceId), invoice);

    // Deduct Inventory
    for (const item of cartItems) {
      const prod = currentProducts.get(item.product.id) || item.product;
      const currentStock = prod.stock || 0;
      const qtyChange = -item.quantity;
      const newStock = Math.max(0, currentStock + qtyChange);

      const prodRef = doc(db, 'products', item.product.id);
      batch.set(prodRef, { stock: newStock, updatedAt: nowIso }, { merge: true });

      const transId = `trans_${order.id}_${item.product.id}`;
      batch.set(doc(db, 'inventoryTransactions', transId), {
        id: transId,
        storeId: order.storeId,
        productId: item.product.id,
        productName: item.product.name,
        type: 'sale',
        quantityChange: qtyChange,
        previousStock: currentStock,
        newStock: newStock,
        note: `Bán hàng - Đơn ${order.orderNumber}`,
        createdBy: order.createdBy,
        createdAt: nowIso
      });
    }

    if (order.tableId) {
      batch.set(doc(db, 'tables', order.tableId), { status: 'available', currentOrderId: null }, { merge: true });
    }

    await batch.commit();
    return { order: finalOrder, invoice };
  }
}

export async function cancelOrder(order: Order, userId: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    // 1. Mark order cancelled
    const orderRef = doc(db, 'orders', order.id);
    batch.update(orderRef, { status: 'cancelled' });

    // Mark invoice cancelled if linked
    if (order.invoiceId) {
      const invRef = doc(db, 'invoices', order.invoiceId);
      batch.update(invRef, { status: 'cancelled' });
    }

    // 2. Restore inventory
    for (const item of order.items) {
      const prodRef = doc(db, 'products', item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prodData = prodSnap.data() as Product;
        const currentStock = prodData.stock || 0;
        const newStock = currentStock + item.quantity;

        batch.update(prodRef, {
          stock: newStock,
          updatedAt: nowIso
        });

        const transId = `cancel_${order.id}_${item.productId}`;
        const transRef = doc(db, 'inventoryTransactions', transId);
        const transDoc: InventoryTransaction = {
          id: transId,
          storeId: order.storeId,
          productId: item.productId,
          productName: item.productName,
          type: 'cancel_order',
          quantityChange: item.quantity,
          previousStock: currentStock,
          newStock: newStock,
          note: `Hủy đơn ${order.orderNumber} - Hoàn kho`,
          createdBy: userId,
          createdAt: nowIso
        };
        batch.set(transRef, transDoc);
      }
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `orders/${order.id}`);
  }
}

// ==========================================
// 4. INVOICES SERVICE
// ==========================================
export async function getInvoices(storeId: string): Promise<Invoice[]> {
  try {
    const res = await fetch(`/api/invoices?storeId=${encodeURIComponent(storeId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.invoices)) {
        return data.invoices;
      }
    }
  } catch (e) {
    // Fallback
  }

  try {
    const q = query(
      collection(db, 'invoices'),
      where('storeId', '==', storeId),
      limit(500)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as Invoice);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'invoices');
  }
}

export async function getInvoiceTemplates(storeId: string): Promise<InvoiceTemplate[]> {
  try {
    const res = await fetch(`/api/invoice-templates?storeId=${encodeURIComponent(storeId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.templates)) {
        return data.templates;
      }
    }
  } catch (e) {
    // Fallback
  }

  try {
    const q = query(collection(db, 'invoiceTemplates'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as InvoiceTemplate);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'invoiceTemplates');
  }
}

export async function saveInvoiceTemplate(template: InvoiceTemplate): Promise<void> {
  try {
    const res = await fetch('/api/invoice-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return;
    }
    throw new Error(data.message || 'Lỗi khi lưu mẫu hóa đơn.');
  } catch (e: any) {
    const ref = doc(db, 'invoiceTemplates', template.id);
    await setDoc(ref, template, { merge: true });
  }
}

// ==========================================
// 5. INVENTORY SERVICE
// ==========================================
export async function getInventoryTransactions(storeId: string, max = 150): Promise<InventoryTransaction[]> {
  try {
    const q = query(
      collection(db, 'inventoryTransactions'),
      where('storeId', '==', storeId),
      limit(max)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as InventoryTransaction);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'inventoryTransactions');
  }
}

export async function adjustInventory(
  storeId: string,
  product: Product,
  type: 'import' | 'export' | 'adjustment',
  amount: number,
  note: string,
  userId: string
): Promise<void> {
  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();
    const currentStock = product.stock || 0;

    let quantityChange = 0;
    let newStock = currentStock;

    if (type === 'import') {
      quantityChange = amount;
      newStock = currentStock + amount;
    } else if (type === 'export') {
      quantityChange = -amount;
      newStock = Math.max(0, currentStock - amount);
    } else if (type === 'adjustment') {
      quantityChange = amount - currentStock;
      newStock = amount;
    }

    const prodRef = doc(db, 'products', product.id);
    batch.update(prodRef, {
      stock: newStock,
      updatedAt: nowIso
    });

    const transId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const transRef = doc(db, 'inventoryTransactions', transId);
    const transDoc: InventoryTransaction = {
      id: transId,
      storeId,
      productId: product.id,
      productName: product.name,
      type,
      quantityChange,
      previousStock: currentStock,
      newStock,
      note: note.trim() || (type === 'import' ? 'Nhập kho' : type === 'export' ? 'Xuất kho' : 'Kiểm kho điều chỉnh'),
      createdBy: userId,
      createdAt: nowIso
    };
    batch.set(transRef, transDoc);

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'inventoryTransactions');
  }
}

// ==========================================
// 6. CUSTOMERS SERVICE
// ==========================================
export async function getCustomers(storeId: string): Promise<Customer[]> {
  try {
    const q = query(collection(db, 'customers'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as Customer);
    return list.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'customers');
  }
}

export async function saveCustomer(customer: Customer): Promise<void> {
  try {
    const ref = doc(db, 'customers', customer.id);
    await setDoc(ref, customer, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `customers/${customer.id}`);
  }
}

export async function deleteCustomer(customerId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'customers', customerId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `customers/${customerId}`);
  }
}

// ==========================================
// 7. TABLES SERVICE (F&B)
// ==========================================
export async function getTables(storeId: string): Promise<Table[]> {
  try {
    const q = query(collection(db, 'tables'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Table);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'tables');
  }
}

export async function getTableAreas(storeId: string): Promise<TableArea[]> {
  try {
    const q = query(collection(db, 'tableAreas'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as TableArea);
    return list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'tableAreas');
  }
}

export async function saveTable(table: Table): Promise<void> {
  try {
    await setDoc(doc(db, 'tables', table.id), table, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tables/${table.id}`);
  }
}

export async function saveTableArea(area: TableArea): Promise<void> {
  try {
    await setDoc(doc(db, 'tableAreas', area.id), area, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tableAreas/${area.id}`);
  }
}

export async function deleteTable(tableId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'tables', tableId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tables/${tableId}`);
  }
}

export async function updateTableStatus(tableId: string, status: Table['status'], currentOrderId?: string | null): Promise<void> {
  try {
    await updateDoc(doc(db, 'tables', tableId), {
      status,
      currentOrderId: currentOrderId ?? null
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `tables/${tableId}`);
  }
}

// ==========================================
// 8. REALTIME MULTI-DEVICE SYNCHRONIZATION
// ==========================================
export function subscribeToOrders(storeId: string, onUpdate: (orders: Order[]) => void) {
  const q = query(collection(db, 'orders'), where('storeId', '==', storeId), limit(250));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Order);
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      onUpdate(list);
    },
    (err) => {
      console.warn('Orders realtime listener notice:', err);
    }
  );
}

export function subscribeToTables(storeId: string, onUpdate: (tables: Table[]) => void) {
  const q = query(collection(db, 'tables'), where('storeId', '==', storeId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Table);
      onUpdate(list);
    },
    (err) => {
      console.warn('Tables realtime listener notice:', err);
    }
  );
}

export function subscribeToProducts(storeId: string, onUpdate: (products: Product[]) => void) {
  const q = query(collection(db, 'products'), where('storeId', '==', storeId));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => d.data() as Product);
      onUpdate(list);
    },
    (err) => {
      console.warn('Products realtime listener notice:', err);
    }
  );
}

export async function saveTableOrder(
  tableId: string,
  storeId: string,
  items: CartItem[],
  subtotal: number
): Promise<void> {
  const orderItems = items.map((i) => ({
    productId: i.product.id,
    productName: i.product.name,
    sku: i.product.sku || '',
    unit: i.product.unit || 'Phần',
    unitPrice: i.unitPrice,
    quantity: i.quantity,
    selectedToppings: i.selectedToppings,
    note: i.note,
    subtotal: i.subtotal
  }));

  try {
    const res = await fetch('/api/tables/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId, storeId, items: orderItems, subtotal })
    });
    if (res.ok) return;
  } catch (e) {
    // fallback
  }

  try {
    await setDoc(
      doc(db, 'tables', tableId),
      {
        status: 'occupied',
        currentCartItems: orderItems,
        currentSubtotal: subtotal,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tables/${tableId}`);
  }
}

export async function clearTableOrder(tableId: string): Promise<void> {
  try {
    const res = await fetch('/api/tables/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableId })
    });
    if (res.ok) return;
  } catch (e) {
    // fallback
  }

  try {
    await setDoc(
      doc(db, 'tables', tableId),
      {
        status: 'available',
        currentOrderId: null,
        currentCartItems: [],
        currentSubtotal: 0,
        updatedAt: new Date().toISOString()
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tables/${tableId}`);
  }
}

// ==========================================
// 8. RAW INGREDIENTS & RECIPE QUANTIFICATION
// ==========================================
export const DEFAULT_RAW_INGREDIENTS = [
  {
    name: 'Cà phê Robusta mộc xay',
    sku: 'NVL-CF-ROB',
    importUnit: 'kg',
    importPrice: 180000,
    usageUnit: 'g',
    conversionRate: 1000,
    costPerUsageUnit: 180,
    stock: 5000,
    minStockAlert: 1000,
    notes: '1kg pha được khoảng 45-50 ly cà phê đậm vị'
  },
  {
    name: 'Sữa đặc Ngôi Sao Phương Nam',
    sku: 'NVL-SUADAC',
    importUnit: 'hộp (1.284kg)',
    importPrice: 68000,
    usageUnit: 'g',
    conversionRate: 1284,
    costPerUsageUnit: 53,
    stock: 2568,
    minStockAlert: 500,
    notes: 'Mỗi ly dùng 30g sữa đặc'
  },
  {
    name: 'Sữa tươi thanh trùng Dalat Milk',
    sku: 'NVL-SUATUOI',
    importUnit: 'lít',
    importPrice: 34000,
    usageUnit: 'ml',
    conversionRate: 1000,
    costPerUsageUnit: 34,
    stock: 6000,
    minStockAlert: 1500,
    notes: 'Pha latte, bạc xỉu, trà sữa tươi'
  },
  {
    name: 'Trà lài ướp hoa tươi',
    sku: 'NVL-TRALAI',
    importUnit: 'kg',
    importPrice: 160000,
    usageUnit: 'g',
    conversionRate: 1000,
    costPerUsageUnit: 160,
    stock: 3000,
    minStockAlert: 500,
    notes: '10g ủ được 1 lít nước cốt trà lài'
  },
  {
    name: 'Đường cát trắng Biên Hòa',
    sku: 'NVL-DUONG',
    importUnit: 'kg',
    importPrice: 26000,
    usageUnit: 'g',
    conversionRate: 1000,
    costPerUsageUnit: 26,
    stock: 10000,
    minStockAlert: 2000,
    notes: 'Nấu nước đường 1kg : 700ml nước'
  },
  {
    name: 'Bộ Ly giấy 500ml + Nắp + Ống hút',
    sku: 'NVL-LY-NAP',
    importUnit: 'cây (50 bộ)',
    importPrice: 65000,
    usageUnit: 'bộ',
    conversionRate: 50,
    costPerUsageUnit: 1300,
    stock: 300,
    minStockAlert: 50,
    notes: 'Định lượng bao bì cho 1 món đồ uống mang đi'
  }
];

export async function getIngredients(storeId: string): Promise<RawIngredient[]> {
  const safeStoreId = storeId || auth.currentUser?.uid;
  if (!safeStoreId) return [];

  try {
    const res = await fetch(`/api/ingredients?storeId=${encodeURIComponent(safeStoreId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.ingredients) && data.ingredients.length > 0) {
        return data.ingredients as RawIngredient[];
      }
    }
  } catch (e) {
    // Network fallback
  }

  try {
    const q = query(collection(db, 'ingredients'), where('storeId', '==', safeStoreId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as RawIngredient);
    if (list.length === 0) {
      // Seed initial realistic ingredients for store owner
      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);
      const seeded: RawIngredient[] = [];
      for (const item of DEFAULT_RAW_INGREDIENTS) {
        const id = `ing_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const record: RawIngredient = {
          id,
          storeId: safeStoreId,
          ...item,
          createdAt: nowIso,
          updatedAt: nowIso
        };
        batch.set(doc(db, 'ingredients', id), record);
        seeded.push(record);
      }
      await batch.commit();
      return seeded;
    }
    return list;
  } catch (error) {
    console.warn('Fallback ingredients query failed:', error);
    return [];
  }
}

export async function saveIngredient(ingredient: RawIngredient): Promise<void> {
  const conversion = Math.max(1, Number(ingredient.conversionRate) || 1);
  const importP = Math.max(0, Number(ingredient.importPrice) || 0);
  const unitCost = Math.round(importP / conversion);

  const clean: RawIngredient = {
    ...ingredient,
    name: ingredient.name.trim(),
    sku: ingredient.sku.trim(),
    importUnit: ingredient.importUnit.trim() || 'kg',
    usageUnit: ingredient.usageUnit.trim() || 'g',
    importPrice: importP,
    conversionRate: conversion,
    costPerUsageUnit: unitCost,
    stock: Number(ingredient.stock) || 0,
    minStockAlert: Number(ingredient.minStockAlert) || 0,
    updatedAt: new Date().toISOString()
  };

  try {
    const res = await fetch('/api/ingredients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clean)
    });
    if (res.ok) return;
  } catch (e) {
    // Fallback
  }

  try {
    const ref = doc(db, 'ingredients', ingredient.id);
    await setDoc(ref, clean, { merge: true });
  } catch (error) {
    console.error('Error saving ingredient directly:', error);
    throw new Error('Không thể lưu nguyên vật liệu.');
  }
}

export async function deleteIngredient(ingredientId: string): Promise<void> {
  try {
    const res = await fetch(`/api/ingredients/${ingredientId}`, { method: 'DELETE' });
    if (res.ok) return;
  } catch (e) {
    // Fallback
  }

  try {
    await deleteDoc(doc(db, 'ingredients', ingredientId));
  } catch (error) {
    console.error('Error deleting ingredient directly:', error);
    throw new Error('Không thể xóa nguyên vật liệu.');
  }
}

// ==========================================
// 9. OPERATING EXPENSES (BÁO CÁO LÃI / LỖ P&L)
// ==========================================
export async function getExpenses(storeId: string): Promise<ExpenseRecord[]> {
  const safeStoreId = storeId || auth.currentUser?.uid;
  if (!safeStoreId) return [];

  try {
    const res = await fetch(`/api/expenses?storeId=${encodeURIComponent(safeStoreId)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.expenses)) {
        return data.expenses as ExpenseRecord[];
      }
    }
  } catch (e) {
    // Network fallback
  }

  try {
    const q = query(collection(db, 'expenses'), where('storeId', '==', safeStoreId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data() as ExpenseRecord);
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.warn('Fallback expenses query failed:', error);
    return [];
  }
}

export async function saveExpense(expense: ExpenseRecord): Promise<void> {
  try {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    if (res.ok) return;
  } catch (e) {
    // Fallback
  }

  try {
    const ref = doc(db, 'expenses', expense.id);
    await setDoc(ref, expense, { merge: true });
  } catch (error) {
    console.error('Error saving expense directly:', error);
    throw new Error('Không thể lưu phiếu chi.');
  }
}

export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    const res = await fetch(`/api/expenses/${expenseId}`, { method: 'DELETE' });
    if (res.ok) return;
  } catch (e) {
    // Fallback
  }

  try {
    await deleteDoc(doc(db, 'expenses', expenseId));
  } catch (error) {
    console.error('Error deleting expense directly:', error);
    throw new Error('Không thể xóa phiếu chi.');
  }
}
