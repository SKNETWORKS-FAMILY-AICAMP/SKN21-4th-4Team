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

// 코딩 테스트 문제 데이터
const problems = {
    'basic_1': {
        title: "문자열 출력하기",
        desc: `[문제 설명]
문자열 str이 주어질 때, str을 출력하는 코드를 작성해 보세요.

[제한사항]
1 ≤ str의 길이 ≤ 1,000,000
str에는 공백이 없으며, 첫째 줄에 한 줄로만 주어집니다.

[입출력 예]
입력: HelloWorld!
출력: HelloWorld!`,
        code: `str = input()
print(str)`
    },
    'intro_1': {
        title: "문자열안에 문자열",
        desc: `[문제 설명]
문자열 str1, str2가 매개변수로 주어집니다.
str1 안에 str2가 있다면 1을, 없다면 2를 return하도록 solution 함수를 완성해주세요.

[제한사항]
1 ≤ str1의 길이 ≤ 100
1 ≤ str2의 길이 ≤ 100
문자열은 알파벳 대문자, 소문자, 숫자로 구성되어 있습니다.

[입출력 예]
str1: "ab6CDE443fgh22iJKlmn1o", str2: "6CD" -> result: 1
str1: "ppprrrogrammers", str2: "pppp" -> result: 2`,
        code: `def solution(str1, str2):
    answer = 0
    return answer`
    },
    'adv_1': {
        title: "폰켓몬",
        desc: `[문제 설명]
총 N 마리의 폰켓몬 중에서 N/2마리를 가져가도 좋다고 했습니다.
N마리 폰켓몬의 종류 번호가 담긴 배열 nums가 매개변수로 주어질 때,
N/2마리의 폰켓몬을 선택하는 방법 중, 가장 많은 종류의 폰켓몬을 선택하는 방법을 찾아,
그때의 폰켓몬 종류 번호의 개수를 return 하도록 solution 함수를 완성해주세요.

[제한사항]
nums는 폰켓몬의 종류 번호가 담긴 1차원 배열입니다.
nums의 길이(N)는 1 이상 10,000 이하의 자연수이며, 항상 짝수로 주어집니다.

[입출력 예]
[3,1,2,3] -> 2
[3,3,3,2,2,4] -> 3`,
        code: `def solution(nums):
    answer = 0
    return answer`
    }
};

function loadProblem(key) {
    if (editor && problems[key]) {
        const p = problems[key];
        // 문제 설명을 주석으로 상단에 추가
        const content = '"""\n' + p.title + '\n\n' + p.desc + '\n"""\n\n' + p.code;

        editor.setValue(content);

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
