InBody 자재 위치 관리 웹사이트

[파일 구성]
- index.html : 웹사이트 화면 구조
- styles.css : InBody Red 디자인과 반응형 화면
- app.js : 자재 등록/수정/삭제/이동 및 Firebase 실시간 동기화
- README.txt : 실행 및 배포 안내

[로컬 실행]
1. 네 파일을 같은 폴더에 둡니다.
2. VS Code에서 폴더를 엽니다.
3. Live Server 확장 기능으로 index.html을 실행합니다.
4. 인터넷 연결이 필요합니다.

[GitHub Pages 배포]
1. GitHub에서 새 저장소(repository)를 만듭니다.
2. index.html, styles.css, app.js, README.txt를 저장소 최상위(root)에 업로드합니다.
3. 저장소의 Settings > Pages로 이동합니다.
4. Build and deployment에서 Deploy from a branch를 선택합니다.
5. Branch는 main, 폴더는 /(root)로 선택하고 Save를 누릅니다.
6. 배포가 끝나면 https://깃허브아이디.github.io/저장소이름/ 형태의 주소로 접속합니다.

[주요 기능]
- InBody Red #971B2F 디자인
- 12가지 색상 네모 선택 팔레트
- 가로/세로 칸 추가 및 마지막 행/열 삭제
- 선택한 칸의 자재 삭제
- 자재명과 품번 등록 및 수정
- 검색 및 검색 결과 강조
- 드래그 앤 드롭 이동 및 자재가 있는 칸과 위치 교환
- PC와 모바일 화면 대응
- Firebase Firestore 실시간 공유
- 변경 사항은 Firestore 트랜잭션으로 서버의 최신 데이터를 확인한 뒤 반영

[Firebase 안내]
이 사이트는 기존 Firebase 프로젝트의 Firestore 문서 sharedMap/main을 사용합니다.
GitHub Pages는 웹사이트 파일을 공개하는 역할이고, 자재 데이터의 저장과 실시간 공유는 Firebase가 담당합니다.
Firebase 콘솔에서 웹 앱 도메인 제한(Authorized domains)을 사용하는 경우 GitHub Pages 도메인도 허용 목록에 추가해야 할 수 있습니다.

[보안 주의]
GitHub 저장소를 Public으로 만들면 소스 코드와 Firebase 웹 설정이 공개됩니다. Firebase 웹 설정의 API 키 자체는 보안 경계가 아니지만, Firestore 보안 규칙으로 읽기/쓰기 권한을 반드시 제한해야 합니다. 누구나 읽기/쓰기가 가능한 규칙은 테스트용으로만 사용하세요. 회사의 민감한 자재 정보는 승인 없이 입력하거나 공개하지 마세요.

[동기화 관련 참고]
이 버전은 자재 등록/수정/삭제/이동과 행/열 변경을 Firestore 트랜잭션으로 반영하여, 여러 사용자의 동시 변경에서 오래된 전체 상태가 무조건 덮어써지는 상황을 줄입니다. 실제 배포 후 두 개 이상의 브라우저에서 등록, 이동, 삭제, 새로고침 테스트를 진행하세요.
