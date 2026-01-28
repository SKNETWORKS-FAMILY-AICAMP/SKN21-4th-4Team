# chat/views.py

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import time

# RAG 시스템 경로 설정

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent.parent  # /app (backend/chat/views.py에서 3단계 상위)
sys.path.append(str(PROJECT_ROOT))

# main.py의 main 함수 import
from main import main as rag_main

@login_required
def chat_page(request):
    """챗봇 페이지 렌더링"""
    return render(request, 'chat.html')

@csrf_exempt
def chat_stream(request):
    """챗봇 응답 스트리밍"""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST만 허용'}, status=405)

    data = json.loads(request.body)
    message = data.get('message', '')

    def generate():
        """챗봇 응답 생성"""
        # RAG 호출
        response = rag_main(message)

        # 1단계: 진행 상태 전송
        steps = [
            {'step': 1, 'title': 'Router', 'desc': '질문 분석'},
            {'step': 2, 'title': 'Router', 'desc': '문서 검색'},
            {'step': 3, 'title': 'Router', 'desc': '답변 생성'},
        ]
    
        for step in steps:
            yield f"data: {json.dumps({'type': 'step', 'data': step})}\n\n"
            time.sleep(0.3)

        # 2단계: 답변 텍스트
        answer = str(response.get('analyst_results', ['응답 없음'])[-1])

        yield f"data: {json.dumps({'type': 'message', 'data': answer})}\n\n"

        # 완료 신호
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingHttpResponse(generate(), content_type='text/event-stream')