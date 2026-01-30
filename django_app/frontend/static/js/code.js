// 테마 토글
function toggleTheme() {
    const body = document.body;
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // 아이콘 업데이트
    updateThemeIcon(newTheme === 'dark');

    // Monaco Editor 테마 변경
    if (window.monacoEditor) {
        monaco.editor.setTheme(newTheme === 'dark' ? 'vs-dark' : 'vs-light');
    }
}

// 아이콘 업데이트 함수
function updateThemeIcon(isDark) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.innerHTML = isDark
            ? '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'
            : '<circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />';
    }
}

// 사이드바 토글 (모바일용 Left)
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// 스튜디오 토글 (Right Sidebar)
function toggleStudio() {
    const studio = document.querySelector('.sidebar-right');
    studio.classList.toggle('active');
}

// 초기 테마 설정
const savedTheme = localStorage.getItem('theme') || 'light';
document.body.setAttribute('data-theme', savedTheme);
document.addEventListener('DOMContentLoaded', () => {
    updateThemeIcon(savedTheme === 'dark');
});

// Monaco Editor 초기화
let editor;
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' } });

require(['vs/editor/editor.main'], function () {
    editor = monaco.editor.create(document.getElementById('monaco-editor'), {
        value: 'print("Hello, Py_Mate!")\n',
        language: 'python',
        theme: savedTheme === 'dark' ? 'vs-dark' : 'vs-light',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14
    });
    window.monacoEditor = editor;
});

// 예제 코드 데이터
const challenges = {
    'basic': 'print("Hello, World!")\nprint(10 + 20)',
    'calc': 'a = 10\nb = 5\n\nprint(f"더하기: {a + b}")\nprint(f"빼기: {a - b}")\nprint(f"곱하기: {a * b}")\nprint(f"나누기: {a / b}")',
    'loop': 'for i in range(1, 10):\n    print(f"2 x {i} = {2 * i}")',
    'fibonacci': 'def fib(n):\n    if n <= 1: return n\n    return fib(n-1) + fib(n-2)\n\nfor i in range(10):\n    print(fib(i), end=" ")'
};

function loadChallenge(key) {
    if (editor && challenges[key]) {
        editor.setValue(challenges[key]);
        if (window.innerWidth <= 768) {
            toggleSidebar(); // 모바일에서는 선택 후 사이드바 닫기
        }
    }
}

// 코드 실행
async function executeCode() {
    if (!editor) return;
    const code = editor.getValue();
    const outputEl = document.getElementById('codeOutput');

    outputEl.textContent = '실행 중...';

    try {
        const response = await fetch('/code/execute/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code })
        });

        const data = await response.json();

        if (data.success) {
            outputEl.textContent = data.output || '(출력 결과 없음)';
            if (data.error) {
                outputEl.textContent += '\n[Error]\n' + data.error;
            }
        } else {
            outputEl.textContent = '실행 오류: ' + (data.error || '알 수 없는 오류');
        }
    } catch (e) {
        outputEl.textContent = '서버 통신 오류: ' + e.message;
    }
}

// AI 리뷰 요청
async function requestAIReview() {
    if (!editor) return;
    const code = editor.getValue();
    const reviewBox = document.getElementById('aiReviewContainer');
    const reviewContent = document.getElementById('aiReviewContent');

    reviewBox.style.display = 'block';
    reviewContent.textContent = 'AI 선생님이 코드를 살펴보고 있어요...';

    try {
        const response = await fetch('/code/review/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code: code })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        reviewContent.textContent = ''; // 초기화

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonData = JSON.parse(line.substring(6));
                    if (jsonData.type === 'chunk') {
                        reviewContent.textContent += jsonData.data;
                    }
                    // done 등 다른 타입 처리...
                }
            }
        }

    } catch (e) {
        reviewContent.textContent = '오류 발생: ' + e.message;
    }
}
