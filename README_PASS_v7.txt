PASS v7 패치 안내

1. ZIP에 포함된 index.html과 js/pass-ux-v7.js 파일을 GitHub parkexam/pass 동일 경로에 올리세요.
2. AI 에이전트가 index.html을 이미 수정했다면 덮어쓰지 마세요. 대신 기존 index.html의 </body> 바로 위에 아래 한 줄만 추가하고, JS 파일만 업로드하세요.
   <script defer src="js/pass-ux-v7.js?v=20261114ux7"></script>
3. data/catalog.json, data/extended-catalog.json, js/core.js, js/app.js, js/quiz.js 등은 변경하지 않습니다.
4. 기존 한 개의 임시 풀이 기록은 자동으로 여러 시험 저장 구조에 편입됩니다. 이전 버전에서 이미 덮어쓴 기록은 복구할 수 없습니다.
5. 브라우저 localStorage에 저장되므로 기기별 기록은 아직 자동 동기화되지 않습니다. 적용 전에 마이페이지 > 데이터 백업으로 기존 데이터를 백업하세요.

수정 기능:
- 오답 복습 결과의 회색 기록 삭제 안내 제거, 확인창 문구 간소화
- 일일 학습 목표 진행률 바(달리기/하트 및 N/M문항 표시)
- 과목별 진행 중인 시험지 별도 저장 및 홈/마이에서 이어 풀기
- 추천 학습 파란 문제은행 배지 삭제
- 문제은행 첫 화면 상단 홈으로 버튼 추가
