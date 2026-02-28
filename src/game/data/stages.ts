import type { StageDef } from '../../types/game';

export const STAGES: StageDef[] = [
  {
    id: 1, name: '지옥의 출근길', emoji: '🚇', time: '07:00', period: 'AM', bgColor: '#0a0a14',
    minigames: [
      { id: 1, sceneKey: 'AlarmScene', name: '알람 0.1초 컷', description: '울리자마자 빛의 속도로 끄기' },
    ],
  },
  {
    id: 2, name: '사무실 생존기', emoji: '🖥️', time: '08:30', period: 'AM', bgColor: '#1a2a4e',
    minigames: [
      { id: 11, sceneKey: 'BootingScene', name: 'PC 부팅 기다리기', description: '로딩바 찰 때까지 클릭하기' },
    ],
  },
  {
    id: 3, name: '점심시간의 혈투', emoji: '🍚', time: '12:00', period: 'PM', bgColor: '#f5e6d0',
    minigames: [
      { id: 21, sceneKey: 'MenuRouletteScene', name: '메뉴 결정 장애', description: '모두가 만족할 메뉴 정하기' },
    ],
  },
  {
    id: 4, name: '회의실 미스터리', emoji: '😴', time: '13:30', period: 'PM', bgColor: '#d5d8f0',
    minigames: [
      { id: 31, sceneKey: 'SleepFightScene', name: '졸음 참기', description: '눈꺼풀 버티기' },
    ],
  },
  {
    id: 5, name: '보고서의 늪', emoji: '📄', time: '15:00', period: 'PM', bgColor: '#c5c8d8',
    minigames: [
      { id: 41, sceneKey: 'FileSaveScene', name: '파일 저장의 저주', description: '진짜 최종 파일 찾기' },
    ],
  },
  {
    id: 6, name: '몰래 딴짓하기', emoji: '🕵️', time: '16:30', period: 'PM', bgColor: '#b8bcc8',
    minigames: [
      { id: 51, sceneKey: 'AltTabScene', name: '웹서핑 숨기기', description: 'Alt+Tab 광속 전환' },
    ],
  },
  {
    id: 7, name: '기기와의 전쟁', emoji: '🔌', time: '18:00', period: 'PM', bgColor: '#2e1810',
    minigames: [
      { id: 65, sceneKey: 'ChargingScene', name: '노트북 충전', description: '0% 직전에 코드 꽂기' },
    ],
  },
  {
    id: 8, name: '야근의 그림자', emoji: '🌙', time: '20:00', period: 'PM', bgColor: '#12121e',
    minigames: [
      { id: 75, sceneKey: 'MosquitoScene', name: '모기 잡기', description: '모기 한 방에 잡기' },
    ],
  },
  {
    id: 9, name: '회식의 기술', emoji: '🍺', time: '21:30', period: 'PM', bgColor: '#2d1810',
    minigames: [
      { id: 81, sceneKey: 'SomekScene', name: '소맥 비율', description: '황금 비율 섞기' },
    ],
  },
  {
    id: 10, name: '퇴사 가즈아', emoji: '🚪', time: '23:00', period: 'PM', bgColor: '#1a0a0a',
    minigames: [
      { id: 91, sceneKey: 'ResignScene', name: '사직서 던지기', description: '상사 책상 정중앙에 안착' },
    ],
  },
];
