from django.urls import path
from . import views

urlpatterns = [
    path('stream/', views.chat_stream, name='chat_stream'),
    path('studio/', views.studio_stream, name='studio_stream'),  # 스튜디오 전용 API
    path('bookmarks/', views.get_bookmarks, name='get_bookmarks'), # 목록 조회
    path('bookmarks/create/', views.create_bookmark, name='create_bookmark'), # 저장
    path('bookmarks/<int:bookmark_id>/delete/', views.delete_bookmark, name='delete_bookmark'), # 삭제
    path('code/execute/', views.execute_code, name='execute_code'), # 코드 실행
    path('code/review/', views.review_code, name='review_code'), # 코드 리뷰
]