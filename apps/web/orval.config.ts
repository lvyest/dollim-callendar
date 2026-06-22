import { defineConfig } from 'orval';

// packages/contracts 에서 생성한 openapi.json → 타입드 react-query 훅 생성.
// 실행: pnpm api:gen  (contracts openapi 생성 후 orval)
export default defineConfig({
  dollim: {
    input: {
      target: '../../packages/contracts/openapi.json',
    },
    output: {
      mode: 'tags-split',
      target: 'src/lib/api/generated',
      schemas: 'src/lib/api/generated/model',
      client: 'react-query',
      clean: true,
      override: {
        mutator: {
          path: 'src/lib/api/http.ts',
          name: 'customFetch',
        },
        query: {
          useQuery: true,
          useMutation: true,
        },
      },
    },
  },
});
