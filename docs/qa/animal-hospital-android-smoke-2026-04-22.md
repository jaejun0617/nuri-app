# AnimalHospital Android Smoke - 2026-04-22

## Device

- `adb devices -l`: `R5CY613NMSY device usb:0-1 product:psqksx model:SM_S937N device:psq`
- build/install: `npm run android -- --deviceId R5CY613NMSY`
- result: `BUILD SUCCESSFUL`, install `Success`, launch `com.nuri.app/com.nuri.MainActivity`

## Evidence Files

- launch screenshot: `docs/qa/android-animal-hospital-smoke-launch-2026-04-22.png`
- home window dump: `docs/qa/android-animal-hospital-smoke-window-2026-04-22.xml`
- more menu dump: `docs/qa/android-animal-hospital-more-window-2026-04-22.xml`
- list screenshot: `docs/qa/android-animal-hospital-list-2026-04-22.png`
- list window dump: `docs/qa/android-animal-hospital-list-window-2026-04-22.xml`
- detail screenshot: `docs/qa/android-animal-hospital-detail-2026-04-22.png`
- detail window dump: `docs/qa/android-animal-hospital-detail-window-2026-04-22.xml`
- map fallback screenshot: `docs/qa/android-animal-hospital-detail-map-2026-04-22.png`
- map fallback window dump: `docs/qa/android-animal-hospital-detail-map-window-2026-04-22.xml`
- approved list screenshot: `docs/qa/android-animal-hospital-approved-thumbnail-list-2026-04-22.png`
- approved list window dump: `docs/qa/android-animal-hospital-approved-thumbnail-list-window-2026-04-22.xml`
- approved detail screenshot: `docs/qa/android-animal-hospital-approved-thumbnail-detail-2026-04-22.png`
- approved detail window dump: `docs/qa/android-animal-hospital-approved-thumbnail-detail-window-2026-04-22.xml`
- tel intent screenshot: `docs/qa/android-animal-hospital-approved-tel-2026-04-22.png`
- tel intent window dump: `docs/qa/android-animal-hospital-approved-tel-window-2026-04-22.xml`
- map intent screenshot: `docs/qa/android-animal-hospital-approved-map-2026-04-22.png`
- map intent window dump: `docs/qa/android-animal-hospital-approved-map-window-2026-04-22.xml`
- approved map preview screenshot: `docs/qa/android-animal-hospital-approved-map-preview-2026-04-22.png`
- approved map preview window dump: `docs/qa/android-animal-hospital-approved-map-preview-window-2026-04-22.xml`
- P0-P2 list screenshot: `docs/qa/android-animal-hospital-p0p2-list-2026-04-22.png`
- P0-P2 list window dump: `docs/qa/android-animal-hospital-p0p2-list-window-2026-04-22.xml`
- P0-P2 VIP search screenshot: `docs/qa/android-animal-hospital-p0p2-search-vip-2026-04-22.png`
- P0-P2 VIP search window dump: `docs/qa/android-animal-hospital-p0p2-search-vip-window-2026-04-22.xml`
- P0-P2 name24 empty screenshot: `docs/qa/android-animal-hospital-p0p2-name24-2026-04-22.png`
- P0-P2 name24 window dump: `docs/qa/android-animal-hospital-p0p2-name24-window-2026-04-22.xml`
- verified open24 list screenshot: `docs/qa/android-animal-hospital-open24-list-2026-04-22.png`
- verified open24 list window dump: `docs/qa/android-animal-hospital-open24-list-window-2026-04-22.xml`
- verified open24 filter screenshot: `docs/qa/android-animal-hospital-open24-filter-2026-04-22.png`
- verified open24 filter window dump: `docs/qa/android-animal-hospital-open24-filter-window-2026-04-22.xml`
- location copy verification screenshot: `docs/qa/android-animal-hospital-open24-location-2026-04-22.png`
- location copy verification window dump: `docs/qa/android-animal-hospital-open24-location-window-2026-04-22.xml`
- P0-P2 detail screenshot: `docs/qa/android-animal-hospital-p0p2-detail-2026-04-22.png`
- P0-P2 detail window dump: `docs/qa/android-animal-hospital-p0p2-detail-window-2026-04-22.xml`
- P0-P2 tel screenshot: `docs/qa/android-animal-hospital-p0p2-tel-2026-04-22.png`
- P0-P2 tel window dump: `docs/qa/android-animal-hospital-p0p2-tel-window-2026-04-22.xml`
- P0-P2 map resolver screenshot: `docs/qa/android-animal-hospital-p0p2-map-2026-04-22.png`
- P0-P2 map resolver window dump: `docs/qa/android-animal-hospital-p0p2-map-window-2026-04-22.xml`
- P0-P2 map preview screenshot: `docs/qa/android-animal-hospital-p0p2-map-preview-2026-04-22.png`
- P0-P2 map preview window dump: `docs/qa/android-animal-hospital-p0p2-map-preview-window-2026-04-22.xml`

## Verified

- 전체메뉴에서 `우리동네 동물병원` 진입 확인
- 리스트 진입 후 `우리동네 동물병원` header 확인
- 리스트 카드에서 `동물병원` label, 병원명, `전화번호 확인 중` 노출 확인
- 리스트 window dump에서 `주소` 텍스트 미검출
- 리스트 텍스트 bounds 기준 label/name/phone이 같은 x=448 좌측 정렬로 배치됨
- 리스트 카드 text block이 썸네일 우측에서 카드 높이 중심부에 배치됨
- 리스트 첫 카드 상세 진입 확인
- 상세에서 주소, 전화 fallback, 기준일, 위치 섹션 확인
- approved coordinates 부재 케이스에서 지도 영역 fallback `검수된 좌표가 아직 없어 주소 기준으로 확인해 주세요.` 확인
- linked SQL seed 후 approved sample `24시 마이동물의료센터` 리스트 카드에서 official thumbnail, `동물병원` label, 병원명, `0319455000` 노출 확인
- approved sample 상세에서 official thumbnail, 전화번호 `0319455000`, `전화하기`, `길찾기` 노출 확인
- `전화하기` 탭 후 Android current focus가 `com.skt.prod.dialer/com.skt.prod.dialer.activities.main.MainActivity`로 전환됨을 확인
- dialer 화면에서 `031-945-5000` 표시 확인. 실제 통화는 진행하지 않음
- `길찾기` 탭 후 Android resolver가 열리고 `네이버지도`, `지도`, `카카오맵`, `TMAP` 선택지가 표시됨을 확인
- approved coordinates 케이스에서 지도 preview 영역의 좌표 없음 fallback 미노출, `열기` CTA 노출 확인
- 상세 진입/뒤로가기 중 앱 프로세스 유지: `pidof com.nuri.app` returned `15855`
- recent logcat에서 `AndroidRuntime` fatal crash 미검출

## P0-P2 Follow-up Verified

- 2026-04-22 후속 build/install/start 재실행: `npm run android -- --deviceId R5CY613NMSY` 성공
- `adb devices -l`: `R5CY613NMSY device usb:0-1 product:psqksx model:SM_S937N device:psq`
- 동물병원 리스트에 `전체`, `가까운순`, `24시 운영` 칩 노출 확인
- 동물병원 리스트에서 `최근 검색` 텍스트 미검출
- 동물병원 리스트 text node 기준 주소 텍스트 미노출, `동물병원 / 병원명 / 전화번호`만 노출 확인
- 위치 문구는 `새 위치 확인 중`이나 `대략 위치 기준`이 아니라 `현재 위치 기준`, `현재 위치`, 역지오코딩 후 `일산3동`으로 표시됨
- 기본 리스트에서 `24시 마이동물의료센터` 전화번호가 `031-945-5000`으로 하이픈 표시됨
- 검색어 `VIP` 입력 후 화면이 `전국 검색`으로 표시됨
- `VIP` 검색 결과에 현재 위치 인근이 아닌 `VIP동물의료센터 청담점`이 노출되고 전화번호가 `02-511-7522`로 하이픈 표시됨
- `24시 운영` 칩은 병원명 신호를 쓰지 않고 approved `open24Hours` verification 기준으로 동작하며, `24시 마이동물의료센터`만 남는 것을 확인함
- 상세에서 `24시 마이동물의료센터` 전화번호 `031-945-5000`, 주소, 거리, `전화하기`, `길찾기` 확인
- `전화하기` 탭 후 Android current focus: `com.skt.prod.dialer/com.skt.prod.dialer.activities.main.MainActivity`
- dialer 화면에서 `24시마이동물의료센터`, `경기 파주시 청석로 122`, `031-945-5000` 표시 확인
- `길찾기` 탭 후 Android resolver `연결 프로그램`이 열리고 `네이버지도`, `지도`, `카카오맵`, `TMAP` 선택지가 표시됨
- 상세 하단 지도 preview에서 `위치`, `지도 미리보기에서 위치를 확인하고 길찾기로 이어갈 수 있어요.`, `열기`, `Google 지도`, `24시 마이동물의료센터 위치 미리보기` 확인
- recent logcat에서 `FATAL EXCEPTION`, `AndroidRuntime`, `ReactNativeJS` 치명 로그 미검출

## Not Verified

- 느린 네트워크 조건은 adb/network shaping 없이 일반 네트워크에서만 확인
- 운영자 UI는 앱 admin 계정 화면으로 직접 시각 검증하지 못했고, service_role claim을 넣은 linked RPC로 summary/detail/review item 응답을 검증했다.
- service role key와 Kakao REST key가 현재 shell에 없어 script apply mode와 live runtime provider snapshot 재실행은 하지 못했다.

## Result

- Android 실기기 build/install/list/detail/fallback smoke와 approved phone/coordinates/thumbnail public 노출 smoke를 통과했다.
- `tel:` CTA는 dialer intent 진입까지, 길찾기 CTA는 외부 지도 앱 resolver 진입까지 확인했다.

## 2026-04-23 Follow-up

- device: `R5CY613NMSY`, model `SM_S937N`
- evidence summary: `docs/qa/animal-hospital-provider-location-admin-closeout-2026-04-23.md`
- launch: `docs/qa/android-animal-hospital-2026-04-23-launch.png`
- list: `docs/qa/android-animal-hospital-2026-04-23-list.png`
- detail: `docs/qa/android-animal-hospital-2026-04-23-detail.png`
- tel intent: `docs/qa/android-animal-hospital-2026-04-23-tel.png`
- directions resolver: `docs/qa/android-animal-hospital-2026-04-23-directions.png`
- map preview: `docs/qa/android-animal-hospital-2026-04-23-map-preview.png`
- map open resolver: `docs/qa/android-animal-hospital-2026-04-23-map-open.png`

Verified:

- 리스트 주소 미노출 유지.
- 리스트 텍스트 left align과 vertical center 유지.
- `24시 마이동물의료센터` phone `031-945-5000` 하이픈 표시 유지.
- 상세 hero thumbnail, phone, `전화하기`, `길찾기`, 지도 preview 확인.
- `전화하기` 탭 후 `com.skt.prod.dialer`에서 `031-945-5000` 표시.
- `길찾기`와 지도 `열기` CTA가 Android resolver를 열고 `네이버지도`, `지도`, `카카오맵`, `TMAP` 선택지를 표시.
- recent logcat에서 `FATAL EXCEPTION`, `AndroidRuntime`, `ReactNativeJS` fatal crash 미검출.
