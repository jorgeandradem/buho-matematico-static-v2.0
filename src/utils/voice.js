// src/utils/voice.js

export const speak = (text) => {
  // 1. Verificamos soporte
  if (!window.speechSynthesis) return;

  // 2. IMPORTANTE: Cancelamos cualquier audio anterior para evitar solapamiento brusco
  window.speechSynthesis.cancel();

  // 3. Configuración de la voz
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES'; 
  utterance.rate = 0.9;     
  utterance.pitch = 1.1;    
  utterance.volume = 1;

  // 4. Hablar
  window.speechSynthesis.speak(utterance);
};