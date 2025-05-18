import { defineStore } from "pinia";

export const useCalculatorStore = defineStore("calculator", {
  // 상태 (State)
  state: () => ({
    numberA: 0,
    numberB: 0,
    sumResult: null as number | null,
    isLoading: false,
    error: null as string | null, // 에러 메시지를 저장
  }),

  // 게터 (Getters) - 계산된 상태
  getters: {
    displayMessage(state): string {
      if (state.isLoading) {
        return "계산 중...";
      }
      if (state.error) {
        return `에러: ${state.error}`;
      }
      if (state.sumResult !== null) {
        return `${state.numberA} + ${state.numberB} = ${state.sumResult}`;
      }
      return "숫자를 입력하고 계산 버튼을 누르세요.";
    },
  },

  // 액션 (Actions) - 상태를 변경하는 메소드 (비동기 로직 포함 가능)
  actions: {
    // 입력된 숫자로 상태 업데이트
    setNumbers(a: number, b: number) {
      this.numberA = a;
      this.numberB = b;
    },

    // 서버에 합계 계산 요청
    async fetchSum() {
      this.isLoading = true;
      this.error = null;
      this.sumResult = null; // 이전 결과 초기화

      try {
        // Nuxt 3에서는 $fetch를 사용하여 API를 간결하게 호출할 수 있습니다.
        // 스토어 액션 내에서는 useFetch보다 $fetch가 더 적합할 수 있습니다.
        const response = await $fetch<{ sum: number }>("/api/calculate", {
          params: {
            a: this.numberA,
            b: this.numberB,
          },
          // $fetch는 에러 발생 시 예외를 throw하므로 try...catch로 잡습니다.
        });
        this.sumResult = response.sum;
      }
      catch (err: any) {
        // API에서 createError로 반환한 에러는 err.data에 포함될 수 있습니다.
        this.error = err.data?.message || err.data?.statusMessage || err.message || "계산 중 알 수 없는 에러가 발생했습니다.";
      }
      finally {
        this.isLoading = false;
      }
    },
  },
});
