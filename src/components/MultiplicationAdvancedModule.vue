<script setup>
import { ref, computed, onMounted } from 'vue';
import { 
    ChevronLeft, Eraser, Eye, 
    HelpCircle, X as CloseIcon, X, Plus
} from 'lucide-vue-next';
import SmartGuide from './SmartGuide.vue';
import SimpleConfetti from './SimpleConfetti.vue';
import VirtualKeypad from './VirtualKeypad.vue';

const emit = defineEmits(['back']);

// --- ESTADOS LÓGICOS ---
const showConfetti = ref(false);
const showSolution = ref(false);
const activeExerciseIndex = ref(0);
const exerciseStatus = ref('playing'); 
const activeCell = ref({ row: 3, col: 0 }); // Inicia en Producto 1 (Unidades)
const currentCarry = ref(0); // Llevada matemática interna

const exercise = ref({
    top: 6139, 
    bot: 98,   
    inputs: {}, 
    totalCols: 7 
});

const topDigits = computed(() => exercise.value.top.toString().split('').reverse().map(Number));
const botDigits = computed(() => exercise.value.bot.toString().split('').reverse().map(Number));

// --- INTELIGENCIA DEL PROFESOR BÚHO (VIAJE SECUENCIAL) ---
const owlAdvice = computed(() => {
    if (exerciseStatus.value === 'finished') return "¡Increíble! Has dominado la multiplicación experta.";
    
    const { row, col } = activeCell.value;
    const uTop = topDigits.value[col] || 0;
    // Detectamos si estamos multiplicando por la unidad (bot[0]) o la decena (bot[1])
    const isUnitsPhase = row === 3 || (row === 0 && activeCell.value.lastRow !== 4); 
    const uBot = isUnitsPhase ? botDigits.value[0] : botDigits.value[1];

    if (row === 0) return `¡Llevada! Escribe el ${currentCarry.value} en el óvalo y seguimos.`;
    
    if (row === 3) {
        return `Multiplica unidades: ${uBot} x ${uTop}${currentCarry.value ? ' + ' + currentCarry.value : ''}.`;
    }
    if (row === 4) {
        return `Multiplica decenas: ${uBot} x ${uTop}${currentCarry.value ? ' + ' + currentCarry.value : ''}.`;
    }

    if (row === 5) return "¡Fase final! Suma los resultados de ambas filas.";
    
    return "Sigue el cursor amarillo.";
});

// --- LÓGICA DE VALIDACIÓN ---
const handleKeypadPress = (num) => {
    if (exerciseStatus.value !== 'playing') return;
    
    const { row, col } = activeCell.value;
    const key = `${row}-${col}`;
    
    // 1. Calcular el valor correcto esperado
    let expected = 0;
    const uTop = topDigits.value[col] || 0;
    
    if (row === 3) {
        // Fila Unidades
        const val = (uTop * botDigits.value[0]) + currentCarry.value;
        expected = val % 10;
    } else if (row === 4) {
        // Fila Decenas
        const val = (uTop * botDigits.value[1]) + currentCarry.value;
        expected = val % 10;
    } else if (row === 0) {
        // Fila Llevadas
        expected = currentCarry.value;
    } else if (row === 5) {
        // Fila Suma Final (Cálculo dinámico basado en lo que hay visualmente en row 3 y 4)
        // NOTA: Para simplificar la validación de la suma, calculamos la suma real de las columnas
        // pero idealmente deberíamos sumar lo que el usuario YA escribió. 
        // Aquí usamos la matemática real para forzar corrección total.
        const p1 = exercise.value.top * botDigits.value[0];
        const p2 = exercise.value.top * botDigits.value[1] * 10;
        const totalStr = (p1 + p2).toString().split('').reverse();
        expected = parseInt(totalStr[col] || 0);
    }

    if (num === expected) {
        exercise.value.inputs[key] = { val: num, status: 'correct' };
        avanzarSecuencia(row, col, num);
    } else {
        exercise.value.inputs[key] = { val: num, status: 'error' };
        if (navigator.vibrate) navigator.vibrate(200);
    }
};

const avanzarSecuencia = (row, col, num) => {
    // Lógica para FILAS DE MULTIPLICACIÓN (3 y 4)
    if (row === 3 || row === 4) {
        const uTop = topDigits.value[col] || 0;
        const uBot = (row === 3) ? botDigits.value[0] : botDigits.value[1];
        const total = (uTop * uBot) + currentCarry.value;
        
        // Calcular nueva llevada
        const nextCarry = Math.floor(total / 10);

        // Si hay llevada y NO es la última columna, subimos al óvalo
        if (nextCarry > 0 && col < topDigits.value.length - 1) {
            currentCarry.value = nextCarry;
            activeCell.value = { row: 0, col: col + 1, lastRow: row }; // Guardamos lastRow para saber si bajar a 3 o 4
        } else {
            // Si no hay llevada o es la última columna
            currentCarry.value = (col === topDigits.value.length - 1) ? 0 : 0; // Reset carry salvo que queramos arrastrarlo (en este diseño parece que se escribe directo)
            
            // Si era la última columna, escribimos el número completo (si cabe) o avanzamos
            // Tu lógica original simplificada:
             if (col < topDigits.value.length - 1) {
                currentCarry.value = 0; // Reset carry
                activeCell.value = { row, col: col + 1 };
            } else {
                // Si sobra llevada al final, deberíamos insertarla en la siguiente col, 
                // pero por tu diseño de grid fijo, pasamos de fase:
                
                if (row === 3) {
                    // Fin fila 3 -> Ir a Fila 4 (Decenas)
                    currentCarry.value = 0;
                    // Limpiamos los inputs de llevadas (fila 0) para que no confundan en la siguiente fase
                    Object.keys(exercise.value.inputs).forEach(k => { if (k.startsWith('0-')) delete exercise.value.inputs[k]; });
                    
                    // Col 1 porque la Col 0 es implícitamente 0 o hueco
                    activeCell.value = { row: 4, col: 0 }; // Ajustado a col 0 para alinear con lógica matemática visual
                } else {
                    // Fin fila 4 -> Ir a Suma (Fila 5)
                    currentCarry.value = 0;
                    Object.keys(exercise.value.inputs).forEach(k => { if (k.startsWith('0-')) delete exercise.value.inputs[k]; });
                    activeCell.value = { row: 5, col: 0 };
                }
            }
        }
    } 
    // Lógica para FILA DE LLEVADAS (0)
    else if (row === 0) {
        // Al escribir la llevada correcta, bajamos inmediatamente a la fila que la generó
        activeCell.value = { row: activeCell.value.lastRow, col: col }; 
    }
    // Lógica para FILA DE SUMA (5)
    else if (row === 5) {
         if (col < exercise.value.totalCols - 1) {
             activeCell.value = { row: 5, col: col + 1 };
         } else {
             exerciseStatus.value = 'finished';
             showConfetti.value = true;
         }
    }
};

// --- FUNCIÓN QUE FALTABA ---
const handleFocus = (row, col) => {
    // Permitir cambio manual solo si queremos dar libertad, 
    // o restringirlo para obligar a seguir la secuencia.
    // Aquí lo permitimos para corregir errores.
    activeCell.value = { row, col };
};

const resetExercise = () => {
    exercise.value.inputs = {};
    currentCarry.value = 0;
    activeCell.value = { row: 3, col: 0 };
    exerciseStatus.value = 'playing';
    showConfetti.value = false;
    generateNewNumbers();
};

const generateNewNumbers = () => {
    exercise.value.top = Math.floor(Math.random() * 8999) + 101;
    exercise.value.bot = Math.floor(Math.random() * 89) + 11;
};

const getCellClass = (row, col) => {
    const isActive = activeCell.value.row === row && activeCell.value.col === col;
    const data = exercise.value.inputs[`${row}-${col}`];
    
    let base = "relative flex items-center justify-center font-mono font-bold transition-all border-[1px] rounded-lg cursor-pointer ";
    let size = row === 0 ? "w-9 h-9 sm:w-14 sm:h-14 text-lg rounded-full " : "w-9 h-11 sm:w-14 sm:h-16 text-2xl sm:text-4xl ";

    if (isActive) return base + size + "bg-white focus-neon z-20 border-yellow-400";
    if (data?.status === 'correct') return base + size + "bg-green-100 border-green-500 text-green-700";
    if (data?.status === 'error') return base + size + "bg-red-50 border-red-500 text-red-600 animate-shake";
    
    return base + size + "bg-white/60 border-slate-200 text-slate-700 hover:bg-white";
};

const handleDelete = () => {
    const key = `${activeCell.value.row}-${activeCell.value.col}`;
    delete exercise.value.inputs[key];
};

onMounted(generateNewNumbers);
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex flex-col items-center overflow-hidden font-sans select-none">
    <SimpleConfetti :isActive="showConfetti" />
    
    <div v-if="showSolution" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" @click.self="showSolution = false">
        <div class="bg-white rounded-2xl shadow-2xl w-[95%] max-w-xs border-4 border-indigo-100 flex flex-col max-h-[80vh]">
            <div class="bg-indigo-50 p-3 border-b border-indigo-100 flex justify-between items-center shrink-0">
                <div class="flex items-center gap-2 font-black text-slate-700"><HelpCircle :size="20" class="text-indigo-500"/> Soluciones</div>
                <button @click="showSolution = false" class="p-1 bg-white rounded-full text-slate-400 hover:text-red-500"><CloseIcon :size="20" /></button>
            </div>
            <div class="overflow-y-auto p-3 bg-white scrollbar-thin">
                <div class="flex justify-between items-center p-4 rounded-xl border bg-slate-50">
                    <span class="text-lg font-bold text-slate-600">{{ exercise.top }} x {{ exercise.bot }}</span>
                    <span class="text-2xl font-black text-indigo-600">= {{ exercise.top * exercise.bot }}</span>
                </div>
            </div>
            <div class="p-3 bg-slate-50 border-t text-center"><button @click="showSolution = false" class="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">¡Entendido!</button></div>
        </div>
    </div>

    <div class="w-full max-w-xl h-full flex flex-col bg-white shadow-2xl relative overflow-hidden">
        
        <div class="flex-none pt-2 px-2 pb-1 z-10 bg-white/90 border-b border-slate-200">
            <div class="flex justify-between items-center h-10 gap-1">
                <div class="flex items-center gap-1 shrink-0">
                    <button @click="emit('back')" class="p-1.5 rounded-lg bg-slate-100 text-slate-600 font-bold text-xs flex items-center gap-0.5 active:scale-95 transition">
                        <ChevronLeft class="w-4 h-4"/> Volver
                    </button>
                    <div class="flex items-center gap-1 bg-purple-100 px-2 py-1 rounded-lg">
                        <div class="bg-purple-600 p-0.5 rounded"><X class="text-white w-3 h-3" stroke-width="4" /></div>
                        <span class="text-purple-700 font-black text-xs">Nivel 2</span>
                    </div>
                </div>
                <div class="text-xs font-bold text-slate-400">Ej {{ activeExerciseIndex + 1 }} / 5</div>
                <div class="flex gap-1 shrink-0">
                   <button @click="resetExercise" class="p-2 bg-slate-50 border rounded-lg text-slate-500 active:scale-95"><Eraser class="w-4 h-4" /></button>
                   <button @click="showSolution = !showSolution" class="p-2 bg-slate-50 border rounded-lg text-slate-500 active:scale-95"><Eye class="w-4 h-4" /></button>
                </div>
            </div>
            <SmartGuide :currentAdvice="owlAdvice" />
        </div>

        <div class="flex-1 bg-purple-50 p-1 flex flex-col items-center justify-center overflow-hidden">
            <div class="w-full h-full max-h-[600px] relative p-2 sm:p-4 rounded-[2rem] border-4 bg-[#fff9c4] border-[#fbc02d] flex flex-col justify-center items-center shadow-inner"
                 style="background-image: linear-gradient(#e1f5fe 1px, transparent 1px); background-size: 100% 2.1rem;">
                
                <div class="absolute top-0 bottom-0 left-5 w-0.5 bg-red-300 opacity-30"></div>

                <div class="flex flex-col items-end gap-0.5 relative z-10 pr-2 sm:pr-6">
                    
                    <div class="grid grid-cols-7 gap-1 h-10 sm:h-14 items-center mb-1">
                        <div v-for="c in 7" :key="'r0-'+c" 
                             :class="[c === 1 ? 'opacity-0 pointer-events-none' : getCellClass(0, 7-c), activeCell.row===0 && activeCell.col === 7-c ? 'ring-2 ring-purple-400' : '']"
                             @click="c !== 1 && handleFocus(0, 7-c)">
                            {{ exercise.inputs[`0-${7-c}`]?.val ?? '' }}
                        </div>
                    </div>

                    <div class="grid grid-cols-7 gap-1 h-9 sm:h-12 items-center">
                        <div v-for="c in 7" :key="'r1-'+c" class="w-9 sm:w-14 text-center text-2xl sm:text-5xl font-black font-mono"
                             :class="activeCell.col > 7-c ? 'text-green-600/50' : 'text-slate-700'">
                            {{ topDigits[7-c] ?? '' }}
                        </div>
                    </div>

                    <div class="grid grid-cols-7 gap-1 h-9 sm:h-12 items-center border-b-[3px] border-slate-800 relative mb-1">
                        <div v-for="c in 7" :key="'r2-'+c" class="w-9 sm:w-14 text-center text-2xl sm:text-5xl font-black font-mono text-slate-700">
                            <span v-if="c === 1" class="text-slate-400 absolute left-2 text-xl sm:text-4xl">×</span>
                            <span :class="{'text-purple-600 scale-125 inline-block transition-transform': 
                                (activeCell.row === 3 && 7-c === 0) || (activeCell.row === 4 && 7-c === 1)}">
                                {{ botDigits[7-c] ?? '' }}
                            </span>
                        </div>
                    </div>

                    <div class="grid grid-cols-7 gap-1 mt-1">
                        <div v-for="c in 7" :key="'r3-'+c" :class="getCellClass(3, 7-c)" @click="handleFocus(3, 7-c)">
                            {{ exercise.inputs[`3-${7-c}`]?.val ?? '' }}
                        </div>
                    </div>

                    <div class="grid grid-cols-7 gap-1 relative">
                        <div class="absolute -left-6 top-1/2 -translate-y-1/2 text-slate-400"><Plus :size="18" /></div>
                        <div v-for="c in 7" :key="'r4-'+c" :class="c === 7 ? 'opacity-0' : getCellClass(4, 7-c)" @click="c !== 7 && handleFocus(4, 7-c)">
                            {{ c === 7 ? '' : (exercise.inputs[`4-${7-c}`]?.val ?? '') }}
                        </div>
                    </div>

                    <div class="grid grid-cols-7 gap-1 mt-1 pt-1 border-t-[3px] border-slate-800">
                        <div v-for="c in 7" :key="'r5-'+c" :class="getCellClass(5, 7-c)" @click="handleFocus(5, 7-c)">
                            {{ exercise.inputs[`5-${7-c}`]?.val ?? '' }}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex-none bg-white border-t"><VirtualKeypad @press="handleKeypadPress" @delete="handleDelete" /></div>
    </div>
  </div>
</template>

<style scoped>
.focus-neon { 
    border-color: #FACC15 !important; 
    box-shadow: 0 0 10px rgba(250, 204, 21, 0.6); 
    z-index: 50;
    transform: scale(1.05);
}
.animate-shake { animation: shake 0.4s; }
@keyframes shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-5px);} 75%{transform:translateX(5px);} }
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

/* Scrollbar fina */
.scrollbar-thin::-webkit-scrollbar { width: 6px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
</style>