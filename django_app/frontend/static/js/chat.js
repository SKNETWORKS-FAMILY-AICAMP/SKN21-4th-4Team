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
    { id: 'quiz', name: '퀴즈풀래용' },
    { id: 'coding', name: '코딩할래용' }
];

// 현재 상태 변수들
let currentMode = 'learning';  // 현재 선택된 모드 (learning/quiz)
let isProcessing = false;      // 메시지 처리 중 여부
let notebookMode = false;      // Chat/Notebook 모드 (false: Chat, true: Notebook)
let monacoInstance = null;     // Monaco Editor 인스턴스

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
    const container = document.getElementById('sectionsContainer');
    if (!container) return;  // 요소 없으면 그냥 리턴

    container.innerHTML = SECTIONS.map(s => `
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
            inputArea.style.display = (mode === 'quiz' || mode === 'coding') ? 'none' : 'block';
        }

        // 코딩 모드 UI 토글
        const chatArea = document.getElementById('chatArea');
        const codingArea = document.getElementById('codingArea');

        if (mode === 'coding') {
            if (chatArea) chatArea.style.display = 'none';
            if (codingArea) {
                codingArea.style.display = 'flex';
                // 에디터 초기화가 안 되어 있으면 초기화
                if (!monacoInstance) {
                    initMonaco();
                }
            }
        } else {
            if (chatArea) chatArea.style.display = 'block';
            if (codingArea) codingArea.style.display = 'none';
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
            body: JSON.stringify({
                message: msg,
                filters: {
                    python: document.getElementById('filterPython')?.checked ?? true,
                    lecture: document.getElementById('filterLecture')?.checked ?? true,
                    code: document.getElementById('filterCode')?.checked ?? false
                }
            })
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
                                // 소스 일괄 렌더링 함수 호출
                                appendSources(botDiv, sources);
                            }
                        } else if (data.type === 'web_sources') {
                            const webSources = data.data;
                            if (botDiv && webSources.length > 0) {
                                appendWebSources(botDiv, webSources);
                            }
                        } else if (data.type === 'questions') {  // suggestions -> questions
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
 * 참고 자료 카드 리스트 추가 (최대 3개)
 */
function appendSources(div, sources) {
    // 컨테이너가 없으면 생성
    let container = div.querySelector('.best-match-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'best-match-container';
        container.style.marginTop = '12px';
        container.style.display = 'flex';
        container.style.gap = '10px';
        container.style.overflowX = 'auto'; // 가로 스크롤
        container.style.paddingBottom = '8px'; // 스크롤바 공간 확보
        container.style.scrollBehavior = 'smooth';
        // 스크롤바 스타일링
        const style = document.createElement('style');
        style.innerHTML = `
            .best-match-container::-webkit-scrollbar { height: 6px; }
            .best-match-container::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 3px; }
            .best-match-container::-webkit-scrollbar-track { background: transparent; }
        `;
        div.appendChild(style);
        div.querySelector('.message-content').appendChild(container); // 마지막에 추가
    }

    // 최대 3개까지만 표시
    sources.slice(0, 3).forEach(source => {
        // 중복 방지
        const contentKey = source.content.substring(0, 30);
        const existing = container.querySelector(`[data-content-key="${contentKey}"]`);
        if (existing) return;

        // 백엔드에서 이미 정제된 데이터 사용
        let title = source.title || source.metadata?.source || '참고 자료';
        let content = source.content;
        let scorePercent = source.score || 0;

        // 태그 결정 (백엔드 type 우선, 없으면 title 기반 추론)
        let tag = source.type || 'DOC';
        if (tag === 'DOC') { // 기본값이면 다시 한번 체크
            if (title.includes('강의') || title.toLowerCase().includes('lecture')) tag = 'LECTURE';
            else if (title.includes('코드') || title.toLowerCase().includes('code') || title.endsWith('.ipynb')) tag = 'CODE';
        }

        // 화면 표시용 제목 (접두어 제거)
        const displayTitle = title.replace(/^강의:\s*/, '').replace(/^코드:\s*/, '');

        const html = `
            <div class="best-match-card" data-content-key="${contentKey}" style="
                min-width: 260px; 
                max-width: 260px;
                padding: 14px;
                border: 1px solid var(--border);
                border-radius: 12px;
                background: linear-gradient(135deg, var(--bg-tertiary) 0%, #fff 100%);
                box-shadow: 0 2px 8px rgba(0,0,0,0.05);
                flex-shrink: 0;
                transition: transform 0.2s;
                display: flex;
                flex-direction: column;
            " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
                     <span style="
                        align-self: flex-start;
                        font-size: 10px; 
                        font-weight: 700; 
                        color: #fff; 
                        background: var(--accent, #e91e8c); 
                        padding: 3px 6px; 
                        border-radius: 4px;
                    ">${tag}</span>
                    <span style="
                        font-size: 13px; 
                        font-weight: 600; 
                        color: var(--accent); 
                        line-height: 1.4; 
                        display: -webkit-box; 
                        -webkit-line-clamp: 2; 
                        -webkit-box-orient: vertical; 
                        overflow: hidden;
                        height: 2.8em;
                    " title="${title}">
                        ${displayTitle}
                    </span>
                </div>
                
                <div style="
                    font-size: 12px; 
                    color: var(--text-secondary); 
                    line-height: 1.6; 
                    margin-bottom: auto;
                    display: -webkit-box;
                    -webkit-line-clamp: 4;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    height: 6.4em;
                ">
                    ${content}
                </div>
                
                <div style="text-align: right; font-size: 11px; color: var(--accent); font-weight: 600; margin-top: 10px;">
                    유사도: ${scorePercent}%
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', html);
    });
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
    if (div.querySelector('.suggestion-btn-container')) return;

    const html = `
        <div class="suggestion-btn-container" style="margin-top: 16px; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 8px;">
            ${suggestions.map(q => `
                <button onclick="send('${q.replace(/'/g, "\\'")}')"
                    style="
                        padding: 8px 16px; 
                        border-radius: 20px; 
                        border: 1px solid var(--accent); 
                        background: var(--bg-tertiary); 
                        color: var(--accent); 
                        font-size: 13px;
                        cursor: pointer;
                        transition: all 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    "
                    onmouseover="this.style.background='var(--accent)'; this.style.color='white';"
                    onmouseout="this.style.background='var(--bg-tertiary)'; this.style.color='var(--accent)';"
                >
                    <span style="font-size: 14px;">💬</span> ${q}
                </button>
            `).join('')}
        </div>
    `;
    div.querySelector('.message-content').insertAdjacentHTML('beforeend', html);
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
            bookmarks = data.bookmarks || [];
            if (document.getElementById('bookmarkList')) {
                renderBookmarks();
            }
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

    if (bookmarks.length === 0) {
        list.innerHTML = '<div class="bookmark-empty">저장된 북마크가 없습니다</div>';
        return;
    }

    list.innerHTML = bookmarks.map(b => `
        <div class="bookmark-item" onclick="loadBookmark('${b.id}')">
            <div class="bookmark-title">${b.query}</div>
            <div class="bookmark-date">${new Date(b.created_at).toLocaleDateString()}</div>
        </div>
    `).join('');
}

// ========================================
// 💻 Monaco Editor & Code Execution
// ========================================

const CHALLENGES = {
    'basic': `# 문제 이름
# 문자열 출력하기
#
# 문제 설명
# 문자열 str이 주어질 때, str을 출력하는 코드를 작성해 보세요.
#
# 제한사항
# 1 ≤ str의 길이 ≤ 1,000,000
# str에는 공백이 없으며, 첫째 줄에 한 줄로만 주어집니다.
# 입출력 예
# 입력 #1
#
# HelloWorld!
# 출력 #1
#
# HelloWorld!

str = input()`,

    'intro': `# 문제 이름
# 문자열안에 문자열
#
# 문제 설명
# 문자열 str1, str2가 매개변수로 주어집니다. str1 안에 str2가 있다면 1을 없다면 2를 return하도록 solution 함수를 완성해주세요.
#
# 제한사항
# 1 ≤ str1의 길이 ≤ 100
# 1 ≤ str2의 길이 ≤ 100
# 문자열은 알파벳 대문자, 소문자, 숫자로 구성되어 있습니다.
# 입출력 예
# str1	str2	result
# "ab6CDE443fgh22iJKlmn1o"	"6CD"	1
# "ppprrrogrammers"	"pppp"	2
# "AbcAbcA"	"AAA"	2
# 입출력 예 설명
# 입출력 예 #1
#
# "ab6CDE443fgh22iJKlmn1o" str1에 str2가 존재하므로 1을 return합니다.
# 입출력 예 #2
#
# "ppprrrogrammers" str1에 str2가 없으므로 2를 return합니다.
# 입출력 예 #3
#
# "AbcAbcA" str1에 str2가 없으므로 2를 return합니다.

def solution(str1, str2):
    answer = 0
    return answer`,

    'advanced': `# 문제 이름 
# 폰켓몬
#
# 문제 설명
# 당신은 폰켓몬을 잡기 위한 오랜 여행 끝에, 홍 박사님의 연구실에 도착했습니다. 홍 박사님은 당신에게 자신의 연구실에 있는 총 N 마리의 폰켓몬 중에서 N/2마리를 가져가도 좋다고 했습니다.
# 홍 박사님 연구실의 폰켓몬은 종류에 따라 번호를 붙여 구분합니다. 따라서 같은 종류의 폰켓몬은 같은 번호를 가지고 있습니다. 예를 들어 연구실에 총 4마리의 폰켓몬이 있고, 각 폰켓몬의 종류 번호가 [3번, 1번, 2번, 3번]이라면 이는 3번 폰켓몬 두 마리, 1번 폰켓몬 한 마리, 2번 폰켓몬 한 마리가 있음을 나타냅니다. 이때, 4마리의 폰켓몬 중 2마리를 고르는 방법은 다음과 같이 6가지가 있습니다.
#
# 첫 번째(3번), 두 번째(1번) 폰켓몬을 선택
# 첫 번째(3번), 세 번째(2번) 폰켓몬을 선택
# 첫 번째(3번), 네 번째(3번) 폰켓몬을 선택
# 두 번째(1번), 세 번째(2번) 폰켓몬을 선택
# 두 번째(1번), 네 번째(3번) 폰켓몬을 선택
# 세 번째(2번), 네 번째(3번) 폰켓몬을 선택
# 이때, 첫 번째(3번) 폰켓몬과 네 번째(3번) 폰켓몬을 선택하는 방법은 한 종류(3번 폰켓몬 두 마리)의 폰켓몬만 가질 수 있지만, 다른 방법들은 모두 두 종류의 폰켓몬을 가질 수 있습니다. 따라서 위 예시에서 가질 수 있는 폰켓몬 종류 수의 최댓값은 2가 됩니다.
# 당신은 최대한 다양한 종류의 폰켓몬을 가지길 원하기 때문에, 최대한 많은 종류의 폰켓몬을 포함해서 N/2마리를 선택하려 합니다. N마리 폰켓몬의 종류 번호가 담긴 배열 nums가 매개변수로 주어질 때, N/2마리의 폰켓몬을 선택하는 방법 중, 가장 많은 종류의 폰켓몬을 선택하는 방법을 찾아, 그때의 폰켓몬 종류 번호의 개수를 return 하도록 solution 함수를 완성해주세요.
#
# 제한사항
# nums는 폰켓몬의 종류 번호가 담긴 1차원 배열입니다.
# nums의 길이(N)는 1 이상 10,000 이하의 자연수이며, 항상 짝수로 주어집니다.
# 폰켓몬의 종류 번호는 1 이상 200,000 이하의 자연수로 나타냅니다.
# 가장 많은 종류의 폰켓몬을 선택하는 방법이 여러 가지인 경우에도, 선택할 수 있는 폰켓몬 종류 개수의 최댓값 하나만 return 하면 됩니다.
# 입출력 예
# nums	result
# [3,1,2,3]	2
# [3,3,3,2,2,4]	3
# [3,3,3,2,2,2]	2
# 입출력 예 설명
# 입출력 예 #1
# 문제의 예시와 같습니다.
#
# 입출력 예 #2
# 6마리의 폰켓몬이 있으므로, 3마리의 폰켓몬을 골라야 합니다.
# 가장 많은 종류의 폰켓몬을 고르기 위해서는 3번 폰켓몬 한 마리, 2번 폰켓몬 한 마리, 4번 폰켓몬 한 마리를 고르면 되며, 따라서 3을 return 합니다.
#
# 입출력 예 #3
# 6마리의 폰켓몬이 있으므로, 3마리의 폰켓몬을 골라야 합니다.
# 가장 많은 종류의 폰켓몬을 고르기 위해서는 3번 폰켓몬 한 마리와 2번 폰켓몬 두 마리를 고르거나, 혹은 3번 폰켓몬 두 마리와 2번 폰켓몬 한 마리를 고르면 됩니다. 따라서 최대 고를 수 있는 폰켓몬 종류의 수는 2입니다.

def solution(nums):
    answer = 0
    return answer`
};

/**
 * 예제 불러오기
 */
function loadChallenge(type) {
    if (!type || !monacoInstance) return;

    const code = CHALLENGES[type];
    if (code) {
        monacoInstance.setValue(code);
    }
}

/**
 * AI 코드 리뷰 요청
 */
async function requestAIReview() {
    if (!monacoInstance) return;

    const code = monacoInstance.getValue();
    const outputEl = document.getElementById('codeOutput');
    const output = outputEl.textContent; // 실행 결과도 같이 보냄

    // 실행 결과가 없으면 먼저 실행하라고 안내
    if (!output || output === '실행 결과가 여기에 표시됩니다...') {
        alert('먼저 코드를 실행해서 결과를 확인해주세요!');
        return;
    }

    // UI 준비: 터미널 패널 내 리뷰 영역 활성화
    const container = document.getElementById('aiReviewContainer');
    const contentDiv = document.getElementById('aiReviewContent');
    if (container && contentDiv) {
        container.style.display = 'block';
        contentDiv.innerHTML = 'AI 선생님이 코드를 분석하고 있어요... 🧠';
        // 터미널 스크롤 맨 아래로
        const terminalPanel = document.querySelector('.terminal-panel');
        if (terminalPanel) terminalPanel.scrollTop = terminalPanel.scrollHeight;
    }

    try {
        const response = await fetch('/api/chat/code/review/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                code: code,
                output: output
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let rawMarkdown = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const payload = JSON.parse(line.slice(6));

                        if (payload.type === 'message' || payload.type === 'chunk') {
                            rawMarkdown += payload.data;
                            if (contentDiv) {
                                contentDiv.innerHTML = marked.parse(rawMarkdown);
                                // 스트리밍 될 때마다 스크롤을 맨 아래로
                                const terminalPanel = document.querySelector('.terminal-panel');
                                if (terminalPanel) terminalPanel.scrollTop = terminalPanel.scrollHeight;
                            }
                        }
                    } catch (e) {
                        // json parse error ignore
                    }
                }
            }
        }
    } catch (e) {
        console.error('리뷰 요청 실패:', e);
        if (contentDiv) contentDiv.textContent = '리뷰 요청 중 오류가 발생했습니다.';
    }
}

/**
 * Monaco Editor 초기화
 */
function initMonaco() {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function () {
        monacoInstance = monaco.editor.create(document.getElementById('monaco-editor'), {
            value: '# 여기에 파이썬 코드를 작성하세요\nprint("Hello, World!")\n',
            language: 'python',
            theme: isDark ? 'vs-dark' : 'vs',
            automaticLayout: true,
            minimap: { enabled: false },
            fontSize: 14
        });
    });
}

/**
 * 코드 실행 요청
 */
async function executeCode() {
    if (!monacoInstance) return;

    const code = monacoInstance.getValue();
    const outputEl = document.getElementById('codeOutput');
    outputEl.textContent = '실행 중...';

    try {
        const response = await fetch('/api/chat/code/execute/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken') // Django CSRF 토큰 필요
            },
            body: JSON.stringify({ code: code })
        });

        const data = await response.json();

        if (data.success) {
            outputEl.textContent = data.output || '(출력 결과 없음)';
            if (data.error) {
                outputEl.textContent += '\n\n[Error]\n' + data.error;
            }
        } else {
            outputEl.textContent = '실행 오류: ' + (data.error || '알 수 없는 오류');
        }
    } catch (e) {
        outputEl.textContent = '서버 통신 오류: ' + e.message;
    }
}

/**
 * 쿠키 가져오기 (CSRF 토큰용)
 */
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

// ========================================
// 🎨 스튜디오 AI 도구 함수
// ========================================

/**
 * 마지막 AI 답변 내용을 가져오는 함수
 */
function getLastAnswer() {
    // AI Tutor 답변 영역 찾기 (실제 클래스에 맞게 수정)
    const answers = document.querySelectorAll('.message.assistant, .answer-content, .ai-response');

    // 못 찾으면 다른 방법 시도
    if (answers.length === 0) {
        // 모든 메시지 중 마지막 것 찾기
        const allMessages = document.querySelectorAll('#chatContent > div');
        if (allMessages.length < 2) {
            alert('먼저 질문을 해주세요!');
            return null;
        }
        // 마지막 메시지의 텍스트
        return allMessages[allMessages.length - 1].innerText;
    }

    return answers[answers.length - 1].innerText;
}


/**
 * AI 도구 버튼 클릭 시 - 답변 아래에 결과 추가
 */
async function requestAI(type) {
    const lastAnswer = getLastAnswer();
    if (!lastAnswer) return;

    const prompts = {
        summarize: `[중요: 아래 내용을 3줄로 요약만 해줘]\n\n${lastAnswer}`,
        stepByStep: `[중요: 아래 내용을 1,2,3 단계로 나눠서 설명해줘]\n\n${lastAnswer}`,
        table: `[중요: 아래 내용을 마크다운 표로 정리해줘]\n\n${lastAnswer}`,
        example: `[중요: 아래 개념의 다른 예시를 들어줘]\n\n${lastAnswer}`,
        quiz: `[JSON으로 답해줘] 아래 내용으로 O/X 퀴즈 1개 만들어줘. 형식: {"quizzes": [{"question": "질문", "answer": true, "explanation": "해설"}]}\n\n${lastAnswer}`,
        flashcard: `[JSON으로 답해줘] 아래 내용으로 플래시카드 3개 만들어줘. 형식: {"cards": [{"front": "질문", "back": "답변"}]}\n\n${lastAnswer}`,
    };

    const labels = {
        summarize: '개념 요약',
        stepByStep: '단계별 설명',
        table: '표로 정리',
        example: '다른 예시',
        quiz: 'O/X 퀴즈',
        flashcard: '플래시카드',
    };

    const prompt = prompts[type];
    if (!prompt) return;

    const chatContent = document.getElementById('chatContent');
    const lastMessageDiv = chatContent.lastElementChild;

    const resultDiv = document.createElement('div');
    resultDiv.className = 'studio-result';
    resultDiv.dataset.type = type;  // 타입 저장
    resultDiv.style.cssText = `
        background: var(--bg-secondary, #f8f9fa);
        border-radius: 8px;
        padding: 16px;
        margin-top: 12px;
        border: 1px solid var(--border, #e9ecef);
    `;
    resultDiv.innerHTML = `
        <div class="studio-header" style="
            font-size: 13px;
            font-weight: 600;
            color: var(--accent, #e91e8c);
            margin-bottom: 10px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--border, #e9ecef);
            display: flex;
            justify-content: space-between;
            align-items: center;
        ">
            <span>${labels[type]}</span>
            <button class="bookmark-studio-btn" style="display:none; background:#e91e8c; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:11px;">⭐ 저장</button>
        </div>
        <div class="studio-content" style="
            font-size: 14px;
            line-height: 1.6;
            color: var(--text-secondary, #666);
        ">생성 중...</div>
    `;
    lastMessageDiv.appendChild(resultDiv);

    try {
        // 스튜디오 전용 API 호출 (RAG 없이 순수 LLM)
        const response = await fetch('/api/chat/studio/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({
                prompt: prompt,
                type: type  // 타입 전송 (summarize, quiz, flashcard 등)
            })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        const contentDiv = resultDiv.querySelector('.studio-content');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        // chunk 타입: 실시간 스트리밍 표시
                        if (data.type === 'chunk' && data.data) {
                            result += data.data;
                            // 퀴즈/플래시카드는 완료 후 렌더링, 나머지는 실시간
                            if (type !== 'quiz' && type !== 'flashcard') {
                                contentDiv.innerHTML = marked.parse(result);
                            } else {
                                contentDiv.textContent = '생성 중... ' + result.slice(0, 50) + '...';
                            }
                        }
                        // message 타입: 최종 결과
                        if (data.type === 'message' && data.data) {
                            result = data.data;
                        }
                    } catch (e) { }
                }
            }
        }

        // 타입별 렌더링
        if (type === 'quiz') {
            renderQuizUI(contentDiv, result, resultDiv);
        } else if (type === 'flashcard') {
            renderFlashcardUI(contentDiv, result);
        } else {
            contentDiv.innerHTML = marked.parse(result);
        }

        // 북마크 버튼 표시
        if (type === 'quiz') {
            const bookmarkBtn = resultDiv.querySelector('.bookmark-studio-btn');
            bookmarkBtn.style.display = 'inline-block';
            bookmarkBtn.onclick = () => saveQuizToBookmark(result);
        }

    } catch (error) {
        console.error('Studio error:', error);
        resultDiv.querySelector('.studio-content').innerHTML = '오류가 발생했습니다.';
    }
}

/**
 * O/X 퀴즈 UI 렌더링
 */
function renderQuizUI(container, result, resultDiv) {
    try {
        // JSON 추출 시도
        const jsonMatch = result.match(/\{[\s\S]*"quizzes"[\s\S]*\}/);
        if (!jsonMatch) {
            container.innerHTML = marked.parse(result);
            return;
        }

        const data = JSON.parse(jsonMatch[0]);
        const quizzes = data.quizzes || [];

        let html = '<div class="quiz-container">';
        quizzes.forEach((q, idx) => {
            // 해설을 Base64로 인코딩하여 특수문자 문제 방지
            const encodedExplanation = btoa(encodeURIComponent(q.explanation || '해설 없음'));
            html += `
                <div class="inline-quiz" data-answer="${q.answer}" data-explanation="${encodedExplanation}" style="
                    background: linear-gradient(135deg, #fff5f8 0%, #fff 100%);
                    border: 2px solid #ffcce0;
                    border-radius: 12px;
                    padding: 16px;
                    margin-bottom: 12px;
                ">
                    <div style="font-weight: 600; margin-bottom: 12px; color: #333;">🧩 ${q.question}</div>
                    <div class="quiz-buttons" style="display: flex; gap: 10px;">
                        <button class="quiz-btn-o" data-answer="true"
                            style="flex:1; padding:12px; border:2px solid #e91e8c; background:#fff5f8; border-radius:8px; cursor:pointer; font-weight:600; color:#e91e8c; transition:all 0.2s;">
                            ⭕ O
                        </button>
                        <button class="quiz-btn-x" data-answer="false"
                            style="flex:1; padding:12px; border:2px solid #666; background:#f8f9fa; border-radius:8px; cursor:pointer; font-weight:600; color:#333; transition:all 0.2s;">
                            ❌ X
                        </button>
                    </div>
                    <div class="quiz-result" style="display:none; margin-top:12px; padding:10px; border-radius:8px;"></div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;

        // 이벤트 리스너 등록
        container.querySelectorAll('.quiz-btn-o, .quiz-btn-x').forEach(btn => {
            btn.addEventListener('click', function () {
                const quizDiv = this.closest('.inline-quiz');
                const correctAnswer = quizDiv.dataset.answer === 'true';
                const userAnswer = this.dataset.answer === 'true';
                const encodedExp = quizDiv.dataset.explanation;
                const explanation = decodeURIComponent(atob(encodedExp));
                const resultDiv = quizDiv.querySelector('.quiz-result');
                const isCorrect = userAnswer === correctAnswer;

                // 버튼 비활성화
                quizDiv.querySelectorAll('button').forEach(b => b.disabled = true);

                // 결과 표시
                resultDiv.style.display = 'block';
                resultDiv.style.background = isCorrect ? '#d4edda' : '#f8d7da';
                resultDiv.style.color = isCorrect ? '#155724' : '#721c24';
                resultDiv.innerHTML = `
                    <strong>${isCorrect ? '🎉 정답!' : '😅 오답!'}</strong>
                    <p style="margin:8px 0 0 0;">${explanation}</p>
                `;
            });
        });

        // 데이터 저장 (북마크용)
        resultDiv.dataset.quizData = JSON.stringify(data);

    } catch (e) {
        console.error('Quiz parse error:', e);
        container.innerHTML = marked.parse(result);
    }
}

/**
 * 퀴즈 정답 확인
 */
function checkQuizAnswer(btn, userAnswer, explanation) {
    const quizDiv = btn.closest('.inline-quiz');
    const correctAnswer = quizDiv.dataset.answer === 'true';
    const resultDiv = quizDiv.querySelector('.quiz-result');
    const isCorrect = userAnswer === correctAnswer;

    // 버튼 비활성화
    quizDiv.querySelectorAll('button').forEach(b => b.disabled = true);

    // 결과 표시
    resultDiv.style.display = 'block';
    resultDiv.style.background = isCorrect ? '#d4edda' : '#f8d7da';
    resultDiv.style.color = isCorrect ? '#155724' : '#721c24';
    resultDiv.innerHTML = `
        <strong>${isCorrect ? '🎉 정답!' : '😅 오답!'}</strong>
        <p style="margin:8px 0 0 0;">${explanation}</p>
    `;
}

/**
 * 플래시카드 UI 렌더링
 */
function renderFlashcardUI(container, result) {
    try {
        const jsonMatch = result.match(/\{[\s\S]*"cards"[\s\S]*\}/);
        if (!jsonMatch) {
            container.innerHTML = marked.parse(result);
            return;
        }

        const data = JSON.parse(jsonMatch[0]);
        const cards = data.cards || [];

        let html = '<div class="flashcard-container" style="display:flex; gap:12px; flex-wrap:wrap;">';
        cards.forEach((card, idx) => {
            html += `
                <div class="flashcard" onclick="this.classList.toggle('flipped')" style="
                    width: 180px;
                    height: 120px;
                    perspective: 1000px;
                    cursor: pointer;
                ">
                    <div class="flashcard-inner" style="
                        position: relative;
                        width: 100%;
                        height: 100%;
                        transition: transform 0.6s;
                        transform-style: preserve-3d;
                    ">
                        <div class="flashcard-front" style="
                            position: absolute;
                            width: 100%;
                            height: 100%;
                            backface-visibility: hidden;
                            background: linear-gradient(135deg, #e91e8c 0%, #ff6b9d 100%);
                            color: white;
                            border-radius: 12px;
                            padding: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            font-weight: 600;
                            font-size: 13px;
                            box-shadow: 0 4px 15px rgba(233, 30, 140, 0.3);
                        ">${card.front}</div>
                        <div class="flashcard-back" style="
                            position: absolute;
                            width: 100%;
                            height: 100%;
                            backface-visibility: hidden;
                            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
                            color: #333;
                            border-radius: 12px;
                            padding: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            font-size: 12px;
                            transform: rotateY(180deg);
                            box-shadow: 0 4px 15px rgba(255, 154, 158, 0.3);
                        ">${card.back}</div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        html += '<p style="font-size:11px; color:var(--text-muted, #999); margin-top:8px;">💡 카드를 클릭하면 뒤집어집니다</p>';
        container.innerHTML = html;

    } catch (e) {
        console.error('Flashcard parse error:', e);
        container.innerHTML = marked.parse(result);
    }
}

/**
 * 스튜디오에서 만든 O/X 퀴즈를 퀴즈 북마크에 저장
 * QuizBookmark 모델: quiz_id, question, answer, explanation, source
 */
async function saveQuizToBookmark(result) {
    try {
        // JSON 파싱 시도
        const jsonMatch = result.match(/\{[\s\S]*"quizzes"[\s\S]*\}/);
        if (!jsonMatch) {
            alert('퀴즈 데이터를 찾을 수 없습니다.');
            return;
        }

        const data = JSON.parse(jsonMatch[0]);
        const quizzes = data.quizzes || [];

        if (quizzes.length === 0) {
            alert('저장할 퀴즈가 없습니다.');
            return;
        }

        let savedCount = 0;

        // 각 퀴즈를 개별적으로 저장
        for (const quiz of quizzes) {
            const quizData = {
                quiz_id: `studio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                question: quiz.question,
                answer: quiz.answer ? 'O' : 'X',  // true -> 'O', false -> 'X'
                explanation: quiz.explanation || '해설 없음',
                source: 'AI 스튜디오'
            };

            const response = await fetch('/quiz/api/bookmarks/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(quizData)
            });

            const result = await response.json();
            if (result.success) {
                savedCount++;
            }
        }

        if (savedCount > 0) {
            alert(`${savedCount}개의 퀴즈가 저장되었습니다!\n마이페이지에서 확인할 수 있어요.`);
        } else {
            alert('이미 저장된 퀴즈입니다.');
        }

    } catch (e) {
        console.error('Quiz save error:', e);
        alert('퀴즈 저장에 실패했습니다.');
    }
}



// ========================================
// 🎨 드로잉 (Note) 기능
// ========================================

let isDrawing = false;
let drawingContext = null;
let currentColor = '#000000';

/**
 * Note 모드 활성화
 */
function openDrawing() {
    const overlay = document.getElementById('drawingOverlay');
    const canvas = document.getElementById('drawingCanvas');

    // 캔버스 크기 설정
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    drawingContext = canvas.getContext('2d');
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
    drawingContext.lineWidth = 3;
    drawingContext.strokeStyle = currentColor;

    overlay.style.display = 'block';

    // 이벤트 리스너
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // 터치 지원
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouchMove);
    canvas.addEventListener('touchend', stopDrawing);

    // 펜 색상 버튼 이벤트
    document.querySelectorAll('.pen-color').forEach(btn => {
        btn.onclick = () => {
            currentColor = btn.dataset.color;
            drawingContext.strokeStyle = currentColor;
            document.querySelectorAll('.pen-color').forEach(b => b.style.border = '2px solid #ddd');
            btn.style.border = '3px solid #333';
        };
    });

    // 첫 번째 색상 선택
    document.querySelector('.pen-color').click();
}

function startDrawing(e) {
    isDrawing = true;
    drawingContext.beginPath();
    drawingContext.moveTo(e.clientX, e.clientY);
}

function draw(e) {
    if (!isDrawing) return;
    drawingContext.lineTo(e.clientX, e.clientY);
    drawingContext.stroke();
}

function stopDrawing() {
    isDrawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    startDrawing({ clientX: touch.clientX, clientY: touch.clientY });
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    draw({ clientX: touch.clientX, clientY: touch.clientY });
}

/**
 * 드로잉 지우기
 */
function clearDrawing() {
    const canvas = document.getElementById('drawingCanvas');
    drawingContext.clearRect(0, 0, canvas.width, canvas.height);
}

/**
 * 드로잉 닫기
 */
function closeDrawing() {
    const overlay = document.getElementById('drawingOverlay');
    overlay.style.display = 'none';
    clearDrawing();
}

/**
 * 스크린샷 찍기
 */
async function takeScreenshot() {
    try {
        // html2canvas 라이브러리 필요
        if (typeof html2canvas === 'undefined') {
            alert('스크린샷 기능을 사용하려면 html2canvas 라이브러리가 필요합니다.');
            return;
        }

        const canvas = await html2canvas(document.body);
        const link = document.createElement('a');
        link.download = `screenshot_${Date.now()}.png`;
        link.href = canvas.toDataURL();
        link.click();
        alert('스크린샷이 저장되었습니다!');
    } catch (error) {
        console.error('Screenshot error:', error);
        alert('스크린샷 저장에 실패했습니다.');
    }
}