<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { 
  ChevronLeft, Eraser, Eye, EyeOff, HelpCircle, X as CloseIcon, 
  Plus, Minus, X as MultiplyIcon, Divide, ChevronDown, 
  Check, BookOpen 
} from 'lucide-vue-next';
import SmartGuide from './SmartGuide.vue';
import CoinRain from './CoinRain.vue';
import VirtualKeypad from './VirtualKeypad.vue';
import { useGamificationStore } from '../stores/useGamificationStore';
// CAMBIO: Importamos la voz
import { speak } from '../utils/voice';

const props = defineProps({
  operation: { type: String, default: 'add' },
  difficulty: { type: Number, default: 1 }
});

const emit = defineEmits(['back']);
const gamificationStore = useGamificationStore(); 

// --- ESTADOS ---
const showSolution = ref(false); // Modal de Tablas
const showCoinRain = ref(false); 
const activeExerciseIndex = ref(0);
const activeCell = ref(null); 
const currentInputTask = ref({ expected: null, nextFn: null, id: null, exIdx: null });

// Nuevo estado para la tabla seleccionada en el modal (por defecto la del 1)
const selectedHelpTable = ref(1);

const rewardCoinType = computed(() => {
    return props.operation === 'mult' ? 'gold' : 'silver';
});

// --- GENERADOR DE TABLAS DE AYUDA ---
const helpTableData = computed(() => {
    const tableNum = selectedHelpTable.value;
    const list = [];
    const symbol = operatorSymbol.value; 

    for (let i = 1; i <= 10; i++) {
        let n1, n2, res;
        
        if (props.operation === 'add') {
            n1 = tableNum; n2 = i; res = n1 + n2;
        } 
        else if (props.operation === 'sub') {
            n2 = tableNum; 
            res = i;       
            n1 = n2 + res; 
        } 
        else if (props.operation === 'mult') {
            n1 = tableNum; n2 = i; res = n1 * n2;
        } 
        else { 
            n2 = tableNum; res = i; n1 = n2 * res;
        }
        
        list.push({ n1, op: symbol, n2, res });
    }
    return list;
});

const operatorSymbol = computed(() => {
    if (props.operation === 'add') return '+';
    if (props.operation === 'sub') return '-';
    if (props.operation === 'mult') return '×';
    if (props.operation === 'div') return '÷';
    return '?';
});

const opSymbol = computed(() => {
    if (props.operation === 'sub') return '-';
    if (props.operation === 'mult') return '×';
    if (props.operation === 'div') return '÷';
    return '+';
});

const operationConfig = computed(() => {
  const configs = {
    add: { icon: Plus, color: 'bg-green-500', label: 'Sumar' },
    sub: { icon: Minus, color: 'bg-orange-500', label: 'Restar' },
    mult: { icon: MultiplyIcon, color: 'bg-purple-500', label: 'Multiplicar' },
    div: { icon: Divide, color: 'bg-blue-500', label: 'Dividir' }
  };
  return configs[props.operation] || configs.add;
});

const themeColors = computed(() => {
    const map = {
        add: { bg: 'bg-green-50', border: 'border-green-100', text: 'text-green-700', iconBg: 'bg-green-500' },
        sub: { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-700', iconBg: 'bg-orange-500' },
        mult: { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-700', iconBg: 'bg-purple-500' },
        div: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-700', iconBg: 'bg-blue-500' }
    };
    return map[props.operation] || map.add;
});

const getOperatorColorClass = () => {
    if (props.operation === 'add') return 'text-green-500';
    if (props.operation === 'sub') return 'text-orange-500';
    if (props.operation === 'mult') return 'text-purple-600';
    return 'text-blue-500';
};

// --- GENERADOR ---
const generateRandomExercise = (id) => {
  let top, bot;
  if (props.operation === 'sub') {
    top = Math.floor(Math.random() * 900) + 100; 
    let units = (top % 10);
    bot = Math.floor(Math.random() * (top - 50)) + 10;
    if (bot >= top) bot = top - 1;
  } else if (props.operation === 'mult') {
    top = Math.floor(Math.random() * 800) + 100;
    bot = Math.floor(Math.random() * 8) + 2;
  } else if (props.operation === 'div') {
    bot = Math.floor(Math.random() * 8) + 2; 
    let cociente = Math.floor(Math.random() * 20) + 1;
    top = bot * cociente;
  } else {
    top = Math.floor(Math.random() * 800) + 100; bot = Math.floor(Math.random() * 800) + 100;
  }
  return { id: Math.random().toString(36).substr(2, 9), top, bot, completed: false, inputs: {} };
};

const exercises = ref(Array.from({ length: 5 }, (_, i) => generateRandomExercise(i)));

// --- MOTOR DE MATRIZ RÍGIDA ---
const processStandardOperation = (ex, exIndex) => {
  if (!ex) return null;
  
  const tDigits = ex.top.toString().split('').reverse().map(Number);
  const bDigits = ex.bot.toString().split('').reverse().map(Number);
  const maxLength = Math.max(tDigits.length, bDigits.length);

  // --- SIMULADOR DE PRÉSTAMOS (RESTA) ---
  const finalTopDigits = [...tDigits]; 
  const borrowedStatus = new Array(maxLength).fill(false); 
  const originalTopDigits = [...tDigits]; 

  if (props.operation === 'sub') {
      for (let i = 0; i < maxLength; i++) {
          const topVal = finalTopDigits[i] || 0;
          const botVal = bDigits[i] || 0;
          
          if (topVal < botVal) {
              let j = i + 1;
              while (j < finalTopDigits.length) {
                  if (finalTopDigits[j] > 0) {
                      finalTopDigits[j] -= 1;
                      borrowedStatus[j] = true;
                      for (let k = j - 1; k >= i; k--) {
                          if (k === i) finalTopDigits[k] += 10;
                          else { finalTopDigits[k] = 9; borrowedStatus[k] = true; }
                      }
                      break;
                  }
                  j++;
              }
          }
      }
  }

  const columns = [];
  let carry = 0; 
  
  for (let i = 0; i <= 5; i++) {
      if (i === 5) {
          columns.push({ colIdx: i, type: 'OPERATOR' });
          continue;
      }
      if (i >= maxLength && (props.operation === 'sub' || carry === 0)) {
          if (i >= maxLength) {
             columns.push({ colIdx: i, type: 'GHOST' });
             continue;
          }
      }

      const tOrg = originalTopDigits[i] || 0; 
      const b = props.operation === 'mult' ? ex.bot : (bDigits[i] || 0);
      
      let resDigit = 0, ovalValue = 0, showOval = false;
      let owlMsgType = ''; 
      let subEffectiveTop = 0;
      let owlTotalSum = 0;
      let owlNextCarry = 0;
      let isLenderVisible = false;

      // --- LÓGICA RESTA ---
      if (props.operation === 'sub') {
          subEffectiveTop = finalTopDigits[i] !== undefined ? finalTopDigits[i] : 0;
          resDigit = subEffectiveTop - b;
          
          const isLender = borrowedStatus[i]; 
          const valAfterLending = tOrg - (isLender ? 1 : 0); 
          const isBorrower = subEffectiveTop > valAfterLending; 

          if (isLender) {
              if (i > 0) {
                  const prevKey = `in-${exIndex}-c${i-1}-carry`; 
                  if (ex.inputs && ex.inputs[prevKey] === 'correct') {
                      isLenderVisible = true;
                  }
              }
          }

          if (isLender && isBorrower) {
              showOval = true; ovalValue = subEffectiveTop; owlMsgType = 'sub_lender_borrower';
          } else if (isBorrower) {
              showOval = true; ovalValue = subEffectiveTop; owlMsgType = 'sub_borrow_rx';
          } else if (isLender) {
              showOval = true; ovalValue = subEffectiveTop;
              owlMsgType = subEffectiveTop === 0 ? 'sub_lender_zero' : 'sub_lender_normal';
          } else {
              owlMsgType = 'sub_simple';
          }

      // --- LÓGICA SUMA / MULT ---
      } else {
          const product = props.operation === 'mult' ? tOrg * b : tOrg + b;
          const valTotal = product + carry;
          
          resDigit = valTotal % 10;
          owlNextCarry = Math.floor(valTotal / 10);
          owlTotalSum = valTotal;

          if (props.operation === 'add') {
              if (carry > 0) owlMsgType = 'add_carry_rx'; 
              else if (owlNextCarry > 0) owlMsgType = 'add_carry_tx'; 
              else owlMsgType = 'add_simple';
          } else if (props.operation === 'mult') {
              if (carry > 0) owlMsgType = 'mult_carry_rx';
              else if (owlNextCarry > 0) owlMsgType = 'mult_carry_tx';
              else owlMsgType = 'mult_simple';
          }

          if (carry > 0 || (props.operation === 'mult' && carry > 0)) {
             showOval = carry > 0;
             ovalValue = carry;
          }
          
          carry = owlNextCarry;
      }

      columns.push({ 
          colIdx: i, 
          type: 'DATA',
          top: tOrg, 
          bot: b, 
          isTopVisible: i < originalTopDigits.length,
          isBotVisible: i < (props.operation === 'mult' ? 1 : bDigits.length), 
          expectedResult: resDigit, 
          showOval, 
          ovalValue, 
          fullBot: ex.bot,
          owlMsgType,
          subEffectiveTop,
          owlTotalSum,
          owlNextCarry,
          owlPrevCarry: (props.operation === 'add' || props.operation === 'mult' ? (showOval ? ovalValue : 0) : 0),
          isLenderVisible 
      });
  }
  return { ...ex, processedCols: columns };
};

const computedExercises = computed(() => {
  return exercises.value.map((ex, i) => processStandardOperation(ex, i));
});

const currentExercise = computed(() => {
  if (activeExerciseIndex.value >= computedExercises.value.length) return null;
  return computedExercises.value[activeExerciseIndex.value];
});

// --- HELPER VISUAL ---
const shouldShowCheck = (colIdx) => {
    if (props.operation !== 'mult') return false;
    const ex = currentExercise.value;
    if (ex && ex.completed) return true;
    if (activeCell.value) return colIdx <= activeCell.value.colIdx;
    return false;
};

const isCheckActive = (colIdx) => {
    if (props.operation !== 'mult') return false;
    const ex = currentExercise.value;
    if (ex && ex.completed) return false;
    if (activeCell.value) return colIdx === activeCell.value.colIdx;
    return false;
};

// --- BÚHO ---
const owlAdvice = computed(() => {
  const ex = currentExercise.value;
  if (!activeCell.value || !ex) return "¡Vamos búho!";
  
  if (ex.completed) {
      if (activeExerciseIndex.value === exercises.value.length - 1) return "¡Felicidades!\nHas completado todo.";
      return "¡Excelente! Preparando el siguiente...";
  }

  const { type, colIdx } = activeCell.value;
  const col = ex.processedCols[colIdx];

  if (!col) return "Selecciona casilla.";

  // === RESTA ===
  if (props.operation === 'sub') {
      const effTop = col.subEffectiveTop;
      const orgTop = col.top;
      const bot = col.bot;

      if (type === 'carry') {
          if (col.owlMsgType === 'sub_borrow_rx') return `Resta ${orgTop} - ${bot}. No puedes. Pide 1 a tu vecino y quedas en ${effTop}. Escríbelo.`;
          if (col.owlMsgType === 'sub_lender_borrower') {
              if (orgTop === 0) return `Eras 0. Pediste 1 (10) y prestaste 1. Ahora eres ${effTop}. Escríbelo.`;
              return `Eras ${orgTop}. Prestaste 1 (quedaste en ${orgTop-1}). Pediste 1 prestado y ahora eres ${effTop}. Escríbelo.`;
          }
          if (col.owlMsgType === 'sub_lender_zero') return `Prestaste 1 ahora eres 0. Escríbelo.`;
          if (col.owlMsgType === 'sub_lender_normal') return `Prestaste 1 ahora eres ${effTop}. Escríbelo.`;
      }
      if (type === 'result') return `Resta ${effTop} - ${bot} = ${col.expectedResult}. Escríbelo.`;
  }

  // === SUMA ===
  if (props.operation === 'add') {
      if (type === 'carry') return `Escribe el ${col.ovalValue} que te dio tu vecino.`;
      if (type === 'result') {
          const t = col.top;
          const b = col.bot;
          const total = col.owlTotalSum;
          const nextC = col.owlNextCarry;
          const resD = col.expectedResult;

          if (col.owlMsgType === 'add_carry_rx') {
              return `Suma ${t} + ${b} = ${t+b}. Más ${col.ovalValue} que llevas son ${total}. Anota ${resD}${nextC > 0 ? ' y lleva ' + nextC : '.'}`;
          } else if (nextC > 0) {
              return `Suma ${t} + ${b} = ${total}. Anota ${resD} y escribe ${nextC} en las llevadas del vecino.`;
          } else {
              return `Suma ${t} + ${b} = ${total}. Escríbelo.`;
          }
      }
  }
  
  // === MULTIPLICACIÓN ===
  if (props.operation === 'mult' && col.type === 'DATA') {
      if (type === 'carry') return `Escribe el ${col.ovalValue} que llevas de la multiplicación anterior.`;
      
      if (type === 'result') {
          const t = col.top;
          const b = col.bot; 
          const total = col.owlTotalSum;
          const nextC = col.owlNextCarry;
          const resD = col.expectedResult;
          const prevC = col.owlPrevCarry;

          if (!col.isTopVisible) {
              if (prevC > 0) return `Como ya no hay más números arriba, baja el ${prevC} que llevabas al resultado.`;
              else return `¡Ya casi terminamos!`;
          }

          if (col.owlMsgType === 'mult_carry_rx') {
              const baseProd = b * t; 
              return `Multiplica ${b} x ${t} = ${baseProd}. Más ${prevC} que llevas son ${total}. Escribe ${resD}${nextC > 0 ? ' y lleva ' + nextC : '.'}`;
          } else if (nextC > 0) {
              return `Multiplica ${b} x ${t} = ${total}. Escribe ${resD} y lleva ${nextC} en las unidades.`;
          } else {
              return `Multiplica ${b} x ${t} = ${total}. Escríbelo.`;
          }
      }
  }
  return "Toca la casilla y escribe.";
});

const handleKeypadPress = (num) => {
  const exIdx = activeExerciseIndex.value;
  if (exercises.value[exIdx].completed) return;

  if (!currentInputTask.value.id || !exercises.value[exIdx]) return;
  const { expected, id, nextFn } = currentInputTask.value;
  if (exercises.value[exIdx].inputs[id] === 'error') { exercises.value[exIdx].inputs[id] = null; exercises.value[exIdx].inputs[id + '_val'] = ""; }
  let cur = exercises.value[exIdx].inputs[id + '_val'] || "";
  let newVal = cur + num.toString();
  
  const expStr = expected.toString();
  
  if (parseInt(newVal) === expected) {
    exercises.value[exIdx].inputs[id] = 'correct'; 
    exercises.value[exIdx].inputs[id + '_val'] = ""; 
    nextTick(() => { if (nextFn) nextFn(); });
  } else if (newVal.length >= expStr.length) {
    exercises.value[exIdx].inputs[id] = 'error'; 
    exercises.value[exIdx].inputs[id + '_val'] = ""; 
    if (navigator.vibrate) navigator.vibrate(200);
  } else {
    exercises.value[exIdx].inputs[id + '_val'] = newVal;
  }
};

const handleDelete = () => {
    const exIdx = activeExerciseIndex.value;
    if (exercises.value[exIdx].completed) return; 
    if (!currentInputTask.value.id || !exercises.value[exIdx]) return;
    const { id } = currentInputTask.value;
    if (exercises.value[exIdx].inputs[id] === 'correct') return; 
    exercises.value[exIdx].inputs[id] = null; exercises.value[exIdx].inputs[id + '_val'] = "";
};

const handleFocus = (exIdx, type, colIdx, rowId, expectedVal, nextFn) => {
  if (exercises.value[exIdx].completed) return; 
  activeExerciseIndex.value = exIdx;
  const newId = `in-${exIdx}-c${colIdx}-${type}`;
  currentInputTask.value = { expected: expectedVal, nextFn, id: newId, exIdx };
  activeCell.value = { exIdx, type, colIdx, rowId };
};

const autoFocus = () => {
  nextTick(() => {
    const idx = activeExerciseIndex.value; const ex = currentExercise.value; 
    if(!ex) return;
    const firstDataCol = ex.processedCols.find(c => c.type === 'DATA' && c.colIdx === 0);
    if(firstDataCol) {
        const startType = (firstDataCol.showOval) ? 'carry' : 'result';
        handleFocus(idx, startType, 0, null, startType==='carry' ? firstDataCol.ovalValue : firstDataCol.expectedResult, () => nextStepStd(idx, 0, startType));
    }
  });
};

const nextStepStd = (idx, colIdx, type) => {
  const ex = currentExercise.value; if (!ex) return;
  const col = ex.processedCols.find(c => c.colIdx === colIdx);

  if (type === 'carry') {
      handleFocus(idx, 'result', colIdx, null, col.expectedResult, () => nextStepStd(idx, colIdx, 'result'));
      return;
  }

  const nextColIndex = colIdx + 1;
  const nextCol = ex.processedCols.find(c => c.colIdx === nextColIndex);

  if (nextCol && nextCol.type === 'DATA') {
      const nextHasAction = nextCol.showOval; 
      const nextType = nextHasAction ? 'carry' : 'result';
      handleFocus(idx, nextType, nextCol.colIdx, null, nextType === 'carry' ? nextCol.ovalValue : nextCol.expectedResult, () => nextStepStd(idx, nextCol.colIdx, nextType));
  } else {
      exercises.value[idx].completed = true; 
      activeCell.value = null; 
      
      const amount = props.operation === 'mult' ? 2 : 5; 
      gamificationStore.addCoins(rewardCoinType.value, amount);

      // CAMBIO: Voz de felicitación
      const frases = ["¡Excelente!", "¡Muy bien!", "¡Lo lograste!", "¡Eres genial!"];
      const frase = frases[Math.floor(Math.random() * frases.length)];
      const nombreMoneda = rewardCoinType.value === 'gold' ? 'de oro' : 'de plata';
      speak(`${frase} Ganaste ${amount} monedas ${nombreMoneda}.`);

      if (idx === exercises.value.length - 1) { 
          // CAMBIO: Pausa dramática al final (3.5 segundos)
          setTimeout(() => {
              showCoinRain.value = true;
              speak("¡Fantástico! Has terminado todos los ejercicios.");
          }, 3500);
      } else {
          setTimeout(() => {
              activeExerciseIndex.value++;
              nextTick(autoFocus);
          }, 1500);
      }
    }
};

const fullReset = async () => {
  showCoinRain.value = false; activeExerciseIndex.value = 0; exercises.value = Array.from({ length: 5 }, (_, i) => generateRandomExercise(i)); showSolution.value = false; await nextTick(); autoFocus(); 
};

onMounted(autoFocus);
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex justify-center overflow-hidden font-sans select-none">
    
    <div v-if="showCoinRain">
        <CoinRain :type="rewardCoinType" :count="30" />
    </div>
    
    <div class="w-full max-w-xl h-full flex flex-col bg-white shadow-2xl relative">

        <div v-if="showSolution" class="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="showSolution = false">
            <div class="bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm border-4 border-indigo-100 overflow-hidden flex flex-col max-h-[85vh]">
                
                <div class="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center text-slate-700 font-black shrink-0">
                    <div class="flex items-center gap-2">
                        <BookOpen :size="20" class="text-indigo-500"/> Tablas de Ayuda
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
                                    ? 'bg-indigo-600 text-white shadow-md scale-105' 
                                    : 'bg-slate-100 text-slate-500 hover:bg-indigo-100'
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
                    
                    <div :class="`flex items-center gap-2 px-3 py-1 rounded-xl border-2 ${themeColors.bg} ${themeColors.border} shadow-sm`">
                         <div :class="`p-1 rounded-md ${themeColors.iconBg} flex items-center justify-center`">
                            <component :is="operationConfig.icon" class="text-white w-3 h-3 md:w-4 md:h-4" stroke-width="4" />
                         </div>
                         <span :class="`font-black text-xs md:text-sm uppercase ${themeColors.text}`">Nivel 1</span>
                    </div>

                </div>
                <div class="text-xs md:text-sm font-bold text-slate-400 uppercase tracking-widest">Ej {{ activeExerciseIndex + 1 }} / 5</div>
                <div class="flex gap-2">
                   <button @click="fullReset" class="p-2 md:p-2.5 bg-white shadow-sm rounded-lg text-slate-500 active:scale-95 transition hover:text-indigo-600" title="Reiniciar"><Eraser class="w-4 h-4 md:w-5 md:h-5" /></button>
                   <button @click="showSolution = true" :class="`p-2 md:p-2.5 rounded-lg shadow-sm transition active:scale-95 ${showSolution ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'bg-white text-slate-500 hover:text-indigo-600'}`">
                       <BookOpen class="w-4 h-4 md:w-5 md:h-5" />
                   </button>
                </div>
            </div>
            
            <div class="w-full mb-1 z-30">
                <div class="bg-white/90 backdrop-blur-sm border-l-4 border-blue-500 rounded-r-xl p-3 shadow-md flex gap-3 items-center animate-fade-in">
                    <div class="text-2xl select-none">🦉</div>
                    <p class="text-slate-700 font-bold text-sm md:text-base leading-tight">
                        {{ owlAdvice }}
                    </p>
                </div>
            </div>
        </div>

        <div class="flex-1 flex flex-col items-center justify-center p-0 relative bg-slate-50 overflow-hidden">
            <div v-if="currentExercise" :key="currentExercise.id" class="w-[98%] max-w-lg flex flex-col justify-center h-full animate-fade-in">
                 
                 <div class="relative p-4 md:p-10 rounded-[2.5rem] border-4 w-full h-[95%] shadow-2xl flex flex-col justify-center items-center transition-all duration-500" 
                      :class="currentExercise.completed ? 'bg-green-100 border-green-400' : 'bg-[#fff9c4] border-yellow-400'"
                      style="background-image: linear-gradient(#e1f5fe 1px, transparent 1px); background-size: 100% 2.1rem;">
                    
                    <div v-if="currentExercise.completed" class="absolute inset-0 flex items-center justify-center z-50 pointer-events-none animate-fade-in">
                        <Check class="w-64 h-64 text-green-500/50 drop-shadow-sm" stroke-width="5" />
                    </div>

                    <div class="absolute top-0 bottom-0 left-4 md:left-8 w-0.5 bg-red-300 opacity-40"></div>

                    <div class="absolute -top-4 -left-2 bg-white text-slate-700 font-black text-lg md:text-xl w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md border-2 border-slate-200">{{ activeExerciseIndex + 1 }}</div>

                    <div class="w-full flex justify-center">
                        <div class="flex flex-row-reverse justify-center gap-1 md:gap-3 relative z-20">
                            
                            <div v-for="col in currentExercise.processedCols" :key="col.colIdx" class="flex flex-col items-center">
                                
                                <div v-if="col.type === 'OPERATOR'" class="w-14 md:w-[4.5rem] h-full flex flex-col items-center justify-end pb-16 md:pb-28">
                                     <div :class="`text-5xl md:text-7xl font-black ${getOperatorColorClass()}`">{{ opSymbol }}</div>
                                </div>

                                <div v-else-if="col.type === 'GHOST'" class="w-14 md:w-[4.5rem] pointer-events-none"></div>

                                <template v-else>
                                    <div class="h-14 md:h-20 flex flex-col justify-end items-center w-full mb-1">
                                        <div v-if="props.operation === 'sub' && col.isLenderVisible" 
                                             class="text-red-500 font-black text-lg md:text-2xl mb-1 md:mb-2 z-10 animate-fade-in-down">
                                            -1
                                        </div>

                                        <div v-if="col.showOval" 
                                          :class="[ 'flex items-center justify-center cursor-pointer w-10 h-8 md:w-16 md:h-10 rounded-lg border-2 text-xl md:text-2xl font-bold shadow-inner transition-all z-10', 
                                                    currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-carry`] === 'correct' ? 'bg-green-100 border-green-500 text-green-700' : 
                                                    currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-carry`] === 'error' ? 'bg-red-50 border-red-500 text-red-600 animate-shake' : 
                                                    (activeCell?.exIdx === activeExerciseIndex && activeCell?.colIdx === col.colIdx && activeCell?.type === 'carry') ? 'bg-yellow-50 focus-neon' : 'bg-white border-slate-300' ]"
                                          @click="handleFocus(activeExerciseIndex, 'carry', col.colIdx, null, col.ovalValue, () => nextStepStd(activeExerciseIndex, col.colIdx, 'carry'))">
                                            {{ currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-carry`] === 'correct' ? col.ovalValue : (currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-carry_val`] || '') }}
                                        </div>
                                    </div>

                                    <div class="w-14 md:w-[4.5rem] h-16 md:h-20 flex items-center justify-center text-5xl md:text-6xl font-mono font-bold text-slate-700 relative">
                                        <div v-if="shouldShowCheck(col.colIdx)" 
                                             :class="['absolute -top-3 left-1/2 -translate-x-1/2 text-green-500 z-50', isCheckActive(col.colIdx) ? 'animate-heartbeat' : '']">
                                            <Check :size="24" stroke-width="4" />
                                        </div>
                                        {{ col.isTopVisible ? col.top : '' }}
                                    </div>
                                    
                                    <div class="w-14 md:w-[4.5rem] h-16 md:h-20 flex items-center justify-center text-5xl md:text-6xl font-mono font-bold text-slate-700 border-b-[4px] md:border-b-[6px] border-slate-800">
                                        {{ col.isBotVisible ? (props.operation === 'mult' ? col.fullBot : col.bot) : '' }}
                                    </div>

                                    <div :class="[ 'flex items-center justify-center cursor-pointer w-14 h-16 md:w-[4.5rem] md:h-24 rounded-xl md:rounded-2xl border-2 text-5xl md:text-6xl mt-2 md:mt-4 shadow-inner transition-all', 
                                                   currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-result`] === 'correct' ? 'bg-green-100 border-green-500 text-green-700' : 
                                                   currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-result`] === 'error' ? 'bg-red-50 border-red-500 text-red-600 animate-shake' : 
                                                   (activeCell?.exIdx === activeExerciseIndex && activeCell?.colIdx === col.colIdx && activeCell?.type === 'result') ? 'bg-yellow-50 focus-neon' : 'bg-white border-slate-300' ]"
                                          @click="handleFocus(activeExerciseIndex, 'result', col.colIdx, null, col.expectedResult, () => nextStepStd(activeExerciseIndex, col.colIdx, 'result'))">
                                            {{ currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-result`] === 'correct' ? col.expectedResult : (currentExercise.inputs[`in-${activeExerciseIndex}-c${col.colIdx}-result_val`] || '') }}
                                    </div>
                                </template>

                            </div>
                        </div>
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
.animate-shake { animation: shake 0.4s; }
@keyframes shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);} }
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in-scale { animation: fadeInScale 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
.animate-fade-in-down { animation: fadeInDown 0.4s ease-out forwards; }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
.scrollbar-thin::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }
.focus-neon { 
  border-color: #FACC15 !important; 
  border-width: 3px !important; 
  box-shadow: 0 0 15px rgba(250, 204, 21, 0.5); 
  animation: neon-pulse 1.5s infinite ease-in-out; 
  z-index: 50 !important; 
  transform: scale(1.05);
}
@keyframes neon-pulse {
  0% { box-shadow: 0 0 5px rgba(250, 204, 21, 0.4); border-color: #eab308; }
  50% { box-shadow: 0 0 20px rgba(250, 204, 21, 0.7); border-color: #facc15; }
  100% { box-shadow: 0 0 5px rgba(250, 204, 21, 0.4); border-color: #eab308; }
}
@keyframes heartbeat {
    0% { transform: translate(-50%, 0) scale(1); }
    50% { transform: translate(-50%, 0) scale(1.3); }
    100% { transform: translate(-50%, 0) scale(1); }
}
.animate-heartbeat {
    animation: heartbeat 1.5s infinite ease-in-out;
}
</style>