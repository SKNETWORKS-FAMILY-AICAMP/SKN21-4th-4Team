from django.urls import path
from . import views

urlpatterns = [
    path('', views.code_page, name='code_page'),
    path('execute/', views.execute_code, name='execute_code'),
    path('review/', views.ai_review, name='ai_review'),
]
