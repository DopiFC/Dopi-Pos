export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  storeName?: string;
  role: UserRole;
  status?: 'active' | 'blocked' | 'locked';
  isLocked?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  phone?: string;
  address?: string;
  taxCode?: string;
  email?: string;
  createdAt: string;
}

export interface ProductTopping {
  name: string;
  price: number;
}

export interface RawIngredient {
  id: string;
  storeId: string;
  name: string;             // Tên nguyên vật liệu (VD: Cà phê bột, Sữa đặc, Trà đen...)
  sku: string;
  importUnit: string;       // Đơn vị nhập (kg, lít, hộp, thùng, cây, vỉ...)
  importPrice: number;      // Giá nhập 1 đơn vị nhập (VD: 180,000 đ/kg)
  usageUnit: string;        // Đơn vị định lượng tiêu hao (g, ml, cái, lát...)
  conversionRate: number;   // Tỷ lệ quy đổi: 1 đơn vị nhập = bao nhiêu đơn vị sử dụng (VD: 1kg = 1000g -> 1000)
  costPerUsageUnit: number; // Đơn giá tiêu hao = importPrice / conversionRate (VD: 180 đ/g)
  stock: number;            // Số lượng tồn kho theo đơn vị tiêu hao hoặc nhập
  minStockAlert: number;    // Cảnh báo tồn kho tối thiểu
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductRecipeItem {
  ingredientId: string;
  ingredientName: string;
  usageQuantity: number;    // Lượng sử dụng cho 1 đơn vị sản phẩm (VD: 20g bột cà phê)
  usageUnit: string;        // Đơn vị sử dụng (g, ml, cái...)
  costPerUnit: number;      // Đơn giá tại thời điểm định lượng (VNĐ / đơn vị sử dụng)
  subtotalCost: number;     // Thành tiền = usageQuantity * costPerUnit
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  status: 'active' | 'inactive';
  imageUrl?: string;
  toppings?: ProductTopping[];
  costingMethod?: 'direct' | 'recipe'; // Định lượng theo công thức NVL hoặc nhập trực tiếp
  recipeItems?: ProductRecipeItem[];   // Chi tiết các nguyên vật liệu cấu thành nên sản phẩm
  createdAt: string;
  updatedAt?: string;
}

export interface ExpenseRecord {
  id: string;
  storeId: string;
  category: 'rent' | 'utilities' | 'salary' | 'packaging' | 'maintenance' | 'marketing' | 'other';
  categoryName: string;
  amount: number;
  date: string;
  title: string;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface CartItem {
  cartItemId: string; // unique for item + topping combination
  product: Product;
  quantity: number;
  selectedToppings: ProductTopping[];
  note?: string;
  unitPrice: number; // product.sellingPrice + sum(toppings)
  subtotal: number;
}

export type PaymentMethod = 'cash' | 'transfer' | 'split';
export type OrderStatus = 'completed' | 'cancelled';
export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export interface OrderItemRecord {
  productId: string;
  productName: string;
  sku: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  selectedToppings?: ProductTopping[];
  note?: string;
  subtotal: number;
}

export interface Order {
  id: string;
  storeId: string;
  orderNumber: string;
  items: OrderItemRecord[];
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  cashAmount?: number;
  transferAmount?: number;
  amountReceived?: number;
  changeGiven?: number;
  customerId?: string;
  customerName?: string;
  tableId?: string;
  tableName?: string;
  orderType: OrderType;
  status: OrderStatus;
  invoiceId?: string;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt?: string;
  createdAt: string;
}

export interface InventoryTransaction {
  id: string;
  storeId: string;
  productId: string;
  productName: string;
  type: 'import' | 'export' | 'sale' | 'adjustment' | 'cancel_order';
  quantityChange: number;
  previousStock: number;
  newStock: number;
  note?: string;
  createdBy: string;
  createdAt: string;
}

export type TableStatus = 'available' | 'occupied' | 'bill_printed';

export interface Table {
  id: string;
  storeId: string;
  name: string;
  areaId: string;
  areaName: string;
  status: TableStatus;
  currentOrderId?: string | null;
  currentCartItems?: OrderItemRecord[];
  currentSubtotal?: number;
  capacity?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TableArea {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  storeId: string;
  planId: 'business_household' | 'month_1' | 'month_3' | 'year_1' | string;
  planName: string;
  status: 'active' | 'expired';
  isTrial?: boolean;
  startDate: string;
  endDate: string;
  activatedViaCode?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivationCode {
  id: string;
  code: string;
  planId: string;
  planDays: number;
  planPrice: number;
  redeemed: boolean;
  redeemedBy?: string | null;
  redeemedAt?: string | null;
  storeId?: string | null;
  status: 'active' | 'disabled';
  createdBy?: string;
  createdAt: string;
}

export interface SystemSettings {
  appName: string;
  logoUrl?: string;
  contactZalo: string;
  contactFacebook: string;
  contactMessenger: string;
  contactPhone: string;
  contactEmail: string;
  pricingPlans?: Array<{
    id: string;
    name: string;
    price: number;
    days: number;
    popular?: boolean;
    description?: string;
  }>;
}

export interface Invoice {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  storeId: string;
  customerId?: string;
  customerName?: string;
  tableId?: string;
  tableName?: string;
  items: OrderItemRecord[];
  subtotal: number;
  discount: number;
  surcharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  changeGiven?: number;
  customerPaid?: number;
  changeAmount?: number;
  status: 'paid' | 'cancelled';
  invoiceTemplateId?: string;
  createdAt: string;
}

export type PaperSize = '58mm' | '80mm' | 'A4';

export interface InvoiceTemplate {
  id: string;
  storeId: string;
  name: string;
  paperSize: PaperSize;
  logoUrl?: string;
  storeName?: string;
  address?: string;
  phone?: string;
  taxCode?: string;
  email?: string;
  headerGreeting?: string;
  footerThankYou?: string;
  footerAlignment: 'left' | 'center' | 'right';
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showTaxCode: boolean;
  showCustomer: boolean;
  showStaff: boolean;
  showNotes: boolean;
  showPaidAndChange: boolean;
  showQrCode: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string;
}
