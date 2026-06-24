'use client';

import { useRef } from 'react';

/**
 * 더블클릭/연타로 같은 제출이 여러 번 들어가는 것을 막는다.
 * disabled 는 리렌더 후에야 적용돼 아주 빠른 연타를 못 막으므로,
 * ref 로 즉시 잠그고 mutation 이 끝나면(onSettled) 해제한다.
 *
 * 사용: const guard = useSubmitGuard(); ... guard(post.mutate, { data });
 */
export function useSubmitGuard() {
  const busy = useRef(false);
  return function run<V>(mutate: (vars: V, opts?: { onSettled?: () => void }) => void, vars: V) {
    if (busy.current) return;
    busy.current = true;
    mutate(vars, { onSettled: () => { busy.current = false; } });
  };
}
