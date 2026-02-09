<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { 
  ArrowLeft, Eraser, Eye, EyeOff, HelpCircle, Check, X, 
  BookOpen, Calculator, ChevronLeft // Agregado ChevronLeft para el botón Volver
} from 'lucide-vue-next';
import SimpleConfetti from './SimpleConfetti.vue';
import VerticalExercise from './VerticalExercise.vue';
import MultiplicationAdvancedModule from './MultiplicationAdvancedModule.vue';
import VirtualKeypad from './VirtualKeypad.vue'; 

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

// --- ESTADO DE NAVEGACIÓN JERÁRQUICA ---
const selectedNotebookLevel = ref(null); 

const themes = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-900', btn: 'bg-blue-600', border: 'border-blue-200', ring: 'ring-blue-100', soft: 'bg-blue-50' },
  green: { bg: 'bg-green-50', text: 'text-green-900', btn: 'bg-green-600', border: 'border-green-200', ring: 'ring-green-100', soft: 'bg-green-50' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-900', btn: 'bg-purple-600', border: 'border-purple-200', ring: 'ring-purple-100', soft: 'bg-purple-50' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-900', btn: 'bg-orange-600', border: 'border-orange-200', ring: 'ring-orange-100', soft: 'bg-orange-50' },
};
const themeClasses = computed(() => themes[props.colorTheme] || themes.blue);

// --- LÓGICA DE INICIO ---
const initModule = async () => {
  if (isNotebookMode.value) {
      if (props.operation === 'mult') {
          selectedNotebookLevel.value = null;
      } else {
          selectedNotebookLevel.value = 1;
      }
  } else {
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
  <div class="h-[100dvh] w-full bg-slate-100 flex justify-center overflow-hidden font-sans select-none">
    
    <SimpleConfetti :isActive="showConfetti" />
    
    <div v-if="!isNotebookMode" :class="`w-full max-w-xl h-full flex flex-col shadow-2xl relative bg-white ${themeClasses.bg}`">
        
        <div class="flex-none p-2 flex items-center justify-between z-10 bg-white/60 backdrop-blur border-b border-slate-200">
          <div class="flex items-center gap-2">
            
            <button @click="emit('back')" class="p-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-1 active:scale-95 transition">
                <ChevronLeft class="w-4 h-4"/> Volver
            </button>

            <h1 class="text-lg font-black text-slate-800 flex items-center gap-2">
              <span :class="`${themeClasses.btn} text-white p-1 rounded`"><component :is="icon" :size="16" /></span>
              {{ title }}
            </h1>
          </div>
          <div class="flex gap-2">
               <button @click="generateExercises" class="p-2 bg-white shadow-sm rounded-lg text-slate-500 active:scale-95 transition"><Eraser :size="18" /></button>
               <button @click="showTable = !showTable" :class="`p-2 rounded-lg shadow-sm transition active:scale-95 ${showTable ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-300' : 'bg-white text-slate-500'}`">
                   <component :is="showTable ? EyeOff : Eye" :size="18" />
               </button>
          </div>
        </div>

        <div v-if="showTable" class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="showTable = false">
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

        <div class="flex-1 overflow-hidden p-2 relative flex flex-col">
           <div class="w-full h-full flex flex-col justify-center">
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

        <div class="flex-none bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-20">
            <VirtualKeypad @press="handleKeypadPress" @delete="handleDelete" />
        </div>
    </div>

    <div v-if="isNotebookMode" class="fixed inset-0 z-50 bg-slate-100 flex justify-center overflow-hidden">
        
        <div v-if="selectedNotebookLevel === null" class="w-full max-w-xl h-full flex flex-col bg-white shadow-2xl relative animate-fade-in">
             
             <div class="flex-none p-6 pb-0">
                 <button @click="emit('back')" class="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-slate-200 rounded-full text-slate-500 font-bold hover:border-slate-300 hover:text-slate-700 active:scale-95 transition-all shadow-sm">
                     <ArrowLeft :size="20" stroke-width="3" />
                     Volver
                 </button>
             </div>

             <div class="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50/30">
                
                <div class="bg-white rounded-[2.5rem] shadow-xl border-4 border-white w-full max-w-sm p-8 flex flex-col items-center relative overflow-hidden ring-1 ring-slate-100">
                    
                    <div :class="`absolute top-0 left-0 w-full h-32 opacity-10 ${themeClasses.bg} rounded-b-[50%] scale-150 -translate-y-16`"></div>

                    <div class="relative flex flex-col items-center mb-8">
                        <div :class="`w-20 h-20 rounded-3xl rotate-3 flex items-center justify-center mb-3 shadow-lg ${themeClasses.soft} ${themeClasses.text} border-4 border-white ring-2 ${themeClasses.ring}`">
                            <component :is="icon" :size="40" stroke-width="4" />
                        </div>
                        <h1 :class="`text-3xl font-black uppercase tracking-wider ${themeClasses.text}`">
                            {{ title }}
                        </h1>
                        <p class="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                            Selecciona tu desafío
                        </p>
                    </div>
                    
                    <div class="grid grid-cols-1 gap-4 w-full relative z-10">
                        <button @click="selectedNotebookLevel = 1" class="group relative bg-slate-50 hover:bg-white p-4 rounded-2xl border-2 border-slate-100 hover:border-green-400 transition-all flex items-center gap-4 shadow-sm hover:shadow-md active:scale-95 active:border-b-2 border-b-4">
                            <div class="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform shadow-inner">
                                <BookOpen :size="24" stroke-width="3" />
                            </div>
                            <div class="text-left">
                                <h3 class="text-xl font-black text-slate-700">Nivel 1</h3>
                                <p class="text-slate-400 font-bold text-[10px] uppercase tracking-wide">Tablas del 1 al 10</p>
                            </div>
                        </button>

                        <button @click="selectedNotebookLevel = 2" class="group relative bg-slate-50 hover:bg-white p-4 rounded-2xl border-2 border-slate-100 hover:border-purple-400 transition-all flex items-center gap-4 shadow-sm hover:shadow-md active:scale-95 active:border-b-2 border-b-4">
                            <div class="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform shadow-inner">
                                <Calculator :size="24" stroke-width="3" />
                            </div>
                            <div class="text-left">
                                <h3 class="text-xl font-black text-slate-700">Nivel 2</h3>
                                <p class="text-slate-400 font-bold text-[10px] uppercase tracking-wide">2 y 3 cifras</p>
                            </div>
                        </button>
                    </div>
                </div>

             </div>
        </div>

        <VerticalExercise 
            v-if="selectedNotebookLevel === 1"
            :key="'level1-'+refreshKey" 
            :operation="props.operation" 
            :difficulty="1"
            @back="props.operation === 'mult' ? resetLevelSelection() : emit('back')"
        />

        <MultiplicationAdvancedModule
             v-if="selectedNotebookLevel === 2"
             @back="resetLevelSelection"
        />

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