from django.urls import path
from . import views

urlpatterns = [
    path('stream/', views.chat_stream, name='chat_stream'),
    path('bookmark/', views.toggle_bookmark, name='chat_bookmark'),
]