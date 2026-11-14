# PASS-Firebase shinna-c863e 연결 패치

## GitHub `parkexam/pass`에 올릴 파일
- `js/pass-firebase-config.js` (프로젝트 설정 완료)
- `js/pass-account-stage1.js` (계정 기능; 이전 1단계 파일과 동일)

`index.html` 파일은 패치에 넣지 않았습니다. AI 에이전트가 수정한 최신 파일을 보호하기 위해서입니다.
`index.html` 끝 `</body>` 바로 위에 `index_추가할_두줄.txt` 내용을 넣으세요.
이미 계정 기능 스크립트 두 줄이 있다면 추가하지 말고 `v=shinna1`로 바꿔 캐시를 갱신하세요.

## 먼저 Firebase 콘솔에서 설정할 것
1. Authentication > 로그인 방법 > 이메일/비밀번호 켬.
2. Authentication > 설정 > 승인된 도메인에 `parkexam.github.io` 등록.
3. Firestore Database 생성. 프로덕션 모드로 시작.
4. 이전에 제공한 `pass_firebase_server_setup.zip`의 `firestore.rules`를 Firebase Firestore > 규칙 화면에 적용하고 게시.
5. 2개 JS 업로드 및 HTML 스크립트 연결 후 https://parkexam.github.io/pass/ > 마이 페이지에서 테스트.

## 현재 제공되지 않는 것
- 현재 공개된 시험지 JSON 및 이미지는 비공개 아님.
- Cloud Functions를 배포하기 전 `membershipStatus`, `adminSetNursingAccess` 기능은 아직 동작하지 않음.
- 실제 결제/인앱결제/관리자 권한 지정 작업은 완료되지 않음.
- 여러 기기에서 동시에 수정 시 데이터 충돌 자동 해결 기능은 없음.

## 기존 학습 기록 백업
배포/첫 로그인 전에 마이페이지 > 데이터 백업 > 내보내기로 백업하세요.
처음 가입한 계정의 클라우드 기록이 비어 있으면 기기 기록을 따로 가져오는 버튼을 사용합니다.
