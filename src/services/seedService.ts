import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export async function seedStoreDataClient(storeId: string, userId?: string): Promise<void> {
  if (!storeId) return;
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
    batch.set(doc(db, 'products', prod.id), {
      ...prod,
      storeId,
      createdAt: nowIso,
      updatedAt: nowIso
    });
  });

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
    batch.set(doc(db, 'tables', t.id), {
      ...t,
      storeId,
      status: 'available',
      currentOrderId: null,
      createdAt: nowIso
    });
  });

  await batch.commit();
}
