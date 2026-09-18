// Web Audio API Sound Effects for Slide Puzzle
class SoundController {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    playSlide() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;
        
        // Gentle tactile sliding friction sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.08);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.08);
    }

    playClick() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(260, now + 0.05);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    playShuffle() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        for (let i = 0; i < 6; i++) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + i * 0.05;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(200 + i * 45, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.04);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + 0.04);
        }
    }

    playUndo() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.1);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    playVictory() {
        if (!this.enabled) return;
        this.init();
        const now = this.ctx.currentTime;

        // Royal triumphant fanfare chord sequence
        const notes = [
            { freq: 293.66, delay: 0 },       // D4
            { freq: 369.99, delay: 0.12 },    // F#4
            { freq: 440.00, delay: 0.24 },    // A4
            { freq: 587.33, delay: 0.36 },    // D5
            { freq: 739.99, delay: 0.52 },    // F#5
            { freq: 880.00, delay: 0.70 }     // A5 long hold
        ];

        notes.forEach(({ freq, delay }) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + delay;
            const duration = (delay >= 0.70) ? 1.2 : 0.4;

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, t);

            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(t);
            osc.stop(t + duration);
        });
    }
}

window.soundCtrl = new SoundController();
