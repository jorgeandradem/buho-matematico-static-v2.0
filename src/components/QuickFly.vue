<script setup>
import { ref, onMounted } from 'vue';
import { ArrowLeft, RefreshCw } from 'lucide-vue-next';
// Importamos la lluvia y el banco
import CoinRain from './CoinRain.vue';
import { useGamificationStore } from '../stores/useGamificationStore';
import { speak } from '../utils/voice';

const props = defineProps({
  operation: { type: String, default: 'add' }, 
  tableNumber: { type: [Number, String], default: 'random' }
});

const emit = defineEmits(['back']);
const gamificationStore = useGamificationStore();

// 10 preguntas para una sesión rápida
const QUESTIONS_COUNT = 10; 

const currentQuestionIndex = ref(0);
const score = ref(0);
const showCoinRain = ref(false);
const isFinished = ref(false);
const currentQuestion = ref(null);
const options = ref([]);
const feedbackMessage = ref('');
const feedbackColor = ref('');

// Lógica para generar preguntas rápidas según la operación
const generateQuestion = () => {
    let num1, num2, answer, symbol;
    const table = props.tableNumber === 'random' ? Math.floor(Math.random() * 9) + 2 : parseInt(props.tableNumber);
    
    if (props.operation === 'add') {
        num1 = table; num2 = Math.floor(Math.random() * 10) + 1; answer = num1 + num2; symbol = '+';
    } else if (props.operation === 'sub') {
        num2 = Math.floor(Math.random() * 10) + 1; answer = table; num1 = num2 + answer; symbol = '-';
    } else if (props.operation === 'mult') {
        num1 = table; num2 = Math.floor(Math.random() * 10) + 1; answer = num1 * num2; symbol = '×';
    } else if (props.operation === 'div') {
        answer = table; num2 = Math.floor(Math.random() * 9) + 2; num1 = answer * num2; symbol = '÷';
    }

    let opts = new Set([answer]);
    while (opts.size < 3) {
        let fake = answer + Math.floor(Math.random() * 10) - 5;
        if (fake > 0 && fake !== answer) opts.add(fake);
    }
    options.value = Array.from(opts).sort(() => Math.random() - 0.5);
    currentQuestion.value = { num1, num2, symbol, answer };
};

const selectOption = (selected) => {
    if (isFinished.value) return;

    if (selected === currentQuestion.value.answer) {
        score.value++;
        feedbackMessage.value = "¡Bien!";
        feedbackColor.value = "text-green-500";
        
        // ¡PAGAMOS EN COBRE! (1 moneda por acierto)
        gamificationStore.addCoins('copper', 1);
        
        if (currentQuestionIndex.value < QUESTIONS_COUNT - 1) {
            currentQuestionIndex.value++;
            setTimeout(() => { feedbackMessage.value = ""; generateQuestion(); }, 500);
        } else {
            finishGame();
        }
    } else {
        feedbackMessage.value = "¡Ups!";
        feedbackColor.value = "text-red-500";
        if (navigator.vibrate) navigator.vibrate(200);
        setTimeout(() => feedbackMessage.value = "", 800);
    }
};

const finishGame = () => {
    isFinished.value = true;
    showCoinRain.value = true;
    
    // Bono de 5 cobres al terminar
    gamificationStore.addCoins('copper', 5);
    
    const total = score.value + 5;
    speak(`¡Excelente velocidad! Ganaste ${total} monedas de cobre.`);
};

const resetGame = () => {
    isFinished.value = false;
    currentQuestionIndex.value = 0;
    score.value = 0;
    showCoinRain.value = false;
    generateQuestion();
};

const getThemeColor = () => {
    if (props.operation === 'add') return 'bg-green-500';
    if (props.operation === 'sub') return 'bg-orange-500';
    if (props.operation === 'mult') return 'bg-purple-500';
    return 'bg-blue-500';
};

onMounted(() => {
    generateQuestion();
    speak("¡Modo Rápido! Toca la respuesta correcta.");
});
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex justify-center overflow-hidden font-sans select-none">
    
    <div v-if="showCoinRain">
        <CoinRain type="copper" :count="40" />
    </div>

    <div class="w-full max-w-xl h-full flex flex-col bg-white shadow-2xl relative">
        <div :class="`flex-none p-4 ${getThemeColor()} text-white flex justify-between items-center shadow-md z-10`">
            <button @click="$emit('back')" class="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                <ArrowLeft />
            </button>
            <div class="flex flex-col items-center">
                <span class="text-xs font-bold opacity-80 uppercase tracking-widest">Tablas Rápidas</span>
                <span class="text-2xl font-black">{{ currentQuestionIndex + 1 }} / {{ QUESTIONS_COUNT }}</span>
            </div>
            <div class="flex items-center gap-1 bg-black/20 px-3 py-1 rounded-full">
                <span class="text-sm font-bold">🏆</span>
                <span class="font-mono font-bold">{{ score }}</span>
            </div>
        </div>

        <div class="flex-1 flex flex-col items-center justify-center p-6 relative">
            <div v-if="!isFinished" class="w-full flex flex-col items-center gap-8">
                <div class="flex items-center gap-4 text-7xl font-black text-slate-700 drop-shadow-sm animate-bounce-short">
                    <span>{{ currentQuestion?.num1 }}</span>
                    <span :class="`text-6xl ${props.operation === 'add' ? 'text-green-500' : props.operation === 'sub' ? 'text-orange-500' : props.operation === 'mult' ? 'text-purple-500' : 'text-blue-500'}`">
                        {{ currentQuestion?.symbol }}
                    </span>
                    <span>{{ currentQuestion?.num2 }}</span>
                </div>
                <div class="h-8">
                    <span v-if="feedbackMessage" :class="`text-2xl font-black ${feedbackColor} animate-ping-once`">
                        {{ feedbackMessage }}
                    </span>
                </div>
                <div class="grid grid-cols-1 gap-4 w-full max-w-xs">
                    <button v-for="opt in options" :key="opt" 
                        @click="selectOption(opt)"
                        class="bg-white border-4 border-slate-100 hover:border-blue-400 hover:bg-blue-50 text-slate-600 text-4xl font-black py-6 rounded-2xl shadow-lg active:scale-95 active:bg-blue-200 transition-all transform">
                        {{ opt }}
                    </button>
                </div>
            </div>

            <div v-else class="flex flex-col items-center gap-6 animate-fade-in text-center p-4">
                <h2 class="text-4xl font-black text-slate-800">¡Terminaste!</h2>
                <div class="bg-orange-100 p-6 rounded-full border-4 border-orange-300 shadow-inner">
                    <img src="/images/coin-copper.png" class="w-24 h-24 drop-shadow-lg" />
                </div>
                <p class="text-xl text-slate-600 font-bold">
                    Ganaste <span class="text-orange-600 font-black text-2xl">{{ score + 5 }}</span> monedas de cobre.
                </p>
                <div class="flex gap-4 w-full mt-4">
                    <button @click="$emit('back')" class="flex-1 py-4 bg-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-300">Salir</button>
                    <button @click="resetGame" class="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg hover:bg-blue-500 flex items-center justify-center gap-2"><RefreshCw /> Repetir</button>
                </div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-bounce-short { animation: bounceShort 0.5s; }
@keyframes bounceShort { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
.animate-ping-once { animation: ping .5s cubic-bezier(0, 0, 0.2, 1) 1; }
.animate-fade-in { animation: fadeIn 0.5s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
</style>