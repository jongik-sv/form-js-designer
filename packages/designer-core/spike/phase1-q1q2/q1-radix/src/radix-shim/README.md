# radix-shim

이 디렉토리는 Radix UI + preact/compat 조합을 위해 추가된 "shim" 코드의 격리 수용소다.
Phase 1 §2 Q1 kill criterion: 컴포넌트당 50줄 이상이면 후보 탈락.

현재 상태: Radix 1.1.x + preact 10.29 + @preact/preset-vite + preact/compat alias 조합만으로
Dialog · Tabs · Popover 3종이 동작한다. monkeypatch/shim 없음.
