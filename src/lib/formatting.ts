export function formatCompactNumber(n: number | null | undefined): string {
  if (n == null) return '0';
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = 'SLE',
  opts?: { compact?: boolean; decimals?: number }
): string {
  if (amount == null) return `${currency} 0`;
  if (opts?.compact) {
    return `${currency} ${formatCompactNumber(amount)}`;
  }
  const decimals = opts?.decimals ?? 0;
  return `${currency} ${amount.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

export function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
