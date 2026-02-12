<script setup>
import { ref, onMounted } from 'vue';
import OwlImage from './OwlImage.vue';
import SimpleConfetti from './SimpleConfetti.vue';
import userIcon from '@/assets/icono.png'; 
import { playOwlHoot } from '../utils/sound';

const emit = defineEmits(['start']);
const showOwl = ref(false);
const showButton = ref(false);

const handleStart = () => {
  playOwlHoot();
  emit('start');
};

onMounted(() => {
  setTimeout(() => { showOwl.value = true; }, 100);
  setTimeout(() => { showButton.value = true; }, 800);
});
</script>

<template>
  <div class="h-[100dvh] w-full bg-slate-100 flex justify-center overflow-hidden font-sans select-none">
    <div class="w-full max-w-xl h-full flex flex-col bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl relative overflow-hidden">
      <SimpleConfetti :isActive="true" />
      <div class="absolute top-[-10%] left-[-10%] w-60 h-60 bg-white/10 rounded-full blur-3xl animate-pulse-slow"></div>
      <div class="absolute bottom-[-10%] right-[-10%] w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse-slow delay-700"></div>

      <div class="absolute top-4 left-4 flex items-center gap-3 z-50">
          <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white flex items-center justify-center border-2 border-indigo-200 overflow-hidden shadow-lg">
              <img :src="userIcon" alt="Usuario" class="w-full h-full object-cover" />
          </div>
          <div class="block">
              <h3 class="font-bold text-white text-sm md:text-base leading-tight drop-shadow-md">Jorge Andrade</h3>
              <p class="text-xs md:text-sm text-white font-medium tracking-wide drop-shadow-sm">Mentor Digital & IA</p>
          </div>
      </div>

      <div class="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <h1 class="text-5xl sm:text-6xl font-black text-white mb-2 tracking-tight drop-shadow-lg text-center animate-fade-in-down">
          Búho
          <span class="block text-yellow-300 text-6xl sm:text-7xl mt-1">Matemático</span>
        </h1>
        <p class="text-blue-100 text-lg sm:text-xl font-bold mb-8 tracking-wide text-center animate-fade-in-down delay-100">¡Aprende jugando!</p>
        
        <div v-if="showOwl" class="w-48 h-48 sm:w-60 sm:h-60 mb-8 relative animate-pop-in">
          <div class="absolute inset-0 bg-white/20 rounded-full scale-110 blur-xl animate-pulse-slow"></div>
           <OwlImage customClass="w-full h-full object-contain drop-shadow-2xl relative z-10" />
        </div>

        <button v-if="showButton" @click="handleStart" class="group relative bg-yellow-400 hover:bg-yellow-300 text-indigo-900 font-black text-2xl sm:text-3xl py-4 px-12 rounded-full shadow-[0_8px_0_rgb(180,83,9)] hover:shadow-[0_4px_0_rgb(180,83,9)] active:shadow-[0_0_0_rgb(180,83,9)] active:translate-y-2 transition-all duration-150 animate-bounce-in mx-auto flex items-center gap-3">
          <span class="relative z-10">¡EMPEZAR!</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          
          <div class="absolute inset-0 rounded-full bg-white/40 animate-ping-slow pointer-events-none"></div>
        </button>
      </div>

      <div class="p-4 text-center relative z-10 flex flex-col items-center mb-2">
          <div class="flex flex-col items-center gap-1">
              <p class="text-white text-sm sm:text-base font-bold drop-shadow-sm">@Copyright 2026</p>
              <p class="text-white text-xs sm:text-sm font-medium drop-shadow-sm opacity-100">v2.1 Static Edition</p>
          </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in-down { animation: fadeInDown 0.8s ease-out forwards; opacity: 0; }
@keyframes fadeInDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
.delay-100 { animation-delay: 0.1s; }
.animate-pop-in { animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; opacity: 0; }
@keyframes popIn { from { opacity: 0; transform: scale(0.5) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.animate-bounce-in { animation: bounceIn 0.8s cubic-bezier(0.215, 0.610, 0.355, 1.000) forwards; opacity: 0; }
@keyframes bounceIn { 0% { opacity: 0; transform: scale(0.3); } 20% { transform: scale(1.1); } 40% { transform: scale(0.9); } 60% { opacity: 1; transform: scale(1.03); } 80% { transform: scale(0.97); } 100% { opacity: 1; transform: scale(1); } }
.animate-pulse-slow { animation: pulseSlow 4s infinite ease-in-out; }
@keyframes pulseSlow { 0%, 100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.05); } }
/* El ping hace el efecto de expansión y desvanecimiento continuo */
.animate-ping-slow { animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
@keyframes pingSlow { 75%, 100% { transform: scale(1.5); opacity: 0; } }
</style>