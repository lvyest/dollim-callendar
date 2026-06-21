/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // 새 기능
        'fix', // 버그 수정
        'refactor', // 동작 변화 없는 코드 개선
        'perf', // 성능 개선
        'docs', // 문서
        'style', // 포맷/세미콜론 등 (동작 변화 없음)
        'test', // 테스트 추가/수정
        'build', // 빌드 시스템/의존성
        'ci', // CI 설정
        'chore', // 기타 잡일
        'revert', // 되돌리기
      ],
    ],
    // Scopes mirror the workspace layout — keep commits attributable to a package/area.
    'scope-enum': [
      2,
      'always',
      ['web', 'contracts', 'db', 'ui', 'auth', 'deps', 'release', 'repo'],
    ],
    'scope-empty': [1, 'never'],
    // 한글 제목 + 고유명사(Supabase, Next 등)를 허용하기 위해 대소문자 규칙 비활성화.
    'subject-case': [0],
    'body-max-line-length': [0, 'always'],
  },
};
