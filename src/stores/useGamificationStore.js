// src/stores/useGamificationStore.js
import { defineStore } from 'pinia';

// Clave para guardar en el almacenamiento local del navegador
const STORAGE_KEY = 'buho-matematico-tesoro-v1';

export const useGamificationStore = defineStore('gamification', {
  // 1. ESTADO (State): La "Caja Fuerte". Aquí están los saldos reales.
  state: () => ({
    // Saldo total acumulado (Persistente)
    copper: 0,
    silver: 0,
    gold: 0,

    // Ganancias de la sesión actual (Temporal, para el resumen de salida)
    sessionCopperEarned: 0,
    sessionSilverEarned: 0,
    sessionGoldEarned: 0,

    // Estado del modal de resumen
    showSessionSummary: false,
  }),

  // 2. GETTERS: Calculadoras (opcional por ahora, útil para el futuro)
  getters: {
    // Calcula la riqueza total en valor de cobre (útil para rankings futuros)
    totalWealthInCopper: (state) => {
      return state.copper + (state.silver * 100) + (state.gold * 10000);
    }
  },

  // 3. ACCIONES (Actions): Los "Cajeros". Las únicas formas de modificar el saldo.
  actions: {
    // Acción principal: El profesor Búho deposita monedas
    addCoins(type, amount) {
      // Asegurar que el monto sea un número positivo entero
      const safeAmount = Math.abs(parseInt(amount)) || 0;
      if (safeAmount === 0) return;

      // 1. Agregar al saldo total y al saldo de sesión
      switch (type) {
        case 'copper':
          this.copper += safeAmount;
          this.sessionCopperEarned += safeAmount;
          break;
        case 'silver':
          this.silver += safeAmount;
          this.sessionSilverEarned += safeAmount;
          break;
        case 'gold':
          this.gold += safeAmount;
          this.sessionGoldEarned += safeAmount;
          break;
        default:
          console.warn(`Tipo de moneda desconocido: ${type}`);
          return; // Salir si el tipo no es válido
      }

      // 2. Procesar las conversiones automáticas (la magia de la economía)
      this.processConversions();

      // 3. Guardar inmediatamente en el navegador
      this.saveToStorage();
      
      console.log(`💰 Depósito: +${safeAmount} ${type}. Nuevo saldo: C:${this.copper} | P:${this.silver} | O:${this.gold}`);
    },

    // Lógica de Conversión Automática (100 Cobre -> 1 Plata, etc.)
    processConversions() {
      let converted = false;

      // Convertir Cobre a Plata
      // Usamos 'while' por si ganaron 250 cobres de golpe (convertiría 2 platas y sobran 50)
      while (this.copper >= 100) {
        this.copper -= 100;
        this.silver += 1;
        converted = true;
      }

      // Convertir Plata a Oro
      while (this.silver >= 100) {
        this.silver -= 100;
        this.gold += 1;
        converted = true;
      }
      
      if (converted) {
         console.log('✨ ¡Conversión automática realizada!');
      }
    },

    // --- PERSISTENCIA (Guardar y Cargar) ---

    // Guardar el estado actual en localStorage
    saveToStorage() {
      try {
        const dataToSave = {
          copper: this.copper,
          silver: this.silver,
          gold: this.gold,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error('Error al guardar el tesoro del Búho:', e);
      }
    },

    // Cargar el estado desde localStorage (se llama al iniciar la app)
    loadFromStorage() {
      try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          // Restauramos los valores, asegurando que sean números
          this.copper = parseInt(parsedData.copper) || 0;
          this.silver = parseInt(parsedData.silver) || 0;
          this.gold = parseInt(parsedData.gold) || 0;
          console.log('📂 Tesoro del Búho cargado desde la memoria.');
        } else {
            console.log('📂 No se encontró tesoro previo. Iniciando cuenta nueva.');
        }
      } catch (e) {
        console.error('Error al cargar el tesoro, iniciando desde cero:', e);
        // Si hay error (data corrupta), no hacemos nada y se usarán los valores por defecto (0)
      }
    },

    // --- GESTIÓN DE SESIÓN ---
    
    // Se llama al abrir el modal de resumen
    triggerSessionSummary() {
        // Solo mostrar si realmente ganaron algo
        if (this.sessionCopperEarned > 0 || this.sessionSilverEarned > 0 || this.sessionGoldEarned > 0) {
            this.showSessionSummary = true;
        }
    },

    // Se llama al cerrar el modal de resumen para reiniciar el contador de sesión
    closeSessionSummary() {
      this.showSessionSummary = false;
      // Reiniciamos los contadores de la sesión
      this.sessionCopperEarned = 0;
      this.sessionSilverEarned = 0;
      this.sessionGoldEarned = 0;
    },
    
    // Utilidad para resetear todo (útil para desarrollo/debug)
    DEBUG_resetAllWallet() {
        this.copper = 0;
        this.silver = 0;
        this.gold = 0;
        this.saveToStorage();
        console.log('⚠️ Billetera reseteada a cero.');
    }
  },
});