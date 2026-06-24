/**
 * 아바타에 쓰는 글자. 성(첫 글자)은 겹치기 쉬워 이름의 가운데 글자를 쓴다.
 * 김가영 → 가, 김연주 → 연, 남궁민수 → 민.
 */
export function initial(name?: string | null) {
  if (!name) return '?';
  return name[Math.floor(name.length / 2)] ?? name[0] ?? '?';
}
