<script setup>
import { ArrowRight } from 'lucide-vue-next';
import OwlImage from './OwlImage.vue';
import userIcon from '@/assets/icono.png'; 
import { playOwlHoot } from '../utils/sound'; // Importación Nueva

const emit = defineEmits(['start']);

// Función Intermedia: Suena el búho Y cambia de pantalla
const handleStart = () => {
    // 1. Sonar inmediatamente (El navegador lo permite porque es un clic)
    playOwlHoot();
    
    // 2. Emitir el evento de navegación
    emit('start');
};
</script>

<template>
  <div class="h-[100dvh] w-full bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col items-center p-6 text-white relative overflow-hidden font-sans">
    
    <!-- Header: Perfil -->
    <div class="absolute top-4 left-4 flex items-center gap-3 z-50">
        <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center border-2 border-indigo-200 overflow-hidden shadow-lg">
            <img :src="userIcon" alt="Usuario" class="w-full h-full object-cover" />
        </div>
        <div class="block">
            <h3 class="font-bold text-white text-sm leading-tight">Jorge Andrade</h3>
            <p class="text-[10px] md:text-xs text-indigo-100 font-medium">Mentor Digital & IA</p>
        </div>
    </div>
    
    <!-- Contenedor Flex -->
    <div class="flex-1 flex flex-col items-center justify-center w-full max-w-sm gap-8">
      
      <!-- Tarjeta Principal -->
      <div class="bg-white/10 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl flex flex-col items-center border border-white/20 w-full text-center relative mt-10 animate-fade-in">
          
          <div class="bg-white rounded-full p-4 shadow-xl mb-4 transform hover:scale-110 transition-transform duration-500 -mt-16">
            <OwlImage customClass="w-20 h-20 object-contain" />
          </div>
          
          <h1 class="text-4xl md:text-5xl font-black tracking-tight mb-2 drop-shadow-sm text-white font-numbers">
            Búho<br>Matemático
          </h1>
          <p class="text-lg font-light text-indigo-100 mb-8 font-handwriting">
            Tu compañero experto
          </p>
          
          <!-- Botón con la nueva función handleStart -->
          <button
            @click="handleStart"
            class="group w-full py-4 bg-white hover:bg-indigo-50 text-indigo-900 rounded-2xl font-black text-xl shadow-xl active:scale-95 flex items-center justify-center gap-3 transition-all"
          >
            <span>Entrar a la Escuela</span>
            <ArrowRight class="group-hover:translate-x-1 transition-transform" :size="24" />
          </button>
      </div>

      <!-- Pie de página -->
      <div class="text-center opacity-80">
        <p class="text-xs font-bold text-white">v1.0 Static Edition</p>
        <p class="text-xs font-bold text-white">© Copyright 2026</p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.font-numbers { font-family: 'Nunito', sans-serif; }
.font-handwriting { font-family: 'Patrick Hand', cursive; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
.animate-fade-in { animation: fadeIn 0.8s ease-out forwards; }
</style>