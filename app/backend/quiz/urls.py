"""
Quiz 앱 URL 설정
"""
from django.urls import path
from . import views

app_name = 'quiz'

urlpatterns = [
    # 퀴즈 페이지
    path('', views.quiz_page, name='quiz_page'),
    # 퀴즈 API
    path('api/', views.get_quiz, name='api_quiz'),
    path('api/bookmarks/', views.get_bookmarks, name='get_bookmarks'),
    path('api/bookmarks/create/', views.create_bookmark, name='create_bookmark'),
    path('api/bookmarks/<int:bookmark_id>/delete/', views.delete_bookmark, name='delete_bookmark'),
]
