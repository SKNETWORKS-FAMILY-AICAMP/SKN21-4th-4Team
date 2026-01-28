"""
Quiz 앱 URL 설정
"""
from django.urls import path
from . import views

app_name = 'quiz'

urlpatterns = [
    # 퀴즈 페이지
    path('', views.quiz_page, name='quiz_page'),
    # 퀴즈 API (상위 config/urls.py에서 /api/quiz/로 라우팅됨)
]
