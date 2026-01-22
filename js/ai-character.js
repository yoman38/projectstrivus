class AICharacter {
    constructor() {
        this.isVisible = true;
        this.mood = 'neutral';
        this.reactions = [];
        this.currentMessage = '';
        this.userContext = {};
        this.createOverlay();
        this.setupGlobalListeners();
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'ai-character-overlay';
        overlay.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 900;
            pointer-events: none;
            @media (max-width: 768px) {
                bottom: 90px;
                right: 10px;
            }
        `;

        overlay.innerHTML = `
            <div id="ai-character-container" style="
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
            ">
                <div id="ai-message-bubble" class="chat-bubble ai" style="
                    display: none;
                    max-width: 250px;
                    margin-bottom: 8px;
                    animation: slideIn 0.3s ease;
                    pointer-events: auto;
                    cursor: pointer;
                "></div>

                <div id="ai-character-wrapper" style="
                    font-size: 80px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    pointer-events: auto;
                    filter: drop-shadow(0 0 20px rgba(0, 217, 255, 0.6));
                    animation: gentle-float 4s ease-in-out infinite;
                    user-select: none;
                ">
                    <div id="ai-character">🦄</div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const wrapper = document.getElementById('ai-character-wrapper');
        if (wrapper) {
            wrapper.addEventListener('click', () => this.toggleMessage());
            wrapper.addEventListener('mouseenter', () => this.react('happy'));
        }
    }

    setupGlobalListeners() {
        window.addEventListener('aiEvent', (e) => {
            this.handleAIEvent(e.detail);
        });
    }

    react(emotion) {
        const character = document.getElementById('ai-character');
        if (!character) return;

        const emotions = {
            happy: { emoji: '🦄', animation: 'bounce' },
            thinking: { emoji: '🤔🦄', animation: 'wobble' },
            excited: { emoji: '🦄✨', animation: 'bounce-fast' },
            sad: { emoji: '😢🦄', animation: 'shake' },
            confused: { emoji: '🦄❓', animation: 'wiggle' }
        };

        const emotion_data = emotions[emotion] || emotions.happy;
        character.textContent = emotion_data.emoji;

        character.style.animation = `${emotion_data.animation} 0.6s ease-in-out`;
        setTimeout(() => {
            character.style.animation = 'gentle-float 4s ease-in-out infinite';
        }, 600);

        this.mood = emotion;
    }

    showMessage(text, delay = 3000, emotion = 'neutral') {
        const bubble = document.getElementById('ai-message-bubble');
        if (!bubble) return;

        this.currentMessage = text;
        bubble.textContent = text;
        bubble.style.display = 'block';

        if (emotion !== 'neutral') {
            this.react(emotion);
        }

        if (delay > 0) {
            setTimeout(() => {
                bubble.style.display = 'none';
            }, delay);
        }
    }

    hideMessage() {
        const bubble = document.getElementById('ai-message-bubble');
        if (bubble) bubble.style.display = 'none';
    }

    toggleMessage() {
        const bubble = document.getElementById('ai-message-bubble');
        if (bubble && bubble.style.display === 'none') {
            bubble.style.display = 'block';
        } else if (bubble) {
            bubble.style.display = 'none';
        }
    }

    handleAIEvent(detail) {
        const { event, data } = detail;

        switch(event) {
            case 'workout-saved':
                this.react('excited');
                this.showMessage('Awesome! Your workout is saved! Keep pushing! 💪', 5000, 'excited');
                break;
            case 'checkin-logged':
                this.react('happy');
                this.showMessage('Great check-in! This data helps me understand you better!', 4000, 'happy');
                break;
            case 'pr-achieved':
                this.react('excited');
                this.showMessage(`New PR! ${data?.exercise}! Incredible! 🚀`, 5000, 'excited');
                break;
            case 'low-readiness':
                this.react('concerned');
                this.showMessage('Your readiness is low. Consider lighter training today.', 4000, 'thinking');
                break;
            case 'high-readiness':
                this.react('excited');
                this.showMessage('You\'re primed! Time for an intense session! 🔥', 4000, 'excited');
                break;
            case 'exercise-added':
                this.react('happy');
                this.showMessage(`${data?.name}? Great choice! 💪`, 3000, 'happy');
                break;
            case 'tab-switched':
                this.provideContextualTip(data?.tab);
                break;
        }
    }

    provideContextualTip(tab) {
        const tips = {
            'dashboard': 'Check your metrics and plan your week!',
            'record': 'Log your workout to track progress!',
            'history': 'See how far you\'ve come! 📈',
            'condition': 'Help me understand your recovery status.',
            'ai-coach': 'Ask me anything about your training!'
        };

        const tip = tips[tab] || 'Let\'s get to work!';
        this.react('thinking');
        this.showMessage(tip, 3000, 'thinking');
    }

    setUserContext(context) {
        this.userContext = context;
    }
}

const addAnimationStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes gentle-float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
        }

        @keyframes bounce {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-12px) scale(1.1); }
        }

        @keyframes bounce-fast {
            0%, 100% { transform: translateY(0) scale(1); }
            25% { transform: translateY(-15px) scale(1.15); }
            50% { transform: translateY(0) scale(1); }
            75% { transform: translateY(-10px) scale(1.1); }
        }

        @keyframes wobble {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(-5deg); }
            50% { transform: rotate(5deg); }
            75% { transform: rotate(-3deg); }
        }

        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }

        @keyframes wiggle {
            0%, 100% { transform: rotate(0deg); }
            25% { transform: rotate(3deg); }
            75% { transform: rotate(-3deg); }
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        #ai-character-wrapper:hover {
            filter: drop-shadow(0 0 30px rgba(0, 217, 255, 0.8));
            transform: scale(1.1);
        }

        @media (max-width: 768px) {
            #ai-character-wrapper {
                font-size: 60px;
            }
        }
    `;
    document.head.appendChild(style);
};

document.addEventListener('DOMContentLoaded', () => {
    addAnimationStyles();
    window.aiCharacter = new AICharacter();
});
