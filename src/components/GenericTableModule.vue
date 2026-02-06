<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { ArrowLeft, Eraser, Eye, EyeOff, HelpCircle, Check, X, BookOpen, Calculator } from 'lucide-vue-next';
import SimpleConfetti from './SimpleConfetti.vue';
import VerticalExercise from './VerticalExercise.vue';
// NOTA: VerticalExerciseAdvanced se importará en la Fase 2
import VirtualKeypad from './VirtualKeypad.vue'; 
// ELIMINADO: import TablaSoluciones... (Usamos el modal interno restaurado)

const props = defineProps({
  operation: String, title: String, colorTheme: String, icon: Object,
  initialMode: String, initialDifficulty: Number, initialTable: [String, Number]
});

const emit = defineEmits(['back']);
const isNotebookMode = ref(props.initialMode === 'notebook'); 
const selectedNumber = ref(props.initialTable || 'random');
const showConfetti = ref(false);
const isSuccess = ref(false);
const refreshKey = ref(0);

// --- NUEVO: ESTADO DE NAVEGACIÓN JERÁRQUICA ---
// null = Esperando selección (Hall)
// 1 = Nivel Básico (VerticalExercise)
// 2 = Nivel Experto (VerticalExerciseAdvanced - Futuro)
const selectedNotebookLevel = ref(null); 

const themes = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-900', btn: 'bg-blue-600', border: 'border-blue-200' },
  green: { bg: 'bg-green-50', text: 'text-green-900', btn: 'bg-green-600', border: 'border-green-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-900', btn: 'bg-purple-600', border: 'border-purple-200' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-900', btn: 'bg-orange-600', border: 'border-orange-200' },
};
const themeClasses = computed(() => themes[props.colorTheme] || themes.blue);

// --- LÓGICA DE INICIO ---
const initModule = async () => {
  // Si estamos en Cuaderno...
  if (isNotebookMode.value) {
      // ...y es Multiplicar: Nos quedamos en el Hall (null) para que elija nivel
      if (props.operation === 'mult') {
          selectedNotebookLevel.value = null;
      } else {
          // ...si es Suma/Resta/Div: Pasamos directo al Nivel 1
          selectedNotebookLevel.value = 1;
      }
  } else {
      // Si es Rápida, generamos ejercicios normal
      generateExercises();
  }
};

const resetLevelSelection = () => {
    selectedNotebookLevel.value = null;
};

// ESTADO MODO RÁPIDO
const userInputs = ref({});
const showTable = ref(false);
const exercises = ref([]);
const activeInputId = ref(null); 

// Soluciones para el componente compartido (Modo Rápido)
const solucionesData = computed(() => {
  return exercises.value.map(ex => ({
    n1: ex.left, operator: ex.operator, n2: ex.right, result: ex.result
  }));
});

const generateExercises = async () => {
  isSuccess.value = false;
  showConfetti.value = false;
  userInputs.value = {};
  activeInputId.value = null;
  exercises.value = [];
  
  if (!isNotebookMode.value) {
    let baseArray = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    if (selectedNumber.value === 'random') baseArray.sort(() => Math.random() - 0.5);
    exercises.value = baseArray.slice(0, 10).map(i => createExerciseData(i));
    await nextTick();
    if (exercises.value.length > 0) focusInput(exercises.value[0].id);
  } else {
    refreshKey.value++; 
  }
};

const createExerciseData = (i) => {
    let left = 0, right = 0, opChar = '+', result = 0;
    let currentTableNum = selectedNumber.value === 'random' ? Math.floor(Math.random() * 9) + 2 : parseInt(selectedNumber.value);
    if (props.operation === 'div') currentTableNum = selectedNumber.value === 'random' ? Math.floor(Math.random() * 10) + 1 : parseInt(selectedNumber.value);
    
    let varNum = i;
    if (props.operation === 'sub') {
        left = Math.max(currentTableNum, varNum) + Math.min(currentTableNum, varNum); 
        right = Math.min(currentTableNum, varNum); opChar = '-'; result = left - right;
    } else if (props.operation === 'add') {
        left = currentTableNum; right = varNum; opChar = '+'; result = left + right;
    } else if (props.operation === 'div') {
        left = currentTableNum * varNum; right = currentTableNum; opChar = '÷'; result = varNum;
    } else { 
        left = currentTableNum; right = varNum; opChar = 'x'; result = left * right;
    }
    return { id: `q-${Date.now()}-${Math.random()}`, left, right, operator: opChar, result };
};

onMounted(() => { setTimeout(initModule, 100); });

const focusInput = (id) => { activeInputId.value = id; };

const handleKeypadPress = (num) => {
    if (!activeInputId.value) return;
    const id = activeInputId.value;
    const ex = exercises.value.find(e => e.id === id);
    if (userInputs.value[id] === 'correct') return; 
    let currentVal = (userInputs.value[id] || '').toString();
    if (currentVal === 'error') currentVal = '';
    const newVal = currentVal + num.toString();
    if (newVal.length > ex.result.toString().length + 1) return;
    if (parseInt(newVal) === ex.result) {
        userInputs.value[id] = 'correct'; 
        const idx = exercises.value.findIndex(e => e.id === id);
        if (idx < exercises.value.length - 1) { focusInput(exercises.value[idx + 1].id); } 
        else { activeInputId.value = null; isSuccess.value = true; showConfetti.value = true; }
    } else {
        const strResult = ex.result.toString();
        if (newVal.length >= strResult.length && newVal !== strResult) { userInputs.value[id] = 'error'; if (navigator.vibrate) navigator.vibrate(200); } 
        else { userInputs.value[id] = newVal; }
    }
};

const handleDelete = () => {
    if (!activeInputId.value) return;
    const id = activeInputId.value;
    if (userInputs.value[id] === 'correct') return;
    let val = (userInputs.value[id] || '').toString();
    if (val === 'error') val = '';
    userInputs.value[id] = val.slice(0, -1);
};
</script>

<template>
  <div :class="`h-[100dvh] w-full ${themeClasses.bg} font-sans flex flex-col overflow-hidden`">
    <SimpleConfetti :isActive="showConfetti" />
    
    <!-- HEADER (Solo visible si NO estamos en el Hall de selección) -->
    <div v-if="!isNotebookMode || selectedNotebookLevel !== null" class="flex-none p-2 flex items-center justify-between z-10 bg-white/60 backdrop-blur border-b border-slate-200">
      <div class="flex items-center gap-2">
        <!-- El botón volver cambia su comportamiento según dónde estemos -->
        <button @click="isNotebookMode && operation === 'mult' ? resetLevelSelection() : emit('back')" class="text-slate-500 hover:text-slate-800 font-bold"><ArrowLeft :size="24" /></button>
        <h1 class="text-lg font-black text-slate-800 flex items-center gap-2">
          <span :class="`${themeClasses.btn} text-white p-1 rounded`"><component :is="icon" :size="16" /></span>
          {{ title }}
        </h1>
      </div>
      <!-- Botones de acción (solo en modo Rápida o si ya estamos dentro de un nivel) -->
      <div class="flex gap-2" v-if="!isNotebookMode">
           <button @click="generateExercises" class="p-2 bg-white shadow-sm rounded-lg text-slate-500 active:scale-95 transition"><Eraser :size="18" /></button>
           <button @click="showTable = !showTable" :class="`p-2 rounded-lg shadow-sm transition active:scale-95 ${showTable ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'bg-white text-slate-500'}`">
               <component :is="showTable ? EyeOff : Eye" :size="18" />
           </button>
      </div>
    </div>

    <!-- MODAL TABLA AYUDA (MODO RÁPIDO) -->
    <div v-if="showTable && !isNotebookMode" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="showTable = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xs border-4 border-indigo-100 overflow-hidden flex flex-col max-h-[70vh]">
            <div class="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center shrink-0">
                <div class="flex items-center gap-2 font-black text-slate-700"><HelpCircle :size="20" class="text-indigo-500"/> Soluciones</div>
                <button @click="showTable = false" class="p-1 bg-white rounded-full text-slate-400 hover:text-red-500 transition shadow-sm"><X :size="20" /></button>
            </div>
            <div class="overflow-y-auto p-3 bg-white">
                <div class="grid grid-cols-1 gap-2">
                    <div v-for="ex in exercises" :key="'h-'+ex.id" class="flex justify-between items-center p-2 rounded-xl bg-slate-50 border border-slate-100 shadow-sm">
                        <span class="text-lg font-bold text-slate-600 font-mono">{{ ex.left }} {{ ex.operator }} {{ ex.right }}</span>
                        <span class="text-xl font-black text-indigo-600">= {{ ex.result }}</span>
                    </div>
                </div>
            </div>
            <div class="p-3 bg-slate-50 border-t border-slate-100 text-center shrink-0">
                <button @click="showTable = false" class="w-full py-2 bg-indigo-600 text-white font-bold rounded-xl shadow-md active:scale-95 transition">¡Entendido!</button>
            </div>
        </div>
    </div>

    <!-- CUERPO TABLAS RÁPIDAS (MODO ORIGINAL) -->
    <div v-if="!isNotebookMode" class="flex-1 overflow-hidden p-2 bg-slate-50 relative flex flex-col">
       <div class="w-full max-w-md mx-auto h-full flex flex-col justify-center">
           <div class="grid grid-cols-2 grid-rows-5 gap-2 h-full w-full">
             <div v-for="ex in exercises" :key="ex.id" 
                  class="bg-white p-1 rounded-xl shadow-sm border-2 transition-all flex items-center justify-between gap-1 h-full w-full pl-3 pr-2"
                  :class="activeInputId === ex.id ? 'border-yellow-400 ring-2 ring-yellow-100 scale-[1.02] z-10' : 'border-white'">
               <div class="text-2xl font-black text-slate-600 font-numbers flex gap-0.5 whitespace-nowrap">
                 <span>{{ ex.left }}</span> <span class="text-indigo-400">{{ ex.operator }}</span> <span>{{ ex.right }}</span> <span class="text-slate-300">=</span>
               </div>
               <div class="relative flex items-center justify-end flex-1">
                 <div @click="focusInput(ex.id)" :id="ex.id"
                      class="w-20 h-10 sm:w-24 sm:h-12 rounded-lg border-2 flex items-center justify-center text-2xl font-bold cursor-pointer transition-colors"
                      :class="[ userInputs[ex.id] === 'correct' ? 'bg-green-100 border-green-500 text-green-700 shadow-sm' : userInputs[ex.id] === 'error' ? 'bg-red-50 border-red-300 text-red-500' : activeInputId === ex.id ? 'bg-yellow-50 border-yellow-400 text-slate-800' : 'bg-slate-50 border-slate-200 text-slate-400' ]">
                   <span>{{ userInputs[ex.id] === 'error' ? '?' : (userInputs[ex.id] === 'correct' ? ex.result : (userInputs[ex.id] || '')) }}</span>
                 </div>
                 <div v-if="userInputs[ex.id] === 'correct'" class="absolute right-0 mr-[-6px] text-green-600 animate-fade-in-scale z-20 bg-white rounded-full border border-green-100 shadow-sm"><Check :size="16" stroke-width="4" /></div>
               </div>
             </div>
           </div>
       </div>
    </div>

    <!-- MODO CUADERNO: LÓGICA DE PUERTAS -->
    <div v-if="isNotebookMode" class="fixed inset-0 z-50 bg-slate-100 flex flex-col">
        
        <!-- PANTALLA DE SELECCIÓN DE NIVEL (LAS DOS PUERTAS - SOLO MULTIPLICAR) -->
        <div v-if="selectedNotebookLevel === null" class="flex-1 flex flex-col items-center justify-center p-6 animate-fade-in">
            <h2 class="text-3xl font-black text-slate-800 mb-8 text-center">Selecciona tu desafío</h2>
            
            <div class="grid grid-cols-1 gap-6 w-full max-w-sm">
                <!-- PUERTA 1: BÁSICO -->
                <button @click="selectedNotebookLevel = 1" class="group relative bg-white p-6 rounded-3xl shadow-xl border-4 border-b-8 border-green-200 active:border-b-4 active:translate-y-1 transition-all flex flex-row items-center gap-6 hover:border-green-300">
                    <div class="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                        <BookOpen :size="32" stroke-width="3" />
                    </div>
                    <div class="text-left">
                        <h3 class="text-2xl font-black text-slate-700">Nivel 1</h3>
                        <p class="text-slate-400 font-bold text-sm">Tablas del 1 al 10</p>
                    </div>
                </button>

                <!-- PUERTA 2: EXPERTO (FASE 2) -->
                <button @click="selectedNotebookLevel = 2" class="group relative bg-white p-6 rounded-3xl shadow-xl border-4 border-b-8 border-purple-200 active:border-b-4 active:translate-y-1 transition-all flex flex-row items-center gap-6 hover:border-purple-300">
                    <div class="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                        <Calculator :size="32" stroke-width="3" />
                    </div>
                    <div class="text-left">
                        <h3 class="text-2xl font-black text-slate-700">Nivel 2</h3>
                        <p class="text-slate-400 font-bold text-sm">2 y 3 cifras</p>
                    </div>
                </button>
            </div>

            <button @click="emit('back')" class="mt-12 text-slate-400 font-bold hover:text-slate-600 flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-slate-200/50 transition">
                <ArrowLeft :size="20"/> Volver a Materias
            </button>
        </div>

        <!-- NIVEL 1: EL CLÁSICO (FASE 3 - LIMPIO) -->
        <VerticalExercise 
            v-if="selectedNotebookLevel === 1"
            :key="'level1-'+refreshKey" 
            :operation="props.operation" 
            :difficulty="1"
            @back="props.operation === 'mult' ? resetLevelSelection() : emit('back')"
        />

        <!-- NIVEL 2: PLACEHOLDER PARA FASE 2 -->
        <div v-if="selectedNotebookLevel === 2" class="flex-1 flex flex-col items-center justify-center bg-purple-50">
            <div class="text-center p-8">
                <h2 class="text-3xl font-black text-purple-600 mb-2">🚧 En Construcción</h2>
                <p class="text-slate-500 font-bold">El Nivel Experto llegará en la Fase 2.</p>
                <button @click="resetLevelSelection()" class="mt-8 px-6 py-3 bg-white text-purple-600 font-bold rounded-xl shadow-md border-2 border-purple-100 hover:border-purple-300">
                    Volver
                </button>
            </div>
        </div>
    </div>

    <!-- TECLADO RÁPIDO (SOLO MODO RÁPIDO) -->
    <div v-if="!isNotebookMode" class="flex-none bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
        <VirtualKeypad @press="handleKeypadPress" @delete="handleDelete" />
    </div>

  </div>
</template>

<style scoped>
.font-numbers { font-family: 'Nunito', sans-serif; }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
.animate-fade-in-scale { animation: fadeInScale 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
@keyframes fadeInScale { from { opacity: 0; transform: scale(0.5); } to { opacity: 1; transform: scale(1); } }
</style>