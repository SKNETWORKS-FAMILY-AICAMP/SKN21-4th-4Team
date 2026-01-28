from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from django.http import JsonResponse
import sys
from pathlib import Path

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
    Query Params:
      - category: 'python' | 'lecture' | 'all' (default: all)
      - count: int (default: 5)
    
    Returns:
      JSON: {'success': True, 'quizzes': [...]}
    """
    category = request.GET.get('category', 'all')
    
    try:
        count = int(request.GET.get('count', 5))
    except ValueError:
        count = 5
    
    try:
        quizzes = quiz_service.get_quizzes(category, count)
        return JsonResponse({'success': True, 'quizzes': quizzes})
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e),
            'message': '퀴즈 데이터를 불러올 수 없습니다.'
        }, status=500)