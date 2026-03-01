import type { StageDef } from '../../types/game';

export const STAGES: StageDef[] = [
  {
    id: 1, name: '지옥의 출근길', emoji: '⏰', time: '07:00', period: 'AM', bgColor: '#0a0a14',
    minigames: [
      { id: 1, sceneKey: 'AlarmScene', name: '알람 0.1초 컷', description: '스마트폰을 끄는 진짜 방법을 찾아라' },
    ],
  },
  {
    id: 2, name: '사무실 생존기', emoji: '💬', time: '08:30', period: 'AM', bgColor: '#1a2a4e',
    minigames: [
      { id: 11, sceneKey: 'BootingScene', name: '메신저 오타', description: '물리적으로 서버를 다운시켜라' },
    ],
  },
  {
    id: 3, name: '점심시간의 혈투', emoji: '✊', time: '12:00', period: 'PM', bgColor: '#f5e6d0',
    minigames: [
      { id: 21, sceneKey: 'MenuRouletteScene', name: '가위바위보', description: '을의 생존법을 깨달아라' },
    ],
  },
  {
    id: 4, name: '회의실 미스터리', emoji: '🗣️', time: '13:30', period: 'PM', bgColor: '#d5d8f0',
    minigames: [
      { id: 31, sceneKey: 'SleepFightScene', name: '빈말 퍼레이드', description: '영혼 없는 앵무새가 되어라' },
    ],
  },
  {
    id: 5, name: '보고서의 늪', emoji: '📄', time: '15:00', period: 'PM', bgColor: '#c5c8d8',
    minigames: [
      { id: 41, sceneKey: 'FileSaveScene', name: '저장의 저주', description: '불변의 법칙을 깨달아라' },
    ],
  },
  {
    id: 6, name: '몰래 딴짓하기', emoji: '🖥️', time: '16:30', period: 'PM', bgColor: '#b8bcc8',
    minigames: [
      { id: 51, sceneKey: 'AltTabScene', name: '웹서핑 숨기기', description: '물리적 차단이 답이다' },
    ],
  },
  {
    id: 7, name: '빌런 대처', emoji: '🦵', time: '18:00', period: 'PM', bgColor: '#2e1810',
    minigames: [
      { id: 65, sceneKey: 'ChargingScene', name: '다리 떠는 빌런', description: '친환경 에너지를 만들어라' },
    ],
  },
  {
    id: 8, name: '야근의 그림자', emoji: '📱', time: '20:00', period: 'PM', bgColor: '#12121e',
    minigames: [
      { id: 75, sceneKey: 'MosquitoScene', name: '가족 거짓말', description: 'AI 오토 파일럿을 가동하라' },
    ],
  },
  {
    id: 9, name: '회식의 기술', emoji: '🚪', time: '21:30', period: 'PM', bgColor: '#2d1810',
    minigames: [
      { id: 81, sceneKey: 'SomekScene', name: '술자리 탈출', description: '영수증 밧줄로 탈출하라' },
    ],
  },
  {
    id: 10, name: '퇴사 가즈아', emoji: '✈️', time: '23:00', period: 'PM', bgColor: '#1a0a0a',
    minigames: [
      { id: 91, sceneKey: 'ResignScene', name: '사직서 투척', description: '종이비행기로 정확히 투하하라' },
    ],
  },
];
