# PASS 시험·직렬·자격증 메뉴 확장

이번 패치는 기존 `data/catalog.json`과 모든 문제 JSON, 이미지, `js/core.js`, `js/views.js`, `js/app.js` 및 저장 데이터를 변경하지 않습니다.

추가/변경하는 4개 파일:
- `index.html` (확장 모듈과 CSS 로드만 추가)
- `js/catalog-extension.js` (목록 탐색, 검색, 직렬→과목 이동)
- `css/catalog-extension.css` (B UI 연속 디자인)
- `data/extended-catalog.json` (새 시험 분야와 직렬/자격 종목 분류)

AI 에이전트가 기존 `catalog.json`을 계속 사용해도 이번 메뉴는 별도로 병합됩니다. 신규 시험 문제를 등록하려면 기존 `data/catalog.json`에 시험지/과목 정보와 문제 파일 경로를 넣어도 되고, 추가 메뉴의 해당 종목 `id`에 연결해도 됩니다.

**신규 시험지를 종목에 바로 연결하는 방식**: 기존 catalog.json의 papers[]에 subjectId로 대상 종목 ID를 넣고 dataFile 경로를 제공합니다.
예: 확장 카탈로그의 `cert-health → 간호사`에 연결해 시험지를 쌓을 수 있습니다.

**공무원 직렬 내 실제 과목을 추가하는 방식**: 기존 catalog.json의 subjects[]에 `{id, examId, name, parentId:<직렬ID>}`를 추가한 뒤, papers[]의 subjectId에 해당 과목ID를 사용하세요. 직렬→과목→기출 시험지 구조가 자동으로 작동합니다.

**중요**: 확장 목록에 있다고 해서 2026/2027년에 해당 직렬을 선발하거나 그 시험이 전부 객관식으로 실시된다는 뜻은 아닙니다. 개편·시행 여부는 각 기관의 연도별 공식 공고에 따릅니다. 기술사, 실기·필답형 전용 시험은 이 객관식 메뉴의 범위가 아닙니다. MEET/M·DEET는 역대시험 분류입니다.

실제 공무원 직렬 채용은 국가공무원채용시스템 및 지자체 공고, 기술자격은 Q-net, 보건의료국시는 국시원 공고로 최신 확인해 주세요.
