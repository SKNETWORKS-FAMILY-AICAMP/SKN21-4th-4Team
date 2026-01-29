// ========================================
// 🧩 퀴즈 관련 변수 및 함수
// ========================================
let currentQuizData = [];
let currentQuizIndex = 0;
let quizScore = 0;

/**
 * 퀴즈 불러오기 (quiz.html 전용)
 * 카테고리와 개수를 선택하고 퀴즈를 불러옴
 */
async function loadQuizzes() {
    const category = document.getElementById('categorySelect').value;
    const count = document.getElementById('quizCount').value;
    const container = document.getElementById('quizContainer');
    const welcome = document.getElementById('quizWelcome');

    // 웰컴 화면 숨기고 퀴즈 컨테이너 표시
    if (welcome) welcome.style.display = 'none';
    container.style.display = 'block';
    container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">퀴즈를 불러오는 중...</p>';

    try {
        const res = await fetch(`/api/quiz/?category=${category}&count=${count}`);
        const data = await res.json();

        if (data.success && data.quizzes.length > 0) {
            currentQuizData = data.quizzes;
            currentQuizIndex = 0;
            quizScore = 0;
            renderQuizPage();
            if (typeof updateQuizStats === 'function') updateQuizStats();
        } else {
            container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">퀴즈를 불러올 수 없습니다.</p>';
        }
    } catch (e) {
        console.error(e);
        container.innerHTML = '<p style="color: red; text-align: center; padding: 40px;">서버 통신 오류가 발생했습니다.</p>';
    }
}

/**
 * 퀴즈 문제 렌더링 (quiz.html 전용)
 */
function renderQuizPage() {
    const container = document.getElementById('quizContainer');
    const quiz = currentQuizData[currentQuizIndex];

    container.innerHTML = `
        <div class="quiz-card">
            <div class="quiz-progress">문제 ${currentQuizIndex + 1} / ${currentQuizData.length}</div>
            <div class="quiz-question">${quiz.question}</div>
            
            <div class="quiz-buttons">
                <button class="quiz-answer-btn btn-o" onclick="checkQuizAnswer('O')">O</button>
                <button class="quiz-answer-btn btn-x" onclick="checkQuizAnswer('X')">X</button>
            </div>
            
            <div id="quizFeedbackPage"></div>
        </div>
    `;
}

/**
 * 답변 체크 (quiz.html 전용)
 */
function checkQuizAnswer(userChoice) {
    const quiz = currentQuizData[currentQuizIndex];
    const feedback = document.getElementById('quizFeedbackPage');
    const buttons = document.querySelector('.quiz-buttons');

    buttons.style.pointerEvents = 'none';
    buttons.style.opacity = '0.6';

    const isCorrect = userChoice === quiz.answer;
    if (isCorrect) quizScore++;

    const resultClass = isCorrect ? 'correct' : 'wrong';
    const resultText = isCorrect ? '정답입니다! 🎉' : `틀렸습니다 😅 (정답: ${quiz.answer})`;

    feedback.innerHTML = `
        <div class="quiz-feedback-page ${resultClass}">
            <div class="result-text">${resultText}</div>
            <div class="explanation">${quiz.explanation}</div>
            <div class="source">출처: ${quiz.source}</div>
            <button class="next-btn" onclick="nextQuizPage()">
                ${currentQuizIndex < currentQuizData.length - 1 ? '다음 문제' : '결과 보기'}
            </button>
        </div>
    `;
}

/**
 * 다음 문제 (quiz.html 전용)
 */
function nextQuizPage() {
    currentQuizIndex++;
    if (currentQuizIndex < currentQuizData.length) {
        renderQuizPage();
    } else {
        showQuizResultPage();
    }
}

/**
 * 최종 결과 (quiz.html 전용)
 */
function showQuizResultPage() {
    const container = document.getElementById('quizContainer');
    container.innerHTML = `
        <div class="quiz-result">
            <h2>퀴즈 종료! 🏁</h2>
            <div class="final-score">${quizScore} / ${currentQuizData.length}</div>
            <p>수고하셨습니다!</p>
            <button class="restart-btn" onclick="loadQuizzes()">다시 하기</button>
        </div>
    `;
}

/**
 * 퀴즈 시작 함수
 * 선택된 카테고리와 문항 수로 퀴즈 데이터를 가져옴
 */
async function startQuiz() {
    const category = document.querySelector('input[name="quizCategory"]:checked').value;
    const count = document.getElementById('quizCount').value;

    // 로딩 표시 (간단히 버튼 텍스트 변경)
    const btn = document.getElementById('btnStartQuiz');
    const originalText = btn.textContent;
    btn.textContent = '문제 불러오는 중...';
    btn.disabled = true;

    try {
        // Django URL: /api/quiz/
        const res = await fetch(`/api/quiz/?category=${category}&count=${count}`);
        const data = await res.json();

        if (data.success && data.quizzes.length > 0) {
            currentQuizData = data.quizzes;
            currentQuizIndex = 0;
            quizScore = 0;
            renderQuizQuestion();
        } else {
            alert('문제를 불러올 수 없습니다.');
            // 에러 발생 시 다시 웰컴 화면으로
            showWelcome();
        }
    } catch (e) {
        console.error(e);
        alert('서버 통신 오류');
        // 에러 발생 시 다시 웰컴 화면으로
        showWelcome();
    } finally {
        // 로딩 상태 해제 (성공/실패 여부와 관계없이)
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

/**
 * 퀴즈 문제 화면 렌더링
 */
function renderQuizQuestion() {
    const quiz = currentQuizData[currentQuizIndex];
    const content = document.getElementById('chatContent');

    content.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-play-card">
                <div class="quiz-progress">문제 ${currentQuizIndex + 1} / ${currentQuizData.length}</div>
                <div class="quiz-question-text">${quiz.question}</div>
                
                <div class="quiz-ox-buttons" id="oxButtons">
                    <button class="quiz-ox-btn quiz-btn-o" onclick="checkAnswer('O')">O</button>
                    <button class="quiz-ox-btn quiz-btn-x" onclick="checkAnswer('X')">X</button>
                </div>

                <div id="quizFeedback"></div>
                
                <button class="quiz-stop-btn" onclick="stopQuiz()" style="
                    margin-top: 30px; 
                    background: transparent; 
                    border: 1px solid var(--border); 
                    color: var(--text-secondary);
                    padding: 8px 16px; 
                    border-radius: 8px; 
                    cursor: pointer;">
                    퀴즈 그만하기
                </button>

                <button id="btnNextQuiz" class="quiz-next-btn" onclick="nextQuestion()" style="display: none;">다음 문제</button>
            </div>
        </div>
    `;
}

/**
 * 사용자 답변 체크
 * @param {string} userChoice - 'O' 또는 'X'
 */
function checkAnswer(userChoice) {
    const quiz = currentQuizData[currentQuizIndex];
    const feedback = document.getElementById('quizFeedback');
    const buttons = document.getElementById('oxButtons');
    const nextButton = document.getElementById('btnNextQuiz');

    // 버튼 재클릭 방지
    buttons.style.pointerEvents = 'none';
    buttons.style.opacity = '0.6';

    const isCorrect = userChoice === quiz.answer;
    if (isCorrect) quizScore++;

    const resultClass = isCorrect ? 'correct' : 'wrong';
    const resultText = isCorrect ? '정답입니다! 🎉' : `틀렸습니다 😅 (정답: ${quiz.answer})`;

    feedback.innerHTML = `
        <div class="quiz-feedback ${resultClass}">
            <div class="feedback-result">${resultText}</div>
            <div class="feedback-explanation">${quiz.explanation}</div>
            <div class="feedback-source">출처: ${quiz.source}</div>
            <button class="quiz-next-btn" onclick="nextQuestion()">
                ${currentQuizIndex < currentQuizData.length - 1 ? '다음 문제' : '결과 보기'}
            </button>
        </div>
    `;
}

/**
 * 다음 문제로 이동
 */
function nextQuestion() {
    currentQuizIndex++;
    if (currentQuizIndex < currentQuizData.length) {
        renderQuizQuestion();
    } else {
        showQuizResult();
    }
}

/**
 * 퀴즈 중단 함수
 */
function stopQuiz() {
    if (confirm('퀴즈를 중단하시겠습니까?')) {
        // 퀴즈 상태 초기화
        currentQuizData = [];
        currentQuizIndex = 0;
        quizScore = 0;
        // 캐시 삭제 후 기본 화면으로
        delete modeContentCache['quiz'];
        showWelcome();
    }
}

/**
 * 퀴즈 최종 결과 표시
 */
function showQuizResult() {
    const content = document.getElementById('chatContent');
    content.innerHTML = `
        <div class="quiz-container">
            <div class="quiz-setup-card">
                <div class="quiz-setup-title">퀴즈 종료! 🏁</div>
                <div class="quiz-final-score">${quizScore} / ${currentQuizData.length}</div>
                <p>수고하셨습니다!</p>
                <button class="quiz-start-btn" onclick="showWelcome()">다시 하기</button>
            </div>
        </div>
    `;
}
