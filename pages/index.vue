<script setup lang="ts">
import { useCalculatorStore } from "~/stores/calculator";

const calculatorStore = useCalculatorStore();
// originalDisplayMessage는 스토어의 기본 getter를 사용하기 위함입니다.
const { numberA, numberB, isLoading, displayMessage: originalDisplayMessage, sumResult, error } = storeToRefs(calculatorStore);

const isClientMounted = ref(false);
// 사용자가 입력을 변경한 후 실제 계산이 시작되기 전(디바운스 대기 중) 상태를 나타내는 로컬 ref
const uiPendingCalculation = ref(false);

onMounted(() => {
  isClientMounted.value = true;
  // 초기값이 0,0이 아닐 경우 초기 계산 (SSR 등으로 값이 설정된 경우)
  if (calculatorStore.numberA !== 0 || calculatorStore.numberB !== 0) {
    // 초기 로드 시에는 uiPendingCalculation을 true로 할 필요 없이 바로 계산 시도
    performCalculation(true); // initialCall 플래그 추가 고려 가능
  }
});

async function performCalculation(initialCall = false) {
  if (!isClientMounted.value)
    return;
  // 스토어의 isLoading은 실제 API 호출 중 상태를 나타냄
  if (isLoading.value && !initialCall)
    return; // 이미 로딩 중이면 중복 방지 (초기 호출은 예외)

  // 실제 계산이 시작되므로, UI 상의 '대기 중' 상태는 해제될 준비
  // (실제 해제는 fetchSum 완료 후)
  // uiPendingCalculation.value는 fetchSum 내부에서 isLoading이 true가 되면서
  // currentDisplayMessage 로직에 의해 '계산 중...'으로 덮어 써지므로 괜찮음.

  if (typeof numberA.value === "number" && typeof numberB.value === "number") {
    try {
      await calculatorStore.fetchSum(); // 이 함수는 내부적으로 isLoading을 true/false로 설정
    }
    finally {
      // 계산 시도가 끝나면(성공/실패 무관) uiPending 상태 해제
      uiPendingCalculation.value = false;
    }
  }
  else {
    // 유효하지 않은 입력이면 즉시 UI 대기 상태 해제
    uiPendingCalculation.value = false;
  }
}

// 일반 watch: numberA 또는 numberB가 (사용자에 의해) 변경되면 즉시 반응
watch([numberA, numberB], (newValues, oldValues) => {
  if (!isClientMounted.value)
    return;

  // 실제 값이 변경되었는지 확인 (초기 마운트 시 불필요한 트리거 방지)
  const hasChanged = oldValues.some((val, i) => val !== newValues[i]);

  if (hasChanged) {
    // 이미 스토어에서 API 호출 중(isLoading)이 아니라면, UI를 '대기 중' 상태로 변경
    if (!isLoading.value) {
      uiPendingCalculation.value = true;
    }
  }
});

// Debounced watch: 디바운스 시간(200ms)이 지나면 실제 계산 함수 호출
watchDebounced(
  [numberA, numberB],
  () => {
    // isClientMounted 체크는 performCalculation 내부에서 수행
    performCalculation();
  },
  { debounce: 500 },
);

// 수동 계산 버튼 클릭 시
async function handleCalculate() {
  // 수동 계산 시에는 UI 대기 상태를 명시적으로 해제하고 바로 계산 시도
  uiPendingCalculation.value = false;
  await performCalculation();
}

// 최종적으로 화면에 표시될 메시지를 결정하는 computed 속성
const currentDisplayMessage = computed(() => {
  if (isLoading.value)
    return "계산 중..."; // 스토어의 isLoading (실제 API 통신 중)
  if (uiPendingCalculation.value)
    return "계산 대기 중..."; // 사용자가 입력 변경 후 디바운스 대기
  return originalDisplayMessage.value; // 그 외 (성공, 에러, 초기 프롬프트)는 스토어 getter 사용
});

// 알림창의 타입(색상)을 결정하는 computed 속성
const alertType = computed(() => {
  if (isLoading.value)
    return "info";
  if (uiPendingCalculation.value)
    return "info"; // 대기 중일 때도 info 타입
  if (error.value)
    return "error";
  if (sumResult.value !== null)
    return "success";
  return "info"; // 초기 상태
});

// 알림창에 표시될 아이콘을 결정하는 computed 속성
const alertIcon = computed(() => {
  if (isLoading.value)
    return "tabler:loader-2";
  if (uiPendingCalculation.value)
    return "tabler:hourglass-low"; // '계산 대기 중' 아이콘
  if (error.value)
    return "tabler:circle-x";
  if (sumResult.value !== null)
    return "tabler:circle-check";
  return "tabler:info-circle"; // 초기 상태 아이콘
});
</script>

<template>
  <div class="hero bg-base-300 min-h-screen container mx-auto py-8 px-4">
    <div class="hero-content flex-col text-center w-full">
      <div class="mt-12 card w-full max-w-lg bg-base-100 shadow-xl">
        <div class="card-body items-center text-center">
          <h2 class="card-title text-2xl mb-4">
            합계 계산기
          </h2>
          <form class="w-full" @submit.prevent="handleCalculate">
            <fieldset
              :disabled="!isClientMounted || isLoading"
              class="space-y-4"
            >
              <legend class="sr-only">
                계산기 입력
              </legend>
              <div class="form-control w-full">
                <label for="numA" class="label"><span class="label-text">숫자 A:</span></label>
                <input
                  id="numA"
                  v-model.number="numberA"
                  type="number"
                  placeholder="숫자를 입력하세요"
                  class="input input-bordered w-full"
                >
              </div>
              <div class="form-control w-full">
                <label for="numB" class="label"><span class="label-text">숫자 B:</span></label>
                <input
                  id="numB"
                  v-model.number="numberB"
                  type="number"
                  placeholder="숫자를 입력하세요"
                  class="input input-bordered w-full"
                >
              </div>

              <button
                type="submit"
                class="btn btn-primary w-full mt-6"
                :class="{ loading: isLoading && isClientMounted }"
                :disabled="uiPendingCalculation"
              >
                <span v-if="isLoading && isClientMounted">계산 중...</span>
                <span v-else>수동 계산</span>
              </button>
            </fieldset>
          </form>

          <div v-if="isClientMounted && currentDisplayMessage" class="w-full mt-6 min-h-16">
            <div
              role="alert"
              class="alert text-sm"
              :class="{
                'alert-success': alertType === 'success',
                'alert-error': alertType === 'error',
                'alert-info': alertType === 'info',
              }"
            >
              <Icon
                :name="alertIcon"
                class="h-6 w-6"
              />
              <span>{{ currentDisplayMessage }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
