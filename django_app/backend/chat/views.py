# chat/views.py

from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import time
import sys
from pathlib import Path

# RAG 시스템 경로 설정
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
sys.path.append(str(PROJECT_ROOT))

# main.py의 main 함수 import
from main import main as rag_main
from .models import ChatBookmark
from django_app.backend.quiz.models import QuizBookmark

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