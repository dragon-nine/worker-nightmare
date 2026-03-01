import type { NarrativeDef } from '../../types/game';

export const NARRATIVES: NarrativeDef[] = [
  // ── 프롤로그 (알람 전) ──
  {
    stageIndex: 0,
    time: '06:59', period: 'AM',
    bgColor: '#0a0a14',
    isPrologue: true,
    messages: [
      { type: 'system', text: '월요일 아침' },
      { type: 'left', sender: '팀장님', text: '오늘 보고서 3시까지 부탁해요' },
      { type: 'left', sender: '동료 김대리', text: '오늘 회식이래ㅋㅋ' },
      { type: 'system', text: '📋 내일까지 프로젝트 마감' },
      { type: 'thought', text: '...5분만 더' },
      { type: 'system', text: '⏰ 07:00 — 알람이 울립니다' },
    ],
  },

  // ── 08:30 사무실 도착 (메신저 오타 전) ──
  {
    stageIndex: 1,
    time: '08:30', period: 'AM',
    bgColor: '#1a2a4e',
    messages: [
      { type: 'system', text: '사무실 도착' },
      { type: 'left', sender: '동료', text: '헐 오늘도 이 시간에?' },
      { type: 'right', text: '응... (하품)' },
      { type: 'system', text: '💬 메신저 알림' },
      { type: 'thought', text: '...잠깐, 어젯밤에 뭘 보냈지?' },
    ],
  },

  // ── 12:00 점심시간 (가위바위보 전) ──
  {
    stageIndex: 2,
    time: '12:00', period: 'PM',
    bgColor: '#f5e6d0',
    messages: [
      { type: 'system', text: '점심시간' },
      { type: 'left', sender: '부장님', text: '오늘 점심은 내가 쏜다~' },
      { type: 'left', sender: '부장님', text: '대신 가위바위보 진 사람이 주문!' },
      { type: 'thought', text: '어떻게 하면 자연스럽게 지지...' },
    ],
  },

  // ── 13:30 회의 (빈말 퍼레이드 전) ──
  {
    stageIndex: 3,
    time: '13:30', period: 'PM',
    bgColor: '#d5d8f0',
    messages: [
      { type: 'left', sender: '팀장님', text: '다들 회의실 집합~' },
      { type: 'right', text: '네...' },
      { type: 'thought', text: '점심 먹고 바로 회의라니...' },
      { type: 'thought', text: '적당히 맞장구만 치자...' },
    ],
  },

  // ── 15:00 보고서 (파일 저장 전) ──
  {
    stageIndex: 4,
    time: '15:00', period: 'PM',
    bgColor: '#c5c8d8',
    messages: [
      { type: 'left', sender: '팀장님', text: '아까 그 보고서 다시 보내줘' },
      { type: 'right', text: '어느 버전이요...?' },
      { type: 'left', sender: '팀장님', text: '최종' },
      { type: 'right', text: '최종이 5개인데요' },
      { type: 'left', sender: '팀장님', text: '진짜 최종' },
      { type: 'thought', text: '이번엔 절대 수정 못하게...' },
    ],
  },

  // ── 16:30 딴짓 (웹서핑 전) ──
  {
    stageIndex: 5,
    time: '16:30', period: 'PM',
    bgColor: '#b8bcc8',
    messages: [
      { type: 'thought', text: '퇴근까지 1시간 30분...' },
      { type: 'system', text: '🔔 오늘의 핫딜: 에어팟 50% 할인' },
      { type: 'thought', text: '...잠깐만 보자' },
      { type: 'thought', text: '딱 5분만' },
    ],
  },

  // ── 18:00 야근 시작 (다리 떠는 빌런 전) ──
  {
    stageIndex: 6,
    time: '18:00', period: 'PM',
    bgColor: '#2e1810',
    messages: [
      { type: 'system', text: '퇴근 시간' },
      { type: 'left', sender: '팀장님', text: '미안한데 오늘 야근 가능?' },
      { type: 'right', text: '네... 가능합니다 😊' },
      { type: 'thought', text: '😊→😭' },
      { type: 'system', text: '📱 스마트폰 배터리: 1%' },
      { type: 'thought', text: '옆자리 그놈은 또 다리를 떤다...' },
    ],
  },

  // ── 20:00 야근 중 (가족 거짓말 전) ──
  {
    stageIndex: 7,
    time: '20:00', period: 'PM',
    bgColor: '#12121e',
    messages: [
      { type: 'system', text: '야근 중...' },
      { type: 'system', text: '📱 카카오톡 12건' },
      { type: 'left', sender: '여보', text: '언제 와?' },
      { type: 'left', sender: '여보', text: '오늘 밥은 먹고 와?' },
      { type: 'thought', text: '뭐라고 답해야 하지...' },
    ],
  },

  // ── 21:30 회식 (술자리 탈출 전) ──
  {
    stageIndex: 8,
    time: '21:30', period: 'PM',
    bgColor: '#2d1810',
    messages: [
      { type: 'left', sender: '부장님', text: '고생했어~ 한잔 하자' },
      { type: 'thought', text: '거절 불가...' },
      { type: 'system', text: '회식 2시간째...' },
      { type: 'left', sender: '부장님', text: '한 잔 더!' },
      { type: 'thought', text: '화장실... 탈출구가 있을지도' },
    ],
  },

  // ── 23:00 퇴사 결심 (사직서 전) ──
  {
    stageIndex: 9,
    time: '23:00', period: 'PM',
    bgColor: '#1a0a0a',
    messages: [
      { type: 'system', text: '집 앞 도착' },
      { type: 'system', text: '📱 알림: 내일 아침 8시 회의 추가' },
      { type: 'thought', text: '...' },
      { type: 'thought', text: '......' },
      { type: 'thought', text: '오늘이 마지막이다.' },
    ],
  },
];
