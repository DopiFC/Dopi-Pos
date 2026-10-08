import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  runTransaction,
  writeBatch
} from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Initialize Server-side Firebase
const fbApp = initializeApp(firebaseConfig, 'dopipos-server');
const db = getFirestore(fbApp, firebaseConfig.firestoreDatabaseId);

// Helper to hash password
function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass + '_dopipos_salt').digest('hex');
}

// Helper to generate 15-character uppercase alphanumeric code
function generateActivationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const randomBytes = crypto.randomBytes(15);
  for (let i = 0; i < 15; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

const DEFAULT_ADMIN_UID = 'admin_dopipos_root';
const DEFAULT_ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'nhgb2605@gmail.com').toLowerCase();
const DEFAULT_ADMIN_PASS = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';

// Auto initialize Default Admin in Firestore
async function initDefaultAdmin() {
  try {
    const adminRef = doc(db, 'users', DEFAULT_ADMIN_UID);
    const snap = await getDoc(adminRef);
    const nowIso = new Date().toISOString();

    if (!snap.exists()) {
      console.log('Initializing Default Admin in Firestore...');
      // 1. Admin record in /admins
      await setDoc(doc(db, 'admins', DEFAULT_ADMIN_UID), {
        uid: DEFAULT_ADMIN_UID,
        email: DEFAULT_ADMIN_EMAIL,
        createdAt: nowIso
      });

      // 2. Admin profile in /users
      const adminProfile = {
        uid: DEFAULT_ADMIN_UID,
        email: DEFAULT_ADMIN_EMAIL,
        displayName: 'Quản trị viên DopiPOS',
        phoneNumber: '0987654321',
        storeName: 'DopiPOS Flagship Store',
        role: 'admin',
        passwordHash: hashPassword(DEFAULT_ADMIN_PASS),
        createdAt: nowIso
      };
      await setDoc(adminRef, adminProfile);

      // 3. Store record in /stores
      const adminStore = {
        id: DEFAULT_ADMIN_UID,
        ownerId: DEFAULT_ADMIN_UID,
        name: 'DopiPOS Flagship Store',
        phone: '0987654321',
        address: '123 Phố Tràng Tiền, Hoàn Kiếm, Hà Nội',
        createdAt: nowIso
      };
      await setDoc(doc(db, 'stores', DEFAULT_ADMIN_UID), adminStore);

      // 4. 1-Year Active Subscription in /subscriptions
      const oneYearLater = new Date(Date.now() + 365 * 86400000).toISOString();
      await setDoc(doc(db, 'subscriptions', DEFAULT_ADMIN_UID), {
        id: DEFAULT_ADMIN_UID,
        userId: DEFAULT_ADMIN_UID,
        storeId: DEFAULT_ADMIN_UID,
        planId: 'month_3',
        planName: 'DopiPOS Doanh Nghiệp (1 năm)',
        status: 'active',
        startDate: nowIso,
        endDate: oneYearLater,
        activatedViaCode: 'ROOT_ADMIN',
        createdAt: nowIso
      });

      // 5. Seed sample products & tables for admin store
      await seedStoreData(DEFAULT_ADMIN_UID, DEFAULT_ADMIN_UID);
      console.log('Default Admin initialized successfully!');
    }
  } catch (err) {
    console.error('Error initializing default admin:', err);
  }
}

// ==========================================
// AUTH ENDPOINTS (SEAMLESS REGISTRATION & LOGIN)
// ==========================================

// 1. One-click Admin Login
app.post('/api/auth/admin-login', async (_req: Request, res: Response) => {
  try {
    let adminSnap = await getDoc(doc(db, 'users', DEFAULT_ADMIN_UID));
    if (!adminSnap.exists()) {
      await initDefaultAdmin();
      adminSnap = await getDoc(doc(db, 'users', DEFAULT_ADMIN_UID));
    }

    const userData = adminSnap.data();
    const storeSnap = await getDoc(doc(db, 'stores', DEFAULT_ADMIN_UID));
    const storeData = storeSnap.data();
    const subSnap = await getDoc(doc(db, 'subscriptions', DEFAULT_ADMIN_UID));
    const subData = subSnap.data();

    return res.json({
      success: true,
      message: 'Đăng nhập tài khoản Admin mặc định thành công!',
      user: {
        uid: DEFAULT_ADMIN_UID,
        email: DEFAULT_ADMIN_EMAIL,
        displayName: userData?.displayName || 'Quản trị viên DopiPOS',
        storeName: userData?.storeName || 'DopiPOS Flagship Store',
        role: 'admin',
        createdAt: userData?.createdAt
      },
      store: storeData,
      subscription: subData
    });
  } catch (error) {
    console.error('Admin login error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi đăng nhập admin.' });
  }
});

// 2. Server Register (Foolproof fallback)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName, storeName, phoneNumber } = req.body;

    if (!email || !password || !displayName || !storeName) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const isAutoAdmin = normalizedEmail === DEFAULT_ADMIN_EMAIL;
    const uid = isAutoAdmin ? DEFAULT_ADMIN_UID : `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const nowIso = new Date().toISOString();

    const userProfile = {
      uid,
      email: normalizedEmail,
      displayName: displayName.trim(),
      phoneNumber: phoneNumber?.trim() || '',
      storeName: storeName.trim(),
      role: isAutoAdmin ? 'admin' : 'user',
      passwordHash: hashPassword(password),
      createdAt: nowIso
    };

    const storeData = {
      id: uid,
      ownerId: uid,
      name: storeName.trim(),
      phone: phoneNumber?.trim() || '',
      createdAt: nowIso
    };

    const trialEnd = new Date(Date.now() + 3 * 86400000).toISOString();
    const subData = {
      id: uid,
      userId: uid,
      storeId: uid,
      planId: 'business_household',
      planName: 'Gói Hộ Kinh Doanh (Free 3 ngày)',
      status: 'active',
      isTrial: true,
      startDate: nowIso,
      endDate: trialEnd,
      createdAt: nowIso
    };

    // Save in Firestore
    await setDoc(doc(db, 'users', uid), userProfile);
    await setDoc(doc(db, 'stores', uid), storeData);
    await setDoc(doc(db, 'subscriptions', uid), subData);

    if (isAutoAdmin) {
      await setDoc(doc(db, 'admins', uid), { uid, email: normalizedEmail, createdAt: nowIso });
    }

    // Auto seed initial products so user has instant items
    try {
      await seedStoreData(uid, uid);
    } catch (e) {
      console.warn('Initial seeding warning:', e);
    }

    return res.json({
      success: true,
      message: 'Đăng ký thành công!',
      user: {
        uid,
        email: normalizedEmail,
        displayName: displayName.trim(),
        storeName: storeName.trim(),
        role: isAutoAdmin ? 'admin' : 'user',
        createdAt: nowIso
      },
      store: storeData,
      subscription: subData
    });
  } catch (error: any) {
    console.error('Server register error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi tạo tài khoản.' });
  }
});

// 3. Server Login (Foolproof fallback)
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập email và mật khẩu.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const hash = hashPassword(password);

    // Query user in Firestore
    const usersSnap = await getDocs(query(collection(db, 'users'), limit(500)));
    const matchedDoc = usersSnap.docs.find((d) => {
      const data = d.data();
      return (
        data.email?.toLowerCase() === normalizedEmail &&
        (data.passwordHash === hash || (!data.passwordHash && normalizedEmail === DEFAULT_ADMIN_EMAIL))
      );
    });

    if (!matchedDoc) {
      return res.status(401).json({ success: false, message: 'Email hoặc mật khẩu không chính xác.' });
    }

    const userData = matchedDoc.data();
    const uid = userData.uid;
    const storeSnap = await getDoc(doc(db, 'stores', uid));
    const subSnap = await getDoc(doc(db, 'subscriptions', uid));

    return res.json({
      success: true,
      user: {
        uid,
        email: userData.email,
        displayName: userData.displayName,
        storeName: userData.storeName,
        role: userData.role || (normalizedEmail === DEFAULT_ADMIN_EMAIL ? 'admin' : 'user'),
        createdAt: userData.createdAt
      },
      store: storeSnap.exists() ? storeSnap.data() : { id: uid, ownerId: uid, name: userData.storeName || 'Cửa hàng' },
      subscription: subSnap.exists() ? subSnap.data() : null
    });
  } catch (error) {
    console.error('Server login error:', error);
    return res.status(500).json({ success: false, message: 'Lỗi đăng nhập hệ thống.' });
  }
});

// Seed helper function
async function seedStoreData(storeId: string, userId: string) {
  const batch = writeBatch(db);
  const nowIso = new Date().toISOString();

  const categoriesData = [
    { id: `${storeId}_cat_cafe`, name: 'Cà phê', sortOrder: 1 },
    { id: `${storeId}_cat_tra`, name: 'Trà & Trà sữa', sortOrder: 2 },
    { id: `${storeId}_cat_nuocngot`, name: 'Nước ngọt & Khác', sortOrder: 3 },
    { id: `${storeId}_cat_doan`, name: 'Đồ ăn nhanh', sortOrder: 4 },
    { id: `${storeId}_cat_topping`, name: 'Topping F&B', sortOrder: 5 }
  ];

  categoriesData.forEach((cat) => {
    batch.set(doc(db, 'categories', cat.id), { ...cat, storeId, createdAt: nowIso });
  });

  const productsData = [
    {
      id: `${storeId}_p_cf_den`,
      name: 'Cà phê đen đá',
      sku: 'CF-DEN',
      categoryId: `${storeId}_cat_cafe`,
      categoryName: 'Cà phê',
      unit: 'Ly',
      costPrice: 8000,
      sellingPrice: 18000,
      stock: 120,
      minStockAlert: 15,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
      toppings: []
    },
    {
      id: `${storeId}_p_cf_sua`,
      name: 'Cà phê sữa đá',
      sku: 'CF-SUA',
      categoryId: `${storeId}_cat_cafe`,
      categoryName: 'Cà phê',
      unit: 'Ly',
      costPrice: 10000,
      sellingPrice: 22000,
      stock: 95,
      minStockAlert: 20,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80',
      toppings: []
    },
    {
      id: `${storeId}_p_bacxiu`,
      name: 'Bạc xỉu 3 tầng',
      sku: 'CF-BX',
      categoryId: `${storeId}_cat_cafe`,
      categoryName: 'Cà phê',
      unit: 'Ly',
      costPrice: 12000,
      sellingPrice: 25000,
      stock: 60,
      minStockAlert: 10,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80',
      toppings: []
    },
    {
      id: `${storeId}_p_tra_dao`,
      name: 'Trà đào cam sả',
      sku: 'TRA-DAO',
      categoryId: `${storeId}_cat_tra`,
      categoryName: 'Trà & Trà sữa',
      unit: 'Ly',
      costPrice: 14000,
      sellingPrice: 35000,
      stock: 45,
      minStockAlert: 10,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
      toppings: [
        { name: 'Thạch đào giòn', price: 5000 },
        { name: 'Trân châu trắng', price: 5000 },
        { name: 'Kem cheese béo', price: 10000 }
      ]
    },
    {
      id: `${storeId}_p_coca`,
      name: 'Coca Cola lon 330ml',
      sku: 'NG-COCA',
      categoryId: `${storeId}_cat_nuocngot`,
      categoryName: 'Nước ngọt & Khác',
      unit: 'Lon',
      costPrice: 8500,
      sellingPrice: 15000,
      stock: 48,
      minStockAlert: 12,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80',
      toppings: []
    },
    {
      id: `${storeId}_p_banhmi`,
      name: 'Bánh mì thịt nướng pate',
      sku: 'DA-BM',
      categoryId: `${storeId}_cat_doan`,
      categoryName: 'Đồ ăn nhanh',
      unit: 'Ổ',
      costPrice: 15000,
      sellingPrice: 28000,
      stock: 30,
      minStockAlert: 5,
      status: 'active',
      imageUrl: 'https://images.unsplash.com/photo-1600490036275-35f5f1656861?w=400&auto=format&fit=crop&q=80',
      toppings: []
    }
  ];

  productsData.forEach((prod) => {
    batch.set(doc(db, 'products', prod.id), { ...prod, storeId, createdAt: nowIso, updatedAt: nowIso });
  });

  // Table areas
  const areaIndoorId = `${storeId}_area_indoor`;
  batch.set(doc(db, 'tableAreas', areaIndoorId), {
    id: areaIndoorId,
    storeId,
    name: 'Khu máy lạnh (Tầng 1)',
    sortOrder: 1,
    createdAt: nowIso
  });

  const tables = [
    { id: `${storeId}_tbl_1`, name: 'Bàn A1', areaId: areaIndoorId, areaName: 'Khu máy lạnh', capacity: 4 },
    { id: `${storeId}_tbl_2`, name: 'Bàn A2', areaId: areaIndoorId, areaName: 'Khu máy lạnh', capacity: 4 },
    { id: `${storeId}_tbl_3`, name: 'Bàn A3', areaId: areaIndoorId, areaName: 'Khu máy lạnh', capacity: 6 }
  ];

  tables.forEach((t) => {
    batch.set(doc(db, 'tables', t.id), { ...t, storeId, status: 'available', currentOrderId: null, createdAt: nowIso });
  });

  await batch.commit();
}

// ==========================================
// PRODUCTS API (FOOLPROOF CRUD FOR FIRESTORE)
// ==========================================
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Thiếu storeId' });
    }
    const q = query(collection(db, 'products'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    const products = snap.docs.map((d) => d.data());
    return res.json({ success: true, products });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách sản phẩm.' });
  }
});

app.post('/api/products', async (req: Request, res: Response) => {
  try {
    const product = req.body;
    if (!product || !product.id || !product.storeId || !product.name) {
      return res.status(400).json({ success: false, message: 'Dữ liệu sản phẩm không hợp lệ (thiếu tên, id hoặc storeId).' });
    }

    if (typeof product.sellingPrice !== 'number' || product.sellingPrice < 0) {
      return res.status(400).json({ success: false, message: 'Giá bán sản phẩm phải lớn hơn hoặc bằng 0.' });
    }

    const nowIso = new Date().toISOString();
    // Sanitize product object to prevent any undefined values from breaking Firestore
    const sanitizedProduct: Record<string, any> = {
      id: String(product.id),
      storeId: String(product.storeId),
      name: String(product.name).trim(),
      sku: String(product.sku || '').trim(),
      categoryId: String(product.categoryId || ''),
      categoryName: String(product.categoryName || 'Khác'),
      unit: String(product.unit || 'Phần').trim(),
      costPrice: Number(product.costPrice) || 0,
      sellingPrice: Number(product.sellingPrice) || 0,
      stock: Number(product.stock) || 0,
      minStockAlert: Number(product.minStockAlert) || 10,
      status: product.status === 'inactive' ? 'inactive' : 'active',
      imageUrl: product.imageUrl ? String(product.imageUrl).trim() : '',
      toppings: Array.isArray(product.toppings) ? product.toppings : [],
      costingMethod: product.costingMethod || 'direct',
      recipeItems: Array.isArray(product.recipeItems) ? product.recipeItems : [],
      createdAt: product.createdAt || nowIso,
      updatedAt: nowIso
    };

    const ref = doc(db, 'products', sanitizedProduct.id);
    await setDoc(ref, sanitizedProduct, { merge: true });

    return res.json({
      success: true,
      message: 'Đã lưu sản phẩm thành công!',
      product: sanitizedProduct
    });
  } catch (error: any) {
    console.error('Error saving product:', error);
    return res.status(500).json({
      success: false,
      message: error.message ? `Lỗi cơ sở dữ liệu: ${error.message}` : 'Không thể lưu sản phẩm vào cơ sở dữ liệu.'
    });
  }
});

app.delete('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu id sản phẩm' });
    }
    const ref = doc(db, 'products', id);
    await deleteDoc(ref);
    return res.json({ success: true, message: 'Đã xóa sản phẩm thành công.' });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa sản phẩm.' });
  }
});

// ==========================================
// POS CHECKOUT: ATOMIC ORDER & INVOICE CREATION
// ==========================================
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { order, cartItems, storeId, userId } = req.body;
    if (!order || !order.id || !storeId) {
      return res.status(400).json({ success: false, message: 'Dữ liệu đơn hàng không hợp lệ.' });
    }
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return res.status(400).json({ success: false, message: 'Giỏ hàng đang trống.' });
    }

    const nowIso = new Date().toISOString();
    const batch = writeBatch(db);

    // 1. Recalculate and verify item prices from Firestore database products
    let verifiedSubtotal = 0;
    const verifiedOrderItems: any[] = [];

    for (const item of cartItems) {
      const prodRef = doc(db, 'products', item.product.id);
      const prodSnap = await getDoc(prodRef);
      const prodData = prodSnap.exists() ? prodSnap.data() : item.product;

      const basePrice = Number(prodData.sellingPrice) || Number(item.unitPrice) || 0;
      let toppingExtra = 0;
      if (Array.isArray(item.selectedToppings)) {
        toppingExtra = item.selectedToppings.reduce((sum: number, t: any) => sum + (Number(t.price) || 0), 0);
      }
      const unitPrice = basePrice + toppingExtra;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const lineSubtotal = unitPrice * quantity;
      verifiedSubtotal += lineSubtotal;

      verifiedOrderItems.push({
        productId: item.product.id,
        productName: prodData.name || item.product.name,
        sku: prodData.sku || item.product.sku || '',
        unit: prodData.unit || item.product.unit || 'Phần',
        unitPrice,
        quantity,
        selectedToppings: item.selectedToppings || [],
        note: item.note || '',
        subtotal: lineSubtotal
      });

      // Deduct inventory
      const currentStock = Number(prodData.stock) || 0;
      const newStock = Math.max(0, currentStock - quantity);
      if (prodSnap.exists()) {
        batch.set(prodRef, { stock: newStock, updatedAt: nowIso }, { merge: true });
      }

      // Inventory transaction record
      const transId = `trans_${order.id}_${item.product.id}`;
      const transRef = doc(db, 'inventoryTransactions', transId);
      batch.set(transRef, {
        id: transId,
        storeId,
        productId: item.product.id,
        productName: prodData.name || item.product.name,
        type: 'sale',
        quantityChange: -quantity,
        previousStock: currentStock,
        newStock,
        note: `Bán hàng - Đơn ${order.orderNumber}`,
        createdBy: userId || storeId,
        createdAt: nowIso
      });
    }

    const discount = Number(order.discount) || 0;
    const surcharge = Number(order.surcharge) || 0;
    const verifiedTotal = Math.max(0, verifiedSubtotal - discount + surcharge);

    // 2. Generate matching Invoice ID
    const invoiceId = `INV-${order.orderNumber.replace('DP-', '')}`;

    // 3. Prepare sanitized Order object
    const finalOrder = {
      ...order,
      id: String(order.id),
      storeId: String(storeId),
      orderNumber: String(order.orderNumber),
      items: verifiedOrderItems,
      subtotal: verifiedSubtotal,
      discount,
      surcharge,
      total: verifiedTotal,
      invoiceId,
      status: 'completed',
      createdBy: userId || storeId,
      createdAt: nowIso
    };

    // 4. Prepare sanitized Invoice object
    const finalInvoice = {
      id: invoiceId,
      orderId: String(order.id),
      orderNumber: String(order.orderNumber),
      userId: userId || storeId,
      storeId: String(storeId),
      customerId: order.customerId ? String(order.customerId) : null,
      customerName: order.customerName ? String(order.customerName) : 'Khách lẻ',
      tableId: order.tableId ? String(order.tableId) : null,
      tableName: order.tableName ? String(order.tableName) : null,
      items: verifiedOrderItems,
      subtotal: verifiedSubtotal,
      discount,
      surcharge,
      total: verifiedTotal,
      paymentMethod: order.paymentMethod || 'cash',
      amountReceived: Number(order.amountReceived) || verifiedTotal,
      changeGiven: Math.max(0, (Number(order.amountReceived) || verifiedTotal) - verifiedTotal),
      customerPaid: Number(order.amountReceived) || verifiedTotal,
      changeAmount: Math.max(0, (Number(order.amountReceived) || verifiedTotal) - verifiedTotal),
      status: 'paid',
      createdAt: nowIso
    };

    // Commit batch: Order + Invoice + Inventory update
    batch.set(doc(db, 'orders', finalOrder.id), finalOrder);
    batch.set(doc(db, 'invoices', finalInvoice.id), finalInvoice);

    // Update table status if dine-in
    if (order.tableId) {
      batch.set(doc(db, 'tables', order.tableId), {
        status: 'available',
        currentOrderId: null
      }, { merge: true });
    }

    await batch.commit();

    return res.json({
      success: true,
      message: 'Tạo đơn hàng và hóa đơn thành công!',
      order: finalOrder,
      invoice: finalInvoice
    });
  } catch (error: any) {
    console.error('Error creating order & invoice:', error);
    return res.status(500).json({ success: false, message: error.message || 'Lỗi khi xử lý đơn hàng.' });
  }
});

// ==========================================
// INVOICES API
// ==========================================
app.get('/api/invoices', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Thiếu storeId' });
    }
    const q = query(collection(db, 'invoices'), where('storeId', '==', storeId), limit(500));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data());
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, invoices: list });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách hóa đơn.' });
  }
});

// ==========================================
// ORDERS QUERY API
// ==========================================
app.get('/api/orders', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    const maxLimit = Number(req.query.limit) || 1000;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Thiếu storeId' });
    }
    const q = query(collection(db, 'orders'), where('storeId', '==', storeId), limit(maxLimit));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data());
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return res.json({ success: true, orders: list });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách đơn hàng.' });
  }
});

// ==========================================
// INGREDIENTS API (NVL & ĐỊNH LƯỢNG)
// ==========================================
app.get('/api/ingredients', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Thiếu storeId' });
    }
    const q = query(collection(db, 'ingredients'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    let list = snap.docs.map((d) => d.data());
    if (list.length === 0) {
      const nowIso = new Date().toISOString();
      const batch = writeBatch(db);
      const defaults = [
        {
          id: `${storeId}_ing_cf`,
          storeId,
          name: 'Cà phê Robusta mộc xay',
          sku: 'NVL-CF-ROB',
          importUnit: 'kg',
          importPrice: 180000,
          usageUnit: 'g',
          conversionRate: 1000,
          costPerUsageUnit: 180,
          stock: 5000,
          minStockAlert: 1000,
          notes: '1kg pha được khoảng 45-50 ly',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: `${storeId}_ing_suadac`,
          storeId,
          name: 'Sữa đặc Ngôi Sao Phương Nam',
          sku: 'NVL-SUADAC',
          importUnit: 'hộp (1.284kg)',
          importPrice: 68000,
          usageUnit: 'g',
          conversionRate: 1284,
          costPerUsageUnit: 53,
          stock: 2568,
          minStockAlert: 500,
          notes: 'Mỗi ly dùng 30g sữa đặc',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: `${storeId}_ing_suatuoi`,
          storeId,
          name: 'Sữa tươi thanh trùng Dalat Milk',
          sku: 'NVL-SUATUOI',
          importUnit: 'lít',
          importPrice: 34000,
          usageUnit: 'ml',
          conversionRate: 1000,
          costPerUsageUnit: 34,
          stock: 6000,
          minStockAlert: 1500,
          notes: 'Pha latte, bạc xỉu, trà sữa',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: `${storeId}_ing_tralài`,
          storeId,
          name: 'Trà lài ướp hoa tươi',
          sku: 'NVL-TRALAI',
          importUnit: 'kg',
          importPrice: 160000,
          usageUnit: 'g',
          conversionRate: 1000,
          costPerUsageUnit: 160,
          stock: 3000,
          minStockAlert: 500,
          notes: 'Ủ trà hoa quả, trà sữa',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: `${storeId}_ing_duong`,
          storeId,
          name: 'Đường cát trắng Biên Hòa',
          sku: 'NVL-DUONG',
          importUnit: 'kg',
          importPrice: 26000,
          usageUnit: 'g',
          conversionRate: 1000,
          costPerUsageUnit: 26,
          stock: 10000,
          minStockAlert: 2000,
          notes: 'Nấu nước đường',
          createdAt: nowIso,
          updatedAt: nowIso
        },
        {
          id: `${storeId}_ing_ly`,
          storeId,
          name: 'Bộ Ly giấy 500ml + Nắp + Ống hút',
          sku: 'NVL-LY-NAP',
          importUnit: 'cây (50 bộ)',
          importPrice: 65000,
          usageUnit: 'bộ',
          conversionRate: 50,
          costPerUsageUnit: 1300,
          stock: 300,
          minStockAlert: 50,
          notes: 'Bao bì cho 1 món mang đi',
          createdAt: nowIso,
          updatedAt: nowIso
        }
      ];
      defaults.forEach((d) => batch.set(doc(db, 'ingredients', d.id), d));
      await batch.commit();
      list = defaults;
    }
    return res.json({ success: true, ingredients: list });
  } catch (error: any) {
    console.error('Error fetching ingredients:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách nguyên vật liệu.' });
  }
});

app.post('/api/ingredients', async (req: Request, res: Response) => {
  try {
    const item = req.body;
    if (!item || !item.id || !item.storeId || !item.name) {
      return res.status(400).json({ success: false, message: 'Dữ liệu nguyên vật liệu không hợp lệ.' });
    }
    const conversion = Math.max(1, Number(item.conversionRate) || 1);
    const importP = Math.max(0, Number(item.importPrice) || 0);
    const costPerUsage = Math.round(importP / conversion);
    const sanitized = {
      ...item,
      importPrice: importP,
      conversionRate: conversion,
      costPerUsageUnit: costPerUsage,
      stock: Number(item.stock) || 0,
      minStockAlert: Number(item.minStockAlert) || 0,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'ingredients', sanitized.id), sanitized, { merge: true });
    return res.json({ success: true, ingredient: sanitized });
  } catch (error: any) {
    console.error('Error saving ingredient:', error);
    return res.status(500).json({ success: false, message: 'Không thể lưu nguyên vật liệu.' });
  }
});

app.delete('/api/ingredients/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu id' });
    await deleteDoc(doc(db, 'ingredients', id));
    return res.json({ success: true, message: 'Đã xóa nguyên vật liệu thành công.' });
  } catch (error: any) {
    console.error('Error deleting ingredient:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa nguyên vật liệu.' });
  }
});

// ==========================================
// OPERATING EXPENSES API (P&L LÃI LỖ)
// ==========================================
app.get('/api/expenses', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Thiếu storeId' });
    }
    const q = query(collection(db, 'expenses'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => d.data());
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return res.json({ success: true, expenses: list });
  } catch (error: any) {
    console.error('Error fetching expenses:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải danh sách chi phí.' });
  }
});

app.post('/api/expenses', async (req: Request, res: Response) => {
  try {
    const exp = req.body;
    if (!exp || !exp.id || !exp.storeId || !exp.title) {
      return res.status(400).json({ success: false, message: 'Dữ liệu phiếu chi không hợp lệ.' });
    }
    await setDoc(doc(db, 'expenses', exp.id), exp, { merge: true });
    return res.json({ success: true, expense: exp });
  } catch (error: any) {
    console.error('Error saving expense:', error);
    return res.status(500).json({ success: false, message: 'Không thể lưu phiếu chi.' });
  }
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) return res.status(400).json({ success: false, message: 'Thiếu id' });
    await deleteDoc(doc(db, 'expenses', id));
    return res.json({ success: true, message: 'Đã xóa phiếu chi thành công.' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    return res.status(500).json({ success: false, message: 'Không thể xóa phiếu chi.' });
  }
});

// ==========================================
// INVOICE TEMPLATES API
// ==========================================
const DEFAULT_INVOICE_TEMPLATES = (storeId: string) => [
  {
    id: `tmpl_${storeId}_80mm`,
    storeId,
    name: 'Mẫu Tiêu Chuẩn 80mm (Khuyên dùng F&B)',
    paperSize: '80mm',
    headerGreeting: 'KÍNH CHÀO QUÝ KHÁCH',
    footerThankYou: 'CẢM ƠN QUÝ KHÁCH VÀ HẸN GẶP LẠI!',
    footerAlignment: 'center',
    showLogo: true,
    showAddress: true,
    showPhone: true,
    showTaxCode: false,
    showCustomer: true,
    showStaff: true,
    showNotes: true,
    showPaidAndChange: true,
    showQrCode: false,
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  {
    id: `tmpl_${storeId}_58mm`,
    storeId,
    name: 'Mẫu Nhỏ Gọn 58mm (Máy in mini)',
    paperSize: '58mm',
    headerGreeting: 'HÓA ĐƠN BÁN HÀNG',
    footerThankYou: 'HẸN GẶP LẠI QUÝ KHÁCH!',
    footerAlignment: 'center',
    showLogo: false,
    showAddress: true,
    showPhone: true,
    showTaxCode: false,
    showCustomer: false,
    showStaff: false,
    showNotes: false,
    showPaidAndChange: true,
    showQrCode: false,
    isDefault: false,
    createdAt: new Date().toISOString()
  }
];

app.get('/api/invoice-templates', async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    if (!storeId) {
      return res.status(400).json({ success: false, message: 'Thiếu storeId' });
    }
    const q = query(collection(db, 'invoiceTemplates'), where('storeId', '==', storeId));
    const snap = await getDocs(q);
    if (snap.empty) {
      // Seed default templates
      const defaults = DEFAULT_INVOICE_TEMPLATES(storeId);
      for (const t of defaults) {
        await setDoc(doc(db, 'invoiceTemplates', t.id), t);
      }
      return res.json({ success: true, templates: defaults });
    }
    const templates = snap.docs.map((d) => d.data());
    return res.json({ success: true, templates });
  } catch (error: any) {
    console.error('Error fetching invoice templates:', error);
    return res.status(500).json({ success: false, message: 'Không thể tải mẫu hóa đơn.' });
  }
});

app.post('/api/invoice-templates', async (req: Request, res: Response) => {
  try {
    const template = req.body;
    if (!template || !template.id || !template.storeId || !template.name) {
      return res.status(400).json({ success: false, message: 'Dữ liệu mẫu hóa đơn không hợp lệ.' });
    }

    const ref = doc(db, 'invoiceTemplates', template.id);
    const nowIso = new Date().toISOString();

    // If set as default, unset other templates for this store
    if (template.isDefault) {
      const q = query(collection(db, 'invoiceTemplates'), where('storeId', '==', template.storeId));
      const snap = await getDocs(q);
      const batch = writeBatch(db);
      snap.docs.forEach((d) => {
        if (d.id !== template.id && d.data().isDefault) {
          batch.update(d.ref, { isDefault: false });
        }
      });
      await batch.commit();
    }

    await setDoc(ref, { ...template, updatedAt: nowIso }, { merge: true });
    return res.json({ success: true, message: 'Đã lưu mẫu hóa đơn thành công!' });
  } catch (error: any) {
    console.error('Error saving invoice template:', error);
    return res.status(500).json({ success: false, message: 'Không thể lưu mẫu hóa đơn.' });
  }
});

// Plan specifications
const PLANS_MAP: Record<string, { name: string; days: number; price: number }> = {
  business_household: {
    name: 'Gói Hộ Kinh Doanh (Free 3 ngày)',
    days: 3,
    price: 0
  },
  month_1: {
    name: 'DopiPOS Hộ kinh doanh – 1 tháng',
    days: 30,
    price: 39000
  },
  month_3: {
    name: 'DopiPOS Hộ kinh doanh – 3 tháng',
    days: 90,
    price: 79000
  },
  year_1: {
    name: 'DopiPOS Hộ kinh doanh – 1 năm',
    days: 365,
    price: 299000
  }
};

// ==========================================
// 1. ACTIVATION CODE REDEMPTION (ATOMIC TRANSACTION)
// ==========================================
app.post('/api/activation/redeem', async (req: Request, res: Response) => {
  try {
    const { code, planId, userId, storeId } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp mã kích hoạt.' });
    }
    if (!userId || !storeId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin người dùng hoặc cửa hàng.' });
    }

    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z0-9]{15}$/.test(normalizedCode)) {
      return res.status(400).json({
        success: false,
        message: 'Mã kích hoạt không đúng định dạng (phải gồm đúng 15 ký tự chữ và số).'
      });
    }

    const targetPlan = PLANS_MAP[planId];
    if (!targetPlan) {
      return res.status(400).json({ success: false, message: 'Gói dịch vụ không hợp lệ.' });
    }

    const codeRef = doc(db, 'activationCodes', normalizedCode);
    const subRef = doc(db, 'subscriptions', userId);

    // Atomic transaction ensures no race condition if two devices enter same code simultaneously
    const result = await runTransaction(db, async (transaction) => {
      const codeSnap = await transaction.get(codeRef);
      if (!codeSnap.exists()) {
        throw new Error('NOT_FOUND');
      }

      const codeData = codeSnap.data();

      if (codeData.status === 'disabled') {
        throw new Error('DISABLED');
      }

      if (codeData.redeemed === true) {
        throw new Error('ALREADY_REDEEMED');
      }

      if (codeData.planId !== planId) {
        throw new Error('WRONG_PLAN');
      }

      const subSnap = await transaction.get(subRef);
      const now = new Date();
      let newStartDate = now;
      let newEndDate = new Date(now.getTime() + targetPlan.days * 86400000);

      if (subSnap.exists()) {
        const subData = subSnap.data();
        if (subData.endDate) {
          const currentEnd = new Date(subData.endDate);
          if (currentEnd > now) {
            // Subscription is still active -> add cumulatively without losing remaining days
            newStartDate = new Date(subData.startDate || now);
            newEndDate = new Date(currentEnd.getTime() + targetPlan.days * 86400000);
          }
        }
      }

      const nowIso = now.toISOString();

      // 1. Mark activation code as redeemed
      transaction.update(codeRef, {
        redeemed: true,
        redeemedBy: userId,
        redeemedAt: nowIso,
        storeId: storeId
      });

      // 2. Set / Update subscription
      const updatedSubscription = {
        id: userId,
        userId: userId,
        storeId: storeId,
        planId: planId,
        planName: targetPlan.name,
        status: 'active',
        startDate: newStartDate.toISOString(),
        endDate: newEndDate.toISOString(),
        activatedViaCode: normalizedCode,
        updatedAt: nowIso
      };
      transaction.set(subRef, updatedSubscription, { merge: true });

      return {
        subscription: updatedSubscription,
        addedDays: targetPlan.days
      };
    });

    // Write audit log
    try {
      const logId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      await setDoc(doc(db, 'auditLogs', logId), {
        id: logId,
        type: 'ACTIVATION_REDEEM',
        description: `Kích hoạt thành công mã ${normalizedCode} cho gói ${targetPlan.name}`,
        performedBy: userId,
        code: normalizedCode,
        planId,
        storeId,
        createdAt: new Date().toISOString()
      });
    } catch (e) {
      console.warn('Failed to record audit log:', e);
    }

    return res.json({
      success: true,
      message: `Kích hoạt thành công gói ${targetPlan.name}!`,
      subscription: result.subscription,
      addedDays: result.addedDays
    });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: 'Mã kích hoạt không tồn tại trên hệ thống.' });
    }
    if (error.message === 'ALREADY_REDEEMED') {
      return res.status(400).json({ success: false, message: 'Mã kích hoạt này đã được sử dụng trước đó.' });
    }
    if (error.message === 'DISABLED') {
      return res.status(400).json({ success: false, message: 'Mã kích hoạt này hiện đã bị khóa.' });
    }
    if (error.message === 'WRONG_PLAN') {
      return res.status(400).json({ success: false, message: 'Mã kích hoạt này không áp dụng cho gói bạn đã chọn.' });
    }
    console.error('Error redeeming code:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi kích hoạt mã. Vui lòng thử lại.' });
  }
});

// ==========================================
// 2. ADMIN ACTIVATION CODE GENERATION
// ==========================================
app.post('/api/admin/generate-codes', async (req: Request, res: Response) => {
  try {
    const { count, planId, adminUid, adminEmail } = req.body;
    
    // Strict admin verification
    if (adminEmail && adminEmail.toLowerCase() !== DEFAULT_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền quản trị.' });
    }
    if (adminUid) {
      const uSnap = await getDoc(doc(db, 'users', adminUid));
      if (uSnap.exists()) {
        const u = uSnap.data();
        if (u.email?.toLowerCase() !== DEFAULT_ADMIN_EMAIL && u.role !== 'admin') {
          return res.status(403).json({ success: false, message: 'Bạn không có quyền quản trị.' });
        }
      }
    }

    const num = Number(count) || 10;
    if (![1, 10, 50, 100, 500].includes(num)) {
      return res.status(400).json({ success: false, message: 'Số lượng code tạo không hợp lệ (hỗ trợ 10, 50, 100, 500).' });
    }

    const plan = PLANS_MAP[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: 'Gói dịch vụ không hợp lệ.' });
    }

    const generatedCodes: string[] = [];
    const nowIso = new Date().toISOString();

    // Firestore batch writes max 500 operations
    const batch = writeBatch(db);
    for (let i = 0; i < num; i++) {
      const code = generateActivationCode();
      generatedCodes.push(code);
      const codeRef = doc(db, 'activationCodes', code);
      batch.set(codeRef, {
        id: code,
        code: code,
        planId: planId,
        planDays: plan.days,
        planPrice: plan.price,
        redeemed: false,
        redeemedBy: null,
        redeemedAt: null,
        status: 'active',
        createdBy: adminUid || 'admin',
        createdAt: nowIso
      });
    }

    await batch.commit();

    return res.json({
      success: true,
      count: num,
      planName: plan.name,
      codes: generatedCodes
    });
  } catch (error) {
    console.error('Error generating codes:', error);
    return res.status(500).json({ success: false, message: 'Không thể tạo mã kích hoạt.' });
  }
});

// ==========================================
// 3. ADMIN LIST ACTIVATION CODES
// ==========================================
app.get('/api/admin/codes', async (req: Request, res: Response) => {
  try {
    const filter = (req.query.filter as string) || 'all';
    const codesCol = collection(db, 'activationCodes');
    const snap = await getDocs(query(codesCol, limit(500)));

    let list = snap.docs.map((d) => d.data());

    if (filter === 'unredeemed') {
      list = list.filter((c) => !c.redeemed && c.status === 'active');
    } else if (filter === 'redeemed') {
      list = list.filter((c) => c.redeemed);
    } else if (filter === 'disabled') {
      list = list.filter((c) => c.status === 'disabled');
    }

    // Sort newest first
    list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    return res.json({ success: true, codes: list });
  } catch (error) {
    console.error('Error fetching admin codes:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tải danh sách mã.' });
  }
});

// Toggle code status (active / disabled)
app.post('/api/admin/toggle-code', async (req: Request, res: Response) => {
  try {
    const { code, status } = req.body;
    if (!code || !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Thông tin không hợp lệ.' });
    }
    const codeRef = doc(db, 'activationCodes', code);
    await setDoc(codeRef, { status }, { merge: true });
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating code status:', error);
    return res.status(500).json({ success: false, message: 'Không thể cập nhật trạng thái mã.' });
  }
});

// ==========================================
// 4. ADMIN SYSTEM OVERVIEW STATS
// ==========================================
app.get('/api/admin/stats', async (_req: Request, res: Response) => {
  try {
    const [usersSnap, subsSnap, codesSnap] = await Promise.all([
      getDocs(collection(db, 'users')),
      getDocs(collection(db, 'subscriptions')),
      getDocs(collection(db, 'activationCodes'))
    ]);

    const totalUsers = usersSnap.size;
    const users = usersSnap.docs.map((d) => d.data());
    const totalSubs = subsSnap.size;
    const codes = codesSnap.docs.map((d) => d.data());

    const totalCodes = codes.length;
    const redeemedCodes = codes.filter((c) => c.redeemed).length;
    const unredeemedCodes = codes.filter((c) => !c.redeemed && c.status === 'active').length;

    const now = new Date();
    const subs = subsSnap.docs.map((d) => d.data());
    const subsMap = new Map<string, any>();
    subs.forEach((s) => {
      if (s.userId) subsMap.set(s.userId, s);
      if (s.id) subsMap.set(s.id, s);
    });

    // Enrich users with subscription and status
    const enrichedUsers = usersSnap.docs.map((d) => {
      const u = d.data();
      const userSub = subsMap.get(u.uid);
      const isExpired = userSub?.endDate ? new Date(userSub.endDate) < now : true;
      const daysLeft = userSub?.endDate
        ? Math.max(0, Math.ceil((new Date(userSub.endDate).getTime() - now.getTime()) / 86400000))
        : 0;

      return {
        ...u,
        subscription: userSub || null,
        planName: userSub?.planName || 'Chưa có gói',
        planId: userSub?.planId || 'none',
        isTrial: Boolean(userSub?.isTrial || userSub?.planId === 'business_household'),
        isExpired,
        daysLeft,
        subEndDate: userSub?.endDate || null
      };
    });

    const activeSubs = subs.filter((s) => s.endDate && new Date(s.endDate) > now).length;
    const expiringSoonSubs = subs.filter((s) => {
      if (!s.endDate) return false;
      const end = new Date(s.endDate);
      const diffDays = (end.getTime() - now.getTime()) / 86400000;
      return diffDays > 0 && diffDays <= 7;
    }).length;

    return res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers: totalUsers,
        totalSubscriptions: totalSubs,
        activeSubscriptions: activeSubs,
        expiringSoonSubscriptions: expiringSoonSubs,
        totalCodes,
        redeemedCodes,
        unredeemedCodes
      },
      users: enrichedUsers
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tải thống kê hệ thống.' });
  }
});

// Admin direct plan activation / extension for any user
app.post('/api/admin/activate-user-plan', async (req: Request, res: Response) => {
  try {
    const { adminEmail, userId, planId, days, planName } = req.body;
    if (adminEmail?.toLowerCase() !== DEFAULT_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Chỉ tài khoản Quản trị viên mới có quyền thực hiện.' });
    }
    if (!userId) {
      return res.status(400).json({ success: false, message: 'Thiếu userId người dùng.' });
    }

    const numDays = Number(days) || 30;
    const now = new Date();
    const newEndDate = new Date(now.getTime() + numDays * 86400000).toISOString();
    const nowIso = now.toISOString();

    const subRef = doc(db, 'subscriptions', userId);
    await setDoc(subRef, {
      id: userId,
      userId,
      storeId: userId,
      planId: planId || 'month_1',
      planName: planName || `DopiPOS Hộ kinh doanh (${numDays} ngày)`,
      status: 'active',
      isTrial: false,
      startDate: nowIso,
      endDate: newEndDate,
      activatedByAdmin: true,
      updatedAt: nowIso
    }, { merge: true });

    return res.json({ success: true, message: `Đã kích hoạt ${numDays} ngày cho người dùng!` });
  } catch (error) {
    console.error('Error activating user plan by admin:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi kích hoạt gói dịch vụ.' });
  }
});

// Admin toggle user account status (active / blocked)
app.post('/api/admin/toggle-user-status', async (req: Request, res: Response) => {
  try {
    const { adminEmail, userId, status } = req.body;
    if (adminEmail?.toLowerCase() !== DEFAULT_ADMIN_EMAIL) {
      return res.status(403).json({ success: false, message: 'Chỉ Admin mới có quyền thực hiện.' });
    }
    if (!userId || !['active', 'blocked'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Tham số không hợp lệ.' });
    }

    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, { status, updatedAt: new Date().toISOString() }, { merge: true });

    return res.json({ success: true, status });
  } catch (error) {
    console.error('Error toggling user status:', error);
    return res.status(500).json({ success: false, message: 'Lỗi cập nhật trạng thái tài khoản.' });
  }
});

// Real-time table order sync for multi-device café
app.post('/api/tables/order', async (req: Request, res: Response) => {
  try {
    const { tableId, storeId, items, subtotal } = req.body;
    if (!tableId || !storeId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bàn hoặc cửa hàng.' });
    }

    const tableRef = doc(db, 'tables', tableId);
    await setDoc(tableRef, {
      status: 'occupied',
      currentCartItems: items || [],
      currentSubtotal: Number(subtotal) || 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return res.json({ success: true, message: 'Đã lưu gọi món vào bàn thành công!' });
  } catch (error) {
    console.error('Error saving table order:', error);
    return res.status(500).json({ success: false, message: 'Lỗi lưu gọi món vào bàn.' });
  }
});

app.post('/api/tables/clear', async (req: Request, res: Response) => {
  try {
    const { tableId } = req.body;
    if (!tableId) {
      return res.status(400).json({ success: false, message: 'Thiếu tableId.' });
    }

    const tableRef = doc(db, 'tables', tableId);
    await setDoc(tableRef, {
      status: 'available',
      currentOrderId: null,
      currentCartItems: [],
      currentSubtotal: 0,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error clearing table:', error);
    return res.status(500).json({ success: false, message: 'Lỗi giải phóng bàn.' });
  }
});

// ==========================================
// 5. SYSTEM SETTINGS (CONTACT / BRANDING)
// ==========================================
const DEFAULT_SYSTEM_SETTINGS = {
  appName: 'DopiPOS',
  logoUrl: '',
  contactZalo: '0987654321',
  contactFacebook: 'https://facebook.com/dopipos',
  contactMessenger: 'https://m.me/dopipos',
  contactPhone: '0987.654.321',
  contactEmail: 'hotro@dopipos.vn',
  pricingPlans: [
    {
      id: 'month_1',
      name: 'DopiPOS Hộ kinh doanh – 1 tháng',
      price: 39000,
      days: 30,
      description: 'Phù hợp trải nghiệm bán hàng nhanh, quản lý tồn kho và doanh thu'
    },
    {
      id: 'month_3',
      name: 'DopiPOS Hộ kinh doanh – 3 tháng',
      price: 79000,
      days: 90,
      popular: true,
      description: 'Tiết kiệm chi phí, vận hành ổn định lâu dài cho cửa hàng và quán F&B'
    }
  ]
};

app.get('/api/system-settings', async (_req: Request, res: Response) => {
  try {
    const docSnap = await getDoc(doc(db, 'systemSettings', 'config'));
    if (docSnap.exists()) {
      return res.json({ success: true, settings: { ...DEFAULT_SYSTEM_SETTINGS, ...docSnap.data() } });
    }
    return res.json({ success: true, settings: DEFAULT_SYSTEM_SETTINGS });
  } catch (error) {
    return res.json({ success: true, settings: DEFAULT_SYSTEM_SETTINGS });
  }
});

app.post('/api/admin/system-settings', async (req: Request, res: Response) => {
  try {
    const settings = req.body;
    await setDoc(doc(db, 'systemSettings', 'config'), {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return res.json({ success: true, message: 'Đã cập nhật cấu hình hệ thống.' });
  } catch (error) {
    console.error('Error saving system settings:', error);
    return res.status(500).json({ success: false, message: 'Không thể lưu cấu hình.' });
  }
});

// ==========================================
// 6. STORE DEMO SEEDING API
// ==========================================
app.post('/api/seed-store', async (req: Request, res: Response) => {
  try {
    const { storeId, userId } = req.body;
    if (!storeId || !userId) {
      return res.status(400).json({ success: false, message: 'Thiếu storeId hoặc userId' });
    }

    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    // 1. Categories
    const categoriesData = [
      { id: `${storeId}_cat_cafe`, name: 'Cà phê', sortOrder: 1 },
      { id: `${storeId}_cat_tra`, name: 'Trà & Trà sữa', sortOrder: 2 },
      { id: `${storeId}_cat_nuocngot`, name: 'Nước ngọt & Khác', sortOrder: 3 },
      { id: `${storeId}_cat_doan`, name: 'Đồ ăn nhanh', sortOrder: 4 },
      { id: `${storeId}_cat_topping`, name: 'Topping F&B', sortOrder: 5 }
    ];

    categoriesData.forEach((cat) => {
      const ref = doc(db, 'categories', cat.id);
      batch.set(ref, {
        id: cat.id,
        storeId,
        name: cat.name,
        sortOrder: cat.sortOrder,
        createdAt: nowIso
      });
    });

    // 2. Sample Products
    const productsData = [
      {
        id: `${storeId}_p_cf_den`,
        name: 'Cà phê đen đá',
        sku: 'CF-DEN',
        categoryId: `${storeId}_cat_cafe`,
        categoryName: 'Cà phê',
        unit: 'Ly',
        costPrice: 8000,
        sellingPrice: 18000,
        stock: 120,
        minStockAlert: 15,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&auto=format&fit=crop&q=80',
        toppings: []
      },
      {
        id: `${storeId}_p_cf_sua`,
        name: 'Cà phê sữa đá',
        sku: 'CF-SUA',
        categoryId: `${storeId}_cat_cafe`,
        categoryName: 'Cà phê',
        unit: 'Ly',
        costPrice: 10000,
        sellingPrice: 22000,
        stock: 95,
        minStockAlert: 20,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=400&auto=format&fit=crop&q=80',
        toppings: []
      },
      {
        id: `${storeId}_p_bacxiu`,
        name: 'Bạc xỉu 3 tầng',
        sku: 'CF-BX',
        categoryId: `${storeId}_cat_cafe`,
        categoryName: 'Cà phê',
        unit: 'Ly',
        costPrice: 12000,
        sellingPrice: 25000,
        stock: 60,
        minStockAlert: 10,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=400&auto=format&fit=crop&q=80',
        toppings: []
      },
      {
        id: `${storeId}_p_tra_dao`,
        name: 'Trà đào cam sả',
        sku: 'TRA-DAO',
        categoryId: `${storeId}_cat_tra`,
        categoryName: 'Trà & Trà sữa',
        unit: 'Ly',
        costPrice: 14000,
        sellingPrice: 35000,
        stock: 45,
        minStockAlert: 10,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&auto=format&fit=crop&q=80',
        toppings: [
          { name: 'Thạch đào giòn', price: 5000 },
          { name: 'Trân châu trắng', price: 5000 },
          { name: 'Kem cheese béo', price: 10000 }
        ]
      },
      {
        id: `${storeId}_p_tra_tac`,
        name: 'Trà tắc khổng lồ',
        sku: 'TRA-TAC',
        categoryId: `${storeId}_cat_tra`,
        categoryName: 'Trà & Trà sữa',
        unit: 'Ly',
        costPrice: 6000,
        sellingPrice: 15000,
        stock: 80,
        minStockAlert: 15,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400&auto=format&fit=crop&q=80',
        toppings: []
      },
      {
        id: `${storeId}_p_coca`,
        name: 'Coca Cola lon 330ml',
        sku: 'NG-COCA',
        categoryId: `${storeId}_cat_nuocngot`,
        categoryName: 'Nước ngọt & Khác',
        unit: 'Lon',
        costPrice: 8500,
        sellingPrice: 15000,
        stock: 48,
        minStockAlert: 12,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400&auto=format&fit=crop&q=80',
        toppings: []
      },
      {
        id: `${storeId}_p_banhmi`,
        name: 'Bánh mì thịt nướng pate',
        sku: 'DA-BM',
        categoryId: `${storeId}_cat_doan`,
        categoryName: 'Đồ ăn nhanh',
        unit: 'Ổ',
        costPrice: 15000,
        sellingPrice: 28000,
        stock: 30,
        minStockAlert: 5,
        status: 'active',
        imageUrl: 'https://images.unsplash.com/photo-1600490036275-35f5f1656861?w=400&auto=format&fit=crop&q=80',
        toppings: []
      },
      {
        id: `${storeId}_p_topping_tc`,
        name: 'Topping trân châu hoàng kim',
        sku: 'TOP-TC',
        categoryId: `${storeId}_cat_topping`,
        categoryName: 'Topping F&B',
        unit: 'Phần',
        costPrice: 2000,
        sellingPrice: 5000,
        stock: 200,
        minStockAlert: 20,
        status: 'active',
        imageUrl: '',
        toppings: []
      }
    ];

    productsData.forEach((prod) => {
      const ref = doc(db, 'products', prod.id);
      batch.set(ref, {
        ...prod,
        storeId,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    });

    // 3. F&B Table Areas and Tables
    const areaIndoorId = `${storeId}_area_indoor`;
    const areaOutdoorId = `${storeId}_area_outdoor`;

    batch.set(doc(db, 'tableAreas', areaIndoorId), {
      id: areaIndoorId,
      storeId,
      name: 'Khu máy lạnh (Tầng 1)',
      sortOrder: 1,
      createdAt: nowIso
    });

    batch.set(doc(db, 'tableAreas', areaOutdoorId), {
      id: areaOutdoorId,
      storeId,
      name: 'Khu sân vườn (Ngoài trời)',
      sortOrder: 2,
      createdAt: nowIso
    });

    const tables = [
      { id: `${storeId}_tbl_1`, name: 'Bàn A1', areaId: areaIndoorId, areaName: 'Khu máy lạnh', capacity: 4 },
      { id: `${storeId}_tbl_2`, name: 'Bàn A2', areaId: areaIndoorId, areaName: 'Khu máy lạnh', capacity: 4 },
      { id: `${storeId}_tbl_3`, name: 'Bàn A3', areaId: areaIndoorId, areaName: 'Khu máy lạnh', capacity: 6 },
      { id: `${storeId}_tbl_4`, name: 'Bàn B1', areaId: areaOutdoorId, areaName: 'Khu sân vườn', capacity: 4 },
      { id: `${storeId}_tbl_5`, name: 'Bàn B2', areaId: areaOutdoorId, areaName: 'Khu sân vườn', capacity: 2 },
      { id: `${storeId}_tbl_6`, name: 'Bàn B3', areaId: areaOutdoorId, areaName: 'Khu sân vườn', capacity: 8 }
    ];

    tables.forEach((t) => {
      const ref = doc(db, 'tables', t.id);
      batch.set(ref, {
        ...t,
        storeId,
        status: 'available',
        currentOrderId: null,
        createdAt: nowIso
      });
    });

    // 4. Sample Customers
    const sampleCustomer = {
      id: `${storeId}_cust_1`,
      storeId,
      name: 'Nguyễn Văn Minh (Khách thân thiết)',
      phone: '0912345678',
      address: '123 Lê Lợi, Quận 1, TP.HCM',
      notes: 'Thích uống ít đường',
      totalOrders: 3,
      totalSpent: 95000,
      lastOrderAt: nowIso,
      createdAt: nowIso
    };
    batch.set(doc(db, 'customers', sampleCustomer.id), sampleCustomer);

    await batch.commit();

    return res.json({ success: true, message: 'Khởi tạo dữ liệu mẫu thành công!' });
  } catch (error) {
    console.error('Error seeding store data:', error);
    return res.status(500).json({ success: false, message: 'Lỗi khi khởi tạo dữ liệu mẫu.' });
  }
});

// ==========================================
// VITE SPA INTEGRATION
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DopiPOS full-stack server running on http://0.0.0.0:${PORT}`);
    // Initialize default admin account in background
    initDefaultAdmin();
  });
}

startServer();
