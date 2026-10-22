# Healthpick 고혈압 원고와 글 화면 개선

앞선 `a3e92b29` 배포 이후 기존 고혈압 글 2편을 재작성하고 공통 글 화면의 가독성을 점검했다. 새 글을 늘리거나 기존 URL을 바꾸는 작업이 아니다.

## 원고 수정

| 기존 경로 | 새 제목 | 수정한 핵심 |
| --- | --- | --- |
| `난치성-고혈압-2026-진료지침-약-3제-병합-기준-변화` | 혈압약을 여러 개 먹어도 높다면 무엇을 확인할까 | 넓은 난치성 평가 범위와 기존 저항성 정의를 구분. 진료 전 기록·측정·복약 문제를 설명하고, 새 약과 시술을 일괄적인 네 번째 약 목록으로 나열하던 부분 제거 |
| `커프리스-혈압계-2026-진료지침-기존-자가측정-신뢰도-차이` | 반지와 스마트워치 혈압을 진료에 써도 될까 | 조건부 모니터링 권고와 모든 소비자용 기기의 사용을 구분. 평균 차이를 개별 오차의 상한으로 일반화하지 않고, 검증 조건·사용 목적·보정·위팔 커프식 선택을 설명 |

원래 발행일인 2026년 5월 28일과 URL은 유지하고 실제 수정일을 2026년 10월 23일로 기록했다. 두 글의 중복된 frontmatter·본문 FAQ를 제거했다. 실제 의료 감수 기록은 새로 만들지 않았다.

## 출처와 범위

[대한고혈압학회 2026년 하이라이트 논문](https://clinicalhypertension.org/DOIx.php?id=10.5646/ch.2026.32.e31)의 해당 절을 직접 대조했다. 기존 글의 '2026 지침' 자체를 허위로 취급하지 않았다. 커프리스의 권고 강도와 근거수준을 구분하고, 추가 약과 시술의 조건도 나누어 설명했다.

[AHA 저항성 고혈압 평가](https://professional.heart.org/en/science-news/resistant-hypertension-detection-evaluation-and-management/top-things-to-know), [AHA 환자 안내](https://www.heart.org/en/health-topics/high-blood-pressure/the-facts-about-high-blood-pressure/resistant-hypertension--high-blood-pressure-thats-hard-to-treat), [CDC 측정 안내](https://www.cdc.gov/high-blood-pressure/measure/index.html), [NHS 스피로노락톤 안내](https://www.nhs.uk/medicines/spironolactone/)를 보완 출처로 연결했다. 개인별 약 용량·검사 중단 일정이나 모든 환자에게 같은 목표 혈압을 제시하지 않는다.

커프리스 글은 [AHA 과학 성명 안내](https://newsroom.heart.org/news/cuffless-blood-pressure-technologies-in-wearable-devices-show-promise-to-transform-care), [FDA 안전 안내](https://www.fda.gov/medical-devices/safety-communications/do-not-use-unauthorized-devices-measuring-blood-pressure-fda-safety-communication), [AHA 가정혈압 안내](https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home)를 사용했다. FDA 자료의 미국 허가 체계를 국내 허가 판단으로 옮겨 쓰지 않는다. 일반 기기를 단순히 추세 관찰용이라는 이유만으로 권하지 않는다.

## 공통 화면 변경

운영 화면에서 데스크톱 첫 화면의 실제 H1이 약 806px 아래에 있어 720px 높이 화면 밖으로 밀리는 것을 확인했다. 같은 제목이 담긴 큰 장식 카드가 먼저 노출되고 있었다. 목차 이동 시 대상 H2의 위쪽은 약 0px로, 64px 고정 헤더 뒤에 가렸다.

- 글 상단의 중복 장식 카드만 제거했다. 실제 H1·설명·발행일·수정일·감수 상태는 유지한다.
- 목록 카드와 공유용 OG 이미지는 유지한다. 장식 제거를 색인 회복이나 검색 순위 상승의 증거로 해석하지 않는다.
- 글 본문 H2·H3의 앵커에는 `scroll-margin-top: 8rem`을 적용한다. 콘텐츠 밖의 레이아웃 전체에 임의의 여백을 추가하지 않는다.
- 390px 모바일과 기본 데스크톱 화면에서 변경 전 기준 화면을 기록했다. 변경 후 화면과 앵커 이동은 배포 후 확인한다.

## 검증과 남은 범위

단위·회귀 테스트 19개가 통과했고 정적 빌드는 743페이지로 성공했다. 전체 발행 글 361개(건강 91개와 기존 다른 카테고리 270개)의 H1·상단 장식 제거·OG 메타데이터와 이미지 파일 보존을 검사했다. 수정한 2편의 원래 발행일·canonical·직접 출처 연결·실제 수정 문장도 출력물에서 확인했다. 사이트맵은 101개, 건강 URL은 91개이고 건강 글 수정일 누락은 0개다. RSS 50개는 모두 건강 글이다.

출력 검사·운영 응답·실제 화면 검증 결과는 소유자의 `output/healthpick-2026-10-23-blood-pressure` 작업 폴더에 보관한다. 운영 화면의 변경 후 기하 측정과 모바일 가독성은 배포 후 확인한다. 기계적 검사는 의학적 타당성이나 검색 색인 완료를 자동 판정하지 않는다.

건강 글은 91편을 유지한다. 기관 홈페이지 참조를 포함한 기계적 검토 대상은 53편에서 51편으로 줄었다. 해당 수치는 의학적 검증 완료 여부와 다르며, 이번 편집도 의사의 실제 감수가 아니다. GSC의 기존 색인 요청을 반복하지 않고, 이번 화면 변경을 유입 회복으로 보고하지 않는다.
