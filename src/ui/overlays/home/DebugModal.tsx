import { useState } from 'react';
import { ModalShell } from '../../components/ModalShell';
import { TapButton } from '../../components/TapButton';
import { Text } from '../../components/Text';
import { useResponsiveScale } from '../../hooks/useResponsiveScale';
import { gameBus } from '../../../game/event-bus';

interface Props {
  onClose: () => void;
}

const DEBUG_PASSWORD = '1114';

export function DebugModal({ onClose }: Props) {
  const scale = useResponsiveScale();
  const [unlocked, setUnlocked] = useState(false);
  const [pwInput, setPwInput] = useState('');
  const [pwError, setPwError] = useState(false);

  const handleSubmitPassword = () => {
    if (pwInput === DEBUG_PASSWORD) {
      setUnlocked(true);
      setPwError(false);
    } else {
      setPwError(true);
      setPwInput('');
    }
  };

  const handleStageSelect = () => {
    gameBus.emit('play-sfx', 'sfx-click');
    onClose();
    gameBus.emit('screen-change', 'stage-select');
  };

  if (!unlocked) {
    return (
      <ModalShell onClose={onClose} maxWidth={320}>
        <Text size={22 * scale} weight={900} align="center" style={{ marginBottom: 6 * scale }}>
          🔒 비밀번호
        </Text>
        <Text size={11 * scale} color="rgba(255,255,255,0.55)" align="center" style={{ marginBottom: 18 * scale }}>
          디버그 도구를 열려면 비밀번호를 입력하세요
        </Text>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pwInput}
          onChange={(e) => {
            setPwInput(e.target.value);
            if (pwError) setPwError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmitPassword();
          }}
          placeholder="••••"
          style={{
            width: '100%',
            padding: `${12 * scale}px ${14 * scale}px`,
            background: 'rgba(255,255,255,0.06)',
            border: `${1.5 * scale}px solid ${pwError ? '#e8593c' : 'rgba(255,255,255,0.18)'}`,
            borderRadius: 10 * scale,
            color: '#fff',
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 18 * scale,
            letterSpacing: 4 * scale,
            textAlign: 'center',
            outline: 'none',
            boxSizing: 'border-box',
            marginBottom: 8 * scale,
          }}
        />
        {pwError && (
          <Text size={11 * scale} color="#e8593c" align="center" style={{ marginBottom: 12 * scale }}>
            비밀번호가 틀려요
          </Text>
        )}
        <TapButton
          onTap={handleSubmitPassword}
          pressScale={0.96}
          style={{
            width: '100%',
            marginTop: 6 * scale,
            padding: `${12 * scale}px`,
            background: 'linear-gradient(180deg, #ffd24a, #f5a623)',
            border: 'none',
            borderRadius: 10 * scale,
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: 'GMarketSans, sans-serif',
              fontWeight: 900,
              fontSize: 14 * scale,
              color: '#241808',
              letterSpacing: 0.3,
            }}
          >
            확인
          </span>
        </TapButton>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} maxWidth={320}>
      <Text size={22 * scale} weight={900} align="center" style={{ marginBottom: 4 * scale }}>
        🛠 디버그
      </Text>
      <Text size={11 * scale} color="rgba(255,255,255,0.55)" align="center" style={{ marginBottom: 20 * scale }}>
        잠금 해제됨
      </Text>

      <TapButton
        onTap={handleStageSelect}
        pressScale={0.96}
        style={{
          width: '100%',
          padding: `${14 * scale}px`,
          background: 'linear-gradient(180deg, #ffd24a, #f5a623)',
          border: 'none',
          borderRadius: 12 * scale,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'GMarketSans, sans-serif',
            fontWeight: 900,
            fontSize: 15 * scale,
            color: '#241808',
            letterSpacing: 0.3,
          }}
        >
          🎯 스테이지 바로 시작하기
        </span>
      </TapButton>
    </ModalShell>
  );
}
