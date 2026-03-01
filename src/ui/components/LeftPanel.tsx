import { STAGES } from '../../game/data/stages';
import type { GameState } from '../../game/GameBridge';
import styles from './LeftPanel.module.css';

/** 스테이지별 디자인 필요 요소 */
const DESIGN_REQS: Record<number, { category: string; items: string[] }[]> = {
  1: [
    { category: '배경', items: ['어두운 침실', '침대 옆 협탁'] },
    { category: '오브젝트', items: ['스마트폰 (알람 화면)', '🔨 망치 (그림자에 숨김)', '🥛 유리컵 (물)', '👓 안경'] },
    { category: 'UI', items: ['[중지] 버튼 (도망)', '[스누즈] 버튼 (증폭)'] },
    { category: '이펙트', items: ['액정 깨짐 💥', '감전 ⚡', '진동 애니메이션', '파편 파티클'] },
  ],
  2: [
    { category: '배경', items: ['사무실 책상', '모니터 + 베젤', '책상 밑 공간'] },
    { category: '오브젝트', items: ['사내 메신저 UI', '전원 플러그 (검은색 굵은선)', '색깔 케이블들', '🗑️ 쓰레기통'] },
    { category: 'UI', items: ['채팅 말풍선', '[삭제] 버튼 (함정)', '스와이프 힌트'] },
    { category: '이펙트', items: ['모니터 꺼짐 찌직-', '모래시계 ⏳', '스파크'] },
  ],
  3: [
    { category: '배경', items: ['카페 카운터', '에스프레소 머신 (거울면)'] },
    { category: '캐릭터', items: ['🤵 부장님 (뒷모습)', '부장님 손 (가위/바위/보)'] },
    { category: 'UI', items: ['✌️✊✋ 선택 버튼 3개', '거울 반사면 (힌트)'] },
    { category: '이펙트', items: ['분노 이펙트 😤', '법인카드 건네기', '라운드 표시'] },
  ],
  4: [
    { category: '배경', items: ['회의실', '프로젝터 / 화이트보드'] },
    { category: '캐릭터', items: ['👨‍💼 부장님 (열변 중)', '말풍선 (점점 커짐)'] },
    { category: 'UI', items: ['선택지 버튼 4개', '라운드 카운터', '타이머'] },
    { category: '이펙트', items: ['레이저 눈빛 👀🔴', '컨페티 🎊', '끄덕끄덕 모션'] },
  ],
  5: [
    { category: '배경', items: ['PC 바탕화면', '폴더 창 UI'] },
    { category: '오브젝트', items: ['📝 Word 문서 아이콘', '📕 PDF 아이콘 + 🔒', '가상 키보드'] },
    { category: 'UI', items: ['파일명 편집 커서', '키보드 레이아웃', '엔터/백스페이스 키'] },
    { category: '이펙트', items: ['파일 증식 애니메이션', '아이콘 변환 철컥!', '결재 스탬프'] },
  ],
  6: [
    { category: '배경', items: ['사무실 (모니터 앞)', '모니터 베젤 (테두리)'] },
    { category: '오브젝트', items: ['쇼핑몰 화면', '물리 전원버튼 (LED)', '부장님 실루엣 그림자'] },
    { category: 'UI', items: ['가짜 [Alt+Tab] 아이콘', '전원 LED 깜빡임'] },
    { category: '이펙트', items: ['CRT 꺼짐 효과', '모래시계 렉', '발자국 흔들림'] },
  ],
  7: [
    { category: '배경', items: ['사무실 (분할 뷰)', '옆자리 동료 하반신', '내 책상'] },
    { category: '오브젝트', items: ['떨리는 다리', '📱 스마트폰 (1%)', '⚡ 소형 발전기', '🔌 USB 케이블', '📎 스테이플러'] },
    { category: 'UI', items: ['배터리 게이지', '서랍 열기'] },
    { category: '이펙트', items: ['화면 흔들림', '충전 파티클 ⚡', '배터리 차오름'] },
  ],
  8: [
    { category: '배경', items: ['카카오톡 채팅방 UI'] },
    { category: '캐릭터', items: ['👨‍👩‍👧 가족 프로필 (여보, 엄마, 딸)'] },
    { category: 'UI', items: ['채팅 말풍선 (좌/우)', '입력창 (함정)', '⚙️ 설정 톱니바퀴', 'AI 챗봇 토글 스위치'] },
    { category: '이펙트', items: ['오토컴플릿 타이핑', '메시지 슬라이드 인', '토글 ON 애니메이션'] },
  ],
  9: [
    { category: '배경', items: ['식당 화장실 (방탈출 뷰)', '세면대', '환기 창문 (높은 곳)'] },
    { category: '오브젝트', items: ['🧻 화장지', '🪠 뚫어뻥', '🧾 영수증 뭉치', '🔵 청테이프', '🚪 문'] },
    { category: 'UI', items: ['인벤토리 바 (하단)', '아이템 합성 UI'] },
    { category: '이펙트', items: ['밧줄 만들기 🪢', '창문 탈출 연출', '문 열림 → 부장님 등장'] },
  ],
  10: [
    { category: '배경', items: ['사무실 (부장님 책상 앞)', '앵그리버드 뷰'] },
    { category: '캐릭터', items: ['😴 부장님 (꿀잠, 입 벌림)', '💤 수면 이펙트'] },
    { category: '오브젝트', items: ['📄 사직서 봉투', '✈️ 종이비행기 (접기 후)', '슬링샷'] },
    { category: 'UI', items: ['궤적 예측선 (점)', '조준 타겟'] },
    { category: '이펙트', items: ['종이접기 변신 착착착!', '꿀꺽 삼킴', '도장 쾅! 퇴사 승인!', '컨페티 🎊'] },
  ],
};

interface Props {
  gameState: GameState;
}

export function LeftPanel({ gameState }: Props) {
  const currentStage = STAGES.find(s => s.id === gameState.stageId) ?? null;
  const timeDisplay = gameState.time
    ? `${gameState.time} ${gameState.period ?? ''}`
    : null;
  const currentMinigame = currentStage?.minigames[0] ?? null;
  const designReqs = currentStage ? DESIGN_REQS[currentStage.id] : null;

  return (
    <aside className={styles.panel}>
      {/* 게임 소개 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>직장인 잔혹사</div>
        <p className={styles.description}>
          평범한 직장인의 월요일을 체험하는 트롤 퍼즐 게임.
        </p>
        <p className={styles.descriptionSub}>
          화면에 보이는 버튼을 곧이곧대로 믿으면 안 됩니다.
          주변 사물을 관찰하고, 기발한 방법을 찾아 하루를 생존하세요.
        </p>
      </div>

      {/* 핵심 조작법 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>조작법</div>
        <ul className={styles.controlList}>
          <li className={styles.controlItem}>
            <span className={styles.controlKey}>탭</span>
            오브젝트 상호작용
          </li>
          <li className={styles.controlItem}>
            <span className={styles.controlKey}>드래그</span>
            아이템 이동 / 합성
          </li>
          <li className={styles.controlItem}>
            <span className={styles.controlKey}>스와이프</span>
            화면 전환 / 문지르기
          </li>
          <li className={styles.controlItem}>
            <span className={styles.controlKey}>길게 누르기</span>
            아이템 잡기
          </li>
        </ul>
      </div>

      {/* 현재 스테이지 */}
      {currentStage && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>현재 스테이지</div>
          {timeDisplay && (
            <div className={styles.timeDisplay}>{timeDisplay}</div>
          )}
          <div className={styles.currentStage}>
            <span className={styles.stageEmoji}>{currentStage.emoji}</span>
            <div className={styles.stageInfo}>
              <span className={styles.stageLabel}>STAGE {currentStage.id}</span>
              <span className={styles.stageName}>{currentStage.name}</span>
            </div>
          </div>
          {currentMinigame && (
            <div className={styles.missionBox}>
              <span className={styles.missionLabel}>미션</span>
              <span className={styles.missionName}>{currentMinigame.name}</span>
              <span className={styles.missionDesc}>{currentMinigame.description}</span>
            </div>
          )}
        </div>
      )}

      {/* 디자인 필요 요소 */}
      {designReqs && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>디자인 필요 요소</div>
          <div className={styles.designReqs}>
            {designReqs.map((group) => (
              <div key={group.category} className={styles.designGroup}>
                <div className={styles.designCategory}>{group.category}</div>
                <ul className={styles.designItems}>
                  {group.items.map((item, i) => (
                    <li key={i} className={styles.designItem}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
