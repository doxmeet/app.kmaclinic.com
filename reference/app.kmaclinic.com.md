# app.kmaclinic.com — 가입/결제 콘솔 API 가이드 (자기완결형)

`app.kmaclinic.com` 은 의사가 **처음 가입(온보딩)** 하고 **결제(구독)** 를 설정하는 콘솔입니다.
**그 외 일상 관리는 이곳에서 하지 않습니다.**
- 의사 프로필의 이후 수정 → 의사 본인 도메인 `<slug>.kmadoc.com` 관리 화면.
- 병원 홈페이지/게시판/문의 관리 → 병원 도메인 `<slug>.kmaclinic.com` 관리 화면.

즉 이 문서가 다루는 범위는 **① 의사 로그인 ② 온보딩(최초 생성) ③ 결제/구독** + (내부) **플랫폼 운영자 콘솔** 입니다.

---

## 사용 흐름 (전체)

```
[의사 가입 → 운영까지]
① 로그인        POST /oauth/callback (Doxmeet)              → 토큰(헤더)
② 대화형 온보딩  POST /onboarding/session                    → 첫 질문(인텐트)
                 POST /onboarding/session/message {…} 반복    → 다음 질문 / draft 채워짐
                   · 파일은 POST /upload/presign → PUT 업로드 → file_url 을 message.file_urls 로
                   · 파일 분석 중엔 GET /onboarding/session 폴링(processing_files)
③ 완료          POST /onboarding/session/commit {admin_password}
                   → { profile, hospital, payment }            (프로필·병원 생성 + 기본 게시판/메뉴/진료과목 자동)
④ (병원이면)결제  payment.toss_client_key 로 Toss 위젯 → authKey
                 POST /billing/issue → POST /subscription → POST /hospital/:no/publish (공개)
[운영자]         Doxmeet ADMIN 로그인 → /admin/* (회원/구독/면허검증/알림)

가입 후 일상 관리는 app 이 아님 → 프로필은 <slug>.kmadoc.com, 병원은 <slug>.kmaclinic.com 에서.
```

## 디자인 가이드(.reference) 대비 변경점

`.reference/의사프로필.pdf`·`병의원.pdf` 의 화면 의도는 유지하되, 구현은 아래처럼 바뀌었습니다.

- **온보딩**: 디자인은 다단계 **위저드 폼**(병원정보 → 결제 → 프로필 작성 → 완료)이었으나, **대화형 AI 온보딩**(한 번에 하나씩 묻고, 이력서·면허증을 올리면 학력·경력·면허·논문 자동 채움)으로 변경. 병원 홈페이지에 필요한 정보(진료시간·진료과목·주차·대중교통·비급여 등)는 모두 챗에서 수집(필수만 강제, 선택은 건너뛰기).
- **본인인증**: 디자인의 **휴대폰 본인인증(PASS)**(통신사/주민번호/문자인증) 대신 현재 **Doxmeet OAuth**(의사). 휴대폰 본인인증·아이디 찾기·비밀번호 재설정은 후속.
- **결제**: 디자인은 신용카드/카카오페이/토스페이/계좌이체 + 연간/월간/1개월권. 현재는 **토스 빌링키 월정기 결제 1종**(나머지 결제수단·플랜은 후속). 단, 가입 마지막에 결제로 유도하는 흐름은 동일.
- **파일 업로드**: 디자인의 드래그드롭 업로드 위젯 → **presigned URL 로 오브젝트 스토리지에 직접 업로드**(서버 미경유).
- **주소 입력**: 디자인의 "우편번호 찾기" 팝업 → **자유 입력 + 서버 도로명 자동 정규화**(행안부 juso) 또는 `GET /ref/address` 검색.
- **자동화 추가**: 병원 생성 시 기본 게시판·메뉴·진료과목 자동 시드, 홈페이지 대문/서브 문구 AI 자동 작성.

---

## 0. 공통 규약

### Base URL
| 환경 | Base URL |
|---|---|
| 운영(main) | `https://api.kmaclinic.com` |
| 개발(dev) | `https://api-dev.kmaclinic.com` |
| 로컬(local) | `https://api-local.kmaclinic.com` |
세 환경은 각각 별도 인스턴스로 배포됩니다. 모든 경로는 위 기준 상대경로입니다.

### 응답 봉투
- 성공: `{ "success": true, "data": { ... } }` — 본 문서의 "응답" 예시는 `data` 내부만 표기.
- 에러: `{ "success": false, "status_code": 402, "error_code": "ERROR_402_...", "error_uuid": null, "error_detail": "..." }`. `error_code` 앞 3자리 = HTTP status. 500 계열은 `error_uuid: "errx-..."` 동반(운영팀 전달용).

### 인증 (Doxmeet realm)
이 콘솔의 사용자는 **의사(Doxmeet)** 와 **플랫폼 운영자(Doxmeet ADMIN)** 입니다.
로그인·갱신 성공 시 토큰이 **응답 헤더**로 내려갑니다(CORS 노출):
```
KCLINIC-Access-Token:  <access JWT>
KCLINIC-Refresh-Token: <refresh JWT>
```
이후 요청에 `Authorization: Bearer <access JWT>` 를 실어 보냅니다. 권한 레벨: **USER=1**(의사) / **ADMIN=9**(운영자).

### 페이지네이션
목록은 `?page=1&limit=20` → 응답 `{ "items": [...], "pagination": { "page", "limit", "total" } }`.

### 파일 업로드 (Ncloud Object Storage — presigned URL, 2단계)
파일은 **서버를 거치지 않고** 오브젝트 스토리지로 **직접** 올립니다.
```
① presigned URL 요청
POST /upload/presign                 (로그인 필요: Doxmeet 또는 로컬 토큰)
{ "filename": "photo.jpg", "content_type": "image/jpeg", "subdir": "profile" }
→ data: { "method":"PUT", "upload_url":"<presigned PUT URL>",
          "headers": { "x-amz-acl":"public-read" },   // ★ PUT 시 반드시 함께 전송
          "file_url":"https://…/profile/xxx_photo.jpg", "key":"profile/xxx_photo.jpg",
          "expires_in":600, "limits_mb":{ "image":10,"video":500,"file":20 } }

② 받은 upload_url 로 파일을 직접 PUT — 응답의 headers(x-amz-acl)를 그대로 전송, Content-Type 권장
PUT <upload_url>   body=<파일 바이너리>   Headers: x-amz-acl: public-read, Content-Type: image/jpeg

③ data.file_url 을 해당 *_url 필드(예: 프로필 photo_url)에 넣어 저장
```
- `subdir`: `profile|hospital|notice|member|misc`(선택, 분류용). 용량 가이드: 이미지 10MB / 동영상 500MB / 문서 20MB(프론트 사전 확인).
- 스토리지 미설정 시 `ERROR_503_STORAGE_NOT_CONFIGURED`.

### 자주 보는 에러 코드
| 코드 | 의미 |
|---|---|
| `ERROR_401_TOKEN_EXPIRED` | access 만료 → refresh 필요 |
| `ERROR_402_HOSPITAL_SUBSCRIPTION_REQUIRED` | 병원 게시(publish)에 활성 구독 필요 |
| `ERROR_403_FORBIDDEN` | 권한 없음(소유자/운영자 아님) |
| `ERROR_409_SLUG_TAKEN` | URL(slug) 중복 |

---

## 1. 의사 로그인 / 세션

프론트가 Doxmeet 인가서버에서 `code` 를 받은 뒤:
```
POST /oauth/callback
{ "site": "doxmeet", "code": "<authorization_code>" }
```
→ 응답 헤더로 토큰 수신·저장(바디 `{}`).

| 동작 | 경로 |
|---|---|
| 토큰 갱신 | `GET /auth/refresh` (`Authorization: Bearer <refresh>`) |
| 로그아웃 | `POST /auth/logout` (`Authorization: Bearer <refresh>`) |
| 내 계정 | `GET /account/me` — 계정 + 프로필 요약 + 소유 병원/구독 상태 |
| 전화번호 수정 | `PATCH /account/me` `{ "phone": "010-..." }` (E.164 정규화) |

---

## 2. 온보딩 — 대화형(AI), 한 번에 하나씩

긴 폼이 아니라 **대화하며 하나씩** 입력합니다. **맨 처음 "프로필만 / 병원까지"를 묻고**, 의사 **프로필 정보는 항상 수집**(베이스), 병원을 택하면 **병원 정보를 물으면서 프로필도 자연스럽게 함께** 받습니다. 이력서·면허증을 올리면 AI가 읽어 학력·면허·경력·논문까지 자동으로 채웁니다.

내부적으로 **AI 두 역할이 분리**돼 있습니다 — ① **추출 AI**(답변·파일에서 값 추출) ② **질문 AI**(지금까지 모은 정보를 보고 부족한 걸 다음 질문으로 생성). AI 미설정이면 정형 질문 순서로 폴백합니다.

| 메서드·경로 | 용도 |
|---|---|
| `POST /onboarding/session` | 세션 시작(또는 진행 중 세션) + 첫 질문 |
| `GET /onboarding/session` | 현재 세션(초안·다음 질문·진행률·처리중 파일 수) — **폴링용** |
| `POST /onboarding/session/message` `{ text?, file_urls?, purpose? }` | 답변/파일 전송 → 다음 질문. `purpose:"logo"\|"photo"` 면 이미지를 그대로 저장(문서 추출 안 함), 기본은 문서로 보고 추출 |
| `POST /onboarding/session/commit` `{ hospital_admin_password? }` | 수집된 초안으로 프로필(+병원) 생성 |
| `POST /onboarding/session/reset` | 진행 중 세션 폐기 |

**세션 응답(view):**
```jsonc
{ "session_no": 7, "status": "in_progress",
  "next_question": "병원명을 입력해 주세요.",       // 화면(챗)에 그대로 표시
  "progress_percent": 30,
  "processing_files": 1,                          // 백그라운드 추출 중인 파일 수(>0이면 스피너 + 폴링)
  "is_clinic_owner": true,                          // 인텐트(프로필만=false / 병원까지=true), 미정이면 null
  "conflicts": [                                    // 입력값과 업로드 파일 추출값이 다른 항목(덮어쓰지 않음, 사용자 확인용)
    { "field": "profile.display_name", "current": "나대범", "from_file": "이상엽" }
  ],
  "draft": { "profile": {...}, "hospital": {...}, "hospital_admin": { "login_id": "..." },
             "departments": [...], "subentities": { "education": [...], "license": [...] } },
  "history": [ { "role":"assistant","text":"..." }, { "role":"user","text":"..." } ],
  "committed": null }
```

**흐름:**
1. `POST /onboarding/session` → **첫 질문 = 인텐트**: "프로필만 만들까요, 병원 홈페이지까지 만들까요?" (이력서가 있으면 지금 올려도 된다고 함께 안내).
2. 답변(`POST …/message { "text": "병원도 만들래요" }`) → `is_clinic_owner` 확정.
   - **병원까지** 면 다음 질문은 **"병원명을 입력해 주세요"** → 이후 병원 정보를 물으면서 성함·전문 진료과 등 **프로필도 함께** 수집.
   - **프로필만** 이면 병원 질문 없이 프로필만 수집.
3. **파일 업로드(비동기)**: `POST /upload/presign`으로 올린 뒤 그 `file_url`을 `POST …/message { "file_urls": ["https://…/cv.pdf"] }`로 전달. → 서버가 **백그라운드 추출**(응답 안 막음, `processing_files`↑)하고, **파일에 들어있을 항목(이름·학력·경력 등)은 건너뛰고** 파일에 없을 항목(병원명/주소/관리자 등)을 먼저 묻습니다.
4. 추출 완료 시 `draft` 자동 채움 → `GET /onboarding/session` 폴링으로 확인(현재 질문 유지). 채워진 항목은 다음 질문에서 자연히 건너뜀.
5. 텍스트 답변마다 질문 AI가 **남은 핵심 항목 중 하나**를 다음 질문으로 생성. 충분히 모이면 `next_question`이 "완료를 눌러…"로 바뀜 → `POST /onboarding/session/commit { "hospital_admin_password": "••••" }`.
   (아직 추출 중이면 `ERROR_409_ONBOARDING_FILES_PROCESSING`)
   ```jsonc
   // commit 응답
   { "profile": {...}, "hospital": {...},          // 병원이면 기본 게시판·메뉴·진료과목 + 홈페이지 문구 자동 세팅
     "seeded": { "education": 3, "paper": 2 },
     "payment": {                                  // ★ 병원이면 마지막에 결제로 유도
       "required": true, "hospital_no": 12,
       "plan": "hospital_monthly", "amount": 10000,
       "toss_client_key": "test_ck_…",             // 프론트 Toss 결제위젯 초기화용
       "customer_key": "kclinic-u34",              // 권장 customerKey(그대로 위젯에 사용)
       "next": ["POST /billing/issue {authKey, customerKey}", "POST /subscription {hospital_no}", "POST /hospital/:no/publish"]
     } }
   // 프로필만이면: "payment": { "required": false } (무료)
   ```
6. **결제 유도(병원만)**: `payment.required=true`면 프론트는 `toss_client_key`+`customer_key`로 **Toss 결제위젯을 띄워 카드(빌링키)를 등록**(→`authKey` 수령) 후 §3의 흐름을 그대로 호출합니다: `POST /billing/issue` → `POST /subscription { hospital_no }` → `POST /hospital/:no/publish`. (즉 **온보딩 마지막 = 결제**)

- **주소**는 사용자가 편하게 입력하면 서버가 도로명 기준으로 자동 정규화합니다(행안부 juso, 우편번호·시/구 포함). 별도 주소 검색/자동완성이 필요하면 공개 `GET /ref/address?keyword=` 사용. (juso 승인키 미설정 시 입력 원문 유지)
- **업로드 파일 추출은 빈 항목만 채우고, 이미 입력한 값은 덮어쓰지 않습니다.** 값이 다르면 `conflicts`에 담겨 내려오니 사용자에게 어느 값을 쓸지 확인하세요(다시 입력하면 그 값이 반영됨).
- 병원 **관리자 아이디(login_id)는 영문 소문자·숫자 4~20자**만 허용됩니다(미충족 시 `ERROR_400_INVALID_LOGIN_ID`). 비밀번호는 draft에 저장/노출되지 않으며 **commit 시에만** 전달합니다.
- **병원 홈페이지에 필요한 정보는 모두 온보딩에서 수집**합니다(관리페이지로 미루지 않음). 필수=병원명·전화·주소·진료시간·운영 진료과목·관리자 아이디 + 프로필 성함·진료과. 선택=개원연도·주차·대중교통·비급여 진료비·네이버 플레이스 URL·로고/사진·병원 소개·프로필 한 줄 소개/연락처/자기소개(선택 항목은 "건너뛰기"로 통과). 비급여는 텍스트로 말하거나 **가격표 파일을 올리면** AI가 항목/금액을 추출, 로고/사진은 `purpose`로 업로드. 생성 후 관리페이지에서 수정도 가능합니다.
- 프로필은 항상 생성(무료), 병원은 인텐트가 "병원까지"일 때만 생성되고 **공개(publish)에는 구독 결제가 필요**합니다.
- 생성 후 병원관리자 계정으로 `<slug>.kmaclinic.com`에서 병원을, 의사 본인이 `<slug>.kmadoc.com`에서 프로필을 이어서 편집합니다.

---

## 3. 결제 / 구독 — 병원 게시(publish) 게이트

병원 홈페이지만 유료(토스 정기결제)입니다. 의사 프로필은 무료. 결제는 **병원 게시에만** 게이트됩니다.
권장 순서: ① 빌링키 발급 → ② 구독 생성(첫 결제) → ③ 병원 게시 가능.

| 메서드·경로 | 용도 |
|---|---|
| `POST /billing/issue` `{ authKey, customerKey }` | 토스 빌링키 발급/재발급(재발급 시 기존 구독에 자동 재연결) |
| `GET /billing` | 내 빌링키 목록(카드 마스킹 요약) |
| `POST /subscription` `{ hospital_no }` | 병원 구독 생성 + 첫 결제 → `active` |
| `GET /subscription?status=active` | 내 구독 목록 |
| `GET /subscription/hospital/:hospital_no` | 특정 병원 구독 조회(소유자) |
| `POST /subscription/:no/cancel` `{ reason? }` | 구독 취소(기간 말까지 유지 후 만료) |
| `GET /payment?status=paid` | 내 결제 내역 |

- 구독 없이 병원을 게시하려 하면 `ERROR_402_HOSPITAL_SUBSCRIPTION_REQUIRED`. 결제 실패 시 만료 유예 7일.
- 토스 빌링키 발급 흐름: 프론트가 토스 SDK 로 카드 등록 → `authKey`/`customerKey` 수신 → `POST /billing/issue` 로 서버에 전달.
- **결제 웹훅**은 토스가 서버로 직접 호출합니다(`POST /payment/webhook`, 인증 없음). 프론트가 호출할 일은 없습니다.

> 현재 결제는 **토스 빌링키 월정기 결제** 1종만 구현돼 있습니다. 카카오페이·계좌이체, 연간/1개월 이용권, 세금계산서 발행, 사업자·요양기관 인증은 아직 미구현(후속 예정)입니다.

---

## 4. (내부) 플랫폼 운영자 콘솔 — Doxmeet **ADMIN(level 9)**

> 임상 의사/병원 사용자가 아니라 **닥스밋 플랫폼 운영자**(내부 스태프)가 쓰는 영역입니다. 모든 호출에 ADMIN 토큰 필요(USER 는 403). 로그인/세션은 §1 과 동일(Doxmeet OAuth).

| 메서드·경로 | 용도 |
|---|---|
| `GET /admin/users?keyword=&level=&page=1` | 회원(의사) 검색/목록 |
| `GET /admin/users/:no` | 회원 상세 |
| `PATCH /admin/users/:no/level` `{ "level": 9 }` | 권한 변경(0/1/9, 본인 강등 금지) |
| `PATCH /admin/users/:no/withdraw` `{ "is_withdrawn": true }` | 탈퇴(refresh 삭제 + 구독 해지) |
| `GET /admin/subscriptions?status=&hospital_no=` · `GET /admin/subscriptions/:no` | 구독 현황 |
| `GET /admin/payments?status=&subscription_no=` | 결제 내역 |
| `GET /admin/profile/license/pending` | 분과전문의 면허 검증 대기 큐 |
| `POST /admin/profile/license/:no/approve` | 승인(→ verified, 알림톡 발송) |
| `POST /admin/profile/license/:no/reject` `{ "reason": "..." }` | 반려(사유 기록) |
| `POST /ref/society` `{ name, name_en?, category?, is_official? }` | 공인 학회 추가(자동완성 목록 노출) |
| `GET /notification/log?channel=alimtalk&status=sent` | 알림(알림톡/SMS/이메일) 발송 로그 |

- `notification/log` 의 `channel` ∈ `alimtalk|sms|email`, `status` ∈ `pending|sent|failed`.
- 권한 변경은 **대상 사용자가 재로그인/refresh** 해야 토큰에 반영됩니다.

> 요양기관 현황 목록의 결제수단 필터·엑셀 다운로드·관리자 메모(비고) 편집은 아직 미구현(후속 예정)입니다.
