/**
 * 게임오버 멘트 — 로컬 하드코딩
 *
 * 원칙: R2 최신본을 참고하더라도 게임 런타임은 로컬 배열만 사용.
 * 멘트 수정 시 Claude에게 요청 → R2 최신본 기준으로 이 배열을 수동 동기화.
 */

interface Quote {
  line1: string
  line2?: string
}

const QUOTES: Quote[] = [
  { line1: '괜찮아.', line2: '원래 월요일이 그래.' },
  { line1: '퇴근은 쉬운 게 아니야...', line2: '인생이 원래 그래.' },
  { line1: '아직 짐도 안 쌌잖아.', line2: '다시 도전해봐.' },
  { line1: '팀장님이 웃고 있어요.' },
  { line1: '컴퓨터가 다시 켜졌습니다.' },
  { line1: '아... 메일이 또 왔어요.', line2: '읽고 가세요.' },
  { line1: '야근 수당은 없습니다.' },
  { line1: '오늘 회식 있는 거', line2: '알고 계시죠?' },
  { line1: '그래도 출근은 하셨네요.', line2: '대단해요.' },
  { line1: '회사 정문은 나왔어.', line2: '다음엔 더 갈 수 있어.' },
  { line1: '버스 정류장이 보였는데...', line2: '아깝다.' },
  { line1: '이 정도면 반은 온 거야.', line2: '한 번 더?' },
  { line1: '다리에 힘이 풀렸을 뿐이야.', line2: '실력은 있어.' },
  { line1: '카드 찍고 나왔는데', line2: '다시 끌려갔어요.' },
  { line1: '저녁 메뉴까지 정했는데...', line2: '아쉽다.' },
  { line1: '이어폰은 꽂았는데', line2: '음악 틀기 전에 잡혔어.' },
  { line1: '지갑이랑 폰은 챙겼는데', line2: '몸이 안 따라줬어.' },
  { line1: '여기서 멈출 거야?', line2: '진짜?' },
  { line1: '이 정도면 잘한 건데...', line2: '만족해?' },
  { line1: '지하철역이 바로 앞이었어.', line2: '한 번만 더.' },
]

export function getRandomQuote(): string {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)]
  return q.line2 ? `${q.line1}\n${q.line2}` : q.line1
}
