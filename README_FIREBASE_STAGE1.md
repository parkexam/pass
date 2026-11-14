# PASS 회원/간호직 이용권 테스트 — 1단계

이번 패치는 `parkexam/pass` **전용**입니다. 기존 B UI, 문제풀이, 오답노트, v7 복수 시험지 임시저장, 180문항 JSON과 확장 시험목록을 건드리지 않습니다.

## 상태
- **작동 준비:** 이메일 회원가입·로그인, 계정별 Firestore 학습 기록 저장/불러오기, 로그인 전 기록 계정으로 가져오기, 간호직 이용권 상태 확인, 관리자 부여·회수 테스트 UI.
- **아직 미연결:** 사용자의 Firebase 프로젝트 설정이 없으므로 `enabled:false`가 기본입니다. 이 상태에서는 기존 로컬 PASS 기능만 동작합니다.
- **아직 미구현:** 실제 결제, App Store/Play 결제 및 영수증 검증, 유료 기출문제 파일/이미지 비공개 이전, 동시 다중 기기의 충돌 자동 병합.

## GitHub Pages에 올릴 파일 — 기존 파일 3개만 추가/교체
1. `js/pass-firebase-config.js` (신규)
2. `js/pass-account-stage1.js` (신규)
3. `index.html` (마지막에 위 JS 2개 연결된 버전)

> AI 에이전트가 `index.html`을 수정했다면 기존 파일을 덮어쓰지 말고 `</body>` 바로 위에 아래 줄만 추가하세요.

```html
<script defer src="js/pass-firebase-config.js?v=stage1"></script>
<script defer src="js/pass-account-stage1.js?v=stage1"></script>
```

## Firebase 콘솔 작업
1. https://console.firebase.google.com/ 에서 프로젝트 생성 후 Web 앱 등록.
2. Authentication > Sign-in method > **Email/Password** 활성화.
3. Authentication > Settings > Authorized domains에 `parkexam.github.io` 등록.
4. Cloud Firestore 데이터베이스 생성. `asia-northeast3`(서울) 사용을 권장하나 실제 선택한 리전은 확인하세요.
5. 별도 서버 설정 ZIP 안의 `firestore.rules`를 배포. **테스트 모드로 전체 읽기/쓰기 허용 금지.**
6. 유효한 Firebase Web 앱 설정값 4개를 `js/pass-firebase-config.js`에 입력하고 `enabled:true`로 설정.
7. 회원가입 → 로그아웃 → 다시 로그인 → 기록 확인.

## 서버 기능 / 관리자 부여·회수
- 서버 설정 ZIP은 GitHub Pages에 업로드하지 마세요. 개발자 PC에서 `npm install` 후 Firebase CLI로 `firebase deploy --only firestore:rules,functions`.
- Cloud Functions는 **Blaze 요금제 필요** (호출 요금 및 사용량 확인).
- **관리자 지정:** 신뢰할 수 있는 PC의 Google Cloud ADC로 `node scripts/set-admin.cjs UID on` 실행 (별도 `scripts/npm install` 필요). `UID`는 Firebase Authentication 사용자 ID입니다. 권한 변경 후 사용자가 다시 로그인해서 토큰 갱신.
- 관리자는 마이페이지 하단 회원 관리 카드에 대상 이메일로 간호직 이용권을 부여·회수할 수 있습니다.
- `users/{uid}/entitlements/nursing_all`에는 브라우저 쓰기가 원천 차단됩니다. 클라우드 함수가 관리자 권한을 검증한 뒤 서버에서 수정합니다.

## 보안상 중요한 한계
- **현재 `data/nursing/*.json`과 `assets/questions/nursing/...`는 GitHub Pages에 공개된 파일입니다.** 지금 '이용권 없음'으로 표시돼도 URL로 그대로 읽을 수 있습니다.
- 실제 유료 운영 전에는 해당 JSON/이미지를 공개 저장소 및 GitHub Pages 배포 경로에서 제거하고, 보안 규칙으로 보호되는 비공개 저장소 + 서버 인증된 전달 방식으로 마이그레이션해야 합니다. Git 히스토리/과거 배포와 외부 복사본의 유출 가능성도 점검하세요.
- `Firebase apiKey` 등 웹 앱 설정은 비밀키가 아니지만, Admin SDK 서비스 계정 JSON/개인키는 코드 또는 GitHub에 **절대 업로드하지 마세요**.
- 사용자 기록은 로그인한 본인에게만 Firestore Rules로 허용하지만, 클라이언트 저장 진위는 인증 수준의 시험감독/성적증명에 적합하지 않습니다.
- 1단계 동기화는 **한 계정의 여러 기기에서 동시에 수정할 경우 마지막 저장으로 충돌할 수 있습니다.** 실서비스 전에 변경 충돌·페이지네이션·데이터 분할 테스트를 추가하세요.
