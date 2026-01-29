// ========================================
// 📌 설정 및 상태 변수
// ========================================

/**
 * [수정 포인트] 모드 설정
 * 새 모드를 추가하려면 이 배열에 객체를 추가하세요.
 * id: 서버에 전송되는 모드 ID
 * name: UI에 표시되는 이름
 */
const SECTIONS = [
    { id: 'learning', name: '학습할래용' },
    { id: 'quiz', name: '퀴즈풀래용' }
];

// 현재 상태 변수들
let currentMode = 'learning';  // 현재 선택된 모드 (learning/quiz)
let isProcessing = false;      // 메시지 처리 중 여부
let notebookMode = false;      // Chat/Notebook 모드 (false: Chat, true: Notebook)

// 북마크 및 학습현황 데이터
// 북마크 및 학습현황 데이터
let bookmarks = []; // DB에서 로드됨
let studyStats = { quiz: 0, notes: 0 }; // HTML에서 초기화됨

// 모드별 chatContent 캐시 (모드 전환 시 상태 유지용)
const modeContentCache = {};

// ========================================
// 🌙 테마 관련 함수
// ========================================

// 로컬 스토리지에서 테마 설정 불러오기
let isDark = localStorage.getItem('theme') === 'dark';
if (isDark) {
    document.documentElement.setAttribute('data-theme', 'dark');
    updateThemeIcon();
}

/**
 * 다크/라이트 모드 전환
 */
function toggleTheme() {
    isDark = !isDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

/**
 * 테마 아이콘 업데이트 (해/달 모양)
 */
function updateThemeIcon() {
    const icon = document.getElementById('themeIcon');
    icon.innerHTML = isDark
        ? '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>'  // 달
        : '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>';  // 해
}

// ========================================
// 📁 모드/섹션 관련 함수
// ========================================

/**
 * 사이드바에 모드 버튼들을 렌더링
 * SECTIONS 배열을 기반으로 동적 생성
 */
function renderSections() {
    document.getElementById('sectionsContainer').innerHTML = SECTIONS.map(s => `
        <div class="section ${s.id === currentMode ? 'active' : ''}" data-mode="${s.id}">
            <div class="section-header" onclick="selectMode('${s.id}')">
                <div class="section-info">
                    <div class="section-name">${s.name}</div>
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * 모드 선택 시 호출
 * @param {string} mode - 선택된 모드 ID
 */
function selectMode(mode) {
    try {
        // 현재 모드의 chatContent 저장
        const chatContent = document.getElementById('chatContent');
        if (chatContent && currentMode) {
            modeContentCache[currentMode] = chatContent.innerHTML;
        }

        // 모든 섹션에서 active 클래스 제거
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        // 선택된 섹션에 active 클래스 추가
        const targetSection = document.querySelector(`.section[data-mode="${mode}"]`);
        if (targetSection) targetSection.classList.add('active');

        currentMode = mode;

        // 퀴즈 모드에서는 입력창 숨기기
        const inputArea = document.querySelector('.input-area');
        if (inputArea) {
            inputArea.style.display = (mode === 'quiz') ? 'none' : 'block';
        }

        // 캐시된 콘텐츠가 있으면 복원, 없으면 웰컴 화면
        if (modeContentCache[mode]) {
            chatContent.innerHTML = modeContentCache[mode];
        } else {
            showWelcome();
        }

        // modeBadge 업데이트
        const badge = document.getElementById('modeBadge');
        if (badge) {
            const info = SECTIONS.find(s => s.id === mode);
            badge.textContent = info ? info.name + ' 모드' : mode + ' 모드';
        }
    } catch (e) {
        console.error('selectMode 오류:', e);
    }
}

/**
 * 전체 초기화 버튼 클릭 시 호출
 */
async function resetAll() {
    if (!confirm('모든 대화가 삭제됩니다. 계속하시겠습니까?')) return;
    // Django URL: /api/reset/
    await fetch('/api/reset/', { method: 'POST' });
    location.reload();
}

/**
 * 웰컴 화면 표시
 * 모드 변경 시 또는 초기 로드 시 호출됨
 */
function showWelcome() {
    const info = SECTIONS.find(s => s.id === currentMode);

    // 퀴즈 모드일 경우 별도 UI 렌더링
    if (currentMode === 'quiz') {
        document.getElementById('chatContent').innerHTML = `
            <div class="quiz-container">
                <div class="quiz-setup-card">
                    <div class="quiz-setup-title">오늘의 퀴즈 도전! 🧩</div>
                    
                    <div class="quiz-option-group">
                        <label class="quiz-option-label">카테고리 선택</label>
                        <div class="quiz-radio-group">
                            <input type="radio" id="catAll" name="quizCategory" value="all" class="quiz-radio-input" checked>
                            <label for="catAll" class="quiz-radio-label">모두</label>
                            
                            <input type="radio" id="catLec" name="quizCategory" value="lecture" class="quiz-radio-input">
                            <label for="catLec" class="quiz-radio-label">강의자료</label>

                            <input type="radio" id="catPy" name="quizCategory" value="python" class="quiz-radio-input">
                            <label for="catPy" class="quiz-radio-label">파이썬 기초</label>
                        </div>
                    </div>

                    <div class="quiz-option-group">
                        <label class="quiz-option-label">문항 수 (5 ~ 20)</label>
                        <input type="number" id="quizCount" class="quiz-input-number" value="5" min="5" max="20">
                    </div>

                    <button id="btnStartQuiz" class="quiz-start-btn" onclick="startQuiz()">퀴즈 시작</button>
                </div>
            </div>
        `;
        return;
    }

    // [기존] 학습 모드 웰컴 화면
    document.getElementById('chatContent').innerHTML = `
        <div class="welcome" id="welcome">
            <!-- 배지 제거됨 -->
            <img src="/static/image/pymate_logo.png" alt="PyMate" style="width: 220px; height: auto; margin-bottom: 30px; border-radius: 16px;">
            <h1>무엇을 배우고 싶으세요?</h1>
            <p>부트캠프 학습 자료를 기반으로 한 AI 튜터입니다.</p>
            <div class="suggestions">
                <div class="suggestion" onclick="send('과적합이 뭐고 어떻게 방지해?')">
                    <div class="suggestion-icon">🎯</div>
                    <div class="suggestion-title">과적합이 뭐고 어떻게 방지해?</div>
                    <div class="suggestion-desc">Overfitting 개념과 해결법</div>
                </div>
                <div class="suggestion" onclick="send('결정트리와 랜덤포레스트 차이가 뭐야?')">
                    <div class="suggestion-icon">🌳</div>
                    <div class="suggestion-title">결정트리와 랜덤포레스트 차이가 뭐야?</div>
                    <div class="suggestion-desc">트리 기반 알고리즘 비교</div>
                </div>
                <div class="suggestion" onclick="send('train_test_split은 왜 하는 거야?')">
                    <div class="suggestion-icon">📊</div>
                    <div class="suggestion-title">train_test_split은 왜 하는 거야?</div>
                    <div class="suggestion-desc">데이터 분할의 필요성</div>
                </div>
                <div class="suggestion" onclick="send('정확도와 정밀도 차이 설명해줘')">
                    <div class="suggestion-icon">📈</div>
                    <div class="suggestion-title">정확도와 정밀도 차이 설명해줘</div>
                    <div class="suggestion-desc">평가 지표 비교</div>
                </div>
            </div>
        </div>
    `;
}

// ========================================
// ⌨️ 입력 관련 함수
// ========================================

/**
 * 입력창 자동 높이 조절
 * @param {HTMLElement} el - textarea 요소
 */
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
}

/**
 * 키보드 이벤트 핸들러
 * Enter: 전송 / Shift+Enter: 줄바꿈
 */
function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
    }
}

// ========================================
// 💬 채팅 관련 함수 (핵심 로직)
// ========================================

/**
 * 메시지 전송 함수 (스트리밍 방식)
 * 
 * @param {string} text - 전송할 메시지 (없으면 입력창 값 사용)
 * 
 * [동작 순서]
 * 1. 사용자 메시지 화면에 표시
 * 2. Thinking Process 표시
 * 3. 서버에 스트리밍 요청
 * 4. 응답을 글자 단위로 수신하며 실시간 표시
 * 5. 완료 시 참고 자료 표시
 */
async function send(text) {
    if (isProcessing) return;  // 이미 처리 중이면 무시

    const input = document.getElementById('input');
    const msg = text || input.value.trim();
    if (!msg) return;

    // 상태 설정
    isProcessing = true;
    document.getElementById('sendBtn').disabled = true;
    document.getElementById('welcome')?.remove();

    // 사용자 메시지 추가
    addMessage('user', msg);
    if (!text) input.value = '';

    // 💭 생각 중... (Thinking Process) UI 표시
    const thinkId = 'think-' + Date.now();
    showThinking(thinkId);

    let botDiv = null;
    let answer = '';
    let sources = [];

    try {
        // Django URL: /api/chat/stream/
        const response = await fetch('/api/chat/stream/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // 스트림 데이터 읽기 루프
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            // SSE(Server-Sent Events) 형식 파싱
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));

                        // 데이터 타입별 처리
                        if (data.type === 'step') {
                            // 진행 단계 추가
                            addStep(thinkId, data.data.step, data.data.title, data.data.desc);
                        } else if (data.type === 'message') {
                            // 전체 메시지 수신 (한 번에 표시)
                            if (!botDiv) {
                                finishThinking(thinkId);
                                botDiv = createBotMessage();
                            }
                            answer = data.data;
                            updateBotMessage(botDiv, answer);
                        } else if (data.type === 'char') {
                            // 글자 수신
                            if (!botDiv) {
                                finishThinking(thinkId);
                                botDiv = createBotMessage();
                            }
                            answer += data.data;
                            updateBotMessage(botDiv, answer);
                        } else if (data.type === 'sources') {
                            sources = data.data;
                            if (botDiv && sources.length > 0) {
                                appendBestMatch(botDiv, sources[0]);
                            }
                        } else if (data.type === 'web_sources') {
                            const webSources = data.data;
                            if (botDiv && webSources.length > 0) {
                                appendWebSources(botDiv, webSources);
                            }
                        } else if (data.type === 'suggestions') {
                            if (botDiv && data.data && data.data.length > 0) {
                                appendSuggestions(botDiv, data.data);
                            }
                        } else if (data.type === 'done') {
                        }
                    } catch (e) { /* JSON 파싱 에러 무시 */ }
                }
            }
        }
    } catch (e) {
        finishThinking(thinkId);
        addMessage('bot', '⚠️ 서버 연결 오류');
    }

    // 상태 복원
    isProcessing = false;
    document.getElementById('sendBtn').disabled = false;
}

/**
 * 봇 메시지 div 생성
 * @returns {HTMLElement} 생성된 메시지 div
 */
function createBotMessage() {
    const div = document.createElement('div');
    div.className = 'message bot';
    div.innerHTML = `
        <div class="message-header">
            <div class="message-avatar">
                <img src="/static/image/pymate_logo.png" alt="AI" style="width: 100%; height: 100%; border-radius: 50%;">
            </div>
            <div class="message-name">AI Tutor</div>
            <button class="chat-bookmark-btn" onclick="requestChatBookmark(this)" title="북마크 저장">★</button>
        </div>
        <div class="message-content"></div>
    `;
    document.getElementById('chatContent').appendChild(div);
    return div;
}

/**
 * 봇 메시지 내용 업데이트 (마크다운 렌더링)
 * @param {HTMLElement} div - 메시지 div
 * @param {string} text - 마크다운 텍스트
 */
function updateBotMessage(div, text) {
    div.querySelector('.message-content').innerHTML = marked.parse(text);
    // 자동 스크롤
    document.getElementById('chatArea').scrollTop = document.getElementById('chatArea').scrollHeight;
}

/**
 * Best Match 카드 추가 (답변 아래에 표시)
 */
function appendBestMatch(div, source) {
    if (div.querySelector('.best-match-card')) return;
    const scorePercent = (source.score * 100).toFixed(1);
    const html = `
        <div class="best-match-card">
    <div class="best-match-header">
        <span class="best-match-badge">${source.type}</span>
        <div class="best-match-title">${source.title}</div>
    </div>
    <div style="font-size: 13px; color: #4b5563; margin: 8px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
        ${source.content || '내용 미리보기가 없습니다.'}
    </div>
    <div class="best-match-score">유사도: ${scorePercent}%</div>
</div>
    `;
    div.querySelector('.message-content').insertAdjacentHTML('beforeend', html);
}

/**
 * 외부 검색 결과 카드 추가
 */
function appendWebSources(div, webSources) {
    if (div.querySelector('.web-sources-container')) return;

    const html = `
        <div class="web-sources-container" style="margin-top: 12px; padding: 12px; background: rgba(59, 130, 246, 0.1); border-radius: 8px; border: 1px solid rgba(59, 130, 246, 0.3);">
            <div style="font-size: 13px; font-weight: 600; color: #3b82f6; margin-bottom: 8px;">🌐 외부 참고 자료 (Web Search)</div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
                ${webSources.map(s => `
                    <a href="${s.url}" target="_blank" style="text-decoration: none; display: flex; flex-direction: column; gap: 4px; padding: 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb; transition: transform 0.2s;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="font-size: 14px;">🔗</div>
                            <div style="font-size: 13px; font-weight: 600; color: #1f2937; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">${s.title}</div>
                        </div>
                        <div style="font-size: 12px; color: #4b5563; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                            ${s.content || '내용 없음'}
                        </div>
                        <div style="font-size: 11px; color: #9ca3af;">${s.url}</div>
                    </a>
                `).join('')}
            </div>
        </div>
    `;
    div.querySelector('.message-content').insertAdjacentHTML('beforeend', html);
}

/**
 * 추천 질문 버튼 추가 (답변 아래에 표시)
 */
function appendSuggestions(div, suggestions) {
    const html = `
        <div style="margin-top: 16px; display: flex; flex-wrap: wrap; gap: 8px;">
            ${suggestions.map(q => `
                <button onclick="send('${q.replace(/'/g, "\\'")}')"
                    style="padding: 8px 14px; border-radius: 20px; border: 1px solid var(--accent); 
                           background: var(--bg-tertiary); color: var(--accent); font-size: 13px;
                           cursor: pointer;">
                    🔗 ${q}
                </button>
            `).join('')}
        </div>
    `;
    div.querySelector('.message-content').innerHTML += html;
}

/**
 * 참고 자료 카드 추가
 * @param {HTMLElement} div - 메시지 div
 * @param {Array} sources - 참고 자료 배열
 */
function appendSources(div, sources) {
    const srcHtml = `
        <div class="sources-grid">
            ${sources.map(s => `
                <div class="source-card">
                    <span class="source-type">${s.type}</span>
                    <div class="source-title">${s.title}</div>
                    <div class="source-cell">${s.content}</div>
                </div>
            `).join('')}
        </div>
    `;
    div.querySelector('.message-content').innerHTML += srcHtml;
}

/**
 * 메시지 추가 (사용자 또는 봇)
 * @param {string} sender - 'user' 또는 'bot'
 * @param {string} text - 메시지 텍스트
 * @param {Array} sources - 참고 자료 (선택)
 */
function addMessage(sender, text, sources = null) {
    const div = document.createElement('div');
    div.className = `message ${sender}`;
    const avatar = sender === 'bot' ?
        '<img src="/static/image/pymate_logo.png" alt="AI" style="width: 100%; height: 100%; border-radius: 50%;">' :
        '👤';

    let srcHtml = '';
    if (sources?.length) {
        srcHtml = `
            <div class="sources-grid">
                ${sources.map(s => `
                    <div class="source-card">
                        <span class="source-type">${s.type}</span>
                        <div class="source-title">${s.title}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    div.innerHTML = `
        <div class="message-header">
            <div class="message-avatar">${avatar}</div>
            <div class="message-name">${sender === 'bot' ? 'AI Tutor' : 'Student'}</div>
            ${sender === 'bot' ? '<button class="chat-bookmark-btn" onclick="requestChatBookmark(this)" title="북마크 저장">★</button>' : ''}
        </div>
        <div class="message-content">${marked.parse(text)}${srcHtml}</div>
    `;

    document.getElementById('chatContent').appendChild(div);
    // 자동 스크롤
    document.getElementById('chatArea').scrollTop = document.getElementById('chatArea').scrollHeight;
    // 코드 하이라이팅
    div.querySelectorAll('pre code').forEach(b => hljs.highlightElement(b));
}

// ========================================
// ⚙️ Thinking Process 관련 함수
// ========================================

/**
 * Thinking Process UI 표시
 * @param {string} id - 고유 ID
 */
function showThinking(id) {
    const div = document.createElement('div');
    div.className = 'thought-process open';
    div.id = id;
    div.innerHTML = `
        <div class="thought-header" onclick="this.parentElement.classList.toggle('open')">
            <div class="thought-title">
                ⚙️ Thinking Process 
                <span class="status-badge" id="${id}-status">Processing...</span>
            </div>
            <span style="font-size:12px;opacity:0.5">▼</span>
        </div>
        <div class="thought-body" id="${id}-body"></div>
    `;
    document.getElementById('chatContent').appendChild(div);
    document.getElementById('chatArea').scrollTop = document.getElementById('chatArea').scrollHeight;
}

/**
 * 진행 단계 추가
 * @param {string} id - Thinking Process ID
 * @param {number} num - 단계 번호
 * @param {string} title - 단계 제목
 * @param {string} desc - 단계 설명
 */
function addStep(id, num, title, desc) {
    const body = document.getElementById(`${id}-body`);
    if (body) {
        body.innerHTML += `
            <div class="thought-step">
                <div class="step-icon">${num}</div>
                <div class="step-content">
                    <div class="step-title">${title}</div>
                    <div class="step-desc">${desc}</div>
                </div>
            </div>
        `;
    }
    document.getElementById('chatArea').scrollTop = document.getElementById('chatArea').scrollHeight;
}

/**
 * Thinking Process 완료 처리
 * @param {string} id - Thinking Process ID
 */
function finishThinking(id) {
    const badge = document.getElementById(`${id}-status`);
    if (badge) {
        badge.textContent = 'Complete';
        badge.style.background = '#10b981';  // 초록색
    }
    // 0.8초 후 자동 접기
    setTimeout(() => document.getElementById(id)?.classList.remove('open'), 800);
}

// ========================================
// 🏥 서버 상태 모니터링
// ========================================

/**
 * 5초마다 서버 상태 체크
 */
async function checkServerStatus() {
    const statusText = document.getElementById('dbStatusText');
    if (!statusText) return; // 요소가 없으면 스킵
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        // Django URL: /api/health/
        const response = await fetch('/api/health/', { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
            statusText.textContent = 'Database is successfully connected';
            statusText.className = 'db-status-text db-status-ok';
        } else {
            throw new Error('Server Error');
        }
    } catch (e) {
        statusText.textContent = 'Database is not connected';
        statusText.className = 'db-status-text db-status-error';
    }
}

// 최초 실행 및 주기적 반복 (5초)
// 최초 실행 및 주기적 반복 (5초)
checkServerStatus();
setInterval(checkServerStatus, 5000);
loadBookmarks(); // 북마크 목록 초기 로드

// ========================================
// 🔄 Chat/Notebook 모드 전환 (작업 5)
// ========================================

/**
 * Chat/Notebook 모드 전환
 * @param {string} mode - 'chat' 또는 'notebook'
 */
function switchMode(mode) {
    notebookMode = (mode === 'notebook');

    // 버튼 상태 업데이트
    document.getElementById('chatModeBtn').classList.toggle('active', !notebookMode);
    document.getElementById('notebookModeBtn').classList.toggle('active', notebookMode);

    if (notebookMode) {
        // Notebook 모드: 저장된 답변만 표시
        document.querySelectorAll('.message.user').forEach(el =>
            el.style.display = 'none'
        );
        document.querySelectorAll('.message.bot').forEach(card => {
            // saved 속성이 있는 것만 표시
            card.style.display = card.dataset.saved ? 'block' : 'none';
        });
        // 입력 영역 숨기기
        const inputArea = document.querySelector('.input-area');
        if (inputArea) inputArea.style.display = 'none';
    } else {
        // Chat 모드: 전체 표시
        document.querySelectorAll('.message').forEach(el =>
            el.style.display = 'block'
        );
        const inputArea = document.querySelector('.input-area');
        if (inputArea) inputArea.style.display = 'block';
    }
}

// ========================================
// 📌 북마크 기능
// ========================================

/**
 * 북마크 저장
 * @param {string} title - 북마크 제목
 * @param {string} content - 북마크 내용 (짧게)
 */
async function addBookmark(title, content) {
    // DB API 사용하므로 로컬 스토리지 로직 제거
    try {
        const res = await fetch('/api/chat/bookmarks/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ query: title, answer: content })
        });
        const data = await res.json();
        if (data.success) {
            loadBookmarks(); // 목록 새로고침
            updateStats('notes', 1); // 통계만 클라이언트에서 임시 증가 (또는 새로고침)
        } else {
            alert(data.message); // "이미 저장된 내용입니다" 등
        }
    } catch (e) {
        console.error('북마크 저장 오류:', e);
    }
}

/**
 * 북마크 목록 로드 (DB 연동)
 */
async function loadBookmarks() {
    try {
        const res = await fetch('/api/chat/bookmarks/');
        const data = await res.json();
        if (data.success) {
            bookmarks = data.bookmarks;
            renderBookmarks();
        }
    } catch (e) {
        console.error('북마크 로드 오류:', e);
    }
}

/**
 * 북마크 목록 렌더링
 */
function renderBookmarks() {
    const list = document.getElementById('bookmarkList');
    if (!list) return;

    if (!bookmarks || bookmarks.length === 0) {
        list.innerHTML = '<div class="bookmark-empty">저장된 북마크가 없습니다</div>';
        return;
    }

    list.innerHTML = bookmarks.map(b => `
        <div class="bookmark-item">
            <div style="flex:1; cursor:pointer;" onclick="location.href='/mypage/#bookmark-card-${b.id}'">
                📌 ${b.query ? b.query.slice(0, 20) : '제목 없음'}...
            </div>
            <button onclick="deleteBookmark(${b.id})" style="background:none; border:none; color:#ef4444; font-size:12px; cursor:pointer;" title="삭제">✕</button>
        </div>
    `).join('');
}

/**
 * 북마크 삭제 (DB 연동)
 */
async function deleteBookmark(id) {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`/api/chat/bookmarks/${id}/delete/`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });
        const data = await res.json();
        if (data.success) {
            loadBookmarks(); // 목록 다시 불러오기
            // 통계 업데이트 (임시)
            const el = document.getElementById('noteCount');
            if (el) {
                let count = parseInt(el.innerText) || 0;
                el.innerText = Math.max(0, count - 1) + '개';
            }
        } else {
            alert(data.message);
        }
    } catch (e) {
        console.error('삭제 오류:', e);
    }
}

/**
 * 북마크로 스크롤
 */
function scrollToBookmark(id) {
    // 해당 북마크 요소로 스크롤 (구현 예정)
    console.log('Scroll to bookmark:', id);
}

// ========================================
// 📊 학습현황 업데이트
// ========================================

/**
 * 학습현황 업데이트
 * @param {string} type - 'quiz' 또는 'notes'
 * @param {number} delta - 증가량 (기본 1)
 */
function updateStats(type, delta = 1) {
    studyStats[type] = (studyStats[type] || 0) + delta;
    localStorage.setItem('pymate_stats', JSON.stringify(studyStats));
    renderStats();
}

/**
 * 학습현황 렌더링
 */
function renderStats() {
    const quizEl = document.getElementById('quizCount');
    const noteEl = document.getElementById('noteCount');
    if (quizEl) quizEl.textContent = `${studyStats.quiz || 0}개`;
    if (noteEl) noteEl.textContent = `${studyStats.notes || 0}개`;
}

// ========================================
// 🧩 퀴즈 패널 (작업 6)
// ========================================

/**
 * 우측 패널에 퀴즈 UI 표시
 */
function showQuizPanel() {
    const rightPanel = document.querySelector('.sidebar-right');
    if (!rightPanel) return;

    // 기존 내용 저장
    if (!rightPanel.dataset.originalContent) {
        rightPanel.dataset.originalContent = rightPanel.innerHTML;
    }

    rightPanel.innerHTML = `
        <div class="quiz-panel">
            <div class="sidebar-right-header">
                <h3>🧩 오늘의 퀴즈</h3>
                <button onclick="closeQuizPanel()" style="background:none;border:none;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div id="quizPanelContent">
                <p style="text-align:center;color:var(--text-muted);padding:20px;">
                    퀴즈를 불러오는 중...
                </p>
            </div>
        </div>
    `;

    // 퀴즈 데이터 로드 (기존 퀴즈 기능 연동)
    loadQuizToPanel();
}

/**
 * 퀴즈 패널 닫기
 */
function closeQuizPanel() {
    const rightPanel = document.querySelector('.sidebar-right');
    if (!rightPanel || !rightPanel.dataset.originalContent) return;

    rightPanel.innerHTML = rightPanel.dataset.originalContent;
    delete rightPanel.dataset.originalContent;
}

/**
 * 퀴즈 패널에 퀴즈 로드
 */
function loadQuizToPanel() {
    const container = document.getElementById('quizPanelContent');
    if (!container) return;

    // 간단한 퀴즈 예시 (실제로는 서버에서 가져옴)
    container.innerHTML = `
        <div style="padding:16px;">
            <div style="font-size:14px;font-weight:600;margin-bottom:12px;">Q. 과적합(Overfitting)이란?</div>
            <button class="action-btn" onclick="submitQuizAnswer(true)" style="width:100%;margin-bottom:8px;">⭕ 모델이 훈련 데이터에 너무 맞춰진 것</button>
            <button class="action-btn" onclick="submitQuizAnswer(false)" style="width:100%;">❌ 모델이 훈련 데이터를 잘 학습하지 못한 것</button>
        </div>
    `;
}

/**
 * 퀴즈 답변 제출
 */
function submitQuizAnswer(isCorrect) {
    const container = document.getElementById('quizPanelContent');
    if (!container) return;

    if (isCorrect) {
        container.innerHTML = `
            <div style="padding:20px;text-align:center;">
                <div style="font-size:48px;margin-bottom:12px;">🎉</div>
                <div style="font-size:16px;font-weight:600;color:var(--accent);">정답입니다!</div>
                <button class="quiz-btn" onclick="loadQuizToPanel()" style="margin-top:16px;">다음 문제</button>
            </div>
        `;
        updateStats('quiz', 1);
    } else {
        container.innerHTML = `
            <div style="padding:20px;text-align:center;">
                <div style="font-size:48px;margin-bottom:12px;">😢</div>
                <div style="font-size:16px;font-weight:600;color:var(--danger);">틀렸습니다</div>
                <p style="font-size:13px;color:var(--text-secondary);margin-top:8px;">과적합은 모델이 훈련 데이터에 너무 맞춰져서 새로운 데이터에 대한 일반화 능력이 떨어지는 현상입니다.</p>
                <button class="quiz-btn" onclick="loadQuizToPanel()" style="margin-top:16px;">다음 문제</button>
            </div>
        `;
    }
}

/**
 * 노트 패널 표시
 */
function showNotePanel() {
    const rightPanel = document.querySelector('.sidebar-right');
    if (!rightPanel) return;

    // 기존 내용 저장
    if (!rightPanel.dataset.originalContent) {
        rightPanel.dataset.originalContent = rightPanel.innerHTML;
    }

    rightPanel.innerHTML = `
        <div class="note-panel">
            <div class="sidebar-right-header">
                <h3>📝 저장한 노트</h3>
                <button onclick="closeQuizPanel()" style="background:none;border:none;font-size:18px;cursor:pointer;">✕</button>
            </div>
            <div id="notePanelContent">
                ${bookmarks.length === 0
            ? '<p style="text-align:center;color:var(--text-muted);padding:20px;">저장된 노트가 없습니다</p>'
            : bookmarks.map(b => `
                        <div class="bookmark-item">
                            <strong>${b.title}</strong>
                            <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">${b.timestamp}</div>
                        </div>
                    `).join('')
        }
            </div>
        </div>
    `;
}

/**
 * 답변 저장 (노트에 추가)
 * @param {HTMLElement} btn - 클릭된 버튼
 */
function saveToNotebook(btn) {
    const card = btn.closest('.message.bot, .answer-card');
    if (!card) return;

    const content = card.querySelector('.message-content')?.innerText || '';
    const title = content.slice(0, 30) + '...';

    addBookmark(title, content);

    // 버튼 상태 변경
    btn.classList.add('saved');
    btn.innerHTML = '📌 저장됨';

    // 카드에 saved 표시 (Notebook 모드에서 사용)
    card.dataset.saved = 'true';
}

// ========================================
// 🚀 초기화
// ========================================

// 페이지 로드 시 사이드바 렌더링 및 웰컴 화면 표시
renderSections();
showWelcome();
renderBookmarks();
renderStats();

/**
 * 채팅 북마크 저장 (DB 연동)
 */
async function requestChatBookmark(btn) {
    const botMsgDiv = btn.closest('.message.bot');
    if (!botMsgDiv) return;

    const contentDiv = botMsgDiv.querySelector('.message-content');
    const answer = contentDiv.innerText.trim();

    // 직전 사용자 질문 찾기
    let prev = botMsgDiv.previousElementSibling;
    while (prev && !prev.classList.contains('user')) {
        prev = prev.previousElementSibling;
    }

    if (!prev) {
        alert('질문을 찾을 수 없어 북마크할 수 없습니다. (대화 흐름이 끊겼을 수 있습니다)');
        return;
    }

    const query = prev.querySelector('.message-content').innerText.trim();

    // API 호출
    try {
        // 기존 addBookmark 함수 재사용 (내부에서 API 호출하도록 수정되었음)
        addBookmark(query, answer);

        // 버튼 UI 토글 (중복인 경우 addBookmark가 alert를 띄우고 끝남)
        // 여기서는 성공 여부를 알기 어려우므로(비동기), 일단 active 클래스는 추가하지 않음
        // (사용자가 목록을 보고 확인해야 함)

    } catch (e) {
        console.error('서버 통신 오류:', e);
    }
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
