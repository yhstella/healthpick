---
title: SQL 기초, 루틴으로 만드는 법
description: SQL 기초 명령어 SELECT·WHERE·JOIN·GROUP BY의 역할과 질의 실행 순서, 초보자가 자주 하는 실수, 하루 30분 연습 루틴까지 예제와 표로 정리했습니다.
category: study
subcategory: IT·코딩 학습
pubDate: 2026-05-18T11:43:07.000Z
author: "헬스픽 편집부"
heroEmoji: 🧠
tags:
  - SQL 기초
  - 데이터베이스
  - 코딩 학습
tldr:
  - SQL은 SELECT·FROM·WHERE·GROUP BY·JOIN 다섯 축만 잡으면 대부분의 조회를 다룰 수 있습니다.
  - 질의는 적은 순서가 아니라 FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY 순서로 실행됩니다.
  - 개별 행을 거르는 WHERE와 집계 결과를 거르는 HAVING을 구분하면 초반 실수가 크게 줄어듭니다.
faqs:
  - q: SQL과 데이터베이스는 다른 건가요?
    a: SQL은 데이터베이스에 질문을 던지는 언어이고, MySQL·PostgreSQL 같은 데이터베이스는 그 질문을 실제로 처리하는 프로그램입니다. 하나의 SQL 문법을 익히면 여러 데이터베이스에서 비슷하게 쓸 수 있습니다.
  - q: 처음에는 어떤 도구로 연습하면 좋나요?
    a: 설치가 가벼운 SQLite나 무료로 쓸 수 있는 PostgreSQL·MySQL 정도면 충분합니다. 기본 문법은 대부분 공유되므로 첫 도구 선택에 오래 고민하지 않으셔도 됩니다.
  - q: WHERE와 HAVING은 어떻게 다른가요?
    a: WHERE는 그룹으로 묶기 전의 개별 행을 거르고, HAVING은 GROUP BY로 집계한 뒤의 결과를 거릅니다. COUNT·SUM 같은 집계 조건은 HAVING에만 쓸 수 있습니다.
  - q: JOIN이 자꾸 헷갈립니다.
    a: 두 테이블을 어떤 열로 연결할지, 즉 ON 조건을 먼저 정하는 습관을 들이시면 도움이 됩니다. 양쪽에 모두 있는 행만 남기려면 INNER JOIN, 왼쪽 테이블을 모두 남기려면 LEFT JOIN을 씁니다.
  - q: 데이터를 바꾸는 명령은 위험하지 않나요?
    a: INSERT·UPDATE·DELETE는 실제 데이터를 바꾸므로 WHERE 조건을 반드시 확인하고 실행하시는 편이 안전합니다. WHERE 없는 UPDATE·DELETE는 테이블 전체에 적용됩니다.
  - q: 하루에 얼마나 연습해야 하나요?
    a: 시간보다 매일 짧게라도 직접 질의를 써 보는 반복이 중요합니다. 하루 30분씩 같은 예제 테이블에 질문만 바꿔 던지는 방식이 문법을 오래 남깁니다.
sources:
  - name: 위키백과 SQL
    url: https://ko.wikipedia.org/wiki/SQL
  - name: Wikipedia SQL
    url: https://en.wikipedia.org/wiki/SQL
  - name: PostgreSQL 공식 문서 SELECT
    url: https://www.postgresql.org/docs/current/sql-select.html
---

## 한눈에 보는 핵심

- SQL은 SELECT·FROM·WHERE·GROUP BY·JOIN 다섯 축만 잡으면 대부분의 조회를 다룰 수 있습니다.
- 질의는 적은 순서가 아니라 FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY 순서로 실행됩니다.
- 개별 행을 거르는 WHERE와 집계 결과를 거르는 HAVING을 구분하면 초반 실수가 크게 줄어듭니다.

SQL 기초는 명령어를 많이 외우는 일이 아니라, 몇 개의 핵심 명령이 어떻게 맞물려 돌아가는지를 손으로 익히는 일입니다. 데이터가 담긴 표에서 원하는 행과 열을 뽑는 SELECT를 중심에 두고, 조건을 거는 WHERE, 묶어서 요약하는 GROUP BY, 표를 잇는 JOIN 순서로 넓혀 가면 기초가 자연스럽게 잡힙니다.

## SQL이 하는 일

SQL은 데이터베이스에 저장된 표에 질문을 던지고 답을 받아 오는 언어입니다. 여기서 표는 행(가로 한 줄, 하나의 데이터)과 열(세로 항목, 이름·도시·금액 같은 속성)로 이루어집니다. 예를 들어 `customers`라는 고객 표와 `orders`라는 주문 표가 있다면, SQL로 "서울에 사는 고객만 보여줘", "고객별 주문 금액 합계를 알려줘" 같은 질문을 문장으로 적어 실행합니다.

한 가지 문법을 익히면 여러 데이터베이스에서 비슷하게 통합니다. MySQL, PostgreSQL, SQLite, SQL Server 같은 제품은 세부 기능이 조금씩 다르지만, SELECT·WHERE·JOIN 같은 기본 문법은 표준으로 공유하므로 도구가 바뀌어도 배운 내용 대부분이 그대로 쓰입니다.

## 반드시 아는 기본 명령어

기초 단계에서는 아래 명령어의 역할만 정확히 구분해도 충분합니다. 각 명령이 무엇을 거르고 무엇을 만들어 내는지를 한 문장으로 말할 수 있으면 절반은 익힌 셈입니다.

| 명령어 | 하는 일 | 간단한 예시 |
| --- | --- | --- |
| SELECT | 어떤 열을 볼지 지정 | `SELECT name, city` |
| FROM | 대상 테이블 지정 | `FROM customers` |
| WHERE | 행을 조건으로 거름 | `WHERE city = '서울'` |
| ORDER BY | 결과를 정렬 | `ORDER BY name DESC` |
| GROUP BY | 같은 값끼리 묶어 집계 | `GROUP BY city` |
| HAVING | 집계 결과를 거름 | `HAVING COUNT(*) >= 10` |
| JOIN | 두 테이블을 연결 | `JOIN orders ON ...` |
| INSERT | 새 행 추가 | `INSERT INTO customers ...` |
| UPDATE | 기존 행 수정 | `UPDATE customers SET ...` |
| DELETE | 행 삭제 | `DELETE FROM customers WHERE ...` |
| DISTINCT | 중복 값 제거 | `SELECT DISTINCT city` |

여기에 자주 쓰는 집계 함수 다섯 개를 더하면 조회의 폭이 크게 넓어집니다. 개수를 세는 `COUNT`, 합을 구하는 `SUM`, 평균을 내는 `AVG`, 최솟값과 최댓값을 찾는 `MIN`·`MAX`입니다. 이때 `COUNT(*)`는 모든 행을 세지만 `COUNT(열)`은 그 열이 비어 있는(NULL) 행을 빼고 세므로, 둘의 결과가 다를 수 있다는 점을 기억해 두면 좋습니다.

## 질의가 실행되는 순서

초보자가 가장 자주 걸려 넘어지는 지점은, SQL을 적는 순서와 실제로 계산되는 순서가 다르다는 사실입니다. 우리는 `SELECT`부터 적지만, 데이터베이스는 `FROM`으로 표를 먼저 불러온 다음 조건을 걸고 마지막에 열을 골라냅니다. 표준적인 논리 실행 순서는 다음과 같습니다.

```sql
FROM / JOIN   -- 1. 대상 테이블을 불러오고 연결
WHERE         -- 2. 개별 행을 조건으로 거름
GROUP BY      -- 3. 같은 값끼리 묶음
HAVING        -- 4. 묶은 결과를 조건으로 거름
SELECT        -- 5. 볼 열을 고름
ORDER BY      -- 6. 정렬
LIMIT         -- 7. 보여줄 행 수 제한
```

이 순서를 알면 "왜 SELECT에서 붙인 별칭을 WHERE에서 못 쓰지?" 같은 의문이 풀립니다. WHERE가 SELECT보다 먼저 실행되므로, SELECT에서 만든 이름은 WHERE 시점에는 아직 존재하지 않기 때문입니다. 참고로 행 수를 제한하는 마지막 단계는 데이터베이스마다 키워드가 달라, MySQL·PostgreSQL·SQLite는 `LIMIT`, SQL Server는 `TOP`, Oracle은 `FETCH FIRST`를 씁니다.

## 자주 쓰는 조회 패턴

가장 단순한 조회는 한 표에서 조건에 맞는 행을 골라 정렬하는 형태입니다.

```sql
SELECT name, city
FROM customers
WHERE city = '서울'
ORDER BY name;
```

데이터를 요약해서 보고 싶을 때는 GROUP BY로 묶고 집계 함수를 씁니다. 아래 질의는 도시별 고객 수를 세되, 고객이 10명 이상인 도시만 남깁니다. 이때 "10명 이상"은 집계 결과에 대한 조건이므로 WHERE가 아니라 HAVING에 적습니다.

```sql
SELECT city, COUNT(*) AS 고객수
FROM customers
GROUP BY city
HAVING COUNT(*) >= 10
ORDER BY 고객수 DESC;
```

두 표를 이어 붙일 때는 JOIN을 씁니다. 어떤 열을 기준으로 연결할지 ON 조건으로 지정하는 것이 핵심입니다.

```sql
SELECT c.name, o.order_date, o.amount
FROM customers AS c
JOIN orders AS o ON c.id = o.customer_id
WHERE o.amount >= 50000;
```

비어 있는 값을 다룰 때는 등호가 아니라 `IS NULL`을 씁니다. NULL은 "값이 없음"을 뜻하므로 `= NULL`로는 비교되지 않습니다.

```sql
SELECT name
FROM customers
WHERE phone IS NULL;
```

## 초보자가 자주 하는 실수

문법을 외우는 것보다, 자주 나오는 실수의 원인을 이해해 두는 편이 훨씬 오래 남습니다. 아래 다섯 가지는 기초 단계에서 거의 모든 사람이 한 번씩 겪습니다.

| 흔한 실수 | 무엇이 문제인지 | 올바른 방법 |
| --- | --- | --- |
| `WHERE amount = NULL` | NULL은 등호로 비교되지 않음 | `WHERE amount IS NULL` |
| WHERE에 집계 조건 사용 | 집계는 그룹으로 묶은 뒤 계산됨 | `HAVING COUNT(*) > 5` |
| WHERE 없는 UPDATE·DELETE | 테이블 전체 행이 바뀌거나 지워짐 | 조건을 먼저 확인 후 실행 |
| INNER JOIN만 습관적으로 사용 | 한쪽에만 있는 행이 사라짐 | 필요하면 LEFT JOIN |
| `COUNT(열)`과 `COUNT(*)` 혼동 | 열 기준은 NULL을 세지 않음 | 목적에 맞게 구분 |

특히 WHERE 없는 UPDATE·DELETE는 실무에서도 사고로 이어지는 대표적인 실수입니다. 데이터를 바꾸는 문장을 실행하기 전에는, 같은 조건으로 SELECT를 먼저 돌려 어떤 행이 걸리는지 눈으로 확인하는 습관이 안전합니다.

## 단계별 학습 순서

기초를 무리 없이 쌓으려면 명령어를 한꺼번에 외우기보다, 아래처럼 다섯 단계로 나눠 하나씩 손에 익히는 편이 좋습니다. 앞 단계가 익숙해진 다음 넘어가면 뒤 단계가 훨씬 수월해집니다.

| 단계 | 익힐 내용 | 도달 목표 |
| --- | --- | --- |
| 1. 조회 | SELECT · FROM · WHERE · ORDER BY | 한 테이블에서 원하는 행·열 뽑기 |
| 2. 집계 | GROUP BY · HAVING · COUNT/SUM/AVG | 데이터를 요약해서 보기 |
| 3. 결합 | INNER JOIN · LEFT JOIN | 여러 테이블을 이어 붙이기 |
| 4. 변경 | INSERT · UPDATE · DELETE | 데이터를 안전하게 바꾸기 |
| 5. 설계 | CREATE TABLE · 기본키·외래키 | 표 구조를 스스로 만들기 |

처음 두 단계, 곧 조회와 집계만 자유롭게 다뤄도 실제 데이터를 살펴보는 일 대부분을 처리합니다. 결합과 변경은 그 위에서 확장되는 단계이므로, 조회가 어색한 상태에서 JOIN부터 파고들면 오히려 헷갈리기 쉽습니다.

## 하루 30분 연습 루틴

SQL 기초는 눈으로 읽기보다 직접 질의를 쳐 볼 때 자리 잡습니다. 하루 30분이라도 같은 예제 표를 두고 질문만 바꿔 던지는 반복이, 한 번에 몰아서 여러 장을 읽는 것보다 문법을 오래 남깁니다.

- 연습용 표 두어 개를 만들어 두고 매일 같은 데이터로 시작합니다.
- 오늘은 WHERE, 내일은 GROUP BY처럼 하루에 명령어 하나에 집중합니다.
- 새 문법을 배우면 반드시 예제 표에 직접 적용해 결과를 눈으로 확인합니다.
- 막혔던 질의는 짧게 메모해 두고, 다음 날 다시 처음부터 써 봅니다.
- 실행이 안 되면 오류 메시지를 그대로 검색해 원인을 확인하는 습관을 들입니다.

같은 표를 반복해서 쓰는 이유는, 데이터가 익숙해질수록 문법 자체에만 집중할 수 있기 때문입니다. 매번 새로운 예제로 갈아타면 데이터 구조를 파악하는 데 시간을 뺏겨 정작 문법이 남지 않습니다.

## 학습 시 유의 사항

이 안내의 SQL 문법은 표준을 기준으로 정리했지만, 데이터베이스 제품마다 세부 기능과 함수 이름이 조금씩 다릅니다. 특정 함수나 문법을 쓰기 전에는 본인이 사용하는 데이터베이스의 공식 문서를 한 번 확인하시는 편이 정확합니다.

- 실제 데이터를 바꾸는 연습은 반드시 연습용 데이터베이스에서 진행합니다.
- 문법이 통하지 않을 때는 버전과 제품(MySQL·PostgreSQL 등)을 먼저 확인합니다.
- 예제 결과가 예상과 다르면 NULL·중복·정렬 기준부터 다시 살펴봅니다.

## 마무리하며

SQL 기초는 다섯 개 안팎의 명령이 서로 어떻게 이어지는지를 손으로 익히는 과정입니다. 조회에서 집계로, 다시 결합으로 매일 조금씩 범위를 넓혀 가면 어느 순간 원하는 질문을 문장으로 옮기는 일이 자연스러워집니다.

## 자주 묻는 질문

### Q. SQL과 데이터베이스는 다른 건가요?

SQL은 데이터베이스에 질문을 던지는 언어이고, MySQL·PostgreSQL 같은 데이터베이스는 그 질문을 실제로 처리하는 프로그램입니다. 하나의 SQL 문법을 익히면 여러 데이터베이스에서 비슷하게 쓸 수 있습니다.

### Q. 처음에는 어떤 도구로 연습하면 좋나요?

설치가 가벼운 SQLite나 무료로 쓸 수 있는 PostgreSQL·MySQL 정도면 충분합니다. 기본 문법은 대부분 공유되므로 첫 도구 선택에 오래 고민하지 않으셔도 됩니다.

### Q. WHERE와 HAVING은 어떻게 다른가요?

WHERE는 그룹으로 묶기 전의 개별 행을 거르고, HAVING은 GROUP BY로 집계한 뒤의 결과를 거릅니다. COUNT·SUM 같은 집계 조건은 HAVING에만 쓸 수 있습니다.

### Q. JOIN이 자꾸 헷갈립니다.

두 테이블을 어떤 열로 연결할지, 즉 ON 조건을 먼저 정하는 습관을 들이시면 도움이 됩니다. 양쪽에 모두 있는 행만 남기려면 INNER JOIN, 왼쪽 테이블을 모두 남기려면 LEFT JOIN을 씁니다.

### Q. 데이터를 바꾸는 명령은 위험하지 않나요?

INSERT·UPDATE·DELETE는 실제 데이터를 바꾸므로 WHERE 조건을 반드시 확인하고 실행하시는 편이 안전합니다. WHERE 없는 UPDATE·DELETE는 테이블 전체에 적용됩니다.

### Q. 하루에 얼마나 연습해야 하나요?

시간보다 매일 짧게라도 직접 질의를 써 보는 반복이 중요합니다. 하루 30분씩 같은 예제 테이블에 질문만 바꿔 던지는 방식이 문법을 오래 남깁니다.
