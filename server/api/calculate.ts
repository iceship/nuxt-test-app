import { useSum } from "../utils/sum";

export default defineEventHandler(async (event) => {
  // 쿼리 파라미터 가져오기
  const query = getQuery(event);
  const a = Number.parseInt(query.a as string);
  const b = Number.parseInt(query.b as string);

  // 입력 값 유효성 검사 (선택 사항이지만 권장)
  if (Number.isNaN(a) || Number.isNaN(b)) {
    // 에러를 반환하거나 기본값을 사용할 수 있습니다.
    // 여기서는 에러를 발생시킵니다.
    throw createError({
      statusCode: 400, // Bad Request
      statusMessage: "Please provide valid numbers for \"a\" and \"b\" query parameters.",
    });
  }

  // server/utils/sum.ts 에서 정의한 useSum 함수 사용
  // server/utils 내의 함수들은 서버 사이드에서 자동으로 임포트되어 사용할 수 있습니다.
  const result = useSum(a, b);

  return {
    sum: result,
  };
});
