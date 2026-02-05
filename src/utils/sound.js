// Singleton para mantener el contexto de audio vivo
let audioCtx = null;

const getAudioContext = () => {
    if (!audioCtx) {
        // Soporte estándar y Safari
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
            audioCtx = new AudioContext();
        }
    }
    return audioCtx;
};

export const playOwlHoot = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // CRÍTICO: Si el contexto está suspendido (común en móviles), lo reanudamos
    if (ctx.state === 'suspended') {
        ctx.resume().catch(err => console.warn("No se pudo reanudar el audio:", err));
    }

    const t = ctx.currentTime;

    const createHoot = (startTime, duration, startFreq, endFreq, maxVol) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        
        // Frecuencia
        osc.frequency.setValueAtTime(startFreq, startTime); 
        osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

        // Volumen (Subido un poco respecto a la versión anterior)
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(maxVol, startTime + (duration * 0.1));
        gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(startTime);
        osc.stop(startTime + duration + 0.1);
    };

    // Secuencia "Huuu... Huuuuu" con volumen mejorado (0.3 en lugar de 0.15)
    createHoot(t, 0.4, 600, 450, 0.3);       
    createHoot(t + 0.5, 0.6, 550, 400, 0.25); 

  } catch (e) {
    console.error("Audio error:", e);
  }
};

export const playExitSound = () => {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle'; // Sonido tipo "Game Over" suave

        osc.frequency.setValueAtTime(300, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.4);

        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + 0.5);
    } catch (e) {
        console.error("Audio error exit:", e);
    }
};