# chat/views.py

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import time
import sys
import re
import os
from pathlib import Path

# RAG 시스템 경로 설정
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.append(str(PROJECT_ROOT))

# main.py의 main 함수 import
from main import main as rag_main
from .models import ChatBookmark
from django_app.backend.quiz.models import QuizBookmark

# OpenAI 직접 호출을 위한 import
import os
from openai import OpenAI

@login_required
def chat_page(request):
    """챗봇 페이지 렌더링"""
    # 통계용: DB에서 데이터 가져오기
    quiz_count = QuizBookmark.objects.filter(user=request.user).count()
    note_count = ChatBookmark.objects.filter(user=request.user).count()
    
    # 템플릿 전달 데이터
    context = {
        'stats': {
            'quiz_count': quiz_count,
            'note_count': note_count
        }
    }
    return render(request, 'chat.html', context)

@csrf_exempt
def chat_stream(request):
    """챗봇 응답 스트리밍"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST만 허용'}, status=405)

    try:
        data = json.loads(request.body)
        message = data.get('message', '')
        
        # 필터링 옵션 받기 (추후 구현용)
        # filters = data.get('filters', {})

        def generate():
            """챗봇 응답 생성"""
            # RAG 호출
            response = rag_main(message, '1')

            # 1단계: 진행 상태 전송
            steps = [
                {'step': 1, 'title': 'Router', 'desc': '질문 분석'},
                {'step': 2, 'title': 'Router', 'desc': '문서 검색'},
                {'step': 3, 'title': 'Router', 'desc': '답변 생성'},
            ]
        
            for step in steps:
                yield f"data: {json.dumps({'type': 'step', 'data': step})}\n\n"
                time.sleep(0.3)

            # 2단계: 답변 텍스트 추출
            # LangChain 메시지 객체에서 content만 추출
            raw_answer = response.get('analyst_results', ['응답 없음'])[-1]
            
            # content 속성이 있으면 추출, 없으면 문자열 변환
            if hasattr(raw_answer, 'content'):
                answer = raw_answer.content
            elif isinstance(raw_answer, dict) and 'content' in raw_answer:
                answer = raw_answer['content']
            else:
                answer = str(raw_answer)

            yield f"data: {json.dumps({'type': 'message', 'data': answer})}\n\n"

            # 3단계: 연계 질문 (Suggested Questions) 전송
            suggested_questions = response.get('suggested_questions', [])
            if suggested_questions:
                yield f"data: {json.dumps({'type': 'questions', 'data': suggested_questions})}\n\n"

            # 4단계: 참고 자료 (Sources) 전송
            search_results = response.get('search_results', [])
            if search_results:
                # 불필요한 필드 제거 및 포맷팅 (정규식 활용 정제)
                formatted_sources = []
                for r in search_results:
                    # 1. 제목 처리
                    # metadata에 lecture_title이 있으면 최우선, 없으면 source, 그것도 없으면 '문서'
                    raw_title = r.get('metadata', {}).get('lecture_title', r.get('metadata', {}).get('source', '문서'))
                    # undefined 문자열 처리 및 ==[내부자료(origin)]== 제거
                    clean_title = str(raw_title).replace('undefined', '').strip()
                    clean_title = re.sub(r'==\[내부자료\(origin\)\]==', '', clean_title, flags=re.IGNORECASE).strip()
                    if not clean_title:
                        clean_title = '참고 자료'

                    # 2. 내용 처리
                    raw_content = r.get('content', '')
                    # === [내부 자료 (Original)] === 문구 제거
                    clean_content = re.sub(r'={2,}\s*\[내부\s*자료\s*\(Original\)\]\s*={2,}', '', raw_content, flags=re.IGNORECASE).strip()
                    clean_content = clean_content.replace('\n', ' ').strip()
                    
                    # 내용이 비어있으면 건너뛰기
                    if not clean_content:
                        continue

                    source_data = {
                        'type': r.get('metadata', {}).get('source', 'DOC').upper(),
                        'title': clean_title,
                        'content': clean_content[:300] + "..." if len(clean_content) > 300 else clean_content,
                        'score': round(r.get('score', 0) * 100, 1),
                        'metadata': r.get('metadata', {})
                    }
                    formatted_sources.append(source_data)
                
                if formatted_sources:
                    yield f"data: {json.dumps({'type': 'sources', 'data': formatted_sources}, ensure_ascii=False)}\n\n"

            # 완료 신호
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

        return StreamingHttpResponse(generate(), content_type='text/event-stream')
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
def studio_stream(request):
    """
    스튜디오 전용 API - RAG 없이 순수 LLM만 호출
    요약, 퀴즈, 플래시카드, 표 등 생성에 사용
    """
    if request.method != 'POST':
        return JsonResponse({'error': 'POST만 허용'}, status=405)

    try:
        data = json.loads(request.body)
        prompt = data.get('prompt', '')
        tool_type = data.get('type', 'default')  # summarize, quiz, flashcard, table, etc.

        if not prompt:
            return JsonResponse({'error': '프롬프트가 없습니다.'}, status=400)

        # OpenAI 클라이언트 초기화
        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        # 타입별 시스템 프롬프트
        system_prompts = {
            'summarize': '당신은 교육 콘텐츠를 간결하게 요약하는 전문가입니다. 핵심 내용을 3줄 이내로 요약해주세요.',
            'stepByStep': '당신은 복잡한 개념을 단계별로 설명하는 교육 전문가입니다. 1, 2, 3 단계로 나눠서 설명해주세요.',
            'table': '''당신은 정보를 표로 정리하는 전문가입니다.
반드시 마크다운 표 형식으로 정리해주세요.
예시:
| 항목 | 설명 |
|------|------|
| 개념1 | 설명1 |

열은 2-3개만 사용하고, 각 셀 내용은 20자 이내로 간결하게 작성하세요.''',
            'example': '당신은 다양한 예시를 들어 설명하는 교육 전문가입니다. 새로운 예시를 들어 설명해주세요.',
            'quiz': '''당신은 O/X 퀴즈를 만드는 전문가입니다. 
퀴즈는 반드시 1개만 만들어주세요.
반드시 다음 JSON 형식으로만 응답하세요:
{"quizzes": [{"question": "질문내용", "answer": true, "explanation": "해설"}]}
answer는 정답이 O이면 true, X이면 false입니다.''',
            'flashcard': '''당신은 플래시카드를 만드는 전문가입니다.
반드시 다음 JSON 형식으로만 응답하세요:
{"cards": [{"front": "질문/개념", "back": "답변/설명"}]}''',
            'default': '당신은 친절한 AI 튜터입니다. 학생의 학습을 도와주세요.'
        }

        system_prompt = system_prompts.get(tool_type, system_prompts['default'])

        def generate():
            try:
                # OpenAI API 스트리밍 호출
                stream = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    stream=True,
                    max_tokens=1500,
                    temperature=0.7
                )

                full_response = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        # 스트리밍으로 전송
                        yield f"data: {json.dumps({'type': 'chunk', 'data': content})}\n\n"

                # 최종 완료
                yield f"data: {json.dumps({'type': 'message', 'data': full_response})}\n\n"
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

        return StreamingHttpResponse(generate(), content_type='text/event-stream')

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


# ==========================================
# 📌 북마크 API (CRUD)
# ==========================================

@login_required
@require_http_methods(["GET"])
def get_bookmarks(request):
    """북마크 목록 조회 API"""
    bookmarks = ChatBookmark.objects.filter(user=request.user).values(
        'id', 'query', 'answer', 'created_at'
    )
    return JsonResponse({'success': True, 'bookmarks': list(bookmarks)})

@login_required
@require_http_methods(["POST"])
def create_bookmark(request):
    """북마크 저장 API (중복 체크)"""
    try:
        data = json.loads(request.body)
        query = data.get('query')
        answer = data.get('answer')
        
        if not query or not answer:
            return JsonResponse({'success': False, 'message': '내용이 없습니다.'}, status=400)

        # 중복 확인
        exists = ChatBookmark.objects.filter(user=request.user, query=query, answer=answer).exists()
        if exists:
            # 이미 존재하면 저장하지 않고 메시지 리턴
            return JsonResponse({'success': False, 'message': '이미 저장된 내용입니다.'})

        # 저장
        ChatBookmark.objects.create(user=request.user, query=query, answer=answer)
        return JsonResponse({'success': True, 'message': '저장되었습니다!'})
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required
@require_http_methods(["DELETE"])
def delete_bookmark(request, bookmark_id):
    """북마크 삭제 API"""
    try:
        bookmark = ChatBookmark.objects.get(id=bookmark_id, user=request.user)
        bookmark.delete()
        return JsonResponse({'success': True, 'message': '삭제되었습니다.'})
    except ChatBookmark.DoesNotExist:
        return JsonResponse({'success': False, 'message': '북마크를 찾을 수 없습니다.'}, status=404)

@login_required
@require_http_methods(["POST"])
def execute_code(request):
    """파이썬 코드 실행 API"""
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        
        if not code:
            return JsonResponse({'success': False, 'error': '코드가 없습니다.'}, status=400)

        # 보안상 위험한 키워드 필터링 (데모용 간단 차단)
        forbidden = ['import os', 'import sys', 'subprocess', 'open(', 'eval(', 'exec(']
        for word in forbidden:
            if word in code:
                return JsonResponse({
                    'success': True, 
                    'output': '', 
                    'error': f'보안 경고: "{word}" 사용이 제한됩니다.'
                })

        # 코드 실행 (subprocess)
        import subprocess
        # 타임아웃 5초 설정
        result = subprocess.run(
            ['python', '-c', code], 
            capture_output=True, 
            text=True, 
            timeout=5
        )
        
        output = result.stdout
        error = result.stderr
        
        return JsonResponse({'success': True, 'output': output, 'error': error})

    except subprocess.TimeoutExpired:
        return JsonResponse({'success': True, 'output': '', 'error': '실행 시간 초과 (5초)'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required
@csrf_exempt
def review_code(request):
    """AI 코드 리뷰 및 디버깅 API"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST만 허용'}, status=405)

    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        output = data.get('output', '')

        if not code:
            return JsonResponse({'error': '코드가 없습니다.'}, status=400)

        # 시스템 프롬프트 설정
        system_prompt = """당신은 친절한 파이썬 튜터입니다. 
학생이 작성한 코드와 실행 결과를 보고 다음을 수행하세요:
1. 에러가 있다면 원인을 쉽게 설명하고 해결책을 제시하세요.
2. 에러가 없다면 코드를 더 효율적으로 개선할 방법이나 칭찬을 해주세요.
3. 설명은 초보자가 이해하기 쉽게 하고, 예시 코드를 보여주세요.
4. 한국어로 답변하세요."""

        user_prompt = f"""
[작성한 코드]
{code}

[실행 결과]
{output}

이 코드를 리뷰해주세요.
"""

        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        def generate():
            try:
                stream = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    stream=True,
                    max_tokens=1000,
                    temperature=0.7
                )

                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        # 프론트엔드 형식에 맞춰 전송
                        yield f"data: {json.dumps({'type': 'chunk', 'data': content})}\n\n"
                
                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

        return StreamingHttpResponse(generate(), content_type='text/event-stream')

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)