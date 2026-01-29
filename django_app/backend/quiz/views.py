from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
import sys
import json
from pathlib import Path
from .models import QuizBookmark

# 프로젝트 루트 경로 추가 (src 폴더 접근용)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent  # /app (src import용)
sys.path.insert(0, str(PROJECT_ROOT))

from src.quiz_service import QuizService

# QuizService 인스턴스 생성
quiz_service = QuizService()

@login_required
def quiz_page(request):
    """퀴즈 페이지 렌더링"""
    return render(request, 'quiz.html')

def get_quiz(request):
    """
    퀴즈 데이터 반환 API
    """
    category = request.GET.get('category', 'all')
    
    try:
        count = int(request.GET.get('count', 5))
    except ValueError:
        count = 5
    
    try:
        quizzes = quiz_service.get_quizzes(category, count)
        
        # 로그인한 유저의 경우 북마크 여부 확인
        if request.user.is_authenticated:
            bookmarked_ids = set(QuizBookmark.objects.filter(user=request.user).values_list('quiz_id', flat=True))
            for quiz in quizzes:
                # Qdrant ID와 비교 (문자열 변환)
                quiz['bookmarked'] = str(quiz.get('id')) in bookmarked_ids
        
        return JsonResponse({'success': True, 'quizzes': quizzes})
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e),
            'message': '퀴즈 데이터를 불러올 수 없습니다.'
        }, status=500)

@login_required
@require_http_methods(["GET"])
def get_bookmarks(request):
    """퀴즈 북마크 목록 조회 API"""
    bookmarks = QuizBookmark.objects.filter(user=request.user).values(
        'id', 'quiz_id', 'question', 'answer', 'explanation', 'created_at'
    )
    return JsonResponse({'success': True, 'bookmarks': list(bookmarks)})

@login_required
@require_http_methods(["POST"])
def create_bookmark(request):
    """퀴즈 북마크 저장 API (중복 체크)"""
    try:
        data = json.loads(request.body)
        quiz_id = str(data.get('quiz_id'))
        
        if not quiz_id:
            return JsonResponse({'success': False, 'message': 'Quiz ID is required'}, status=400)
            
        # 중복 확인
        exists = QuizBookmark.objects.filter(user=request.user, quiz_id=quiz_id).exists()
        if exists:
            return JsonResponse({'success': False, 'message': '이미 저장된 문제입니다.'})
            
        QuizBookmark.objects.create(
            user=request.user,
            quiz_id=quiz_id,
            question=data.get('question', ''),
            answer=data.get('answer', ''),
            explanation=data.get('explanation', ''),
            source=data.get('source', '')
        )
        return JsonResponse({'success': True, 'message': '저장되었습니다!'})
            
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@login_required
@require_http_methods(["DELETE"])
def delete_bookmark(request, bookmark_id):
    """퀴즈 북마크 삭제 API (ID 기반)"""
    try:
        bookmark = QuizBookmark.objects.get(id=bookmark_id, user=request.user)
        bookmark.delete()
        return JsonResponse({'success': True, 'message': '삭제되었습니다.'})
    except QuizBookmark.DoesNotExist:
        return JsonResponse({'success': False, 'message': '북마크를 찾을 수 없습니다.'}, status=404)
        
# 구버전 호환성 유지 (필요하다면 삭제, 여기선 create_bookmark로 안내)
@login_required
@require_http_methods(["POST"])
def toggle_bookmark(request):
    """(구) 토글 API - 점진적 제거 예정"""
    return create_bookmark(request)