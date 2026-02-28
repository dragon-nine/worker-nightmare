import type { StageDef } from '../../types/game';

export const STAGES: StageDef[] = [
  {
    id: 1, name: '지옥의 출근길', emoji: '🚇',
    minigames: [
      { id: 1, sceneKey: 'AlarmScene', name: '알람 0.1초 컷', description: '울리자마자 빛의 속도로 끄기' },
    ],
  },
  {
    id: 2, name: '사무실 생존기', emoji: '🖥️',
    minigames: [
      { id: 11, sceneKey: 'BootingScene', name: 'PC 부팅 기다리기', description: '로딩바 찰 때까지 클릭하기' },
    ],
  },
  {
    id: 3, name: '점심시간의 혈투', emoji: '🍚',
    minigames: [
      { id: 21, sceneKey: 'MenuRouletteScene', name: '메뉴 결정 장애', description: '모두가 만족할 메뉴 정하기' },
    ],
  },
  {
    id: 4, name: '회의실 미스터리', emoji: '😴',
    minigames: [
      { id: 31, sceneKey: 'SleepFightScene', name: '졸음 참기', description: '눈꺼풀 버티기' },
    ],
  },
  {
    id: 5, name: '보고서의 늪', emoji: '📄',
    minigames: [
      { id: 41, sceneKey: 'FileSaveScene', name: '파일 저장의 저주', description: '진짜 최종 파일 찾기' },
    ],
  },
  {
    id: 6, name: '몰래 딴짓하기', emoji: '🕵️',
    minigames: [
      { id: 51, sceneKey: 'AltTabScene', name: '웹서핑 숨기기', description: 'Alt+Tab 광속 전환' },
    ],
  },
  {
    id: 7, name: '기기와의 전쟁', emoji: '🔌',
    minigames: [
      { id: 65, sceneKey: 'ChargingScene', name: '노트북 충전', description: '0% 직전에 코드 꽂기' },
    ],
  },
  {
    id: 8, name: '야근의 그림자', emoji: '🌙',
    minigames: [
      { id: 75, sceneKey: 'MosquitoScene', name: '모기 잡기', description: '모기 한 방에 잡기' },
    ],
  },
  {
    id: 9, name: '회식의 기술', emoji: '🍺',
    minigames: [
      { id: 81, sceneKey: 'SomekScene', name: '소맥 비율', description: '황금 비율 섞기' },
    ],
  },
  {
    id: 10, name: '퇴사 가즈아', emoji: '🚪',
    minigames: [
      { id: 91, sceneKey: 'ResignScene', name: '사직서 던지기', description: '상사 책상 정중앙에 안착' },
    ],
  },
];
