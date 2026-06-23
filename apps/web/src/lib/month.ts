/** 'YYYY-MM' → 다음 달 1일 'YYYY-MM-DD' (월 범위 조회의 배타적 상한). */
export function nextMonthFirst(month: string): string {
  const parts = month.split('-').map(Number);
  const y = parts[0]!;
  const m = parts[1]!;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-01`;
}
