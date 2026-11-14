/* PASS 회원 / 이용권 테스트 설정
 * Firebase Console > Project settings > Your apps > Web config 값을 입력하세요.
 * apiKey 등의 웹 설정값은 비밀번호가 아닙니다. 서비스 계정 비밀키는 절대 업로드하지 마세요.
 * 연결 전에는 enabled:false로 유지하면 기존 로컬 PASS가 그대로 작동합니다.
 */
window.PASS_FIREBASE_CONFIG = {
  enabled: false,
  firebase: {
    apiKey: '',
    authDomain: '',
    projectId: '',
    appId: ''
  },
  functionsRegion: 'asia-northeast3',
  // 결제 기능이 아닌 이용권 부여/회수 테스트 UI만 사용합니다.
  membershipTest: true
};
