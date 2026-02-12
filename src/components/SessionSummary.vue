<script setup>
import { onMounted, ref, computed } from 'vue';
import { Trophy, Clock } from 'lucide-vue-next'; 
import { useGamificationStore } from '../stores/useGamificationStore';
import { speak } from '../utils/voice';

const emit = defineEmits(['close']);
const store = useGamificationStore();
const isClosing = ref(false); 

// Detectamos si el alumno hizo algo (Suma Oro + Plata + Cobre)
const hasActivity = computed(() => {
    const gold = store.sessionGoldEarned || 0;
    const silver = store.sessionSilverEarned || 0;
    const copper = store.sessionCopperEarned || 0; 
    
    // Si la suma es mayor a 0, consideramos que "trabajó"
    return (gold + silver + copper) > 0;
});

onMounted(() => {
    // MENSAJE DE BIENVENIDA AL RESUMEN
    if (hasActivity.value) {
        speak("¡Gran trabajo! Mira tus logros de esta sesión.");
    } else {
        // Voz un poco más seria si no hizo nada
        speak("¡Vaya! Parece que no hemos sumado puntos esta vez.");
    }
});

const handleClose = () => {
    if (isClosing.value) return;
    isClosing.value = true;

    // MENSAJE DE DESPEDIDA / CONSEJO
    if (hasActivity.value) {
        speak("¡Hasta la próxima, campeón!");
    } else {
        // Llamada de atención / Consejo motivacional
        speak("Recuerda practicar tus ejercicios, por lo menos quince minutos al día.");
    }
    
    // Pausa inteligente: 
    // - Si ganó: 2 segundos (rápido)
    // - Si es consejo: 5 segundos (para que escuche el mensaje completo)
    setTimeout(() => {
        emit('close');
    }, hasActivity.value ? 2000 : 5000); 
};
</script>

<template>
  <div class="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
    
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-xs border-4 border-yellow-400 overflow-hidden relative transform transition-all scale-100">
        
        <div :class="`p-6 flex flex-col items-center justify-center border-b relative overflow-hidden ${hasActivity ? 'bg-yellow-50 border-yellow-100' : 'bg-blue-50 border-blue-100'}`">
            <div :class="`absolute inset-0 ${hasActivity ? 'bg-yellow-400/10' : 'bg-blue-400/10'} pattern-dots`"></div>
            
            <div :class="`p-4 rounded-full mb-2 shadow-inner relative z-10 ${hasActivity ? 'bg-yellow-100' : 'bg-blue-100'}`">
                <Trophy v-if="hasActivity" :size="48" class="text-yellow-600 drop-shadow-sm animate-bounce-slow" />
                <Clock v-else :size="48" class="text-blue-500 drop-shadow-sm" />
            </div>
            
            <h2 :class="`text-2xl font-black uppercase tracking-wide relative z-10 ${hasActivity ? 'text-yellow-800' : 'text-blue-800'}`">
                {{ hasActivity ? '¡Gran Sesión!' : '¡A Practicar!' }}
            </h2>
            <p :class="`text-sm font-bold relative z-10 text-center leading-tight ${hasActivity ? 'text-yellow-600/80' : 'text-blue-600/80'}`">
                {{ hasActivity ? '¡Mira lo que lograste!' : 'La constancia es la clave.' }}
            </p>
        </div>

        <div class="p-6 bg-white">
            <p class="text-center text-slate-500 font-bold mb-4 text-xs uppercase tracking-widest">Tus tesoros de esta sesión:</p>
            
            <div class="flex justify-center gap-4 mb-6">
                <div class="flex flex-col items-center">
                    <img src="/images/coin-gold.png" class="w-12 h-12 mb-1 drop-shadow-md" />
                    <span class="text-xl font-black text-slate-700">{{ store.sessionGoldEarned || 0 }}</span>
                </div>
                <div class="flex flex-col items-center">
                    <img src="/images/coin-silver.png" class="w-12 h-12 mb-1 drop-shadow-md" />
                    <span class="text-xl font-black text-slate-700">{{ store.sessionSilverEarned || 0 }}</span>
                </div>
                <div class="flex flex-col items-center">
                    <img src="/images/coin-copper.png" class="w-12 h-12 mb-1 drop-shadow-md" />
                    <span class="text-xl font-black text-slate-700">{{ store.sessionCopperEarned || 0 }}</span>
                </div>
            </div>

            <button @click="handleClose" 
                :disabled="isClosing"
                :class="`w-full py-4 text-white text-xl font-black rounded-xl shadow-[0_4px_0_rgb(202,138,4)] transition-all ${isClosing ? 'bg-slate-400 cursor-wait' : (hasActivity ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-blue-500 hover:bg-blue-400')} active:shadow-none active:translate-y-1`">
                {{ isClosing ? 'Guardando...' : (hasActivity ? '¡GENIAL!' : '¡ENTENDIDO!') }}
            </button>
        </div>
    </div>

  </div>
</template>

<style scoped>
.animate-fade-in { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

.animate-bounce-slow { animation: bounce 2s infinite; }
@keyframes bounce {
  0%, 100% { transform: translateY(-5%); }
  50% { transform: translateY(5%); }
}

.pattern-dots {
  background-image: radial-gradient(currentColor 1px, transparent 1px);
  background-size: 10px 10px;
}
</style>