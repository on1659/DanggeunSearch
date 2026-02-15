# DanggeunSearch 기능 개선 계획

## Context
DanggeunSearch는 당근마켓 다중지역 검색기로, 현재 모놀리식 `App.svelte` 하나로 모든 UI가 구성되어 있다. 백엔드는 Express + Cheerio 기반 크롤러. 사용자가 5가지 기능 개선을 요청했다.

## 수정 대상 파일

| 파일 | 작업 |
|------|------|
| `server/index.js` | 경기도 지역 데이터 확장 (L87-132) |
| `src/App.svelte` | 모두선택, 판매상태, 페이지네이션, 지도탭 통합 |
| `src/lib/MapSelector.svelte` | **신규** - SVG 지도 컴포넌트 |
| `src/lib/data/map-paths.js` | **신규** - SVG 경로 데이터 |

---

## Phase 1: 경기도 지역 확장
**파일**: `server/index.js` L118-129

현재 경기도 10개 항목 → 전체 시/군/구 ~40개로 확장. "판교" 중복 항목 제거.

추가 대상 (기존 제외):
- 수원시 (장안구, 권선구, 팔달구), 성남시 (중원구)
- 의정부시, 안양시 (만안구, 동안구), 광명시, 평택시, 동두천시
- 안산시 (상록구, 단원구), 고양시 (덕양구, 일산서구), 과천시
- 구리시, 남양주시, 오산시, 시흥시, 군포시, 의왕시
- 용인시 (처인구), 이천시, 안성시, 김포시, 화성시, 광주시
- 양주시, 포천시, 여주시, 연천군, 가평군, 양평군

→ 당근마켓 웹사이트에서 각 지역의 대표동 ID 조회 필요

---

## Phase 2: 모두 선택 체크박스
**파일**: `src/App.svelte`

- `selectedProvince`의 districts 위에 "모두 선택" 체크박스 추가
- `isAllSelected(province)` / `isSomeSelected(province)` 함수 추가
- `toggleAllDistricts(province)` 함수 추가
- 일부만 선택 시 indeterminate 상태 표시 (Svelte action 사용)
- 선택 지역 20개 초과 시 검색 전 경고 표시

---

## Phase 3: 판매 상태 표시
**파일**: `src/App.svelte` L149-161

크롤러가 이미 `item.status` 반환 중 (L129 of `crawler.js`). 프론트에서 표시만 추가.

- 아이템 카드에 상태 뱃지 추가: 판매중(초록), 예약중(파랑), 판매완료(회색)
- 판매완료 아이템은 opacity 낮추고 title에 line-through
- status 값: `"SELLING"` / `"SOLD_OUT"` / `"RESERVED"` 또는 한글 값 모두 처리

---

## Phase 4: 게시판 형식 + 페이지네이션 + 쿨다운
**파일**: `src/App.svelte`

### 4a. 클라이언트 사이드 페이지네이션
- 상태: `itemsPerPage`(20), `currentPage`(1)
- 10/20/50개씩 선택 드롭다운
- 하단 페이지 네비게이션: `< 1 2 3 ... 10 >` 형식
- 필터/페이지 변경 시 `currentPage = 1` 리셋

### 4b. 결과 내 검색 & 지역 필터
- `searchWithinQuery`: 결과 내 텍스트 검색 (title, price, location 대상)
- `filterRegion`: 결과 내 지역 드롭다운 필터
- reactive 파이프라인: `searchResults.items` → filter → paginate

### 4c. 쿨다운 타이머
- 검색 실행 시 60초 카운트다운 시작
- 결과 헤더 옆에 "재검색 N초 후 가능" 뱃지 표시
- 429 에러 시에도 타이머 시작

---

## Phase 5: SVG 지도 선택
**파일**: `src/lib/MapSelector.svelte` (신규), `src/lib/data/map-paths.js` (신규), `src/App.svelte`

### 5a. SVG 경로 데이터 (`map-paths.js`)
- 서울 25구 + 경기도 시/군의 SVG path 데이터
- GitHub `southkorea/seoul-maps` 등의 GeoJSON → SVG 변환하거나 수동 작성
- 각 지역별 `{ path, center, province }` 구조

### 5b. MapSelector 컴포넌트
- props: `regions`, `selectedRegions`, `onToggle`
- SVG 렌더링: 경기도 배경 → 서울 전경 순으로 그리기
- 클릭: 해당 구/시 선택 토글
- 마우스 hover / 터치 누르고있기: 지역명 툴팁 표시
- 선택 상태: 주황색 fill, 미선택: 연한 색상
- 범례 표시

### 5c. App.svelte 통합
- 지역선택 영역에 "목록 / 지도" 탭 추가
- 목록탭: 기존 체크박스 UI (+ 모두선택)
- 지도탭: MapSelector 컴포넌트
- 두 탭 간 선택 상태 공유

---

## 검증 방법
1. `npm run build && npm start` 후 `localhost:3000` 접속
2. 경기도 선택 → 모든 시/군/구 표시 확인
3. "모두 선택" 체크 → 전체 선택/해제 동작 확인
4. 지도 탭 → 구 클릭하여 선택, hover 시 이름 표시 확인
5. 검색 실행 → 판매중/완료 뱃지 표시, 쿨다운 타이머 표시 확인
6. 결과 내 검색, 지역 필터, 페이지네이션 (10/20/50) 동작 확인
