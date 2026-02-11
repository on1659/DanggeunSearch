# 🥕 DanggeunSearch

당근마켓 다중지역 검색기 - 여러 지역의 중고거래 매물을 한번에 검색하세요!

## ✨ 주요 기능

- **다중 지역 검색**: 여러 지역을 동시에 선택하여 당근마켓 매물을 종합 검색
- **계층형 지역 선택**: 시/도 → 구/군 → 동 단위의 직관적인 지역 선택 UI
- **상세 필터링**: 카테고리별, 가격대별 검색 옵션
- **통합 결과**: 선택한 지역들의 검색 결과를 최신순으로 정렬하여 표시
- **모바일 최적화**: 모바일 퍼스트 반응형 디자인
- **실시간 캐싱**: 동일한 검색에 대한 5분간 캐싱으로 빠른 응답

## 🛠 기술 스택

### Frontend
- **Svelte** + **Vite** - 모던 프론트엔드 프레임워크
- **반응형 CSS** - 모바일 퍼스트 디자인

### Backend  
- **Express.js** - Node.js 웹 서버
- **Cheerio** - 당근마켓 웹 크롤링
- **CORS** - 브라우저 정책 처리
- **Node-cron** - 주기적 작업 관리

## 🚀 배포 정보

- **GitHub**: [on1659/DanggeunSearch](https://github.com/on1659/DanggeunSearch)
- **Live Demo**: [https://danggeunsearch-production.up.railway.app](https://danggeunsearch-production.up.railway.app)
- **Railway Project**: [Dashboard](https://railway.com/project/8ea15b40-b922-468d-abfb-f3d8256d18a9)

## 🏃‍♂️ 로컬 개발

### 필요 사항
- Node.js 18+ 
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/on1659/DanggeunSearch.git
cd DanggeunSearch

# 의존성 설치
npm install

# 개발 서버 시작 (클라이언트)
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버 시작
npm start
```

### 개발 서버
- 클라이언트: http://localhost:5173
- 서버: http://localhost:3000

## 📍 지역 데이터

현재 지원되는 지역:

### 서울특별시
- 강남구, 강동구, 강북구, 강서구, 관악구, 광진구, 구로구, 금천구 등

### 경기도
- 성남시 (분당구, 수정구, 중원구)
- 용인시 (기흥구, 수지구, 처인구)

## 🔍 사용법

1. **검색어 입력**: 찾고 싶은 상품명을 입력하세요
2. **지역 선택**: 시/도 → 구/군 → 동 순서로 원하는 지역들을 선택하세요
3. **필터 설정** (선택사항): 카테고리나 가격 범위를 설정하세요
4. **검색 실행**: 검색 버튼을 눌러 결과를 확인하세요

## ⚠️ 주의사항

- 당근마켓 서버 부하 방지를 위해 요청 간 1초 딜레이 적용
- 동일한 검색 결과는 5분간 캐싱됨
- 과도한 요청 시 일시적으로 차단될 수 있음
- 개인적, 비상업적 용도로만 사용하세요

## 🛡 법적 고지

이 프로젝트는 교육 및 개인적 용도로만 제작되었습니다. 당근마켓의 공개된 웹 데이터를 크롤링하며, 상업적 이용을 금지합니다.

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📧 문의

프로젝트에 대한 문의사항이 있으시면 GitHub Issues를 이용해주세요.

---

Made with ❤️ for 당근마켓 사용자들