# KMA Clinic 디자인 시스템 / 공통 컴포넌트 계약서

이 문서는 Figma "병의원" 디자인을 코드로 구현할 때 **반드시 따라야 하는 규칙**과
재사용 컴포넌트 목록입니다. 새 페이지는 항상 이 컴포넌트들을 우선 사용하세요.

## 0. 기술 스택 / 컨벤션

- **TanStack Start (파일 기반 라우팅)**. 라우트 파일은 `src/routes/*.tsx`.
  - 패턴: `export const Route = createFileRoute("/path")({ component: Page })`
  - 중첩 경로는 점 표기: `hospital.confirm.tsx` → `/hospital/confirm`
  - 동적 경로: `board.$id.tsx` → `/board/$id`
  - 라우트 추가 후 `pnpm generate-routes` 로 트리 재생성 (작성자가 일괄 수행).
- **shadcn × @base-ui/react** (radix 아님). 들여쓰기는 **탭**, import alias `#/`.
- **Biome** 포맷. 문자열은 한글 그대로. `cn()` 는 `#/lib/utils.ts`.
- 백엔드 없음 → 더미 데이터/로컬 `useState` 로 동작. 폼은 제출해도 됨(no-op).
- **반응형 필수**: 데스크탑(디자인 px) → 모바일(MO 프레임처럼 1단 스택).
- **크기 정확도**: 입력 56px, 메인 버튼 64px, 컨테이너 폭 등 디자인 수치를 지킬 것.

## 1. 디자인 토큰 (Tailwind 유틸로 사용)

색상 유틸(예: `text-ink`, `bg-brand`, `border-line`):

- `brand`(#2a64f6) `brand-700`(hover) `brand-50`(#eff6ff) `brand-100`(#dbeafe)
- `ink`(#1e2124 제목) `ink-soft` `body`(#464c53 본문) `body-soft`(#58616a) `muted-fg`(#8a949e placeholder)
- `line`(#e2e8f0 입력테두리) `line-soft`(#e5e7eb) `line-strong`(#cdd1d5 디바이더)
- `app-bg`(#f4f5f7) `surface`(흰색) `danger`/`danger-strong` `success`/`success-bg`
- 폰트: Pretendard (전역 기본). 자간은 전역 -0.025em 적용됨.
- 섹션 제목 막대: `SectionTitle` 컴포넌트 또는 `.section-bar` 유틸.

## 2. 레이아웃

- **인증 화면** (`/login` 등): `AuthShell` (`#/components/common/auth-shell.tsx`)
  - `<AuthShell title="로그인" eyebrow="서비스명">…</AuthShell>` (흰 배경, max 1200, 제목+구분선)
  - 2단 폼/안내: `AuthColumns`, 우측 안내: `AuthAside` (`#/components/common/auth-aside.tsx`)
- **앱 화면** (로그인 이후, 헤더+회색배경+푸터): `AppShell` (`#/components/layout/app-shell.tsx`)
  - `<AppShell steps={STEPS} current={0} userName="원장님" maxWidth="1100px" bottomBar={<StickyActionBar .../>}>`
  - 단계 표시는 `steps`(Step[] = {label}) 전달 시 헤더 중앙에 `Stepper` 렌더.
- 헤더/푸터 단독: `AppHeader`, `SiteFooter` (`#/components/layout/`), 로고 `BrandLogo`.
- 하단 액션: `StickyActionBar`({left,center,right}) / `PageActions` (`#/components/layout/action-bar.tsx`)

## 3. 폼 (`#/components/form/`)

- `Field` / `FieldGroup`(세로 32px) / `FieldRow`(가로) / `FieldLabel`(required→빨간 *) /
  `FieldDescription`(회색 도움말) / `FieldError`(빨간 에러) — `field.tsx`
- `FieldInput`(56px, `endAdornment` 지원) / `FieldTextarea` — `field-input.tsx`
  - 에러 표시는 `aria-invalid` 로 (빨간 2px 테두리 자동).
- `OptionGroup` / `OptionButton`(value, fluid) — 분절형 선택(통신사/유형 등) — `option-group.tsx`
- 조립 컴포넌트: `NameRrnFields`(성명+생년월일/성별), `PhoneVerifyFields`(통신사+휴대폰+인증번호)
- 기타 입력은 `#/components/ui/` 의 shadcn 컴포넌트 사용:
  `input` `textarea` `select` `checkbox` `switch` `slider` `label` `dialog` `button` `badge` `table`

## 4. 버튼 (`#/components/ui/button.tsx`)

`<Button variant size>` — 디자인 전용 추가분:
- variant: `brand`(파란 채움+그림자), `brand-outline`(파란 2px 외곽), `neutral-outline`(회색 외곽),
  그 외 기존: default/outline/secondary/ghost/destructive/link
- size: `2xl`(56px), `cta`(64px, 메인 제출), 그 외 xs/sm/default/lg/xl/icon\*

## 5. 카드 / 정보 (`#/components/common/`)

- `SectionCard`(흰 카드) / `SectionTitle`(파란 막대 제목, as h2|h3) / `SectionTitleRow`(제목+우측액션) — `section-card.tsx`
- `DataList` / `DataRow`(label, children) — 라벨↔값 정보 목록 — `data-list.tsx`
- `InfoCallout`(tone: info|success|warning|danger, icon) — 안내 박스 — `info-callout.tsx`
- `GuidelineList` / `GuidelineItem` — 회색 불릿 안내 — `guideline-list.tsx`
- `Badge`(variant: default|soft|secondary|outline|success|warning|destructive) — 칩/태그/상태

## 6. 페이지 작성 규칙

- 새 **공유** 컴포넌트가 꼭 필요하면 `#/components/common|form|layout` 에 추가하되, 파일명이
  겹치지 않게 하고 다른 페이지에서도 쓸 수 있도록 일반화하세요. 페이지 전용 소품은 라우트 파일 안에 둡니다.
- 더미 데이터는 파일 상단 상수로. 이미지가 필요하면 회색 placeholder 박스 + 라벨로 대체.
- 참고 레퍼런스: `src/routes/login.tsx` (검증된 인증 화면 예시). 앱 화면 레이아웃은
  `src/components/layout/app-shell.tsx`, 카드/정보는 `src/components/common/` 소스를 읽어 사용법 확인.
