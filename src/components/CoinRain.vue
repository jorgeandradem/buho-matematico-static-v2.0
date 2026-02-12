<script setup>
import { ref, onMounted } from 'vue';

const props = defineProps({
  // Puede ser 'gold', 'silver' o 'copper'. El componente decide qué imagen usar.
  type: { type: String, default: 'gold' },
  // Cantidad de monedas
  count: { type: Number, default: 30 }
});

const coins = ref([]);

onMounted(() => {
  const newCoins = [];
  for (let i = 0; i < props.count; i++) {
    newCoins.push({
      id: i,
      // Matemáticas para que la caída se vea natural y aleatoria
      left: Math.random() * 100 + '%',
      duration: Math.random() * 2 + 1 + 's',
      delay: Math.random() * 0.5 + 's',
      rotation: Math.random() * 360 + 'deg',
      size: Math.random() * 20 + 30 + 'px' // Tamaño variable
    });
  }
  coins.value = newCoins;
});
</script>

<template>
  <div class="coin-rain-container">
    <img 
      v-for="coin in coins" 
      :key="coin.id"
      :src="`/images/coin-${props.type}.png`" 
      class="falling-coin"
      :style="{ 
        left: coin.left, 
        width: coin.size, 
        height: coin.size,
        animationDuration: coin.duration, 
        animationDelay: coin.delay,
        '--rotation': coin.rotation
      }"
    />
  </div>
</template>

<style scoped>
.coin-rain-container {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none; 
  z-index: 9999;
  overflow: hidden;
}

.falling-coin {
  position: absolute;
  top: -100px;
  object-fit: contain;
  animation-name: fall;
  animation-timing-function: ease-in;
  animation-fill-mode: forwards;
}

@keyframes fall {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  85% { opacity: 1; }
  100% { transform: translateY(110vh) rotate(var(--rotation)); opacity: 0; }
}
</style>