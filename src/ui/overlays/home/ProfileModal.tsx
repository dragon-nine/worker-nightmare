import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ModalShell } from '../../components/ModalShell';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';
import { gameBus } from '../../../game/event-bus';
import { updateMyProfile, ensureAuth, getStoredToken, ApiError } from '../../../game/services/api';
import { storage } from '../../../game/services/storage';

interface Props {
  onClose: () => void;
}

const NICKNAME_KEY = 'nickname';
const DEFAULT_NICKNAME = '토끼킹';
const MAX_LEN = 8;
const NICK_PATTERN = /^[가-힣a-zA-Z0-9]+$/;

function getProfileSaveErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 409 && error.message.includes('nickname already taken')) {
      return '이미 사용 중인 닉네임이에요';
    }
    if (error.status === 400) {
      return '닉네임을 다시 확인해주세요';
    }
    return `저장 실패 (${error.status})`;
  }
  return '서버 연결 실패';
}

export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) || DEFAULT_NICKNAME;
}

export function ProfileModal({ onClose }: Props) {
  const scale = useResponsiveScale();
  const [name, setName] = useState(getNickname);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [saving, setSaving] = useState(false);
  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      gameBus.emit('toast', '닉네임을 입력해주세요');
      return;
    }
    if (trimmed.length > MAX_LEN) {
      gameBus.emit('toast', `닉네임은 최대 ${MAX_LEN}자`);
      return;
    }
    if (!NICK_PATTERN.test(trimmed)) {
      gameBus.emit('toast', '한글/영어/숫자만 가능해요');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      // 토큰이 아예 없을 때만 인증한다. 기존 토큰의 401 재인증은 API 클라이언트가 처리한다.
      if (!getStoredToken()) {
        await ensureAuth({ character: storage.getSelectedCharacter() });
      }
      const profile = await updateMyProfile({
        nickname: trimmed,
        character: storage.getSelectedCharacter(),
      });
      localStorage.setItem(NICKNAME_KEY, profile.nickname);
      gameBus.emit('play-sfx', 'sfx-click');
      gameBus.emit('toast', '닉네임이 저장됐어요');
      onClose();
    } catch (e) {
      gameBus.emit('toast', getProfileSaveErrorMessage(e));
      inputRef.current?.focus();
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <ModalShell onClose={onClose} maxWidth={340} zIndex={1000}>
      <Text size={20 * scale} weight={900} color="#fff" align="center" style={{ marginBottom: 18 * scale }}>
        프로필
      </Text>

      {/* 닉네임 입력 */}
      <Text size={11 * scale} color="rgba(255,255,255,0.55)" style={{ marginBottom: 6 * scale }}>
        닉네임 (최대 {MAX_LEN}자)
      </Text>
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => {
          // 한글/영어/숫자만 허용, 공백·특수문자 실시간 제거
          const filtered = e.target.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/g, '');
          setName(filtered.slice(0, MAX_LEN));
        }}
        maxLength={MAX_LEN}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          padding: `${10 * scale}px ${12 * scale}px`,
          borderRadius: 10 * scale,
          background: 'rgba(0,0,0,0.45)',
          border: `${1.5 * scale}px solid rgba(255,255,255,0.15)`,
          color: '#fff',
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 700,
          fontSize: 15 * scale,
          outline: 'none',
        }}
      />

      {/* 저장 버튼 */}
      <TapButton
        onTap={handleSave}
        pressScale={0.95}
        rapid
        style={{
          marginTop: 16 * scale,
          width: '100%',
          padding: `${12 * scale}px 0`,
          borderRadius: 10 * scale,
          background: saving
            ? 'linear-gradient(180deg, #c8c8c8, #8f8f8f)'
            : 'linear-gradient(180deg, #ffd24a, #f0a030)',
          border: `${2 * scale}px solid #7a4500`,
          textAlign: 'center',
          boxShadow: saving ? 'none' : `0 ${3 * scale}px ${10 * scale}px rgba(240,160,48,0.35)`,
          opacity: saving ? 0.82 : 1,
          pointerEvents: saving ? 'none' : 'auto',
        }}
      >
        <span style={{
          fontFamily: 'GMarketSans, sans-serif',
          fontWeight: 900,
          fontSize: 14 * scale,
          color: '#3a2400',
          letterSpacing: 0.3,
        }}>{saving ? '저장 중...' : '저장'}</span>
      </TapButton>
    </ModalShell>,
    document.body,
  );
}
