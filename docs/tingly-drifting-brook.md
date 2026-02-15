# DanggeunSearch - 이름 입력 화면 + 쿨다운 추가

## Context
DanggeunSearch(당근 다중지역 검색기)에 최초 진입 시 로그인처럼 이름을 입력하는 화면을 추가한다. 이름 입력 후 메인 검색 화면으로 전환되며, 입력한 이름이 검색어로 자동 세팅된다. 또한 검색 후 쿨다운 타이머를 추가하여 연속 검색을 방지한다. 기존 기능(지역 선택, 검색, 결과 표시)은 모두 유지.

## 수정 파일
- `src/App.svelte` (유일한 수정 대상)

## 구현 내용

### 1. 이름 입력 화면 (진입 화면)
- 새 상태 변수: `userName = ''`, `isLoggedIn = false`
- `isLoggedIn === false`일 때 이름 입력 폼만 표시
  - 당근검색기 로고/헤더
  - "이름을 입력해주세요" 입력 필드
  - "시작하기" 버튼
- 이름 입력 후 버튼 클릭 또는 Enter:
  - `userName`에 이름 저장
  - `query`에 이름 세팅 (검색어로 사용)
  - `isLoggedIn = true`로 전환 → 기존 메인 화면 표시

### 2. 쿨다운 타이머
- 새 상태 변수: `cooldown = 0`
- 검색 완료 또는 429 에러 시 `cooldown = 60` 세팅
- `setInterval`로 1초마다 `cooldown--` (0이 되면 정지)
- 쿨다운 중: 검색 버튼 비활성화 + "재검색 N초 후 가능" 텍스트 표시
- 결과 헤더 옆에 쿨다운 뱃지 표시

### 3. 기존 기능 유지
- 지역 선택, 검색 폼, 결과 표시 등 모든 기존 UI/로직 그대로 유지
- `isLoggedIn === true`일 때 기존 화면 전체 표시

## 변경 요약

```
App.svelte 스크립트:
  + userName, isLoggedIn 상태
  + cooldown, cooldownTimer 상태
  + handleLogin() 함수 - 이름 입력 처리
  + startCooldown() 함수 - 60초 타이머 시작
  ~ handleSearch() - 검색 완료/에러 시 startCooldown() 호출

App.svelte 마크업:
  + {#if !isLoggedIn} ... {:else} 기존 UI {/if} 분기
  + 이름 입력 화면 (로그인 스타일)
  + 검색 버튼에 쿨다운 표시
  + 결과 헤더 옆 쿨다운 뱃지

App.svelte 스타일:
  + .login-screen 관련 스타일
  + .cooldown-badge 스타일
```

## 검증
1. `npm run dev`로 실행
2. 최초 진입 시 이름 입력 화면 표시 확인
3. 이름 입력 → 메인 화면 전환 + 검색어에 이름 세팅 확인
4. 지역 선택 후 검색 → 결과 표시 + 60초 쿨다운 시작 확인
5. 쿨다운 중 검색 버튼 비활성화 + 카운트다운 표시 확인
