InBody 자재 위치 관리 웹사이트 - 실시간 공유 버전

파일 구성
- index.html : 웹사이트 화면 구조
- styles.css : InBody Red 디자인 및 반응형 화면
- app.js : 자재 관리 기능 및 Firebase Firestore 실시간 동기화

기존 Firebase 설정
- Firebase 프로젝트: inbody-material-map
- Firestore 문서: sharedMap/main
- 저장 필드: mapState

실행 및 배포
1. 네 파일(index.html, styles.css, app.js, README.txt)을 같은 폴더에 둡니다.
2. GitHub 저장소 최상위(root)에 네 파일을 업로드하고 기존 파일을 덮어씁니다.
3. GitHub 저장소 Settings > Pages에서 main / (root)로 배포합니다.
4. GitHub Pages 주소로 접속합니다.

실시간 공유
- 자재 등록/수정/삭제, 드래그 이동 및 위치 교환, 행/열 추가·삭제가 Firestore에 저장됩니다.
- 같은 주소에 접속한 다른 사용자 화면에도 변경 사항이 실시간 반영됩니다.
- 여러 사용자의 변경은 Firestore 트랜잭션으로 서버의 최신 상태를 기준으로 처리합니다.

Firebase 확인 사항
- Firebase Console에서 프로젝트 inbody-material-map을 엽니다.
- Firestore Database가 생성되어 있어야 합니다.
- Firestore 보안 규칙이 읽기/쓰기를 허용해야 합니다. 인증 없는 전체 공개 규칙은 테스트용으로만 사용하고, 실제 운영 전에는 인증 및 접근 권한을 제한하세요.
- Firebase Authentication의 승인된 도메인 제한을 사용하는 경우 GitHub Pages 도메인도 허용 목록에 추가해야 할 수 있습니다.

주의
GitHub Pages는 사이트 파일을 제공하고, 자재 데이터 저장 및 실시간 공유는 Firebase가 담당합니다. GitHub 저장소가 공개되어 있으면 소스 코드와 Firebase 웹 설정도 공개됩니다. 실제 회사의 민감한 자재 정보는 승인 없이 입력하지 마세요.
