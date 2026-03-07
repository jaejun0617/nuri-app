# Codex Workflow

이 문서는 이 프로젝트에서 Codex가 작업할 때 우선 따라야 하는 실무 기준을 정리한 로컬 작업 가이드다.

## Core Principles

1. 코드를 수정하거나 작업을 진행하기 전에 반드시 전체 코드베이스를 신중하게 분석한다.
2. 프로젝트의 전체 구조와 아키텍처를 충분히 이해한 뒤에만 수정한다.
3. 단계적으로 사고한다. (Think step-by-step)
4. 파일을 무작정 수정하지 않는다.
5. 기존 기능을 절대 깨뜨리지 않는다.
6. 가능한 기존 아키텍처와 설계를 유지한다.
7. 가능한 최소한의 코드만 수정한다.
8. 성능, 안정성, 가독성이 실제로 개선되는 경우에만 수정한다.
9. 실제 모바일 디바이스 환경에서의 UX를 우선 고려한다.
10. TypeScript 타입 안정성을 반드시 보장한다.
11. `any` 사용, `undefined` 접근 등 unsafe 패턴을 피한다.
12. 재사용 가능한 컴포넌트와 구조를 우선적으로 설계한다.
13. 에러가 발생할 수 있는 로직에는 `try-catch` 및 fallback 처리를 적용한다.
14. 코드 스타일과 프로젝트 컨벤션을 유지한다.
15. 불필요한 라이브러리를 추가하지 않는다.
16. 네트워크 요청은 효율적으로 관리하고 불필요한 API 호출을 줄인다.

## Project Analysis Checklist

### 1. 프로젝트 구조 분석

- 디렉토리 구조
- 컴포넌트 계층 구조
- 화면(Screen) 구성
- 공통 컴포넌트 구조

### 2. 상태 관리 구조 분석

- Zustand 사용 여부 및 구조
- 전역 상태와 로컬 상태 분리 여부
- 불필요한 상태 업데이트 여부
- 상태 변경으로 인한 리렌더링 문제

### 3. Navigation 구조 분석

- React Navigation 구조
- Stack / Tab / Modal 흐름
- 화면 전환 시 불필요한 리렌더링
- navigation props 전달 구조

### 4. API 및 데이터 흐름 분석

- 데이터 fetch 구조
- API 호출 위치
- 캐싱 여부
- 불필요한 재요청

### 5. React Native 성능 분석

- `FlatList` / `SectionList` 사용 여부
- `keyExtractor` 최적화 여부
- 이미지 렌더링 최적화 여부
- 불필요한 화면/셀 리렌더링 여부

## Performance Optimization Checklist

### 1. 리렌더링 최적화

- 불필요한 리렌더링 식별
- `React.memo` 적용 가능한 컴포넌트
- `useMemo` 사용 가능한 계산 로직
- `useCallback` 적용 가능한 함수

### 2. 상태 업데이트 최적화

- 불필요한 `setState` 제거
- Zustand 상태 변경 범위 최소화
- selector 사용 여부 확인

### 3. 컴포넌트 구조 개선

- 반복되는 UI 패턴을 재사용 컴포넌트로 분리
- 지나치게 큰 컴포넌트 분리
- props 구조 단순화

### 4. React Native 성능 점검

- `FlatList` / `SectionList` 적용 가능 여부
- `keyExtractor` 안정성 점검
- 이미지 렌더링 최적화
- 불필요한 re-render 방지

## TypeScript Safety Checklist

다음 문제를 우선적으로 점검하고 수정한다.

- `any` 타입 사용
- `undefined` / `null` 접근
- 잘못된 타입 선언
- API 응답 타입 미정의

반드시 optional chaining과 안전한 fallback 값을 사용한다.

## Network and Data Management Checklist

- 불필요한 API 재요청 방지
- 가능한 경우 데이터 캐싱 적용
- 네트워크 오류 처리
- `loading` / `error` 상태 관리

## UI / UX Checklist

모바일 환경 기준으로 다음을 확인한다.

- spacing 및 layout 정렬
- font size 가독성
- 터치 영역 적절성
- placeholder 텍스트 개선
- 실제 서비스 수준의 UX 문구 사용
- 접근성(accessibility) 고려

## Standard Working Sequence

### 1단계: 프로젝트 전체 분석

- 구조 분석
- 상태 관리 분석
- 네비게이션 구조 분석
- 데이터 흐름 분석

### 2단계: 문제점 식별

- 성능 병목
- 불필요한 리렌더링
- 상태 관리 문제
- 타입 안정성 문제
- UI / UX 문제

### 3단계: 개선 전략 수립

- 코드 수정 전에 어떤 개선을 할지 먼저 정리한다.

### 4단계: 코드 수정

- 필요한 부분만 최소 범위로 수정한다.
- 성능 최적화와 코드 가독성을 함께 개선한다.

### 5단계: 검증

다음을 반드시 확인한다.

- 프로젝트가 정상적으로 빌드되는지
- TypeScript 오류가 없는지
- 런타임 오류가 발생하지 않는지
- 실제 모바일 디바이스에서 UI가 정상 동작하는지
- 네비게이션 흐름이 깨지지 않는지
- 기존 기능이 그대로 유지되는지

## Standard Output Format

작업 완료 후 아래 순서로 결과를 정리한다.

1. 수정된 파일 목록
2. 수행한 변경 사항 설명
3. 성능 개선 내용
4. 리렌더링 최적화 내용
5. Zustand 상태관리 개선 내용
6. Navigation 구조 개선 내용
7. 잠재적인 리스크
8. 추가로 개선 가능한 사항

## Priority

항상 코드의 안정성, 성능, 가독성, 유지보수성을 최우선으로 고려한다.
