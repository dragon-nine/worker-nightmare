import type { TutorialStep } from './event-bus';

/**
 * 튜토리얼 스텝별 멘트.
 *
 * - `\n` 으로 강제 줄바꿈 (무조건 2줄)
 * - 한 줄당 한국어 8-10자 권장 (모달 width: 280*scale 기준)
 * - 'done', 'transition', 'transition-road' 스텝은 메시지 없음
 */
export const TUTORIAL_MESSAGES: Partial<Record<TutorialStep, string>> = {
  'intro':             '자, 퇴근을\n시작해볼까요?',
  'path-intro':        '퇴근길은 길을 따라\n앞으로만 갈 수 있어요',
  'path-rule':         '길을 벗어나거나 뒤로 가면\n퇴근에 실패해요',
  'try-it':            '자, 그럼 하면서\n한 번 배워볼까요?',
  'prompt-forward':    '앞으로 버튼을\n한 번 눌러볼까요?',
  'after-forward':     '앞으로 버튼을 누르면\n한 칸씩 올라가게 되요!',
  'turn-info':         '길이 꺾이는 곳에선\n방향을 바꿀 수 있어요',
  'prompt-switch':     '그럼 방향전환 버튼을\n한 번 눌러볼까요?',
  'after-switch':      '방향을 바꿈과 동시에\n한 칸씩 전진하게 되요!',
  'free-play':         '잘했어요! 이번엔\n혼자서 3칸 이동해 볼까요?',
  'free-play-fail':    '길을 벗어나면 실패해요!\n다시 한 번 해볼까요?',
  'all-learned':       '잘했어요! 이제\n지켜야 할 룰을 알려줄게요',
  'gauge-intro':       '퇴근할 수 있는\n시간이 정해져있어요',
  'timeout-warning':   '시간이 다 되면\n퇴근에 실패하게 되요!',
  'timeout-reassure':  '하지만\n걱정하지 마세요!',
  'recovery-intro':    '한 칸씩 올라갈 때마다\n일정 시간이 회복되요',
  'speed-tip':         '빨리 움직일수록\n더 오래 달릴 수 있어요',
  'finale':            '그럼 본격적으로\n시작해볼까요?',
};
