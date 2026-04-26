import { gameBus } from '../event-bus';
import { isTossNative } from '../platform';
import {
  attemptThreeDayPromotion,
  completeThreeDayPromotion,
  failThreeDayPromotion,
  prepareThreeDayPromotion,
} from './api';

const THREE_DAY_PROMOTION_CODE = import.meta.env.VITE_TOSS_PROMOTION_3DAY_CODE as string | undefined;
// dev 서버에서만 TEST_ 접두 코드 사용. ait build (production)는 항상 실 지급 코드.
// .env.local의 토글 변수를 production 빌드로 흘려보내 50원 미지급된 사고 방지.
const USE_TEST_CODE = import.meta.env.DEV;

let inFlight = false;
let testInFlight = false;

/**
 * 서버가 지급 자격을 먼저 판정하고, 그 다음에만 게임 SDK 프로모션을 실행한다.
 */
export async function handleThreeDayPromotionOnGameEnd(): Promise<void> {
  if (!THREE_DAY_PROMOTION_CODE) return;
  if (!isTossNative()) return;
  if (inFlight) return;

  inFlight = true;
  try {
    const prepared = await prepareThreeDayPromotion();
    if (!prepared.eligible || prepared.already_granted) return;
    const attempt = await attemptThreeDayPromotion(prepared.progress_key);

    const { grantPromotionRewardForGame } = await import('@apps-in-toss/web-framework');
    const promotionCode = USE_TEST_CODE ? `TEST_${THREE_DAY_PROMOTION_CODE}` : THREE_DAY_PROMOTION_CODE;
    const result = await grantPromotionRewardForGame({
      params: {
        promotionCode,
        amount: attempt.amount,
      },
    });

    if (result && result !== 'ERROR' && 'key' in result) {
      await completeThreeDayPromotion({
        attemptId: attempt.attempt_id,
        progressKey: prepared.progress_key,
        rewardKey: result.key,
        amount: attempt.amount,
        clientMeta: {
          promotion_code: promotionCode,
          progress_key: prepared.progress_key,
          state: prepared.state,
        },
      });
      gameBus.emit('toast', `3일 연속 플레이 달성!\n토스포인트 ${attempt.amount}원 지급`);
      return;
    }

    if (result && result !== 'ERROR' && 'errorCode' in result) {
      await failThreeDayPromotion({
        attemptId: attempt.attempt_id,
        progressKey: prepared.progress_key,
        amount: attempt.amount,
        errorCode: result.errorCode,
        errorMessage: result.message,
        clientMeta: {
          promotion_code: promotionCode,
          progress_key: prepared.progress_key,
          state: prepared.state,
        },
      });
      console.warn('[promotion] grant failed:', result.errorCode, result.message);
      return;
    }

    await failThreeDayPromotion({
      attemptId: attempt.attempt_id,
      progressKey: prepared.progress_key,
      amount: attempt.amount,
      errorCode: result === 'ERROR' ? 'ERROR' : 'UNSUPPORTED',
      errorMessage: result === 'ERROR' ? 'unknown error' : 'unsupported app version or unexpected result',
      clientMeta: {
        promotion_code: promotionCode,
        progress_key: prepared.progress_key,
        state: prepared.state,
      },
    });
    console.warn('[promotion] unexpected result:', result);
  } catch (e) {
    console.warn('[promotion] handler failed:', e);
  } finally {
    inFlight = false;
  }
}

export async function runThreeDayPromotionTest(): Promise<void> {
  if (!THREE_DAY_PROMOTION_CODE) {
    gameBus.emit('toast', '프로모션 코드가 설정되지 않았어요');
    return;
  }
  if (!isTossNative()) {
    gameBus.emit('toast', '토스 샌드박스/인앱 환경에서만 테스트할 수 있어요');
    return;
  }
  if (testInFlight) return;

  testInFlight = true;
  try {
    const { grantPromotionRewardForGame } = await import('@apps-in-toss/web-framework');
    const result = await grantPromotionRewardForGame({
      params: {
        promotionCode: `TEST_${THREE_DAY_PROMOTION_CODE}`,
        amount: 50,
      },
    });

    if (result && result !== 'ERROR' && 'key' in result) {
      gameBus.emit('toast', '테스트 프로모션 호출 성공');
      return;
    }
    if (result && result !== 'ERROR' && 'errorCode' in result) {
      gameBus.emit('toast', `테스트 호출 실패: ${result.errorCode}`);
      return;
    }
    gameBus.emit('toast', '테스트 호출 실패');
  } catch (e) {
    console.warn('[promotion] test call failed:', e);
    gameBus.emit('toast', '테스트 호출 중 오류가 발생했어요');
  } finally {
    testInFlight = false;
  }
}
