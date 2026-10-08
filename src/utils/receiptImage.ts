import { Order, Store } from '../types';
import { formatCurrency, formatDateTime } from './format';

export interface ReceiptRenderOptions {
  hideBranding?: boolean;
}

/**
 * Renders an ultra-sharp, high-resolution invoice image directly to HTML5 Canvas.
 * This does not rely on DOM CSS parsing or external styles, completely avoiding
 * any oklch color parsing errors or stylesheet incompatibilities.
 */
export async function generateReceiptCanvas(
  order: Order,
  store: Store | null,
  options?: ReceiptRenderOptions
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not available');
  }

  const hideBranding = Boolean(options?.hideBranding);

  // Visual layout dimensions (CSS pixels)
  const width = 480;
  const padding = 28;
  const contentWidth = width - padding * 2;
  const scale = 2; // 2x Retina scale for crisp text on mobile / desktop

  // Helper for text wrapping
  const wrapText = (text: string, maxWidth: number, font: string): string[] => {
    ctx.font = font;
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      lines.push(currentLine);
    }
    return lines;
  };

  // Pre-calculate dynamic canvas height
  let estimatedHeight = padding * 2;
  // Header: Store name, address, phone, title badge
  estimatedHeight += 40 + 20 + 20 + 44 + 20;
  // Order info lines
  estimatedHeight += 24 * 5 + 16;
  // Table header
  estimatedHeight += 32;

  // Item rows calculation
  order.items.forEach((item) => {
    const nameLines = wrapText(item.productName, contentWidth * 0.55, 'bold 13px sans-serif');
    estimatedHeight += Math.max(nameLines.length * 18, 22) + 6;
    if (item.selectedToppings && item.selectedToppings.length > 0) {
      estimatedHeight += 16 * item.selectedToppings.length;
    }
    if (item.note) {
      estimatedHeight += 18;
    }
    estimatedHeight += 8; // spacing
  });

  // Totals & Payment breakdown
  estimatedHeight += 24 * 4 + 40; // Subtotal, discount, surcharge, GRAND TOTAL
  estimatedHeight += 22 * 4; // Payment method, customer paid, change
  // Footer
  estimatedHeight += 60;

  // Setup canvas size with DPI scaling
  canvas.width = width * scale;
  canvas.height = estimatedHeight * scale;
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, estimatedHeight);

  // Outer border with subtle corner roundness
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.strokeRect(1, 1, width - 2, estimatedHeight - 2);

  let y = padding;

  // 1. STORE HEADER
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 20px "Segoe UI", Roboto, Arial, sans-serif';
  const storeName = (store?.name || 'DopiPOS Store').toUpperCase();
  ctx.fillText(storeName, width / 2, y + 16);
  y += 26;

  if (store?.address) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(store.address, width / 2, y + 12);
    y += 18;
  }

  if (store?.phone) {
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(`Hotline: ${store.phone}`, width / 2, y + 12);
    y += 18;
  }

  y += 8;

  // BADGE: HÓA ĐƠN BÁN HÀNG
  const badgeWidth = 200;
  const badgeHeight = 28;
  const badgeX = (width - badgeWidth) / 2;
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(badgeX, y, badgeWidth, badgeHeight, 6) : ctx.rect(badgeX, y, badgeWidth, badgeHeight);
  ctx.fill();

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 13px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('HÓA ĐƠN BÁN HÀNG', width / 2, y + 19);
  y += badgeHeight + 16;

  // Dashed line drawer
  const drawDashedLine = (lineY: number) => {
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.moveTo(padding, lineY);
    ctx.lineTo(width - padding, lineY);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  drawDashedLine(y);
  y += 14;

  // 2. ORDER METADATA
  const drawMetaRow = (label: string, value: string, isHighlight = false) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(label, padding, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = isHighlight ? '#1d4ed8' : '#0f172a';
    ctx.font = isHighlight ? 'bold 12px monospace' : '500 12px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(value, width - padding, y);
    y += 20;
  };

  drawMetaRow('Mã hóa đơn:', order.orderNumber, true);
  drawMetaRow('Thời gian:', formatDateTime(order.createdAt));
  if (order.tableName) {
    drawMetaRow('Bàn / Phòng:', order.tableName, true);
  }
  if (order.customerName) {
    drawMetaRow('Khách hàng:', order.customerName);
  }
  const typeText = order.orderType === 'dine_in' ? 'Tại quán' : order.orderType === 'takeaway' ? 'Mang đi' : 'Giao hàng';
  drawMetaRow('Hình thức phục vụ:', typeText);

  y += 6;
  drawDashedLine(y);
  y += 14;

  // 3. TABLE HEADER
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(padding, y - 4, contentWidth, 24);

  ctx.font = 'bold 11px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.fillText('MẶT HÀNG', padding + 4, y + 12);
  ctx.textAlign = 'center';
  ctx.fillText('SL', padding + contentWidth * 0.62, y + 12);
  ctx.textAlign = 'right';
  ctx.fillText('THÀNH TIỀN', width - padding - 4, y + 12);
  y += 26;

  // 4. ITEMS LIST
  order.items.forEach((item) => {
    const itemStartY = y;
    const nameMaxWidth = contentWidth * 0.55;
    const nameLines = wrapText(item.productName, nameMaxWidth, 'bold 12px "Segoe UI", Roboto, Arial, sans-serif');

    // Draw item name lines
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px "Segoe UI", Roboto, Arial, sans-serif';
    nameLines.forEach((line, idx) => {
      ctx.fillText(line, padding + 4, itemStartY + 14 + idx * 16);
    });

    const textBottomY = itemStartY + 14 + (nameLines.length - 1) * 16;

    // Draw Quantity
    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155';
    ctx.font = '600 12px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(`${item.quantity}`, padding + contentWidth * 0.62, itemStartY + 14);

    // Draw Subtotal
    ctx.textAlign = 'right';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(formatCurrency(item.subtotal), width - padding - 4, itemStartY + 14);

    y = textBottomY + 16;

    // Toppings
    if (item.selectedToppings && item.selectedToppings.length > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "Segoe UI", Roboto, Arial, sans-serif';
      item.selectedToppings.forEach((t) => {
        ctx.fillText(`+ ${t.name} (${formatCurrency(t.price)})`, padding + 12, y);
        y += 14;
      });
    }

    // Notes
    if (item.note) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#b45309';
      ctx.font = 'italic 10px "Segoe UI", Roboto, Arial, sans-serif';
      ctx.fillText(`Ghi chú: ${item.note}`, padding + 12, y);
      y += 14;
    }

    // Item separator line (very light)
    ctx.beginPath();
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.moveTo(padding + 4, y);
    ctx.lineTo(width - padding - 4, y);
    ctx.stroke();
    y += 8;
  });

  drawDashedLine(y);
  y += 16;

  // 5. TOTALS
  const drawSummaryRow = (label: string, value: string, color = '#475569', bold = false) => {
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = bold ? 'bold 12px "Segoe UI", Roboto, Arial, sans-serif' : '12px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(label, padding, y);

    ctx.textAlign = 'right';
    ctx.font = bold ? 'bold 13px monospace' : '12px monospace';
    ctx.fillText(value, width - padding, y);
    y += 20;
  };

  drawSummaryRow('Tạm tính:', formatCurrency(order.subtotal));

  if (order.discount > 0) {
    drawSummaryRow('Giảm giá:', `-${formatCurrency(order.discount)}`, '#e11d48', true);
  }
  if (order.surcharge > 0) {
    drawSummaryRow('Phụ thu:', `+${formatCurrency(order.surcharge)}`, '#475569');
  }

  // GRAND TOTAL HIGHLIGHT BOX
  y += 4;
  const totalBoxHeight = 40;
  ctx.fillStyle = '#eff6ff';
  ctx.beginPath();
  ctx.roundRect
    ? ctx.roundRect(padding, y, contentWidth, totalBoxHeight, 8)
    : ctx.rect(padding, y, contentWidth, totalBoxHeight);
  ctx.fill();
  ctx.strokeStyle = '#bfdbfe';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e3a8a';
  ctx.font = 'bold 13px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('TỔNG THANH TOÁN:', padding + 12, y + 25);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#1d4ed8';
  ctx.font = 'bold 17px monospace';
  ctx.fillText(formatCurrency(order.total), width - padding - 12, y + 26);
  y += totalBoxHeight + 16;

  // 6. PAYMENT BREAKDOWN
  const paymentMethodName =
    order.paymentMethod === 'cash'
      ? 'Tiền mặt'
      : order.paymentMethod === 'transfer'
      ? 'Chuyển khoản ngân hàng'
      : 'Tiền mặt + Chuyển khoản';
  drawSummaryRow('Phương thức:', paymentMethodName, '#334155');

  if (order.amountReceived && order.amountReceived > 0) {
    drawSummaryRow('Khách đưa:', formatCurrency(order.amountReceived), '#475569');
  }
  if (order.changeGiven !== undefined && order.changeGiven > 0) {
    drawSummaryRow('Tiền thừa trả khách:', formatCurrency(order.changeGiven), '#15803d', true);
  }
  if (order.paymentMethod === 'split') {
    const splitDetail = `Tiền mặt: ${formatCurrency(order.cashAmount || 0)} | CK: ${formatCurrency(order.transferAmount || 0)}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '11px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText(`(${splitDetail})`, padding + 12, y);
    y += 18;
  }

  y += 4;
  drawDashedLine(y);
  y += 18;

  // 7. FOOTER
  ctx.textAlign = 'center';
  ctx.fillStyle = '#334155';
  ctx.font = 'bold 12px "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillText('Cảm ơn quý khách và hẹn gặp lại!', width / 2, y);

  if (!hideBranding) {
    y += 18;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Segoe UI", Roboto, Arial, sans-serif';
    ctx.fillText('Hóa đơn điện tử khởi tạo từ DopiPOS POS System', width / 2, y);
  }

  return canvas;
}

/**
 * Downloads invoice PNG image directly to user's device.
 * 100% reliable and instantaneous on all browsers & mobile devices.
 */
export async function downloadReceiptImage(
  order: Order,
  store: Store | null,
  options?: ReceiptRenderOptions
): Promise<void> {
  const canvas = await generateReceiptCanvas(order, store, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Không thể xuất dữ liệu ảnh từ canvas'));
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hoadon_${order.orderNumber || 'dopipos'}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}
