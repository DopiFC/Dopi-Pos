import React, { useEffect, useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit,
  Trash2,
  Filter,
  Check,
  X,
  AlertTriangle,
  Image as ImageIcon,
  Scale,
  Calculator,
  Percent,
  ListTree,
  Eye,
  Info,
  DollarSign,
  TrendingUp,
  Warehouse,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  getProducts,
  getCategories,
  saveProduct,
  deleteProduct,
  getIngredients,
  saveIngredient,
  deleteIngredient
} from '../../services/storeService';
import { Product, Category, ProductTopping, RawIngredient, ProductRecipeItem } from '../../types';
import { formatCurrency } from '../../utils/format';
import { Modal } from '../../components/common/Modal';
import { ConfirmModal } from '../../components/common/ConfirmModal';

export const Products: React.FC = () => {
  const { user, store } = useAuth();
  const { success, error } = useToast();

  // Active Main Tab
  const [activeTab, setActiveTab] = useState<'products' | 'ingredients' | 'costing'>('products');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [ingredients, setIngredients] = useState<RawIngredient[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // ========================================================
  // 1. PRODUCT MODAL STATE
  // ========================================================
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    sku: string;
    categoryId: string;
    unit: string;
    costingMethod: 'direct' | 'recipe';
    costPrice: number;
    sellingPrice: number;
    stock: number;
    minStockAlert: number;
    status: 'active' | 'inactive';
    imageUrl: string;
    toppings: ProductTopping[];
    recipeItems: ProductRecipeItem[];
  }>({
    name: '',
    sku: '',
    categoryId: '',
    unit: 'Ly',
    costingMethod: 'direct',
    costPrice: 0,
    sellingPrice: 0,
    stock: 100,
    minStockAlert: 10,
    status: 'active',
    imageUrl: '',
    toppings: [],
    recipeItems: []
  });

  // Topping inputs
  const [toppingName, setToppingName] = useState('');
  const [toppingPrice, setToppingPrice] = useState(5000);

  // Recipe item input state inside Product Modal
  const [recipeSelectedIngId, setRecipeSelectedIngId] = useState('');
  const [recipeUsageQty, setRecipeUsageQty] = useState<number>(20);

  // View recipe detail modal
  const [viewingRecipeProduct, setViewingRecipeProduct] = useState<Product | null>(null);

  // Delete product confirmation
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // ========================================================
  // 2. RAW INGREDIENT MODAL STATE
  // ========================================================
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<RawIngredient | null>(null);
  const [ingredientFormData, setIngredientFormData] = useState<{
    name: string;
    sku: string;
    importUnit: string;
    importPrice: number;
    usageUnit: string;
    conversionRate: number;
    stock: number;
    minStockAlert: number;
    notes: string;
  }>({
    name: '',
    sku: '',
    importUnit: 'kg',
    importPrice: 180000,
    usageUnit: 'g',
    conversionRate: 1000,
    stock: 5000,
    minStockAlert: 1000,
    notes: ''
  });
  const [deletingIngredientId, setDeletingIngredientId] = useState<string | null>(null);

  // ========================================================
  // DATA LOADING
  // ========================================================
  const loadData = async () => {
    if (!user) return;
    const storeId = store?.id || user.uid;
    try {
      setLoading(true);
      const [pList, cList, iList] = await Promise.all([
        getProducts(storeId),
        getCategories(storeId),
        getIngredients(storeId)
      ]);
      setProducts(Array.isArray(pList) ? pList : []);
      setCategories(Array.isArray(cList) ? cList : []);
      setIngredients(Array.isArray(iList) ? iList : []);
    } catch (err) {
      console.error('Error loading products/ingredients data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user, store?.id]);

  // ========================================================
  // PRODUCT HANDLERS
  // ========================================================
  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: `SP-${Math.floor(1000 + Math.random() * 9000)}`,
      categoryId: categories[0]?.id || '',
      unit: 'Ly',
      costingMethod: 'direct',
      costPrice: 0,
      sellingPrice: 25000,
      stock: 50,
      minStockAlert: 10,
      status: 'active',
      imageUrl: '',
      toppings: [],
      recipeItems: []
    });
    setRecipeSelectedIngId(ingredients[0]?.id || '');
    setRecipeUsageQty(20);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku || '',
      categoryId: p.categoryId || '',
      unit: p.unit || 'Phần',
      costingMethod: p.costingMethod || (p.recipeItems && p.recipeItems.length > 0 ? 'recipe' : 'direct'),
      costPrice: p.costPrice || 0,
      sellingPrice: p.sellingPrice || 0,
      stock: p.stock || 0,
      minStockAlert: p.minStockAlert || 10,
      status: p.status || 'active',
      imageUrl: p.imageUrl || '',
      toppings: p.toppings ? [...p.toppings] : [],
      recipeItems: p.recipeItems ? [...p.recipeItems] : []
    });
    setRecipeSelectedIngId(ingredients[0]?.id || '');
    setRecipeUsageQty(20);
    setIsModalOpen(true);
  };

  const handleAddTopping = () => {
    if (!toppingName.trim()) return;
    setFormData((prev) => ({
      ...prev,
      toppings: [...prev.toppings, { name: toppingName.trim(), price: toppingPrice }]
    }));
    setToppingName('');
    setToppingPrice(5000);
  };

  const handleRemoveTopping = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      toppings: prev.toppings.filter((_, i) => i !== idx)
    }));
  };

  // Recipe builder in Product Form
  const handleAddRecipeItem = () => {
    if (!recipeSelectedIngId) return;
    const ing = ingredients.find((i) => i.id === recipeSelectedIngId);
    if (!ing) return;

    const qty = Math.max(0.1, Number(recipeUsageQty) || 1);
    const costPerUnit = ing.costPerUsageUnit || Math.round(ing.importPrice / ing.conversionRate);
    const subtotalCost = Math.round(qty * costPerUnit);

    const existingIdx = formData.recipeItems.findIndex((r) => r.ingredientId === ing.id);
    let updatedList: ProductRecipeItem[];
    if (existingIdx >= 0) {
      updatedList = [...formData.recipeItems];
      updatedList[existingIdx] = {
        ...updatedList[existingIdx],
        usageQuantity: qty,
        costPerUnit,
        subtotalCost
      };
    } else {
      updatedList = [
        ...formData.recipeItems,
        {
          ingredientId: ing.id,
          ingredientName: ing.name,
          usageQuantity: qty,
          usageUnit: ing.usageUnit,
          costPerUnit,
          subtotalCost
        }
      ];
    }

    const totalCost = updatedList.reduce((sum, item) => sum + item.subtotalCost, 0);

    setFormData((prev) => ({
      ...prev,
      costPrice: totalCost,
      recipeItems: updatedList
    }));
  };

  const handleRemoveRecipeItem = (ingId: string) => {
    const updatedList = formData.recipeItems.filter((item) => item.ingredientId !== ingId);
    const totalCost = updatedList.reduce((sum, item) => sum + item.subtotalCost, 0);
    setFormData((prev) => ({
      ...prev,
      costPrice: totalCost,
      recipeItems: updatedList
    }));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.uid) {
      error('Bạn chưa đăng nhập. Vui lòng đăng nhập lại để tiếp tục.');
      return;
    }

    if (!formData.name.trim()) {
      error('Vui lòng nhập tên sản phẩm.');
      return;
    }

    if (formData.sellingPrice < 0) {
      error('Giá bán sản phẩm không được là số âm.');
      return;
    }

    setIsSubmitting(true);
    try {
      const effectiveStoreId = store?.id || user.uid;
      const selectedCat = categories.find((c) => c.id === formData.categoryId);
      const nowIso = new Date().toISOString();
      const id = editingProduct ? editingProduct.id : `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Calculate final cost price
      let calculatedCost = Number(formData.costPrice) || 0;
      if (formData.costingMethod === 'recipe' && formData.recipeItems.length > 0) {
        calculatedCost = formData.recipeItems.reduce((acc, r) => acc + (r.subtotalCost || 0), 0);
      }

      const productToSave: Product = {
        id,
        storeId: effectiveStoreId,
        name: formData.name.trim(),
        sku: (formData.sku || `SP-${Math.floor(1000 + Math.random() * 9000)}`).trim(),
        categoryId: formData.categoryId || (categories[0]?.id || ''),
        categoryName: selectedCat ? selectedCat.name : (categories[0]?.name || 'Khác'),
        unit: formData.unit.trim() || 'Phần',
        costingMethod: formData.costingMethod,
        costPrice: calculatedCost,
        sellingPrice: Number(formData.sellingPrice) || 0,
        stock: Number(formData.stock) || 0,
        minStockAlert: Number(formData.minStockAlert) || 10,
        status: formData.status,
        imageUrl: formData.imageUrl.trim(),
        toppings: formData.toppings || [],
        recipeItems: formData.costingMethod === 'recipe' ? formData.recipeItems : [],
        createdAt: editingProduct ? editingProduct.createdAt : nowIso,
        updatedAt: nowIso
      };

      await saveProduct(productToSave);

      setProducts((prev) => {
        const exists = prev.some((p) => p.id === productToSave.id);
        if (exists) {
          return prev.map((p) => (p.id === productToSave.id ? productToSave : p));
        }
        return [productToSave, ...prev];
      });

      success(editingProduct ? 'Cập nhật sản phẩm thành công!' : 'Đã thêm sản phẩm thành công');
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error('Error saving product in Products.tsx:', err);
      error(err?.message || 'Không thể lưu sản phẩm vào cơ sở dữ liệu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingProductId) return;
    try {
      await deleteProduct(deletingProductId);
      setProducts((prev) => prev.filter((p) => p.id !== deletingProductId));
      success('Đã xóa sản phẩm thành công.');
      setDeletingProductId(null);
      loadData();
    } catch (err: any) {
      error('Không thể xóa sản phẩm.');
    }
  };

  // ========================================================
  // INGREDIENT HANDLERS
  // ========================================================
  const handleOpenAddIngredient = () => {
    setEditingIngredient(null);
    setIngredientFormData({
      name: '',
      sku: `NVL-${Math.floor(100 + Math.random() * 900)}`,
      importUnit: 'kg',
      importPrice: 150000,
      usageUnit: 'g',
      conversionRate: 1000,
      stock: 5000,
      minStockAlert: 1000,
      notes: ''
    });
    setIsIngredientModalOpen(true);
  };

  const handleOpenEditIngredient = (ing: RawIngredient) => {
    setEditingIngredient(ing);
    setIngredientFormData({
      name: ing.name,
      sku: ing.sku || '',
      importUnit: ing.importUnit || 'kg',
      importPrice: ing.importPrice || 0,
      usageUnit: ing.usageUnit || 'g',
      conversionRate: ing.conversionRate || 1,
      stock: ing.stock || 0,
      minStockAlert: ing.minStockAlert || 0,
      notes: ing.notes || ''
    });
    setIsIngredientModalOpen(true);
  };

  const handleSaveIngredientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!ingredientFormData.name.trim()) {
      error('Vui lòng nhập tên nguyên vật liệu.');
      return;
    }

    try {
      const effectiveStoreId = store?.id || user.uid;
      const nowIso = new Date().toISOString();
      const id = editingIngredient ? editingIngredient.id : `ing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const conversion = Math.max(1, Number(ingredientFormData.conversionRate) || 1);
      const importP = Math.max(0, Number(ingredientFormData.importPrice) || 0);
      const costPerUsage = Math.round(importP / conversion);

      const record: RawIngredient = {
        id,
        storeId: effectiveStoreId,
        name: ingredientFormData.name.trim(),
        sku: (ingredientFormData.sku || `NVL-${Math.floor(100 + Math.random() * 900)}`).trim(),
        importUnit: ingredientFormData.importUnit.trim() || 'kg',
        importPrice: importP,
        usageUnit: ingredientFormData.usageUnit.trim() || 'g',
        conversionRate: conversion,
        costPerUsageUnit: costPerUsage,
        stock: Number(ingredientFormData.stock) || 0,
        minStockAlert: Number(ingredientFormData.minStockAlert) || 0,
        notes: ingredientFormData.notes.trim(),
        createdAt: editingIngredient ? editingIngredient.createdAt : nowIso,
        updatedAt: nowIso
      };

      await saveIngredient(record);
      success(editingIngredient ? 'Cập nhật nguyên vật liệu thành công!' : 'Đã thêm nguyên vật liệu mới!');
      setIsIngredientModalOpen(false);
      loadData();
    } catch (err: any) {
      error(err?.message || 'Lỗi khi lưu nguyên vật liệu.');
    }
  };

  const handleDeleteIngredient = async () => {
    if (!deletingIngredientId) return;
    try {
      await deleteIngredient(deletingIngredientId);
      setIngredients((prev) => prev.filter((i) => i.id !== deletingIngredientId));
      success('Đã xóa nguyên vật liệu thành công.');
      setDeletingIngredientId(null);
    } catch (err) {
      error('Không thể xóa nguyên vật liệu.');
    }
  };

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = categoryFilter === 'all' || p.categoryId === categoryFilter;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [products, categoryFilter, search]);

  // Selected ingredient live calculated cost in recipe builder
  const currentSelectedIng = useMemo(() => {
    return ingredients.find((i) => i.id === recipeSelectedIngId);
  }, [ingredients, recipeSelectedIngId]);

  return (
    <div className="space-y-5">
      {/* Top Header & Tab Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Quản lý Sản phẩm & Định lượng Giá vốn
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cấu hình món ăn, đồ uống, định lượng nguyên vật liệu (COGS) và biên lợi nhuận kinh doanh
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          {activeTab === 'products' ? (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm sản phẩm mới
            </button>
          ) : activeTab === 'ingredients' ? (
            <button
              type="button"
              onClick={handleOpenAddIngredient}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Thêm nguyên vật liệu (NVL)
            </button>
          ) : null}
        </div>
      </div>

      {/* Modern Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl max-w-xl text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'products'
              ? 'bg-white text-blue-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Sản phẩm ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ingredients')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'ingredients'
              ? 'bg-white text-emerald-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Kho Nguyên vật liệu ({ingredients.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('costing')}
          className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all ${
            activeTab === 'costing'
              ? 'bg-white text-purple-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Bảng tính Giá vốn & Lãi gộp</span>
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: DANH SÁCH SẢN PHẨM */}
      {/* =================================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên sản phẩm, mã SKU..."
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Tất cả danh mục ({products.length})</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Sản phẩm</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4 text-right">Giá vốn (COGS)</th>
                    <th className="py-3 px-4 text-right">Giá bán</th>
                    <th className="py-3 px-4 text-right">Lợi nhuận / ly</th>
                    <th className="py-3 px-4 text-center">Tồn kho</th>
                    <th className="py-3 px-4 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        Đang tải dữ liệu sản phẩm...
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Chưa có sản phẩm nào. Hãy bấm "Thêm sản phẩm mới" để bắt đầu!
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const profit = (p.sellingPrice || 0) - (p.costPrice || 0);
                      const marginPercent = p.sellingPrice > 0 ? Math.round((profit / p.sellingPrice) * 100) : 0;
                      const hasRecipe = p.recipeItems && p.recipeItems.length > 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div>
                                <div className="font-semibold text-slate-900 text-xs">{p.name}</div>
                                {hasRecipe ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingRecipeProduct(p)}
                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded mt-0.5 font-medium transition-colors"
                                  >
                                    <Sparkles className="w-3 h-3 text-emerald-600" />
                                    <span>Định lượng ({p.recipeItems!.length} NVL)</span>
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Giá vốn trực tiếp</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{p.sku || '--'}</td>
                          <td className="py-3 px-4 text-slate-600">{p.categoryName}</td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                            {formatCurrency(p.costPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-blue-600">
                            {formatCurrency(p.sellingPrice)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                            +{formatCurrency(profit)}
                            <div className="text-[10px] font-normal text-slate-400">
                              (Lãi {marginPercent}%)
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                p.stock <= (p.minStockAlert || 10)
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {p.stock} {p.unit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                                p.status === 'active'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {p.status === 'active' ? 'Đang bán' : 'Ngừng bán'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasRecipe && (
                                <button
                                  type="button"
                                  onClick={() => setViewingRecipeProduct(p)}
                                  className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                  title="Xem chi tiết định lượng"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-md transition-colors"
                                title="Chỉnh sửa sản phẩm"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingProductId(p.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: KHO NGUYÊN VẬT LIỆU (RAW INGREDIENTS) */}
      {/* =================================================================== */}
      {activeTab === 'ingredients' && (
        <div className="space-y-4">
          {/* Explanation Banner */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-emerald-900">
            <div className="flex items-start gap-2.5">
              <Scale className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Định lượng & Giá vốn Nguyên vật liệu thực tế:</span>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Nhập quy cách đóng gói (VD: 1kg cà phê giá 180,000₫ quy đổi ra 1,000 gam = 180₫/g; 1 lít sữa giá 34,000₫ quy đổi 1,000 ml = 34₫/ml; 1 cây ly 50 bộ = 1,300₫/bộ). Hệ thống tự động tính giá vốn chính xác cho từng ly khi định lượng!
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenAddIngredient}
              className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Thêm NVL mới
            </button>
          </div>

          {/* Ingredients Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Tên nguyên vật liệu</th>
                    <th className="py-3 px-4">Mã SKU</th>
                    <th className="py-3 px-4 text-right">Giá nhập</th>
                    <th className="py-3 px-4 text-center">Đơn vị nhập</th>
                    <th className="py-3 px-4 text-center">Quy đổi</th>
                    <th className="py-3 px-4 text-right">Đơn giá tiêu hao (Định lượng)</th>
                    <th className="py-3 px-4 text-center">Tồn kho</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ingredients.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        Chưa có nguyên vật liệu nào. Bấm "Thêm nguyên vật liệu" để bắt đầu!
                      </td>
                    </tr>
                  ) : (
                    ingredients.map((ing) => {
                      const costPerUnit = ing.costPerUsageUnit || Math.round(ing.importPrice / ing.conversionRate);
                      return (
                        <tr key={ing.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{ing.name}</div>
                            {ing.notes && <div className="text-[11px] text-slate-400 mt-0.5">{ing.notes}</div>}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">{ing.sku || '--'}</td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-800">
                            {formatCurrency(ing.importPrice)}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-700">{ing.importUnit}</td>
                          <td className="py-3 px-4 text-center text-slate-600 font-mono">
                            1 {ing.importUnit} = {ing.conversionRate} {ing.usageUnit}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 bg-emerald-50/50">
                            {costPerUnit.toLocaleString('vi-VN')} ₫ / {ing.usageUnit}
                          </td>
                          <td className="py-3 px-4 text-center font-mono">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                                ing.stock <= ing.minStockAlert
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {ing.stock.toLocaleString('vi-VN')} {ing.usageUnit}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditIngredient(ing)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-slate-100 rounded-md transition-colors"
                                title="Sửa nguyên vật liệu"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingIngredientId(ing.id)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-md transition-colors"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: BẢNG TÍNH GIÁ VỐN & BIÊN LỢI NHUẬN (MENU COSTING MATRIX) */}
      {/* =================================================================== */}
      {activeTab === 'costing' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Phân tích Giá vốn & Biên lợi nhuận toàn bộ Menu
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Giúp chủ kinh doanh kiểm soát chặt chẽ tỷ suất lợi nhuận gộp từng món, tránh bán lỗ hoặc định giá chưa tối ưu
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Tên món / Sản phẩm</th>
                    <th className="py-3 px-4">Danh mục</th>
                    <th className="py-3 px-4 text-center">Phương pháp</th>
                    <th className="py-3 px-4 text-right">Giá bán (₫)</th>
                    <th className="py-3 px-4 text-right">Giá vốn COGS (₫)</th>
                    <th className="py-3 px-4 text-right">Lợi nhuận gộp / ly (₫)</th>
                    <th className="py-3 px-4 text-center">Tỷ suất lợi nhuận (%)</th>
                    <th className="py-3 px-4 text-center">Đánh giá</th>
                    <th className="py-3 px-4 text-right">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((p) => {
                    const profit = (p.sellingPrice || 0) - (p.costPrice || 0);
                    const margin = p.sellingPrice > 0 ? Math.round((profit / p.sellingPrice) * 100) : 0;
                    const hasRecipe = p.recipeItems && p.recipeItems.length > 0;

                    let ratingBadge = (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Lợi nhuận tốt (≥65%)
                      </span>
                    );
                    if (margin < 45) {
                      ratingBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Biên lãi thấp (&lt;45%)
                        </span>
                      );
                    } else if (margin < 65) {
                      ratingBadge = (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                          Trung bình (45-65%)
                        </span>
                      );
                    }

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                        <td className="py-3 px-4 text-slate-600">{p.categoryName}</td>
                        <td className="py-3 px-4 text-center">
                          {hasRecipe ? (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded text-[10px]">
                              Định lượng ({p.recipeItems!.length} NVL)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                              Giá vốn trực tiếp
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-blue-700">
                          {formatCurrency(p.sellingPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700 font-medium">
                          {formatCurrency(p.costPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-600">
                          +{formatCurrency(profit)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold font-mono text-sm">
                          <span className={margin >= 65 ? 'text-emerald-700' : margin >= 45 ? 'text-amber-700' : 'text-rose-700'}>
                            {margin}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">{ratingBadge}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(p)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          >
                            Chỉnh sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* PRODUCT ADD / EDIT MODAL */}
      {/* =================================================================== */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'Chỉnh sửa sản phẩm & Định lượng' : 'Thêm sản phẩm mới'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                Tên sản phẩm *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="VD: Cà phê sữa đá Sài Gòn"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                Mã SKU
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                placeholder="VD: CF-SUA"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                Danh mục *
              </label>
              <select
                required
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chọn danh mục --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                Đơn vị tính bán
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="Ly, Phần, Ổ, Lon..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                Trạng thái
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white"
              >
                <option value="active">Đang bán</option>
                <option value="inactive">Ngừng bán</option>
              </select>
            </div>
          </div>

          {/* Pricing & Costing Method Selector */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
                <Calculator className="w-4 h-4 text-blue-600" />
                <span>Phương thức thiết lập Giá vốn (COGS)</span>
              </label>

              <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, costingMethod: 'direct' }))}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    formData.costingMethod === 'direct'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Nhập trực tiếp (Cố định)
                </button>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, costingMethod: 'recipe' }))}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                    formData.costingMethod === 'recipe'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>⚡ Định lượng theo NVL</span>
                </button>
              </div>
            </div>

            {/* If Recipe Method is Selected */}
            {formData.costingMethod === 'recipe' ? (
              <div className="space-y-3 pt-1 border-t border-slate-200">
                <div className="text-[11px] text-emerald-800 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <span className="font-bold">Định lượng món ăn / thức uống:</span> Chọn các nguyên vật liệu cấu thành (VD: 20g bột cà phê, 30g sữa đặc, 1 bộ ly nắp mang đi). Hệ thống sẽ tự động tính chính xác tổng giá vốn theo đơn giá thực tế của kho NVL!
                </div>

                {/* Recipe input controls */}
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <div className="flex-1 w-full">
                    <select
                      value={recipeSelectedIngId}
                      onChange={(e) => setRecipeSelectedIngId(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                    >
                      <option value="">-- Chọn nguyên vật liệu cấu thành --</option>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={ing.id}>
                          {ing.name} ({ing.costPerUsageUnit}₫/{ing.usageUnit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0.1"
                        step="any"
                        value={recipeUsageQty}
                        onChange={(e) => setRecipeUsageQty(Number(e.target.value))}
                        placeholder="Số lượng"
                        className="w-20 px-2 py-1.5 text-xs border border-slate-300 rounded text-right font-mono"
                      />
                      <span className="text-xs text-slate-500 font-medium">
                        {currentSelectedIng?.usageUnit || 'g'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddRecipeItem}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition-colors shrink-0"
                    >
                      + Thêm vào món
                    </button>
                  </div>
                </div>

                {/* Recipe items list */}
                {formData.recipeItems.length > 0 ? (
                  <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100 overflow-hidden text-xs">
                    {formData.recipeItems.map((item) => (
                      <div key={item.ingredientId} className="px-3 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{item.ingredientName}:</span>
                          <span className="text-slate-600 font-mono">
                            {item.usageQuantity} {item.usageUnit}
                          </span>
                          <span className="text-slate-400 text-[10px]">
                            (@{item.costPerUnit}₫/{item.usageUnit})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 font-mono">
                            = {formatCurrency(item.subtotalCost)}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeItem(item.ingredientId)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                            title="Xóa nguyên liệu này"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="p-2.5 bg-slate-50 flex items-center justify-between font-bold text-slate-900 border-t border-slate-200">
                      <span>TỔNG GIÁ VỐN ĐỊNH LƯỢNG (COGS):</span>
                      <span className="text-emerald-700 font-mono text-sm">
                        {formatCurrency(formData.recipeItems.reduce((s, i) => s + i.subtotalCost, 0))}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-400 italic bg-white border border-dashed border-slate-200 rounded-lg">
                    Chưa có nguyên liệu nào trong định lượng. Hãy chọn NVL ở trên và bấm "Thêm vào món".
                  </div>
                )}
              </div>
            ) : (
              /* Direct Cost Price Input */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                    Giá vốn trực tiếp (₫)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={formData.costPrice || ''}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) || 0 })}
                    placeholder="VD: 12000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-right font-mono"
                  />
                </div>
                <div className="text-[11px] text-slate-500 flex items-center pt-5">
                  Giá vốn mua vào hoặc ước tính trực tiếp của sản phẩm.
                </div>
              </div>
            )}

            {/* Selling Price & Margin Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                  Giá bán sản phẩm * (₫)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  value={formData.sellingPrice || ''}
                  onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) || 0 })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-right font-mono font-bold text-blue-600 text-sm"
                />
              </div>

              {/* Profit & Margin Display */}
              <div className="sm:col-span-2 bg-blue-50/70 border border-blue-200 p-2.5 rounded-lg flex items-center justify-between text-xs">
                <div>
                  <div className="text-slate-500 text-[11px]">Lợi nhuận gộp / ly:</div>
                  <div className="font-bold text-slate-900 font-mono text-sm">
                    {formatCurrency((formData.sellingPrice || 0) - (formData.costPrice || 0))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-500 text-[11px]">Biên lợi nhuận gộp:</div>
                  <div className="font-black text-blue-700 font-mono text-sm">
                    {formData.sellingPrice > 0
                      ? Math.round((((formData.sellingPrice - formData.costPrice) / formData.sellingPrice) * 100))
                      : 0}
                    %
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stock & Image */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                Tồn kho ban đầu
              </label>
              <input
                type="number"
                min="0"
                value={formData.stock || ''}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-right font-mono"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
                Cảnh báo hết hàng (&lt;=)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minStockAlert || ''}
                onChange={(e) => setFormData({ ...formData, minStockAlert: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg text-right font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase text-slate-700 block mb-1">
              Link hình ảnh sản phẩm (URL)
            </label>
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Toppings / Options */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
            <label className="text-xs font-bold uppercase text-slate-800 block">
              Topping / Lựa chọn thêm (F&B)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={toppingName}
                onChange={(e) => setToppingName(e.target.value)}
                placeholder="Tên topping (VD: Trân châu trắng, Thạch phô mai)"
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded"
              />
              <input
                type="number"
                min="0"
                step="1000"
                value={toppingPrice || ''}
                onChange={(e) => setToppingPrice(Number(e.target.value) || 0)}
                placeholder="Giá (+₫)"
                className="w-24 px-2 py-1.5 text-xs bg-white border border-slate-300 rounded text-right"
              />
              <button
                type="button"
                onClick={handleAddTopping}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
              >
                Thêm
              </button>
            </div>

            {formData.toppings.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {formData.toppings.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded text-xs text-slate-700"
                  >
                    <span>
                      {t.name} (+{formatCurrency(t.price)})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTopping(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs flex items-center gap-1.5"
            >
              {isSubmitting ? 'Đang lưu...' : editingProduct ? 'Lưu thay đổi' : 'Thêm sản phẩm'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =================================================================== */}
      {/* INGREDIENT ADD / EDIT MODAL */}
      {/* =================================================================== */}
      <Modal
        isOpen={isIngredientModalOpen}
        onClose={() => setIsIngredientModalOpen(false)}
        title={editingIngredient ? 'Chỉnh sửa Nguyên vật liệu' : 'Thêm Nguyên vật liệu mới'}
        maxWidth="md"
      >
        <form onSubmit={handleSaveIngredientSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="font-semibold uppercase text-slate-700 block mb-1">
              Tên nguyên vật liệu *
            </label>
            <input
              type="text"
              required
              value={ingredientFormData.name}
              onChange={(e) => setIngredientFormData({ ...ingredientFormData, name: e.target.value })}
              placeholder="VD: Cà phê Robusta mộc xay, Sữa đặc Phương Nam, Sữa tươi Dalat Milk..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold uppercase text-slate-700 block mb-1">
                Mã NVL / SKU
              </label>
              <input
                type="text"
                value={ingredientFormData.sku}
                onChange={(e) => setIngredientFormData({ ...ingredientFormData, sku: e.target.value })}
                placeholder="VD: NVL-CF-ROB"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="font-semibold uppercase text-slate-700 block mb-1">
                Đơn vị nhập hàng
              </label>
              <input
                type="text"
                value={ingredientFormData.importUnit}
                onChange={(e) => setIngredientFormData({ ...ingredientFormData, importUnit: e.target.value })}
                placeholder="kg, lít, hộp, thùng, cây..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold uppercase text-slate-700 block mb-1">
                Giá mua vào 1 đơn vị nhập (₫) *
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                required
                value={ingredientFormData.importPrice || ''}
                onChange={(e) => setIngredientFormData({ ...ingredientFormData, importPrice: Number(e.target.value) || 0 })}
                placeholder="VD: 180000"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right font-mono font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="font-semibold uppercase text-slate-700 block mb-1">
                Đơn vị định lượng tiêu hao
              </label>
              <input
                type="text"
                value={ingredientFormData.usageUnit}
                onChange={(e) => setIngredientFormData({ ...ingredientFormData, usageUnit: e.target.value })}
                placeholder="g, ml, cái, lát, muỗng..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold uppercase text-slate-700 block mb-1">
              Tỷ lệ quy đổi (1 {ingredientFormData.importUnit || 'đơn vị nhập'} = bao nhiêu {ingredientFormData.usageUnit || 'đơn vị tiêu hao'}?) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={ingredientFormData.conversionRate || ''}
              onChange={(e) => setIngredientFormData({ ...ingredientFormData, conversionRate: Number(e.target.value) || 1 })}
              placeholder="VD: 1000 (nếu 1kg = 1000g; 1 lít = 1000ml; 1 cây = 50 cái)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right font-mono"
            />
          </div>

          {/* Real-time Calculation Badge */}
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-800 font-semibold">
                Đơn giá tiêu hao tính toán:
              </div>
              <div className="text-[11px] text-emerald-600">
                1 {ingredientFormData.importUnit || 'kg'} ({formatCurrency(ingredientFormData.importPrice)}) ÷ {ingredientFormData.conversionRate} {ingredientFormData.usageUnit || 'g'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-emerald-800 font-mono">
                {Math.round(
                  (ingredientFormData.importPrice || 0) / Math.max(1, ingredientFormData.conversionRate || 1)
                ).toLocaleString('vi-VN')}{' '}
                ₫ / {ingredientFormData.usageUnit || 'g'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold uppercase text-slate-700 block mb-1">
                Tồn kho ({ingredientFormData.usageUnit})
              </label>
              <input
                type="number"
                min="0"
                value={ingredientFormData.stock || ''}
                onChange={(e) => setIngredientFormData({ ...ingredientFormData, stock: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right font-mono"
              />
            </div>
            <div>
              <label className="font-semibold uppercase text-slate-700 block mb-1">
                Cảnh báo sắp hết
              </label>
              <input
                type="number"
                min="0"
                value={ingredientFormData.minStockAlert || ''}
                onChange={(e) => setIngredientFormData({ ...ingredientFormData, minStockAlert: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-right font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold uppercase text-slate-700 block mb-1">
              Ghi chú định lượng / Nhà cung cấp
            </label>
            <input
              type="text"
              value={ingredientFormData.notes}
              onChange={(e) => setIngredientFormData({ ...ingredientFormData, notes: e.target.value })}
              placeholder="VD: Mua tại Đại lý Trung Nguyên, pha được 45 ly..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsIngredientModalOpen(false)}
              className="px-4 py-2 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs"
            >
              {editingIngredient ? 'Cập nhật NVL' : 'Lưu nguyên vật liệu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* =================================================================== */}
      {/* VIEW RECIPE DETAILS MODAL */}
      {/* =================================================================== */}
      {viewingRecipeProduct && (
        <Modal
          isOpen={Boolean(viewingRecipeProduct)}
          onClose={() => setViewingRecipeProduct(null)}
          title={`Bảng định lượng: ${viewingRecipeProduct.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-slate-500">Giá bán hiện tại:</span>
                <span className="font-bold text-blue-700 ml-1.5 font-mono text-sm">
                  {formatCurrency(viewingRecipeProduct.sellingPrice)}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Giá vốn (COGS):</span>
                <span className="font-bold text-emerald-700 ml-1.5 font-mono text-sm">
                  {formatCurrency(viewingRecipeProduct.costPrice)}
                </span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
              <div className="bg-slate-50 px-3 py-2 font-semibold text-slate-600 grid grid-cols-12">
                <span className="col-span-5">Nguyên vật liệu</span>
                <span className="col-span-3 text-center">Định lượng</span>
                <span className="col-span-4 text-right">Chi phí vốn</span>
              </div>
              {viewingRecipeProduct.recipeItems && viewingRecipeProduct.recipeItems.length > 0 ? (
                viewingRecipeProduct.recipeItems.map((item, idx) => (
                  <div key={idx} className="px-3 py-2.5 grid grid-cols-12 items-center">
                    <span className="col-span-5 font-semibold text-slate-900">{item.ingredientName}</span>
                    <span className="col-span-3 text-center font-mono text-slate-700">
                      {item.usageQuantity} {item.usageUnit}
                    </span>
                    <span className="col-span-4 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(item.subtotalCost)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-slate-400">Chưa có công thức định lượng chi tiết.</div>
              )}
            </div>

            {/* Profit Margin Summary */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-emerald-800 font-bold">Lợi nhuận gộp trên 1 phần bán:</div>
                <div className="text-[11px] text-emerald-700">
                  {formatCurrency(viewingRecipeProduct.sellingPrice - viewingRecipeProduct.costPrice)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-emerald-800 font-semibold">Tỷ suất sinh lời:</div>
                <div className="text-base font-black text-emerald-900 font-mono">
                  {viewingRecipeProduct.sellingPrice > 0
                    ? Math.round(
                        ((viewingRecipeProduct.sellingPrice - viewingRecipeProduct.costPrice) /
                          viewingRecipeProduct.sellingPrice) *
                          100
                      )
                    : 0}
                  %
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRecipeProduct(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Product Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingProductId)}
        onClose={() => setDeletingProductId(null)}
        onConfirm={handleDelete}
        title="Xóa sản phẩm"
        message="Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác này không thể hoàn tác."
        confirmLabel="Xóa sản phẩm"
      />

      {/* Delete Ingredient Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingIngredientId)}
        onClose={() => setDeletingIngredientId(null)}
        onConfirm={handleDeleteIngredient}
        title="Xóa nguyên vật liệu"
        message="Bạn có chắc chắn muốn xóa nguyên vật liệu này? Các món sử dụng định lượng này có thể bị ảnh hưởng."
        confirmLabel="Xóa nguyên vật liệu"
      />
    </div>
  );
};
