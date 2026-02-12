<script setup>
import { ref, onMounted, computed } from 'vue';
import { 
  Plus, Minus, X as MultiplyIcon, Divide, LogOut, 
  User, Pencil, Check, BookOpen, Play, X as CloseIcon 
} from 'lucide-vue-next';
import OwlImage from './OwlImage.vue';
import { playOwlHoot } from '../utils/sound'; 
import { incentiveMessages } from '../utils/messages';
import StatusBoard from './StatusBoard.vue';
import SessionSummary from './SessionSummary.vue';
import { useGamificationStore } from '../stores/useGamificationStore';
import { speak } from '../utils/voice';

const emit = defineEmits(['select', 'exit']);
const props = defineProps(['fromView']);

// Conexión con el Banco
const gamificationStore = useGamificationStore();

const randomIncentive = ref("");
const studentName = ref(localStorage.getItem('owlStudentName') || "");
const isEditingName = ref(!localStorage.getItem('owlStudentName'));
const showOwl = ref(false); 
const greeting = ref("");

// Variable para controlar el Modal de Resumen localmente
const showSummary = ref(false);

const pickRandomMessage = () => {
  const randomIndex = Math.floor(Math.random() * incentiveMessages.length);
  randomIncentive.value = incentiveMessages[randomIndex];
};

const showConfigModal = ref(false);
const selectedSubject = ref(null); 
const configMode = ref('notebook'); 
const configDifficulty = ref(1); 
const configTable = ref('random'); 

const options = [
  { id: 'add', label: 'Sumar', icon: Plus, color: 'bg-green-500', desc: 'Aprende a agregar' },
  { id: 'sub', label: 'Restar', icon: Minus, color: 'bg-orange-500', desc: 'Aprende a quitar' },
  { id: 'mult', label: 'Multiplicar', icon: MultiplyIcon, color: 'bg-purple-500', desc: 'Grupos iguales' },
  { id: 'div', label: 'Dividir', icon: Divide, color: 'bg-blue-500', desc: 'Repartir en partes' }
];

const openConfig = (subjectId) => {
    selectedSubject.value = subjectId;
    configMode.value = 'notebook';
    configDifficulty.value = 1;
    configTable.value = 'random';
    showConfigModal.value = true;
};

const startGame = () => {
    showConfigModal.value = false;
    emit('select', {
        id: selectedSubject.value,
        mode: configMode.value,
        difficulty: configDifficulty.value,
        table: configTable.value
    });
};

const handleExit = () => {
    // Al pulsar salir, mostramos el Resumen dentro del contenedor
    showSummary.value = true;
};

const finalExit = () => {
    showSummary.value = false;
    emit('exit');
};

onMounted(() => {
  gamificationStore.loadFromStorage();
  pickRandomMessage();

  if (props.fromView && ['add', 'sub', 'mult', 'div'].includes(props.fromView)) {
      setTimeout(() => { openConfig(props.fromView); }, 50);
  }

  const isComingFromCover = props.fromView === 'cover' || !props.fromView;

  setTimeout(() => {
    showOwl.value = true;
    if (isComingFromCover) {
        const helloText = studentName.value ? `¡Hola ${studentName.value}!` : "¡Hola! ¿Cómo te llamas?";
        greeting.value = helloText;
        speak(helloText); 
        setTimeout(() => { showOwl.value = false; }, 4000);
    } else {
        greeting.value = "¡Sigamos practicando!";
    }
  }, 300);
});

const saveName = () => { 
  if (studentName.value.trim()) { 
    localStorage.setItem('owlStudentName', studentName.value); 
    isEditingName.value = false; 
    const thanksText = `¡Gracias ${studentName.value}!`;
    greeting.value = thanksText; 
    speak(thanksText); 
  } 
};

const currentSubjectLabel = computed(() => {
    const opt = options.find(o => o.id === selectedSubject.value);
    return opt ? opt.label : '';
});
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex justify-center overflow-hidden font-sans select-none text-slate-900">
    
    <div class="w-full max-w-xl h-full flex flex-col bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl relative overflow-hidden p-4">
    
        <div v-if="showSummary" class="absolute inset-0 z-[100]">
            <SessionSummary @close="finalExit" />
        </div>

        <div v-if="showConfigModal" class="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div class="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col gap-4 border-4 border-indigo-100 max-h-[90vh] overflow-y-auto">
                <button @click="showConfigModal = false" class="absolute top-3 right-3 text-slate-400 hover:text-red-500"><CloseIcon /></button>
                <div class="text-center mb-1">
                    <h3 class="text-2xl font-black text-slate-800">{{ currentSubjectLabel }}</h3>
                    <p class="text-slate-500 text-xs font-bold uppercase">Configuración</p>
                </div>
                
                <div class="grid grid-cols-2 gap-3">
                    <button @click="configMode = 'quick'" :class="`p-3 rounded-xl border-2 font-bold text-sm transition-all ${configMode === 'quick' ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 text-slate-400'}`">⚡ Rápida</button>
                    <button @click="configMode = 'notebook'" :class="`p-3 rounded-xl border-2 font-bold text-sm transition-all ${configMode === 'notebook' ? 'border-yellow-500 bg-yellow-50 text-yellow-700 shadow-sm' : 'border-slate-200 text-slate-400'}`">📔 Cuaderno</button>
                </div>

                <div v-if="configMode === 'quick'" class="flex flex-col gap-2 animate-fade-in mt-1 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <p class="text-slate-400 text-[10px] font-bold uppercase text-center">Selecciona la Tabla</p>
                    <button @click="configTable = 'random'" :class="`w-full py-2 rounded-lg font-bold text-xs border-2 transition-all flex items-center justify-center gap-2 ${configTable === 'random' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`">🎲 Tablas Aleatorias</button>
                    <div class="grid grid-cols-5 gap-2">
                        <button v-for="n in 10" :key="n" @click="configTable = n" :class="`aspect-square rounded-lg font-black text-sm border-2 transition-all flex items-center justify-center ${configTable === n ? 'bg-indigo-600 border-indigo-600 text-white shadow-md scale-105' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'}`">{{ n }}</button>
                    </div>
                </div>

                <button @click="startGame" class="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-lg shadow-lg active:scale-95 flex items-center justify-center gap-2 mt-2">
                    <div class="flex items-center gap-2">
                        <div class="flex items-center gap-2">
                            <Play :size="20" fill="currentColor" /> ¡JUGAR!
                        </div>
                    </div>
                </button>
            </div>
        </div>

        <header class="flex justify-between items-center w-full z-30 mb-2">
             <button @click="handleExit" class="p-2 bg-white rounded-full text-indigo-600 shadow-md border-2 border-indigo-100"><LogOut :size="20" class="transform rotate-180" /></button>
             <div class="bg-white px-4 py-1 rounded-full shadow-md"><span class="text-lg font-black text-indigo-600 tracking-wider">MATERIAS</span></div>
             <div class="w-10"></div> 
        </header>

        <div class="w-full grid grid-cols-2 px-2 z-20 mb-2 items-end h-32 shrink-0">
           <div class="flex items-center justify-center pb-2">
               <div v-if="showOwl" class="bg-white rounded-xl p-3 shadow-lg border-2 border-indigo-200 relative animate-fade-in w-full text-center transition-all duration-500">
                  <p class="text-indigo-900 font-bold text-sm">{{ greeting }}</p>
               </div>
           </div>
           <div class="flex flex-col items-center justify-end">
               <div v-if="showOwl" class="w-20 h-20 mb-1 transition-all duration-500"><OwlImage customClass="w-full h-full object-contain" /></div>
               
               <div class="bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-2 border border-white/30 shadow-sm w-full">
                  <User :size="14" class="text-white" />
                  <input v-if="isEditingName" type="text" v-model="studentName" @keyup.enter="saveName" class="bg-transparent text-white font-bold text-xs outline-none w-full" autoFocus />
                  <span v-else class="text-white font-bold text-xs truncate w-full cursor-pointer" @click="isEditingName = true">{{ studentName || "Tu Nombre" }}</span>
                  <button v-if="isEditingName" @click="saveName"><Check :size="14" class="text-green-300" /></button>
                  <Pencil v-else :size="12" class="text-indigo-200" />
               </div>
           </div>
        </div>

        <div class="grid grid-cols-2 gap-6 w-full py-4 z-10 px-2 flex-none">
          <button v-for="opt in options" :key="opt.id" @click="openConfig(opt.id)"
            class="group bg-white p-4 rounded-3xl border-4 border-white hover:border-indigo-200 shadow-xl active:scale-95 flex flex-col items-center justify-center gap-2 h-full min-h-[130px] transition-all">
            <div :class="`w-14 h-14 rounded-full ${opt.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`">
              <component :is="opt.icon" :size="28" class="text-white" :stroke-width="3" />
            </div>
            <div class="text-center">
              <h3 class="text-xl font-black text-slate-800 leading-none">{{ opt.label }}</h3>
              <p class="text-slate-500 font-bold text-[10px] mt-1 tracking-wide uppercase">{{ opt.desc }}</p>
            </div>
          </button>
        </div>

        <div class="mt-auto w-full flex flex-col gap-2 z-20 pb-4 px-2">
            
            <div class="bg-indigo-50/90 rounded-2xl border-2 border-indigo-100 p-3 flex items-center justify-center gap-3 shadow-sm w-full animate-fade-in">
                <BookOpen class="text-indigo-600 shrink-0" :size="20" />
                <p class="text-slate-800 text-xs sm:text-sm font-black italic text-center leading-tight">
                    {{ randomIncentive }}
                </p>
            </div>

            <StatusBoard />
        </div>

    </div>
    
  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
</style>