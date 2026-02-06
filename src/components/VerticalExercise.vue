<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { ChevronLeft, Eraser, Eye, EyeOff, HelpCircle, X as CloseIcon, Plus, Minus, X as MultiplyIcon, ChevronDown } from 'lucide-vue-next';
import SmartGuide from './SmartGuide.vue';
import SimpleConfetti from './SimpleConfetti.vue';
import VirtualKeypad from './VirtualKeypad.vue';

const props = defineProps({
  operation: { type: String, default: 'add' },
  difficulty: { type: Number, default: 1 }
});

const emit = defineEmits(['back']);

// --- ESTADOS ---
const showSolution = ref(false);
const showConfetti = ref(false);
const activeExerciseIndex = ref(0);
const activeCell = ref(null); 
const currentInputTask = ref({ expected: null, nextFn: null, id: null, exIdx: null });
const selectedTableMode = ref('current');

// Resetear selector al abrir modal
watch(showSolution, (newVal) => { if (newVal) selectedTableMode.value = 'current'; });

// --- LÓGICA DE SOLUCIONES (CON SELECTOR DE TABLAS) ---
const displayedSolutions = computed(() => {
    if (selectedTableMode.value === 'current') {
        return exercises.value.map(ex => {
            let res = 0;
            if (props.operation === 'add') res = ex.top + ex.bot;
            else if (props.operation === 'sub') res = ex.top - ex.bot;
            else res = ex.top * ex.bot;
            return { id: ex.id, n1: ex.top, op: operatorSymbol.value, n2: ex.bot, result: res, isCurrent: true };
        });
    } else {
        const tableNum = parseInt(selectedTableMode.value);
        const list = [];
        for (let i = 1; i <= 10; i++) {
            let n1, op, n2, res;
            if (props.operation === 'add') { n1 = tableNum; op = '+'; n2 = i; res = n1 + n2; }
            else if (props.operation === 'sub') { n2 = tableNum; op = '-'; n1 = tableNum + i; res = i; }
            else { n1 = tableNum; op = 'x'; n2 = i; res = n1 * n2; }
            list.push({ id: `tbl-${i}`, n1, op, n2, result: res, isCurrent: false });
        }
        return list;
    }
});

const operatorSymbol = computed(() => {
    if (props.operation === 'add') return '+';
    if (props.operation === 'sub') return '-';
    if (props.operation === 'mult') return 'x';
    return '?';
});

const operationConfig = computed(() => {
  const configs = {
    add: { icon: Plus, color: 'bg-green-500', label: 'Sumar' },
    sub: { icon: Minus, color: 'bg-orange-500', label: 'Restar' },
    mult: { icon: MultiplyIcon, color: 'bg-purple-500', label: 'Multiplicar' }
  };
  return configs[props.operation] || configs.add;
});

const opSymbol = computed(() => props.operation === 'sub' ? '-' : (props.operation === 'mult' ? 'x' : '+'));

// --- GENERADOR DE EJERCICIOS (SOLO BÁSICO/NIVEL 1) ---
const generateRandomExercise = (id) => {
  let top, bot;
  if (props.operation === 'sub') {
    top = Math.floor(Math.random() * 700) + 250; 
    let units = (top % 10);
    bot = Math.floor(Math.random() * (top - 100)) + 50;
    bot = (Math.floor(bot / 10) * 10) + (units === 9 ? 9 : units + 1);
    if (bot >= top) bot = top - 15;
  } else if (props.operation === 'mult') {
    // NIVEL 1: 100-900 arriba, 2-9 abajo (1 cifra de multiplicador)
    top = Math.floor(Math.random() * 800) + 100;
    bot = Math.floor(Math.random() * 8) + 2;
  } else {
    top = Math.floor(Math.random() * 800) + 100; bot = Math.floor(Math.random() * 800) + 100;
  }
  return { id: Math.random().toString(36).substr(2, 9), top, bot, completed: false, inputs: {} };
};

const exercises = ref(Array.from({ length: 5 }, (_, i) => generateRandomExercise(i)));

// --- MOTOR LÓGICO ESTÁNDAR ---
const processStandardOperation = (ex) => {
  if (!ex) return null;
  const getDigits = (num) => num.toString().split('').reverse().map(Number);
  const topDigits = getDigits(ex.top); 
  const botDigits = getDigits(ex.bot); 
  const cols = Math.max(topDigits.length, botDigits.length); 
  const columns = [];
  let carry = 0; 
  const loopLimit = (props.operation === 'sub') ? cols : cols + 1; 

  for (let i = 0; i < loopLimit; i++) {
    if (i >= cols && carry === 0) break;
    const t = topDigits[i] || 0; 
    const b = props.operation === 'mult' ? ex.bot : (botDigits[i] || 0);
    let resDigit, nextCarry, ovalValue = 0, showOval = false, ovalType = '';
    let intermediateVal = t - carry; 

    if (props.operation === 'sub') {
      if (intermediateVal < b && i < cols - 1) {
        ovalValue = intermediateVal + 10; resDigit = ovalValue - b; nextCarry = 1; showOval = true; ovalType = carry > 0 ? 'lent_and_borrow' : 'borrow';
      } else {
        resDigit = intermediateVal - b; nextCarry = 0; 
        if (carry > 0) { showOval = true; ovalValue = intermediateVal; ovalType = 'reduced'; }
      }
    } else {
      const valTotal = (props.operation === 'mult' ? t * b : t + b) + carry;
      resDigit = valTotal % 10; nextCarry = Math.floor(valTotal / 10);
      showOval = i > 0 && carry > 0; ovalValue = carry;
    }
    columns.push({ colIdx: i, top: t, bot: b, isExtraCol: i >= cols, expectedResult: resDigit, expectedCarry: nextCarry, prevCarry: carry, showOval, ovalValue, ovalType, intermediateVal, fullBot: ex.bot });
    carry = nextCarry;
  }
  return { ...ex, processedCols: columns, totalCols: columns.length, isMultL2: false };
};

const computedExercises = computed(() => {
  // Solo procesamos lógica estándar (eliminado cualquier rastro de MultLevel2)
  return exercises.value.map(ex => processStandardOperation(ex));
});

const currentExercise = computed(() => {
  if (activeExerciseIndex.value >= computedExercises.value.length) return null;
  return computedExercises.value[activeExerciseIndex.value];
});

// --- INTELIGENCIA DEL BÚHO ---
const owlAdvice = computed(() => {
  const ex = currentExercise.value;
  if (!activeCell.value || !ex) return "¡Vamos búho!";
  if (ex.completed) return "¡Excelente trabajo!\nLo has hecho\ncomo un campeón.";
  const { type, colIdx } = activeCell.value;
  const col = ex.processedCols[colIdx];

  if (props.operation === 'sub' && col) {
      if (type === 'carry') return "Anota la llevada.";
      const valBase = col.showOval ? col.ovalValue : col.top;
      return `¡Resta ahora!\n${valBase} - ${col.bot} = ${col.expectedResult}`;
  }
  if (props.operation === 'add' && col) return "Suma los números.";
  if (props.operation === 'mult' && col) {
      if (type === 'carry') return `Llevada de la anterior.`;
      return `Multiplica: ${col.top} x ${col.bot} ${col.prevCarry > 0 ? `+ ${col.prevCarry}` : ''}`;
  }
  return "Toca la casilla y escribe.";
});

const handleKeypadPress = (num) => {
  const exIdx = activeExerciseIndex.value;
  if (!currentInputTask.value.id || !exercises.value[exIdx]) return;
  const { expected, id, nextFn } = currentInputTask.value;
  if (exercises.value[exIdx].inputs[id] === 'error') { exercises.value[exIdx].inputs[id] = null; exercises.value[exIdx].inputs[id + '_val'] = ""; }
  let cur = exercises.value[exIdx].inputs[id + '_val'] || "";
  let newVal = cur + num.toString();
  if (parseInt(newVal) === expected) {
    exercises.value[exIdx].inputs[id] = 'correct'; exercises.value[exIdx].inputs[id + '_val'] = ""; nextTick(() => { if (nextFn) nextFn(); });
  } else if (newVal.length >= expected.toString().length) {
    exercises.value[exIdx].inputs[id] = 'error'; exercises.value[exIdx].inputs[id + '_val'] = ""; if (navigator.vibrate) navigator.vibrate(200);
  } else {
    exercises.value[exIdx].inputs[id + '_val'] = newVal;
  }
};

const handleDelete = () => {
    const exIdx = activeExerciseIndex.value;
    if (!currentInputTask.value.id || !exercises.value[exIdx]) return;
    const { id } = currentInputTask.value;
    if (exercises.value[exIdx].inputs[id] === 'correct') return; 
    exercises.value[exIdx].inputs[id] = null; exercises.value[exIdx].inputs[id + '_val'] = "";
};

const handleFocus = (exIdx, type, colIdx, rowId, expectedVal, nextFn) => {
  activeExerciseIndex.value = exIdx;
  const newId = `in-${exIdx}-c${colIdx}-${type}`;
  currentInputTask.value = { expected: expectedVal, nextFn, id: newId, exIdx };
  activeCell.value = { exIdx, type, colIdx, rowId };
};

const autoFocus = () => {
  nextTick(() => {
    const idx = activeExerciseIndex.value; const ex = currentExercise.value; 
    if(!ex) return;
    const col = ex.processedCols[0]; const type = col.showOval ? 'carry' : 'result';
    handleFocus(idx, type, 0, null, type==='carry' ? col.ovalValue : col.expectedResult, () => nextStepStd(idx, 0, type));
  });
};

const nextStepStd = (idx, colIdx, type) => {
  const ex = currentExercise.value; if (!ex) return;
  if (type === 'carry') {
    const col = ex.processedCols[colIdx];
    handleFocus(idx, 'result', colIdx, null, col.expectedResult, () => nextStepStd(idx, colIdx, 'result'));
  } else {
    if (colIdx + 1 < ex.processedCols.length) {
      const nextCol = ex.processedCols[colIdx+1]; const nextType = nextCol.showOval ? 'carry' : 'result';
      handleFocus(idx, nextType, colIdx+1, null, nextType === 'carry' ? nextCol.ovalValue : nextCol.expectedResult, () => nextStepStd(idx, colIdx+1, nextType));
    } else {
      exercises.value[idx].completed = true; if (idx === exercises.value.length - 1) { showConfetti.value = true; } else { activeExerciseIndex.value++; nextTick(autoFocus); }
    }
  }
};

const fullReset = async () => {
  showConfetti.value = false; activeExerciseIndex.value = 0; exercises.value = Array.from({ length: 5 }, (_, i) => generateRandomExercise(i)); showSolution.value = false; await nextTick(); autoFocus(); 
};

onMounted(autoFocus);
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex flex-col overflow-hidden font-sans select-none">
    <SimpleConfetti :isActive="showConfetti" />
    
    <!-- MODAL SOLUCIÓN CON SELECTOR -->
    <div v-if="showSolution" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="showSolution = false">
        <div class="bg-white rounded-2xl shadow-2xl w-[90%] max-w-xs border-4 border-indigo-100 overflow-hidden flex flex-col max-h-[80vh]">
            <div class="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center text-slate-700 font-black shrink-0">
                <div class="flex items-center gap-2"><HelpCircle :size="20" class="text-indigo-500"/> Soluciones</div>
                <button @click="showSolution = false" class="p-1 bg-white rounded-full text-slate-400 hover:text-red-500 transition shadow-sm"><CloseIcon :size="20" /></button>
            </div>
            <div class="p-2 bg-white border-b border-slate-100 shrink-0">
                <div class="relative">
                    <select v-model="selectedTableMode" class="w-full p-2.5 pl-4 pr-10 bg-slate-50 border-2 border-indigo-100 text-slate-700 font-bold rounded-xl appearance-none focus:outline-none focus:border-indigo-400 transition-colors cursor-pointer">
                        <option value="current">📝 Ver mis ejercicios actuales</option>
                        <option disabled>──────────</option>
                        <option v-for="n in 10" :key="n" :value="n">{{ operation === 'add' ? `➕ Tabla del ${n}` : (operation === 'sub' ? `➖ Tabla del ${n}` : `✖️ Tabla del ${n}`) }}</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-indigo-400"><ChevronDown :size="20" stroke-width="3" /></div>
                </div>
            </div>
            <div class="overflow-y-auto p-3 bg-white scrollbar-thin">
               <div class="grid grid-cols-1 gap-2">
                   <div v-for="item in displayedSolutions" :key="item.id" class="flex justify-between items-center p-2 rounded-xl border shadow-sm transition-all" :class="item.isCurrent ? 'bg-slate-50 border-slate-100' : 'bg-indigo-50/50 border-indigo-100'">
                       <span class="text-lg font-bold text-slate-600 font-mono">{{ item.n1 }} <span class="text-indigo-400 mx-1">{{ item.op }}</span> {{ item.n2 }}</span>
                       <span class="text-xl font-black text-indigo-600">= {{ item.result }}</span>
                   </div>
               </div>
            </div>
            <div class="p-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                <button @click="showSolution = false" class="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition">¡Entendido!</button>
            </div>
        </div>
    </div>
    
    <!-- HEADER -->
    <div class="flex-none pt-2 px-4 pb-1 z-10 bg-white/90 backdrop-blur border-b border-slate-200 flex flex-col gap-1">
        <div class="flex justify-between items-center h-10">
            <div class="flex items-center gap-3">
                <button @click="$emit('back')" class="p-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1 active:scale-95 transition"><ChevronLeft class="w-4 h-4"/> Volver</button>
                <div :class="`w-8 h-8 rounded-lg ${operationConfig.color} flex items-center justify-center shadow-sm`"><component :is="operationConfig.icon" :size="18" class="text-white" :stroke-width="3" /></div>
            </div>
            <div class="text-xs font-bold text-slate-400 uppercase tracking-widest">Ej {{ activeExerciseIndex + 1 }} / 5</div>
            <div class="flex gap-2">
               <button @click="fullReset" class="p-2 bg-white shadow-sm rounded-lg text-slate-500 active:scale-95 transition hover:text-indigo-600" title="Reiniciar"><Eraser :size="18" /></button>
               <button @click="showSolution = !showSolution" :class="`p-2 rounded-lg shadow-sm transition active:scale-95 ${showSolution ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'bg-white text-slate-500 hover:text-indigo-600'}`"><component :is="showSolution ? EyeOff : Eye" :size="18" /></button>
            </div>
        </div>
        <SmartGuide :currentAdvice="owlAdvice" />
    </div>

    <!-- ÁREA DE TRABAJO ESTÁNDAR (NIVEL 1 - FUENTE GRANDE) -->
    <div class="flex-1 flex flex-col items-center justify-center p-0 relative bg-slate-50 overflow-hidden">
        <div v-if="currentExercise" :key="currentExercise.id" class="w-[98%] max-w-4xl flex flex-col justify-center h-full animate-fade-in">
             <div class="relative p-6 py-10 rounded-[2.5rem] border-4 w-full h-[95%] shadow-2xl bg-yellow-50 border-yellow-400 flex flex-col justify-center items-center" :class="{ 'bg-green-50 border-green-300': currentExercise.completed }">
                <div class="absolute -top-4 -left-2 bg-white text-slate-700 font-black text-lg w-10 h-10 rounded-full flex items-center justify-center shadow-md border-2 border-slate-200">{{ activeExerciseIndex + 1 }}</div>

                <div class="flex flex-row-reverse justify-center gap-4 sm:gap-10">
                    <div v-for="col in currentExercise.processedCols" :key="col.colIdx" class="flex flex-col items-center">
                        <div class="h-16 flex items-end justify-center">
                            <div v-if="col.showOval" 
                                 :class="[ 'text-center font-bold transition-all outline-none flex items-center justify-center cursor-pointer w-16 h-10 rounded-lg border-2 text-2xl mb-1 shadow-inner', currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-carry`] === 'correct' ? 'bg-green-100 border-green-500 text-green-700' : currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-carry`] === 'error' ? 'bg-red-50 border-red-500 text-red-600 animate-shake' : (activeCell?.exIdx === activeExerciseIndex && activeCell?.colIdx === col.colIdx && activeCell?.type === 'carry') ? 'bg-white focus-neon scale-110 z-10' : 'bg-white border-slate-300' ]"
                                 @click="handleFocus(activeExerciseIndex, 'carry', col.colIdx, null, col.ovalValue, () => nextStepStd(activeExerciseIndex, col.colIdx, 'carry'))">
                                {{ currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-carry`] === 'correct' ? col.ovalValue : (currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-carry_val`] || '') }}
                            </div>
                        </div>
                        <div class="w-20 h-16 flex items-center justify-center text-6xl font-mono font-bold text-slate-700">{{ col.isExtraCol ? '' : col.top }}</div>
                        <div class="w-20 h-16 flex items-center justify-center text-6xl font-mono font-bold text-slate-700 border-b-[6px] border-slate-800 relative">
                            <span v-if="col.colIdx === currentExercise.totalCols - 1 && !col.isExtraCol" class="absolute -left-16 top-2 text-5xl text-slate-400 font-black">{{ opSymbol }}</span>
                            {{ col.isExtraCol ? '' : (props.operation === 'mult' ? (col.colIdx === 0 ? col.fullBot : '') : col.bot) }}
                        </div>
                        <div :class="[ 'text-center font-bold transition-all outline-none flex items-center justify-center cursor-pointer w-20 h-24 rounded-2xl border-2 text-5xl mt-4 shadow-inner', currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-result`] === 'correct' ? 'bg-green-100 border-green-500 text-green-700' : currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-result`] === 'error' ? 'bg-red-50 border-red-500 text-red-600 animate-shake' : (activeCell?.exIdx === activeExerciseIndex && activeCell?.colIdx === col.colIdx && activeCell?.type === 'result') ? 'bg-white focus-neon scale-110 z-10' : 'bg-white border-slate-300' ]"
                             @click="handleFocus(activeExerciseIndex, 'result', col.colIdx, null, col.expectedResult, () => nextStepStd(activeExerciseIndex, col.colIdx, 'result'))">
                            {{ currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-result`] === 'correct' ? col.expectedResult : (currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-result_val`] || '') }}
                        </div>
                    </div>
                </div>
             </div>
        </div>
    </div>

    <!-- TECLADO -->
    <div class="flex-none bg-white z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <VirtualKeypad @press="handleKeypadPress" @delete="handleDelete" />
    </div>
  </div>
</template>

<style scoped>
.animate-shake { animation: shake 0.4s; }
@keyframes shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);} }
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
.focus-neon { border-color: #FACC15 !important; border-width: 5px !important; box-shadow: 0 0 25px rgba(250, 204, 21, 1), inset 0 0 10px rgba(250, 204, 21, 0.5); animation: pulse-neon 0.8s infinite alternate ease-in-out; z-index: 20 !important; }
@keyframes pulse-neon { from { box-shadow: 0 0 10px rgba(250, 204, 21, 0.7); transform: scale(1.05); } to { box-shadow: 0 0 35px rgba(250, 204, 21, 1); transform: scale(1.1); } }
</style>