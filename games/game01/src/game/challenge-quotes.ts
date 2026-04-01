/** 도전장 멘트 — 일반 / 신기록 구분, {s}=현재점수, {b}=최고기록 치환 */
import { storage } from './services/storage';

interface ChallengeQuote {
  text: string
  type: 'normal' | 'record'
}

const CHALLENGE_QUOTES: ChallengeQuote[] = [
  // 일반 (1~40)
  { text: '이거 해봤어? 퇴근하는 게임인데 진짜 못 함 ㅋㅋ', type: 'normal' },
  { text: '토스에 퇴근 게임 있는데 설치 없이 바로 됨. 한 판 해봐', type: 'normal' },
  { text: '나 {s}점 갔다. 이것도 못 이기면 진짜 웃긴다 ㅋㅋ', type: 'normal' },
  { text: '나 {s}점밖에 못 갔어. 너 하면 가볍게 이길 듯', type: 'normal' },
  { text: '{s}점에서 퇴근 실패. 이거 이길 자신 있으면 해봐', type: 'normal' },
  { text: '나 {s}점 갔다. 솔직히 못 이길 거 같은데... 해볼래?', type: 'normal' },
  { text: '직장인이면 공감 100%인 게임 발견함. 나 {s}점 실패', type: 'normal' },
  { text: '이거 하다가 30분 지남 ㅋㅋ 중독 주의. 나 {s}점', type: 'normal' },
  { text: '{s}점까지 갔다. 이거 이기면 인정해줌. 도전?', type: 'normal' },
  { text: '이거 한 판에 1분도 안 걸려. 나 {s}점인데 해봐', type: 'normal' },
  { text: '퇴근이 이렇게 어려운 게임 처음이야 ㅋㅋ 나 {s}점', type: 'normal' },
  { text: '나 {s}점 갔는데 너 이거 한 번에 못 이기면 커피 한 잔', type: 'normal' },
  { text: '요즘 다 이거 하던데. 나 {s}점. 너만 안 해봤어', type: 'normal' },
  { text: '퇴근 실패. 이기면 점심 쏜다 (진심 아님)', type: 'normal' },
  { text: '지하철에서 하기 딱인 게임 찾았다. 나 {s}점', type: 'normal' },
  { text: '퇴근길에서 잡혔어. 너라면 도망칠 수 있었을까?', type: 'normal' },
  { text: '나 {s}점 갔다. 30초면 이길 수 있을걸?', type: 'normal' },
  { text: '퇴근 못 하는 게임이 있다는데... 나 {s}점에서 실패함', type: 'normal' },
  { text: '회사 단톡방에서 난리 난 게임. 나 {s}점. 해봐', type: 'normal' },
  { text: '나 {s}점인데 이거 못 이기면 팀장 성향인 거임', type: 'normal' },
  { text: '오늘 야근 안 해도 되는데 게임에서 야근 당함 ㅋㅋ', type: 'normal' },
  { text: '{s}점 돌파. 이 기록 넘어봐. 자신 있으면', type: 'normal' },
  { text: '이거 쉬워 보이는데 하면 할수록 빠져듦. 나 {s}점', type: 'normal' },
  { text: '직장인 퇴근 게임 {s}점. 못 이기면 야근 확정이다', type: 'normal' },
  { text: '나 {s}점밖에 못 갔는데 이것도 어려울 수 있어?', type: 'normal' },
  { text: '1분 컷 게임인데 중독성 미쳤다. 나 {s}점. 해봐', type: 'normal' },
  { text: '토스 게임 중에 이거 제일 재밌다. 나 {s}점', type: 'normal' },
  { text: '{s}점 기록. 가볍게 이길 수 있을 거라 생각하면 오산임', type: 'normal' },
  { text: '스트레스 풀기 딱 좋은 게임. 나 {s}점. 같이 하자', type: 'normal' },
  { text: '나 {s}점 갔다. 내기할 사람 모집 중', type: 'normal' },
  { text: '이 게임 제목부터 웃기다 ㅋㅋ 직장인 잔혹사. 나 {s}점', type: 'normal' },
  { text: '나 {s}점인데 이거 누구나 쉽게 이기겠더라. 너도 해봐', type: 'normal' },
  { text: '퇴근길에서 팀장한테 잡혔다. 나 대신 퇴근 좀 시켜줘', type: 'normal' },
  { text: '이거 하면서 현생 잊었다 ㅋㅋ {s}점. 강추', type: 'normal' },
  { text: '이거 안 해본 직장인 없다고 하던데. 나 {s}점', type: 'normal' },
  { text: '나 {s}점. 자신 있으면 이 링크 눌러봐', type: 'normal' },
  { text: '출퇴근길에 딱인 게임. 나 {s}점 갔다', type: 'normal' },
  { text: '이거 진짜 쉬운 건데... 나 {s}점. 너는 되겠지?', type: 'normal' },
  { text: '{s}점. 아무도 못 이기길래 자랑하러 왔다', type: 'normal' },
  { text: '칼퇴가 이렇게 어려운 줄 몰랐다 ㅋㅋ 나 {s}점', type: 'normal' },
  // 신기록 (41~50)
  { text: '신기록 {b}점 달성! 이거 깨면 치킨 쏜다 (진심)', type: 'record' },
  { text: '{b}점 신기록. 퇴근 마스터 칭호는 나만 가능한 건가?', type: 'record' },
  { text: '신기록 {b}점! 이 기록 깨는 사람 실물 보고 싶다', type: 'record' },
  { text: '{b}점 신기록인데 아직 퇴근 못 함 ㅋㅋ 넘어봐', type: 'record' },
  { text: '신기록 갱신! {b}점에서 퇴근 실패. 도전할 사람 받는다', type: 'record' },
  { text: '{b}점 달성. 이거 깨는 사람한테 영원한 리스펙', type: 'record' },
  { text: '역대 기록 {b}점. 단언컨대 못 이김. 증명해봐', type: 'record' },
  { text: '{b}점 신기록. 안 깨지면 내가 영원한 퇴근왕', type: 'record' },
  { text: '신기록 {b}점... 자랑인지 슬픔인지 모르겠다. 깰 수 있어?', type: 'record' },
  { text: '{b}점 신기록. 퇴근은 실패했지만 자존심은 지켰다. 도전?', type: 'record' },
]

/**
 * 도전장 멘트를 랜덤 반환
 * @param score 현재 점수
 * @param isNewRecord 신기록 여부 — true면 신기록 멘트 우선, false면 일반 멘트만
 */
export function getRandomChallengeQuote(score: number, isNewRecord: boolean): string {
  const bestScore = storage.getBestScore()

  const pool = isNewRecord
    ? CHALLENGE_QUOTES.filter((q) => q.type === 'record')
    : CHALLENGE_QUOTES.filter((q) => q.type === 'normal')

  const q = pool[Math.floor(Math.random() * pool.length)]
  return q.text
    .replace(/\{s\}/g, String(score))
    .replace(/\{b\}/g, String(bestScore))
}
