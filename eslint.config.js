import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Galaxy WebView 의 React 합성 이벤트 중복 발사 회피 — DOM 요소의 raw onClick 금지.
      // 반드시 TapButton / TapDiv / useNativeTap 을 경유할 것.
      // 커스텀 컴포넌트 prop (<StartButton onClick={...} />) 은 허용 — 소문자 태그만 차단.
      // 불가피한 예외는 `// eslint-disable-next-line no-restricted-syntax -- reason` 로 사유 명시.
      'no-restricted-syntax': ['error',
        {
          selector: "JSXOpeningElement[name.type='JSXIdentifier'][name.name=/^[a-z]/] > JSXAttribute[name.name='onClick']",
          message: 'DOM 요소에 raw onClick 금지 — TapButton / TapDiv / useNativeTap 을 쓰세요 (Galaxy WebView 더블탭 방지).',
        },
      ],
    },
  },
])
