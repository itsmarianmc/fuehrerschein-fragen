const SITEMAP = "sitemap.xml";
const CAPS_FILE = "caps.json";
const QUESTIONS_FILE = "questions.json";
const lastUpdated = "2026-01-03 20:29:31 MEZ";
const checkIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 63 52" width="45"><rect x="1" y="4" fill="#00AF9D" width="47" height="47" rx="4"/><polygon fill="#FFFFFF"points="12.721,28.393 18.331,22.315 27.447,30.731 54.51,1.413 61.587,7.947 28.915,43.343"/></svg>`;
const questionIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

let allItems = [];
let capitalizeWords = [];
let normalizedCapitalizeWords = [];
let searchTimeout;
let questionsData = {};
let currentPopupQuestion = null;
let showOnlyQuiz = false;

document.getElementById('lastUpdated').textContent = lastUpdated;

function normalizeText(text) {
    return text
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/km\/h/g, 'kmh')
        .replace(/km h/g, 'kmh')
        .replace(/\//g, '')
        .trim();
}

function formatTitleForDisplay(title) {
    if (!title || title.length === 0) return 'Ohne Titel';
    
    let formatted = title;
    
    if (capitalizeWords.length > 0) {
        capitalizeWords.forEach((word, index) => {
            const normalizedWord = normalizedCapitalizeWords[index];
            if (normalizedWord && formatted.toLowerCase().includes(normalizedWord)) {
                const regex = new RegExp(`\\b${normalizedWord}\\b`, 'gi');
                formatted = formatted.replace(regex, word);
            }
        });
    }
    
    if (formatted.includes('ue') || formatted.includes('oe') || formatted.includes('ae')) {
        formatted = formatted
            .replace(/([bcdfghjklmnpqrstvwxyz])ue([bcdfghjklmnpqrstvwxyz])/gi, '$1ü$2')
            .replace(/([bcdfghjklmnpqrstvwxyz])oe([bcdfghjklmnpqrstvwxyz])/gi, '$1ö$2')
            .replace(/([bcdfghjklmnpqrstvwxyz])ae([bcdfghjklmnpqrstvwxyz])/gi, '$1ä$2')
            .replace(/([bcdfghjklmnpqrstvwxyz])ue\b/gi, '$1ü')
            .replace(/([bcdfghjklmnpqrstvwxyz])oe\b/gi, '$1ö')
            .replace(/([bcdfghjklmnpqrstvwxyz])ae\b/gi, '$1ä')
            .replace(/\bue([bcdfghjklmnpqrstvwxyz])/gi, 'ü$1')
            .replace(/\boe([bcdfghjklmnpqrstvwxyz])/gi, 'ö$1')
            .replace(/\bae([bcdfghjklmnpqrstvwxyz])/gi, 'ä$1')
            .replace(/km h/gi, 'km/h');
    }

    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function extractImageUrl(imgString) {
    const match = imgString.match(/img\[(.*?)\]/);
    return match ? match[1] : imgString;
}

function createQuestionPopup(questionData) {
    currentPopupQuestion = questionData;

    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('no-scroll');

    function renderExtraInfo() {
        let html = '';
        
        if (questionData['question-assets'] && questionData['question-assets'].unused) {
            html += `<div class="unused-warning">${questionData['question-assets'].unused}</div>`;
        }
        
        if (questionData['question-assets'] && questionData['question-assets'].more_variants) {
            const moreVariants = questionData['question-assets'].more_variants;
            let text = moreVariants.text;
            
            if (moreVariants.link) {
                text = text.replace('%link_start%', `<a href="${moreVariants.link}" target="_blank" class="more-variants-link">`);
                text = text.replace('%link_end%', '</a>');
            }
            
            html += `<div class="more-variants">${text}</div>`;
        }
        
        return html;
    }

    function getAnswerHeaderAndEntries(answers) {
        let answerHeader = '';
        const filteredAnswers = {};
        
        Object.entries(answers).forEach(([key, value]) => {
            if (key === 'answer_header') {
                answerHeader = value;
            } else {
                filteredAnswers[key] = value;
            }
        });
        
        return { answerHeader, filteredAnswers };
    }

    const extraInfoHTML = renderExtraInfo();

    if (questionData['question-assets'] && questionData['question-assets'].video) {
        const { answerHeader, filteredAnswers } = getAnswerHeaderAndEntries(questionData.answers);
        const popup = document.createElement('div');
        popup.className = 'question-popup-overlay no-scroll';
        popup.innerHTML = `
            <div class="question-popup no-scroll">
                <div class="popup-header no-scroll">
                    <h3>Prüfungsfrage*</h3>
                    <button class="close-popup">&times;</button>
                </div>
                <div class="popup-content">
                    <div class="video-question-container">
                        <div class="video-container">
                            <video class="question-video" muted playsinline>
                                <source src="${questionData['question-assets'].video}" type="video/mp4">
                                Dein Browser unterstützt das Video-Tag nicht.
                            </video>
                            <div class="video-controls">
                                <div class="video-playpause">
                                    <button class="btn video-playpause-btn">
                                        <svg height="25" viewBox="0 -960 960 960" width="25" fill="#fff">
                                            <path d="M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z"/>
                                        </svg>
                                    </button>
                                </div>
                                <div class="video-restart hidden">
                                    <button class="btn video-restart-btn">
                                        <svg height="25" viewBox="0 -960 960 960" width="25" fill="#fff">
                                            <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="video-overlay">
                                <button class="btn show-question-btn" disabled>
                                    Frage anzeigen
                                </button>
                            </div>
                        </div>
                        <div class="question-below-video hidden">
                            <div class="question-text">${questionData.question}</div>
                            ${extraInfoHTML ? `<div class="question-info-container">${extraInfoHTML}</div>` : ''}
                            ${answerHeader ? `<div class="answer-header">${answerHeader}</div>` : ''}
                            <div class="answers-container">
                                ${Object.entries(filteredAnswers).map(([answerKey, answerData], index) => {
                                    const isImage = answerKey.startsWith('img[');
                                    let content = '';
                                    
                                    if (isImage) {
                                        content = `<img src="${extractImageUrl(answerKey)}" alt="Antwort ${index + 1}" class="answer-image">`;
                                    } else {
                                        content = `<div class="answer-text">${answerKey}</div>`;
                                    }
                                    
                                    const isCorrect = !answerData.wrong;
                                    return `
                                        <div class="answer-option" data-key="${answerKey}" data-correct="${isCorrect}">
                                            <label class="checkbox-label">
                                                <input type="checkbox" class="answer-checkbox" data-key="${answerKey}">
                                                <span class="checkmark"></span>
                                                <div class="answer-content">
                                                    ${content}
                                                </div>
                                            </label>
                                            <div class="answer-feedback hidden">
                                                <div class="correct-answer-checkbox">
                                                    <input type="checkbox" disabled ${isCorrect ? 'checked' : ''}>
                                                    <span class="${isCorrect ? '' : 'hidden'}">Korrekte Antwort</span>
                                                    <span class="${isCorrect ? 'hidden' : ''}">Falsche Antwort</span>
                                                </div>
                                                <div class="answer-explanation">${answerData.explanation}</div>
                                                ${answerData.assets && answerData.assets.img ? 
                                                    `<img src="${answerData.assets.img}" alt="${answerData.assets['img-alt'] || ''}" class="answer-asset-image" />` 
                                                    : ''}
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                            <div class="popup-buttons">
                                <button class="btn show-answers">Alle Antworten anzeigen</button>
                                <button class="btn check-answers">Antworten überprüfen</button>
                                <button class="btn reset-answers">Auswahl zurücksetzen</button>
                            </div>
                            <div class="result-container hidden">
                                <div class="result-header"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        const video = popup.querySelector('.question-video');
        const showQuestionBtn = popup.querySelector('.show-question-btn');
        const questionBelowVideo = popup.querySelector('.question-below-video');
        const videoOverlay = popup.querySelector('.video-overlay');
        
        showQuestionBtn.addEventListener('click', () => {
            document.querySelector('.video-controls').classList.add('hidden');

            video.removeAttribute('controls');
            video.currentTime = 15;
            video.pause();
            
            videoOverlay.style.display = 'none';
            
            questionBelowVideo.classList.remove('hidden');
            
            setTimeout(() => {
                questionBelowVideo.style.opacity = '1';
                questionBelowVideo.style.transform = 'translateY(0)';
            }, 10);
        });

        const playPauseBtn = popup.querySelector('.video-playpause-btn');
        const restartBtn = popup.querySelector('.video-restart-btn');

        playPauseBtn.addEventListener('click', () => {
            video.play();
            setTimeout(() => {
                showQuestionBtn.disabled = false;
            }, 2000);
        });

        video.addEventListener('play', () => {
            playPauseBtn.parentElement.classList.add('hidden');
            restartBtn.parentElement.classList.add('hidden');
        });

        video.addEventListener('pause', () => {
            playPauseBtn.parentElement.classList.add('hidden');
            restartBtn.parentElement.classList.remove('hidden');
        });

        restartBtn.addEventListener('click', () => {
            video.currentTime = 0;
            video.play();
        });

        video.addEventListener('timeupdate', () => {
            if (video.currentTime >= 15) {
            restartBtn.style.display = 'block';
            }
        });
        
        popup.querySelector('.show-answers').addEventListener('click', showAllAnswers);
        popup.querySelector('.check-answers').addEventListener('click', checkAnswers);
        popup.querySelector('.reset-answers').addEventListener('click', resetAnswers);
        
        setupPopupCloseEvents(popup);
        
    } else if (questionData['question-assets'] && questionData['question-assets'].img && !questionData['question-assets'].video) {
        const { answerHeader, filteredAnswers } = getAnswerHeaderAndEntries(questionData.answers);
        const popup = document.createElement('div');
        popup.className = 'question-popup-overlay no-scroll';
        popup.innerHTML = `
            <div class="question-popup no-scroll">
                <div class="popup-header no-scroll">
                    <h3>Prüfungsfrage*</h3>
                    <button class="close-popup">&times;</button>
                </div>
                <div class="popup-content">
                    <div class="question-text">${questionData.question}</div>
                    ${extraInfoHTML ? `<div class="question-info-container">${extraInfoHTML}</div>` : ''}
                    ${answerHeader ? `<div class="answer-header">${answerHeader}</div>` : ''}
                    <div class="question-image-container">
                        <img src="${questionData['question-assets'].img}" alt="Fragenbild" class="question-image">
                    </div>
                    <div class="answers-container">
                        ${Object.entries(filteredAnswers).map(([answerKey, answerData], index) => {
                            const isImage = answerKey.startsWith('img[');
                            let content = '';
                            
                            if (isImage) {
                                content = `<img src="${extractImageUrl(answerKey)}" alt="Antwort ${index + 1}" class="answer-image">`;
                            } else {
                                content = `<div class="answer-text">${answerKey}</div>`;
                            }
                            
                            const isCorrect = !answerData.wrong;
                            return `
                                <div class="answer-option" data-key="${answerKey}" data-correct="${isCorrect}">
                                    <label class="checkbox-label">
                                        <input type="checkbox" class="answer-checkbox" data-key="${answerKey}">
                                        <span class="checkmark"></span>
                                        <div class="answer-content">
                                            ${content}
                                        </div>
                                    </label>
                                    <div class="answer-feedback hidden">
                                        <div class="correct-answer-checkbox">
                                            <input type="checkbox" disabled ${isCorrect ? 'checked' : ''}>
                                            <span class="${isCorrect ? '' : 'hidden'}">Korrekte Antwort</span>
                                            <span class="${isCorrect ? 'hidden' : ''}">Falsche Antwort</span>
                                        </div>
                                        <div class="answer-explanation">${answerData.explanation}</div>
                                        ${answerData.assets && answerData.assets.img ? 
                                            `<img src="${answerData.assets.img}" alt="${answerData.assets['img-alt'] || ''}" class="answer-asset-image" />` 
                                            : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="popup-buttons">
                        <button class="btn show-answers">Alle Antworten anzeigen</button>
                        <button class="btn check-answers">Antworten überprüfen</button>
                        <button class="btn reset-answers">Auswahl zurücksetzen</button>
                    </div>
                    <div class="result-container hidden">
                        <div class="result-header"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        popup.querySelector('.show-answers').addEventListener('click', showAllAnswers);
        popup.querySelector('.check-answers').addEventListener('click', checkAnswers);
        popup.querySelector('.reset-answers').addEventListener('click', resetAnswers);
        
        setupPopupCloseEvents(popup);
        
    } else if (questionData.answer) {
        const popup = document.createElement('div');
        popup.className = 'question-popup-overlay no-scroll';
        popup.innerHTML = `
            <div class="question-popup no-scroll">
                <div class="popup-header no-scroll">
                    <h3>Prüfungsfrage*</h3>
                    <button class="close-popup">&times;</button>
                </div>
                <div class="popup-content">
                    <div class="question-text">${questionData.question}</div>
                    ${extraInfoHTML ? `<div class="question-info-container">${extraInfoHTML}</div>` : ''}
                    <div class="input-question-container">
                        <div class="input-question-prompt">${questionData.answer.question.replace('{empty_place_input}', '<input type="text" class="answer-input" placeholder="">')}</div>
                        <div class="popup-buttons">
                            <button class="btn check-answer-input">Antwort überprüfen</button>
                            <button class="btn reset-answer-input">Eingabe zurücksetzen</button>
                        </div>
                        <div class="result-container hidden">
                            <div class="result-header"></div>
                        </div>
                        <div class="answer-explanation-container hidden">
                            <div class="explanation-title">Erklärung:</div>
                            <div class="explanation-text">${questionData.answer.explanation}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        popup.querySelector('.check-answer-input').addEventListener('click', () => {
            checkInputAnswer(popup, questionData);
        });
        
        popup.querySelector('.reset-answer-input').addEventListener('click', () => {
            resetInputAnswer(popup);
        });
        
        popup.querySelector('.answer-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                checkInputAnswer(popup, questionData);
            }
        });
        
        setupPopupCloseEvents(popup);
        
    } else {
        const { answerHeader, filteredAnswers } = getAnswerHeaderAndEntries(questionData.answers);
        const popup = document.createElement('div');
        popup.className = 'question-popup-overlay no-scroll';
        popup.innerHTML = `
            <div class="question-popup no-scroll">
                <div class="popup-header no-scroll">
                    <h3>Prüfungsfrage*</h3>
                    <button class="close-popup">&times;</button>
                </div>
                <div class="popup-content">
                    <div class="question-text">${questionData.question}</div>
                    ${extraInfoHTML ? `<div class="question-info-container">${extraInfoHTML}</div>` : ''}
                    ${answerHeader ? `<div class="answer-header">${answerHeader}</div>` : ''}
                    <div class="answers-container">
                        ${Object.entries(filteredAnswers).map(([answerKey, answerData], index) => {
                            const isImage = answerKey.startsWith('img[');
                            const content = isImage 
                                ? `<img src="${extractImageUrl(answerKey)}" alt="Antwort ${index + 1}" class="answer-image">`
                                : `<div class="answer-text">${answerKey}</div>`;
                            const isCorrect = !answerData.wrong;
                            return `
                                <div class="answer-option" data-key="${answerKey}" data-correct="${isCorrect}">
                                    <label class="checkbox-label">
                                        <input type="checkbox" class="answer-checkbox" data-key="${answerKey}">
                                        <span class="checkmark"></span>
                                        <div class="answer-content">
                                            ${content}
                                        </div>
                                    </label>
                                    <div class="answer-feedback hidden">
                                        <div class="correct-answer-checkbox">
                                            <input type="checkbox" disabled ${isCorrect ? 'checked' : ''}>
                                            <span class="${isCorrect ? '' : 'hidden'}">Korrekte Antwort</span>
                                            <span class="${isCorrect ? 'hidden' : ''}">Falsche Antwort</span>
                                        </div>
                                        <div class="answer-explanation">${answerData.explanation}</div>
                                        ${answerData.assets && answerData.assets.img ? 
                                            `<img src="${answerData.assets.img}" alt="${answerData.assets['img-alt'] || ''}" class="answer-asset-image" />` 
                                            : ''}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="popup-buttons">
                        <button class="btn show-answers">Alle Antworten anzeigen</button>
                        <button class="btn check-answers">Antworten überprüfen</button>
                        <button class="btn reset-answers">Auswahl zurücksetzen</button>
                    </div>
                    <div class="result-container hidden">
                        <div class="result-header"></div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(popup);
        
        popup.querySelector('.show-answers').addEventListener('click', showAllAnswers);
        popup.querySelector('.check-answers').addEventListener('click', checkAnswers);
        popup.querySelector('.reset-answers').addEventListener('click', resetAnswers);
        
        setupPopupCloseEvents(popup);
    }
}

function checkInputAnswer(popup, questionData) {
    const input = popup.querySelector('.answer-input');
    const userAnswer = input.value.trim();
    const correctAnswer = questionData.answer.answer;
    const resultContainer = popup.querySelector('.result-container');
    const resultHeader = popup.querySelector('.result-header');
    const explanationContainer = popup.querySelector('.answer-explanation-container');

    document.querySelector('.check-answer-input').classList.add('hidden');
    
    if (!userAnswer) {
        resultHeader.innerHTML = '<h4 style="color: #ff6b6b;">Bitte gib eine Antwort ein!</h4>';
        resultContainer.classList.remove('hidden');
        return;
    }
    
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase();
    
    if (isCorrect) {
        resultHeader.innerHTML = '<h4 style="color: #00AF9D;">✓ Deine Antwort ist korrekt!</h4>';
        input.classList.add('correct-input');
        input.classList.remove('wrong-input');
    } else {
        resultHeader.innerHTML = `<h4 style="color: #ff6b6b;">✗ Deine Antwort ist nicht korrekt. Richtige Antwort: ${correctAnswer}</h4>`;
        input.classList.add('wrong-input');
        input.classList.remove('correct-input');
    }
    
    resultContainer.classList.remove('hidden');
    explanationContainer.classList.remove('hidden');
    input.disabled = true;
}

function resetInputAnswer(popup) {
    document.querySelector('.check-answer-input').classList.remove('hidden');

    const input = popup.querySelector('.answer-input');
    const resultContainer = popup.querySelector('.result-container');
    const explanationContainer = popup.querySelector('.answer-explanation-container');
    
    input.value = '';
    input.disabled = false;
    input.classList.remove('correct-input', 'wrong-input');
    resultContainer.classList.add('hidden');
    explanationContainer.classList.add('hidden');
}

function setupPopupCloseEvents(popup) {
    popup.querySelector('.close-popup').addEventListener('click', () => {
        closePopup(popup);
    });
    
    popup.addEventListener('click', (e) => {
        if (e.target === popup) {
            closePopup(popup);
        }
    });
    
    document.addEventListener('keydown', function closeOnEscape(e) {
        if (e.key === 'Escape') {
            if (document.body.contains(popup)) {
                closePopup(popup);
            }
            document.removeEventListener('keydown', closeOnEscape);
        }
    });
}

function closePopup(popup) {
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('no-scroll');
    if (popup && popup.parentNode) {
        document.body.removeChild(popup);
    }
    currentPopupQuestion = null;
}

function showAllAnswers() {
    if (!currentPopupQuestion) return;

    const answerOptions = document.querySelectorAll('.answer-option');
    const resultContainer = document.querySelector('.result-container');
    const resultHeader = document.querySelector('.result-header');
    const checkboxes = document.querySelectorAll('.answer-checkbox');

    document.querySelector('.show-answers').classList.add('hidden');
    document.querySelector('.check-answers').classList.add('hidden');

    checkboxes.forEach(cb => cb.disabled = true);
    
    answerOptions.forEach(option => {
        const feedback = option.querySelector('.answer-feedback');
        feedback.classList.remove('hidden');
        
        const isCorrect = option.getAttribute('data-correct') === 'true';
        option.classList.add(isCorrect ? 'correct' : 'wrong');
    });
    
    resultHeader.innerHTML = '<h4 style="color: #3182ce;">✓ Alle Antworten werden angezeigt</h4>';
    resultContainer.classList.add('hidden');
}

function checkAnswers() {
    if (!currentPopupQuestion) return;

    document.querySelector('.check-answers').classList.add('hidden');
    
    const checkboxes = document.querySelectorAll('.answer-checkbox:checked');
    const answerOptions = document.querySelectorAll('.answer-option');
    const resultContainer = document.querySelector('.result-container');
    const resultHeader = document.querySelector('.result-header');
    
    if (checkboxes.length === 0) {
        document.querySelector('.check-answers').classList.remove('hidden');

        resultHeader.innerHTML = '<h4 style="color: #ff6b6b;">Bitte wähle mindestens eine Antwort aus!</h4>';
        resultContainer.classList.remove('hidden');
        return;
    }
    
    let allCorrect = true;
    const selectedKeys = Array.from(checkboxes).map(cb => cb.getAttribute('data-key'));
    
    document.querySelectorAll('.answer-checkbox').forEach(cb => cb.disabled = true);
    
    answerOptions.forEach(option => {
        const feedback = option.querySelector('.answer-feedback');
        feedback.classList.add('hidden');
        option.classList.remove('correct', 'wrong');
    });
    
    answerOptions.forEach(option => {
        const answerKey = option.getAttribute('data-key');
        const isSelected = selectedKeys.includes(answerKey);
        const isCorrect = option.getAttribute('data-correct') === 'true';
        const feedback = option.querySelector('.answer-feedback');
        
        if (isSelected) {
            feedback.classList.remove('hidden');
            
            if (isCorrect) {
                option.classList.add('correct');
            } else {
                option.classList.add('wrong');
                allCorrect = false;
            }
        } else if (isCorrect) {
            allCorrect = false;
        }
    });
    
    const allCorrectKeys = Array.from(answerOptions)
        .filter(opt => opt.getAttribute('data-correct') === 'true')
        .map(opt => opt.getAttribute('data-key'));
    
    const allCorrectSelected = allCorrectKeys.every(key => selectedKeys.includes(key));
    const noWrongSelected = selectedKeys.every(key => 
        allCorrectKeys.includes(key)
    );
    
    const isFullyCorrect = allCorrectSelected && noWrongSelected;
    
    resultHeader.innerHTML = isFullyCorrect 
        ? '<h4 style="color: #00AF9D;">✓ Deine Antwort ist korrekt!</h4>'
        : '<h4 style="color: #ff6b6b;">✗ Deine Antwort ist nicht korrekt!</h4>';
    resultContainer.classList.remove('hidden');
}

function resetAnswers() {
    document.querySelector('.show-answers').classList.remove('hidden');
    document.querySelector('.check-answers').classList.remove('hidden');

    const answerOptions = document.querySelectorAll('.answer-option');
    const checkboxes = document.querySelectorAll('.answer-checkbox');
    const resultContainer = document.querySelector('.result-container');
    
    answerOptions.forEach(option => {
        option.classList.remove('correct', 'wrong');
        const feedback = option.querySelector('.answer-feedback');
        feedback.classList.add('hidden');
    });
    
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });
    
    if (resultContainer) {
        resultContainer.classList.add('hidden');
    }
}

Promise.all([
    fetch(CAPS_FILE).then(r => r.json()),
    fetch(SITEMAP).then(r => r.text()),
    fetch(QUESTIONS_FILE).then(r => r.json())
])
.then(([caps, xmlText, questions]) => {
    capitalizeWords = caps;
    normalizedCapitalizeWords = caps.map(word => normalizeText(word));
    questionsData = questions;
    
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const urls = Array.from(xml.querySelectorAll("url loc"));
    
    allItems = urls.map(loc => {
        const fullUrl = loc.textContent.trim();
        const slug = fullUrl.split("/").pop();
        const numberUrl = slug.match(/\d-\d-\d\d-\d\d\d(-[a-z])?/)?.[0] || "";
        const numberReal = numberUrl ?
            numberUrl
                .replace(/-(\d\d\d)/, "-$1")
                .replace(/-/g, ".")
                .replace(/\.(\d\d\d)/, "-$1") 
                .replace(/\.([a-z])$/, "-$1")
            : "";
        const title = slug
            .replace(numberUrl, "")
            .replace(/-$/, "")
            .replace(/-/g, " ")
            .trim();
        
        return {
            fullUrl,
            title,
            numberUrl,
            numberReal,
            titleNormalized: normalizeText(title),
            numberNormalized: normalizeText(numberReal),
            hasQuestion: questions.hasOwnProperty(fullUrl)
        };
    });
    
    render(allItems);
        
    document.getElementById('quiz-filter-btn').addEventListener('click', function() {
        showOnlyQuiz = !showOnlyQuiz;
        this.classList.toggle('active', showOnlyQuiz);
        
        const q = normalizeText(document.getElementById("search").value);
        
        if (q === "") {
            const filtered = showOnlyQuiz ? allItems.filter(item => item.hasQuestion) : allItems;
            render(filtered);
        } else {
            const filtered = allItems.filter(i =>
                i.titleNormalized.includes(q) ||
                i.numberNormalized.includes(q) ||
                i.numberUrl.includes(q)
            );
            const finalFiltered = showOnlyQuiz ? filtered.filter(item => item.hasQuestion) : filtered;
            render(finalFiltered);
        }
    });
})
.catch(err => {
    console.error("Fehler beim Laden:", err);
    document.getElementById("list").innerHTML = `<div class="no-results"><div class="no-results-icon">⚠️</div><div>Fehler beim Laden der Daten</div></div>`;
});

function render(list) {
    const listEl = document.getElementById("list");
    const countEl = document.getElementById("count");

    if (list.length === 0) {
        if (showOnlyQuiz) {
            listEl.innerHTML = `<div class="no-results">
                <div class="no-results-icon">❓</div>
                <div>Keine Quiz-Fragen gefunden</div>
                <div><small>Es wurden keine interaktiven Fragen für diese Suche gefunden. Versuche einen anderen Suchbegriff oder deaktiviere den Quiz-Filter.</small></div>
            </div>`;
        } else {
            listEl.innerHTML = `<div class="no-results">
                <div class="no-results-icon">🔍</div>
                <div>Keine Ergebnisse gefunden</div>
                <div><small>Diese Frage scheint es nicht zu geben! Versuche einen anderen Teil der Frage zu beschreiben oder überprüfe deine Eingabe!</small></div>
            </div>`;
        }
        countEl.textContent = showOnlyQuiz ? `Keine Quiz-Fragen gefunden` : `Keine Fragen gefunden`;
        return;
    }

    const quizCount = list.filter(item => item.hasQuestion).length;
    countEl.textContent = `${list.length} ${list.length === 1 ? 'Frage' : 'Fragen'} gefunden${showOnlyQuiz ? ' (nur Quiz)' : ` (${quizCount} mit Quiz)`}`;
    
    const fragment = document.createDocumentFragment();
    
    const itemsToRender = list.slice(0, 500);
    
    itemsToRender.forEach(item => {
        const a = document.createElement("a");
        a.href = item.fullUrl;
        a.target = "_blank";
        a.className = "item";
        
        const questionButton = item.hasQuestion ? 
            `<button class="question-btn" title="Frage üben">${questionIcon}</button>` : '';
        
        a.innerHTML = `
            <div class="icon">${checkIcon}</div>
            <div class="text">
                <small>Nr. ${item.numberReal || item.numberUrl}</small>
                <strong>${formatTitleForDisplay(item.title)}</strong>
                <small>${item.fullUrl}</small>
            </div>
            ${questionButton}
        `;
        
        if (item.hasQuestion) {
            const btn = a.querySelector('.question-btn');
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                createQuestionPopup(questionsData[item.fullUrl]);
            });
        }
        
        fragment.appendChild(a);
    });
    
    listEl.innerHTML = "";
    listEl.appendChild(fragment);
}

document.getElementById("search").addEventListener("input", e => {
    clearTimeout(searchTimeout);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    searchTimeout = setTimeout(() => {
        const q = normalizeText(e.target.value);
        
        if (q === "") {
            const filtered = showOnlyQuiz ? allItems.filter(item => item.hasQuestion) : allItems;
            render(filtered);
            return;
        }
        
        const filtered = allItems.filter(i =>
            i.titleNormalized.includes(q) ||
            i.numberNormalized.includes(q) ||
            i.numberUrl.includes(q)
        );
        
        const finalFiltered = showOnlyQuiz ? filtered.filter(item => item.hasQuestion) : filtered;
        render(finalFiltered);
    }, 150);
});

document.getElementById('reset').addEventListener('click', function() {
    clearTimeout(searchTimeout);
    
    const searchInput = document.getElementById('search');
    searchInput.value = '';
    
    const filtered = showOnlyQuiz ? allItems.filter(item => item.hasQuestion) : allItems;
    render(filtered);
});

window.addEventListener('scroll', function() {
    if (window.scrollY > 0) {
        document.documentElement.classList.add('scrolling');
    } else {
        document.documentElement.classList.remove('scrolling');
    }
});

/*

TEMPLATE QUESTION DATA FORMAT

,
    "": {
        "question": "",
        "question-assets": {
            "video": "",
            "img": "",
            "unused": "",
            "more_variants": {
                "text": "",
                "link": ""
            }
        },
        "answers": {
            "": {
                "wrong": true,
                "explanation": "",
                "assets": {
                    "img": "",
                    "img-alt": ""
                }
            },
            "": {
                "wrong": false,
                "explanation": "",
                "assets": {
                    "img": "",
                    "img-alt": ""
                }
            },
            "": {
                "wrong": true,
                "explanation": "",
                "assets": {
                    "img": "",
                    "img-alt": ""
                }
            }
        }
    }

*/