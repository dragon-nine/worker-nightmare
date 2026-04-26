import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { gameBus } from '../../game/event-bus';
import { useResponsiveScale } from '../hooks/useResponsiveScale';
import { Text } from './Text';

const TOAST_DURATION_MS = 2500;
const FADE_MS = 220;
const TOAST_Z_INDEX = 2147483000;

/**
 * 전역 Toast 알림 — 비인터랙티브 알림 전용.
 *
 * 디자인 원칙:
 *   - 위치: 상단 (하단 버튼 영역과 분리)
 *   - 모양: 풀 라운드 캡슐 (버튼의 16px 라운드와 차별화)
 *   - 너비: 콘텐츠 기반 (고정 폭 X)
 *   - 깊이: backdrop-filter blur로 "떠 있는" 느낌
 *   - 아이콘: ⓘ 마크로 알림임을 명시
 *
 * `gameBus.emit('toast', '메시지')`로 표시.
 * 새 토스트가 들어오면 기존 토스트 즉시 교체.
 */
export function Toast() {
  const scale = useResponsiveScale();
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const removeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = gameBus.on('toast', (msg) => {
      // 이전 타이머 정리
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);

      setMessage(msg);
      setVisible(true);

      hideTimerRef.current = window.setTimeout(() => {
        setVisible(false);
        removeTimerRef.current = window.setTimeout(() => {
          setMessage(null);
        }, FADE_MS);
      }, TOAST_DURATION_MS);
    });

    return () => {
      unsub();
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
    };
  }, []);

  if (!message) return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: '50%',
        top: `calc(var(--sat, 0px) + ${24 * scale}px)`,
        transform: `translateX(-50%) translateY(${visible ? 0 : -12}px)`,
        opacity: visible ? 1 : 0,
        transition: `opacity ${FADE_MS}ms ease-out, transform ${FADE_MS}ms ease-out`,
        // 너비 — 화면의 70%, 최소 260px 보장
        width: `min(calc(100vw - ${32 * scale}px), ${320 * scale}px)`,
        minWidth: 260 * scale,
        maxWidth: `calc(100vw - ${32 * scale}px)`,
        boxSizing: 'border-box',
        justifyContent: 'center',
        // 풀 라운드 캡슐 — 버튼(16px)과 차별화
        borderRadius: 9999,
        // 반투명 + blur로 떠 있는 느낌
        background: 'linear-gradient(180deg, rgba(255, 224, 102, 0.96), rgba(250, 204, 21, 0.96))',
        backdropFilter: 'blur(12px) saturate(140%)',
        WebkitBackdropFilter: 'blur(12px) saturate(140%)',
        padding: `${12 * scale}px ${22 * scale}px`,
        // 가벼운 그림자 — 버튼처럼 묵직하지 않게
        boxShadow: `0 ${4 * scale}px ${16 * scale}px rgba(245, 158, 11, 0.35)`,
        // 미세한 하이라이트 보더
        border: '1.5px solid rgba(146, 64, 14, 0.75)',
        pointerEvents: 'none',
        zIndex: TOAST_Z_INDEX,
        // 콘텐츠 정렬
        display: 'flex',
        alignItems: 'center',
        gap: 10 * scale,
      }}
    >
      {/* 알림 아이콘 — 작은 원 안에 ⓘ */}
      <div
        style={{
          width: 18 * scale,
          height: 18 * scale,
          borderRadius: '50%',
          background: 'rgba(58, 36, 0, 0.14)',
          color: '#3a2400',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12 * scale,
          fontWeight: 700,
          flexShrink: 0,
          fontFamily: 'sans-serif',
          lineHeight: 1,
        }}
      >
        i
      </div>
      <Text
        size={14 * scale}
        weight={400}
        align="center"
        color="#3a2400"
        as="span"
        style={{
          letterSpacing: 0.1,
          // pre-line: 메시지 안의 \n 을 줄바꿈으로, 긴 메시지는 자동 wrap.
          whiteSpace: 'pre-line',
        }}
      >
        {message}
      </Text>
    </div>,
    document.body,
  );
}
