<script setup>
import { ref, onMounted, watch } from 'vue';
import { useGamificationStore } from '../stores/useGamificationStore';
import { storeToRefs } from 'pinia';

// Conectamos con el Banco
const store = useGamificationStore();
// Extraemos los saldos REALES (Objetivos)
const { copper, silver, gold } = storeToRefs(store);

// --- LÓGICA DE ANIMACIÓN (SLOT MACHINE) ---

// Estos son los valores que se MUESTRAN en pantalla (empiezan en 0)
const displayCopper = ref(0);
const displaySilver = ref(0);
const displayGold = ref(0);

// Función maestra de animación suave
const animateValue = (start, end, duration, elementRef) => {
  if (start === end) {
      elementRef.value = end;
      return;
  }
  
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    
    // Easing: "easeOutExpo" (rápido al inicio, frena suave al final)
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    
    // Calculamos el valor actual
    elementRef.value = Math.floor(easeProgress * (end - start) + start);

    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      elementRef.value = end; // Asegurar precisión final
    }
  };
  
  window.requestAnimationFrame(step);
};

// Al montar el componente, animamos desde 0
onMounted(() => {
    animateValue(0, gold.value, 1500, displayGold);
    animateValue(0, silver.value, 1500, displaySilver);
    animateValue(0, copper.value, 1500, displayCopper);
});

// Si el saldo cambia en tiempo real
watch(copper, (newVal, oldVal) => animateValue(oldVal, newVal, 500, displayCopper));
watch(silver, (newVal, oldVal) => animateValue(oldVal, newVal, 500, displaySilver));
watch(gold, (newVal, oldVal) => animateValue(oldVal, newVal, 500, displayGold));

</script>

<template>
  <div class="status-board">
    <div class="coin-stat gold">
      <img src="/images/coin-gold.png" alt="Oro" class="coin-icon" />
      <span class="count">{{ displayGold }}</span>
    </div>

    <div class="coin-stat silver">
      <img src="/images/coin-silver.png" alt="Plata" class="coin-icon" />
      <span class="count">{{ displaySilver }}</span>
    </div>

    <div class="coin-stat copper">
      <img src="/images/coin-copper.png" alt="Cobre" class="coin-icon" />
      <span class="count">{{ displayCopper }}</span>
    </div>
  </div>
</template>

<style scoped>
.status-board {
  display: flex;
  justify-content: space-evenly; /* Distribución elegante */
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  padding: 12px 10px;
  border-radius: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 2px solid #e0e0e0;
  width: 100%;
}

.coin-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  flex-shrink: 0;
}

.coin-icon {
  width: 60px; /* Un poco más grandes para lucir el 3D */
  height: 60px;
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); /* Sombra más pronunciada */
  transition: transform 0.2s;
}

.coin-stat:hover .coin-icon {
  transform: scale(1.1) rotate(5deg); /* Efecto juguetón al tocar */
}

.count {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-weight: 800;
  font-size: 1.2rem;
  color: #444;
  
  /* CAMBIO: Separación positiva en lugar de negativa */
  margin-top: 4px; 
  
  background: white;
  padding: 2px 12px;
  border-radius: 12px;
  border: 2px solid #eee;
  z-index: 2;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  min-width: 40px; 
  text-align: center;
}

/* Colores específicos */
.gold .count { color: #d4af37; border-color: #d4af37; }
.silver .count { color: #a8a9ad; border-color: #a8a9ad; }
.copper .count { color: #b87333; border-color: #b87333; }
</style>