<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue';
import { 
  ChevronLeft, Eraser, Eye, EyeOff, HelpCircle, X as CloseIcon, 
  Plus, Check, ChevronDown, BookOpen 
} from 'lucide-vue-next';
import SmartGuide from './SmartGuide.vue';
import CoinRain from './CoinRain.vue';
import VirtualKeypad from './VirtualKeypad.vue';
import { useGamificationStore } from '../stores/useGamificationStore';
// Importamos la voz
import { speak } from '../utils/voice';

const emit = defineEmits(['back']);
const gamificationStore = useGamificationStore(); 

// --- ESTADOS ---
const showCoinRain = ref(false); 
const showSolution = ref(false); // Modal de Tablas
const activeExerciseIndex = ref(0);
const isFinished = ref(false);

// Estado para la tabla de ayuda seleccionada
const selectedHelpTable = ref(1);

// Números del ejercicio
const topNum = ref(0);
const botNum = ref(0);

const steps = ref([]);        
const currentStepIdx = ref(0); 
const userInputs = ref({});   

// NUEVO: Variable para bloquear acciones mientras cambia de ejercicio y evitar saltos
const isTransitioning = ref(false);

// --- GENERADOR DE TABLA DE AYUDA (Solo Multiplicación) ---
const helpTableData = computed(() => {
    const tableNum = selectedHelpTable.value;
    const list = [];
    for (let i = 1; i <= 10; i++) {
        list.push({ n1: tableNum, op: '×', n2: i, res: tableNum * i });
    }
    return list;
});

// --- GENERADOR ---
const generateNumbers = () => {
    isFinished.value = false;
    userInputs.value = {};
    currentStepIdx.value = 0;
    // NUEVO: Aseguramos que el bloqueo esté desactivado al iniciar
    isTransitioning.value = false;
    topNum.value = Math.floor(Math.random() * (9999 - 10 + 1)) + 10;
    botNum.value = Math.floor(Math.random() * (99 - 10 + 1)) + 10;
    calculateSteps();
};

// --- EL CEREBRO MATEMÁTICO ---
const calculateSteps = () => {
    steps.value = [];
    
    const tStr = topNum.value.toString();
    const bStr = botNum.value.toString();
    const tDigits = tStr.split('').reverse().map(Number); 
    const bDigits = bStr.split('').reverse().map(Number); 

    // --- FASE 1: UNIDADES ---
    let carry = 0;
    const bUnit = bDigits[0];
    
    for (let i = 0; i < tDigits.length; i++) {
        const productBase = tDigits[i] * bUnit;
        const productTotal = productBase + carry;
        const resultDigit = productTotal % 10;
        const nextCarry = Math.floor(productTotal / 10);

        let msg = "";
        if (carry > 0) msg = `Multiplica ${bUnit} x ${tDigits[i]} = ${productBase} + ${carry} de llevadas = ${productTotal}.`;
        else msg = `Multiplica ${bUnit} x ${tDigits[i]} = ${productBase}.`;

        if (nextCarry > 0) msg += ` Escribe ${resultDigit} y llevas ${nextCarry}.`;
        else msg += ` Escribe ${resultDigit}.`;

        steps.value.push({
            phase: 'prod1', type: 'result', row: 3, col: i, val: resultDigit, mIdx: i, bIdx: 0,
            hint: msg
        });

        if (nextCarry > 0 && i < tDigits.length - 1) {
            steps.value.push({
                phase: 'prod1', type: 'carry', row: 0, col: i + 1, val: nextCarry, mIdx: i, bIdx: 0,
                hint: `Llevas ${nextCarry}.`
            });
        }
        carry = nextCarry;
    }
    if (carry > 0) {
        steps.value.push({
            phase: 'prod1', type: 'result', row: 3, col: tDigits.length, val: carry, mIdx: tDigits.length - 1, bIdx: 0,
            hint: `Como terminaste arriba, baja el ${carry}.`
        });
    }

    // --- FASE 2: DECENAS ---
    carry = 0;
    const bTen = bDigits[1];
    
    for (let i = 0; i < tDigits.length; i++) {
        const productBase = tDigits[i] * bTen;
        const productTotal = productBase + carry;
        const resultDigit = productTotal % 10;
        const nextCarry = Math.floor(productTotal / 10);

        let msg = "";
        if (carry > 0) msg = `Multiplica ${bTen} x ${tDigits[i]} = ${productBase} + ${carry} de llevadas = ${productTotal}.`;
        else msg = `Multiplica ${bTen} x ${tDigits[i]} = ${productBase}.`;

        if (nextCarry > 0) msg += ` Escribe ${resultDigit} y llevas ${nextCarry}.`;
        else msg += ` Escribe ${resultDigit}.`;

        steps.value.push({
            phase: 'prod2', type: 'result', row: 4, col: i + 1, val: resultDigit, mIdx: i, bIdx: 1,
            hint: msg
        });

        if (nextCarry > 0 && i < tDigits.length - 1) {
            steps.value.push({
                phase: 'prod2', type: 'carry', row: 0, col: i + 2, val: nextCarry, mIdx: i, bIdx: 1,
                hint: `Llevas ${nextCarry} (Decenas).`
            });
        }

        carry = nextCarry;
    }
    if (carry > 0) {
        steps.value.push({
            phase: 'prod2', type: 'result', row: 4, col: tDigits.length + 1, val: carry, mIdx: tDigits.length - 1, bIdx: 1,
            hint: `Escribe la llevada final: ${carry}.`
        });
    }

    // --- FASE 3: SUMA FINAL ---
    const p1Digits = (topNum.value * bUnit).toString().split('').reverse().map(Number);
    const p2Digits = (topNum.value * bTen).toString().split('').reverse().map(Number); 
    
    carry = 0;
    const maxCols = Math.max(p1Digits.length, p2Digits.length + 1) + 1; 

    for (let i = 0; i < maxCols; i++) {
        const d1 = p1Digits[i] || 0;
        const d2 = (i > 0) ? (p2Digits[i - 1] || 0) : 0;
        
        if (i >= p1Digits.length && i >= p2Digits.length + 1 && carry === 0) break;

        const baseSum = d1 + d2;
        const sumVal = baseSum + carry;
        const resDigit = sumVal % 10;
        const nextCarry = Math.floor(sumVal / 10);

        let msg = "";
        if (carry > 0) msg = `Suma ${d1} + ${d2} = ${baseSum} + ${carry} de llevadas = ${sumVal}.`;
        else msg = `Suma ${d1} + ${d2} = ${baseSum}.`;

        if (nextCarry > 0) msg += ` Anota ${resDigit} y escribe ${nextCarry} en las llevadas del vecino.`;
        else msg += ` Escríbelo.`;

        steps.value.push({
            phase: 'sum', type: 'result', row: 5, col: i, val: resDigit, mIdx: -1, bIdx: -1,
            hint: msg
        });

        if (nextCarry > 0) {
             steps.value.push({
                phase: 'sum', type: 'carry', row: 0, col: i + 1, val: nextCarry, mIdx: -1, bIdx: -1,
                hint: `Escribe el ${nextCarry} que te dio tu vecino.`
            });
        }
        carry = nextCarry;
    }
};

const clearCarries = () => {
    Object.keys(userInputs.value).forEach(key => {
        if (key.startsWith('0-')) {
            delete userInputs.value[key];
        }
    });
};

// --- INTERACCIÓN ---
const currentStep = computed(() => {
    if (currentStepIdx.value >= steps.value.length) return null;
    return steps.value[currentStepIdx.value];
});

const handleKeypadPress = (num) => {
    // NUEVO: Si estamos en transición, ignoramos el teclado
    if (isTransitioning.value) return;

    if (!currentStep.value || isFinished.value) return;

    const step = currentStep.value;
    const key = `${step.row}-${step.col}`;

    if (num === step.val) {
        userInputs.value[key] = { val: num, status: 'correct' };
        
        const currentPhase = step.phase;
        const nextIdx = currentStepIdx.value + 1;
        
        if (nextIdx < steps.value.length) {
            const nextPhase = steps.value[nextIdx].phase;
            if (currentPhase !== nextPhase) {
                clearCarries();
            }
        }

        currentStepIdx.value++;
        
        if (currentStepIdx.value >= steps.value.length) {
            // EJERCICIO COMPLETADO
            isFinished.value = true;
            // NUEVO: Activamos el bloqueo para evitar saltos
            isTransitioning.value = true;
            
            // LÓGICA DE PREMIO Y VOZ INICIAL
            const rewardAmount = 5;
            gamificationStore.addCoins('gold', rewardAmount);

            const frases = ["¡Excelente!", "¡Muy bien!", "¡Lo lograste!", "¡Eres genial!"];
            const frase = frases[Math.floor(Math.random() * frases.length)];
            // El búho habla inmediatamente
            speak(`${frase} Ganaste ${rewardAmount} monedas de oro.`);

            if (activeExerciseIndex.value === 4) {
                // ÚLTIMO EJERCICIO: Pausa dramática de 5 segundos
                setTimeout(() => {
                    showCoinRain.value = true; 
                    speak("¡Increíble! Has completado todo.");
                    // El bloqueo se mantiene activo porque es el final
                }, 5000);
            } else {
                // EJERCICIOS INTERMEDIOS: Pausa corta y avance
                setTimeout(() => {
                    activeExerciseIndex.value++;
                    // NUEVO: Liberamos el bloqueo antes de generar el siguiente
                    isTransitioning.value = false;
                    generateNumbers(); 
                }, 1500);
            }
        }
    } else {
        userInputs.value[key] = { val: num, status: 'error' };
        if (navigator.vibrate) navigator.vibrate(200);
    }
};

const handleDelete = () => {
    // NUEVO: Bloqueo durante transición
    if (isTransitioning.value) return;

    if (!currentStep.value) return;
    const key = `${currentStep.value.row}-${currentStep.value.col}`;
    if (userInputs.value[key]?.status === 'error') {
        delete userInputs.value[key];
    }
};

const resetExercise = () => {
    generateNumbers();
};

// --- VISUALIZACIÓN ---
const shouldShowTopCheck = (colIdx) => {
    if (!currentStep.value) return false;
    const phase = currentStep.value.phase;
    if (phase !== 'prod1' && phase !== 'prod2') return false;
    return colIdx <= currentStep.value.mIdx;
};

const isTopCheckActive = (colIdx) => {
    if (!currentStep.value) return false;
    return colIdx === currentStep.value.mIdx;
};

const shouldShowBotCheck = (colIdx) => {
    if (!currentStep.value) return false;
    const phase = currentStep.value.phase;
    if (phase !== 'prod1' && phase !== 'prod2') return false;
    return colIdx <= currentStep.value.bIdx;
};

const isBotCheckActive = (colIdx) => {
    if (!currentStep.value) return false;
    return colIdx === currentStep.value.bIdx;
};

const shouldHideCell = (row, col) => {
    const tLen = topNum.value.toString().length;
    const bLen = 2; 
    
    if (row === 1 && col >= tLen) return true;
    if (row === 2 && col >= bLen) return true;
    if (row === 3 && col >= tLen + 1) return true;
    if (row === 4 && (col === 0 || col >= tLen + 2)) return true;

    if (row === 0) {
        const key = `0-${col}`;
        if (userInputs.value[key]) return false;
        if (currentStep.value?.row === 0 && currentStep.value?.col === col) return false;
        return true; 
    }
    return false;
};

const getCellClass = (row, col) => {
    const key = `${row}-${col}`;
    const inputData = userInputs.value[key];
    const isTarget = currentStep.value && currentStep.value.row === row && currentStep.value.col === col;

    let base = "flex items-center justify-center font-mono font-bold transition-all rounded-md sm:rounded-lg border-2 select-none ";
    let size = "w-9 h-10 text-xl md:w-14 md:h-14 md:text-4xl ";
    
    if (row === 0) {
        size = "w-7 h-7 text-sm md:w-10 md:h-10 md:text-xl rounded-full mb-1 ";
    }

    if (inputData?.status === 'error') {
        return base + size + "bg-red-100 border-red-600 text-red-600 animate-shake shadow-md";
    }

    if (isTarget) {
        return base + size + "bg-white border-yellow-400 ring-2 ring-yellow-200 focus-neon z-20 text-slate-800 scale-110";
    }
    
    if (inputData?.status === 'correct') {
        return base + size + "bg-green-100 border-green-500 text-green-700";
    }

    if (shouldHideCell(row, col)) {
        return base + size + "opacity-0 pointer-events-none border-transparent";
    }

    return base + size + "bg-white/50 border-slate-200/60 text-slate-400";
};

const getDigit = (row, col) => {
    if (row === 1) {
        const str = topNum.value.toString().split('').reverse();
        return str[col] || '';
    }
    if (row === 2) {
        const str = botNum.value.toString().split('').reverse();
        return str[col] || '';
    }
    const key = `${row}-${col}`;
    return userInputs.value[key]?.val ?? '';
};

const owlAdvice = computed(() => {
    if (isFinished.value) {
        if (activeExerciseIndex.value === 4) return "¡Increíble! ¡Terminaste todo!";
        return "¡Excelente! Siguiente...";
    }
    return currentStep.value ? currentStep.value.hint : "Prepárate...";
});

onMounted(() => {
    generateNumbers();
});
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex justify-center overflow-hidden font-sans select-none">
    
    <div v-if="showCoinRain">
        <CoinRain type="gold" :count="50" />
    </div>
    
    <div class="w-full max-w-xl h-full flex flex-col bg-white shadow-2xl relative">

        <div v-if="showSolution" class="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="showSolution = false">
            <div class="bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm border-4 border-indigo-100 overflow-hidden flex flex-col max-h-[85vh]">
                
                <div class="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center text-slate-700 font-black shrink-0">
                    <div class="flex items-center gap-2">
                        <BookOpen :size="20" class="text-indigo-500"/> Tablas de Multiplicar
                    </div>
                    <button @click="showSolution = false" class="p-1 bg-white rounded-full text-slate-400 hover:text-red-500 transition shadow-sm">
                        <CloseIcon :size="20" />
                    </button>
                </div>

                <div class="p-3 bg-white border-b border-slate-100 shrink-0">
                    <p class="text-xs font-bold text-slate-400 uppercase text-center mb-2">Selecciona un número</p>
                    <div class="grid grid-cols-5 gap-2">
                        <button v-for="n in 10" :key="n" 
                            @click="selectedHelpTable = n"
                            :class="[
                                'py-2 rounded-lg font-black text-sm transition-all',
                                selectedHelpTable === n 
                                    ? 'bg-purple-600 text-white shadow-md scale-105' 
                                    : 'bg-slate-100 text-slate-500 hover:bg-purple-100'
                            ]">
                            {{ n }}
                        </button>
                    </div>
                </div>

                <div class="overflow-y-auto p-4 bg-slate-50 scrollbar-thin flex-1">
                   <div class="flex flex-col gap-2">
                       <div v-for="(item, idx) in helpTableData" :key="idx" 
                            class="flex justify-between items-center p-3 rounded-xl bg-white border border-slate-200 shadow-sm">
                           <span class="text-lg font-bold text-slate-600 font-mono">
                               {{ item.n1 }} <span class="text-indigo-400 mx-1">{{ item.op }}</span> {{ item.n2 }}
                           </span>
                           <span class="text-xl font-black text-indigo-600">= {{ item.res }}</span>
                       </div>
                   </div>
                </div>
            </div>
        </div>

        <div class="flex-none pt-2 px-4 pb-1 z-10 bg-white/90 backdrop-blur border-b border-slate-200 flex flex-col gap-1 md:gap-2">
            <div class="flex justify-between items-center h-10 md:h-14">
                <div class="flex items-center gap-3">
                    <button @click="$emit('back')" class="p-1.5 md:p-2.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs md:text-sm flex items-center gap-1 active:scale-95 transition"><ChevronLeft class="w-4 h-4 md:w-5 md:h-5"/> Volver</button>
                    
                    <div class="flex items-center gap-2 px-3 py-1 rounded-xl border-2 border-purple-100 bg-purple-50 shadow-sm">
                         <div class="p-1 rounded-md bg-purple-600 flex items-center justify-center">
                            <span class="text-white font-black text-xs md:text-sm">×</span>
                         </div>
                         <span class="font-black text-xs md:text-sm uppercase text-purple-700">Nivel 2</span>
                    </div>
                </div>
                <div class="flex gap-2">
                   <button @click="resetExercise" class="p-2 md:p-2.5 bg-white shadow-sm rounded-lg text-slate-500 active:scale-95 transition hover:text-indigo-600"><Eraser class="w-4 h-4 md:w-5 md:h-5" /></button>
                   <button @click="showSolution = true" :class="`p-2 md:p-2.5 rounded-lg shadow-sm transition active:scale-95 ${showSolution ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'bg-white text-slate-500 hover:text-indigo-600'}`">
                       <BookOpen class="w-4 h-4 md:w-5 md:h-5" />
                   </button>
                </div>
            </div>
            <SmartGuide :currentAdvice="owlAdvice" />
        </div>

        <div class="flex-1 w-full flex flex-col items-center justify-center p-2 md:p-2 bg-slate-50 overflow-hidden relative">
            
            <div class="relative w-full max-w-lg h-full p-2 md:py-14 md:px-8 rounded-[2rem] border-4 shadow-2xl flex flex-col items-center justify-center transition-all duration-500"
                 :class="isFinished ? 'bg-green-100 border-green-400' : 'bg-[#fff9c4] border-yellow-400'"
                 style="background-image: linear-gradient(#e1f5fe 1px, transparent 1px); background-size: 100% 2.1rem;">
                
                <div class="absolute -top-4 -left-2 bg-white text-slate-700 font-black text-lg md:text-xl w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md border-2 border-slate-200 z-20">
                    {{ activeExerciseIndex + 1 }}
                </div>

                <div v-if="isFinished" class="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-fade-in">
                    <Check class="w-64 h-64 text-green-500/50 drop-shadow-sm" stroke-width="5" />
                </div>

                <div class="absolute top-0 bottom-0 left-4 md:left-8 w-0.5 bg-red-300 opacity-40"></div>

                <div class="flex justify-center w-full z-10 pl-2 md:pl-6">
                    <div class="grid grid-cols-7 gap-x-1 gap-y-0.5 md:gap-x-2 md:gap-y-2">
                        <template v-for="cIndex in 7" :key="cIndex">
                            <div class="flex flex-col items-center gap-1">
                                
                                <div :class="getCellClass(0, 7-cIndex)" class="mb-0">
                                    {{ getDigit(0, 7-cIndex) }}
                                </div>

                                <div class="h-4 md:h-6 flex items-end justify-center w-full relative z-20">
                                    <div v-if="shouldShowTopCheck(7-cIndex)" 
                                         :class="[
                                             'flex items-center justify-center transition-all duration-300',
                                             isTopCheckActive(7-cIndex) 
                                                 ? 'bg-white rounded-full w-6 h-6 md:w-8 md:h-8 shadow-sm border border-green-200 animate-heartbeat' 
                                                 : 'w-4 h-4 md:w-6 md:h-6'
                                          ]">
                                        <Check :class="isTopCheckActive(7-cIndex) ? 'w-4 h-4 md:w-5 md:h-5 text-green-600' : 'w-4 h-4 md:w-6 md:h-6 text-green-600/70'" stroke-width="4" />
                                    </div>
                                </div>

                                <div class="flex items-center justify-center w-9 h-10 md:w-14 md:h-14 text-2xl md:text-5xl font-mono font-bold text-slate-800">
                                    {{ getDigit(1, 7-cIndex) }}
                                </div>

                                <div class="relative flex items-center justify-center w-9 h-10 md:w-14 md:h-14 text-2xl md:text-5xl font-mono font-bold text-slate-800 border-b-4 border-slate-800">
                                    <span v-if="7-cIndex === 6" class="text-purple-600 font-black">×</span>
                                    <template v-else>
                                        {{ getDigit(2, 7-cIndex) }}
                                        
                                        <div v-if="shouldShowBotCheck(7-cIndex)" 
                                             :class="[
                                                 'absolute -top-1 -right-1 md:-top-2 md:-right-2 z-30 transition-all duration-300',
                                                 isBotCheckActive(7-cIndex) 
                                                     ? 'bg-white rounded-full p-0.5 shadow-sm border border-green-200 animate-heartbeat' 
                                                     : ''
                                              ]">
                                            <Check :class="isBotCheckActive(7-cIndex) ? 'w-3 h-3 md:w-4 md:h-4 text-green-600' : 'w-3 h-3 md:w-4 md:h-4 text-green-600/70'" stroke-width="4" />
                                        </div>
                                    </template>
                                </div>

                                <div :class="getCellClass(3, 7-cIndex)" class="mt-1">
                                    {{ getDigit(3, 7-cIndex) }}
                                </div>

                                <div v-if="7-cIndex === 6" class="flex items-center justify-center w-9 h-10 md:w-14 md:h-14 text-2xl md:text-5xl font-mono font-black text-green-600">
                                    +
                                </div>
                                <div v-else :class="getCellClass(4, 7-cIndex)">
                                    {{ getDigit(4, 7-cIndex) }}
                                </div>

                                <div :class="['w-full h-1 my-0.5', 7-cIndex === 6 ? 'bg-transparent' : 'bg-slate-800 opacity-80']"></div>

                                <div v-if="7-cIndex === 6" class="flex items-center justify-center w-9 h-10 md:w-14 md:h-14 text-2xl md:text-5xl font-mono font-black text-black">
                                    =
                                </div>
                                <div v-else :class="getCellClass(5, 7-cIndex)">
                                    {{ getDigit(5, 7-cIndex) }}
                                </div>

                            </div>
                        </template>
                    </div>
                </div>

            </div>

        </div>

        <div class="flex-none bg-white z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
            <VirtualKeypad @press="handleKeypadPress" @delete="handleDelete" />
        </div>
        
    </div>
  </div>
</template>

<style scoped>
/* ANIMACIÓN LATIDO */
@keyframes heartbeat {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.3); filter: drop-shadow(0 0 2px rgba(34, 197, 94, 0.6)); }
}
.animate-heartbeat {
    animation: heartbeat 1.2s infinite ease-in-out;
}

.focus-neon { 
  border-color: #FACC15 !important; 
  border-width: 3px !important; 
  box-shadow: 0 0 15px rgba(250, 204, 21, 0.6); 
  animation: neon-pulse 1.5s infinite ease-in-out; 
  z-index: 50;
}

@keyframes neon-pulse {
  0% { box-shadow: 0 0 5px rgba(250, 204, 21, 0.4); border-color: #eab308; transform: scale(1.0); }
  50% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.8); border-color: #facc15; transform: scale(1.05); }
  100% { box-shadow: 0 0 5px rgba(250, 204, 21, 0.4); border-color: #eab308; transform: scale(1.0); }
}

.animate-shake { animation: shake 0.4s; }
@keyframes shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);} }

.animate-fade-in-scale { animation: fadeInScale 0.2s ease-out forwards; }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }

.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }

.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
</style>