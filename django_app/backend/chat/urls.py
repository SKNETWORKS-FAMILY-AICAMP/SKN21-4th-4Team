from django.urls import path
from . import views

urlpatterns = [
    path('stream/', views.chat_stream, name='chat_stream'),
    path('bookmarks/', views.get_bookmarks, name='get_bookmarks'), # 목록 조회
    path('bookmarks/create/', views.create_bookmark, name='create_bookmark'), # 저장
    path('bookmarks/<int:bookmark_id>/delete/', views.delete_bookmark, name='delete_bookmark'), # 삭제
]