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

  // ── 08:30 사무실 도착 (부팅 전) ──
  {
    stageIndex: 1,
    time: '08:30', period: 'AM',
    bgColor: '#1a2a4e',
    messages: [
      { type: 'system', text: '사무실 도착' },
      { type: 'left', sender: '동료', text: '헐 오늘도 이 시간에?' },
      { type: 'right', text: '응... (하품)' },
      { type: 'left', sender: '팀장님', text: '어, 왔어? PC 켜고 바로 시작해' },
      { type: 'thought', text: '아직 커피도 못 마셨는데...' },
    ],
  },

  // ── 12:00 점심시간 (메뉴 전) ──
  {
    stageIndex: 2,
    time: '12:00', period: 'PM',
    bgColor: '#f5e6d0',
    messages: [
      { type: 'system', text: '점심시간' },
      { type: 'left', sender: '동료1', text: '밥 먹으러 가자~' },
      { type: 'left', sender: '동료2', text: '뭐 먹지' },
      { type: 'left', sender: '동료1', text: '아무거나' },
      { type: 'left', sender: '동료2', text: '아무거나 말고' },
      { type: 'thought', text: '매일 반복되는 이 대화...' },
    ],
  },

  // ── 13:30 회의 (졸음 전) ──
  {
    stageIndex: 3,
    time: '13:30', period: 'PM',
    bgColor: '#d5d8f0',
    messages: [
      { type: 'left', sender: '팀장님', text: '다들 회의실 집합~' },
      { type: 'right', text: '네...' },
      { type: 'thought', text: '점심 먹고 바로 회의라니...' },
      { type: 'thought', text: 'PPT 100장이라며...' },
    ],
  },

  // ── 15:00 보고서 (파일 전) ──
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
      { type: 'thought', text: '진짜 최종이 3개야...' },
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

  // ── 18:00 야근 시작 (충전 전) ──
  {
    stageIndex: 6,
    time: '18:00', period: 'PM',
    bgColor: '#2e1810',
    messages: [
      { type: 'system', text: '퇴근 시간' },
      { type: 'left', sender: '팀장님', text: '미안한데 오늘 야근 가능?' },
      { type: 'right', text: '네... 가능합니다 😊' },
      { type: 'thought', text: '😊→😭' },
      { type: 'system', text: '🔋 노트북 배터리: 8%' },
      { type: 'thought', text: '충전기 어디갔어?!' },
    ],
  },

  // ── 20:00 야근 중 (모기 전) ──
  {
    stageIndex: 7,
    time: '20:00', period: 'PM',
    bgColor: '#12121e',
    messages: [
      { type: 'system', text: '사무실에 혼자 남았다' },
      { type: 'thought', text: '나만 야근이네...' },
      { type: 'system', text: '💡 형광등이 깜빡인다' },
      { type: 'system', text: '윙~~' },
      { type: 'thought', text: '...설마' },
    ],
  },

  // ── 21:30 회식 (소맥 전) ──
  {
    stageIndex: 8,
    time: '21:30', period: 'PM',
    bgColor: '#2d1810',
    messages: [
      { type: 'left', sender: '팀장님', text: '고생했어~ 한 잔 하자' },
      { type: 'thought', text: '거절 불가...' },
      { type: 'left', sender: '팀장님', text: '소맥 비율은 내가 정한다' },
      { type: 'right', text: '네 알겠습니다...' },
      { type: 'thought', text: '제발 빨리 끝나라...' },
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
