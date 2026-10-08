export function formatCurrency(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatDateTime(dateStr?: string | Date): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

export function formatDateOnly(dateStr?: string | Date): string {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '--';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(d);
}

export function getRemainingDays(endDateStr?: string): { days: number; isExpired: boolean; label: string } {
  if (!endDateStr) return { days: 0, isExpired: true, label: 'Chưa kích hoạt' };
  const end = new Date(endDateStr);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { days: 0, isExpired: true, label: 'Đã hết hạn' };
  }
  return { days: diffDays, isExpired: false, label: `Còn ${diffDays} ngày` };
}

export function generateOrderNumber(): string {
  const date = new Date();
  const datePart = `${date.getFullYear().toString().slice(-2)}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `DP-${datePart}-${randomPart}`;
}
