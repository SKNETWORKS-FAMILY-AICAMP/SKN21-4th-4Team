"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from backend.chat import views as chat_views
from backend.quiz import views as quiz_views
from backend.accounts import views as accounts_views

urlpatterns = [
    path('admin/', admin.site.urls),

    # accounts
    path('login/', accounts_views.login_page, name='login'),
    path('signup/', accounts_views.signup_page, name = 'signup'),
    path('mypage/', accounts_views.mypage_page, name = 'mypage'),
    path('logout/',accounts_views.logout_view, name='logout'),

    # chat
    path('chat/', chat_views.chat_page, name = 'chat'),
    path('api/chat/', include('backend.chat.urls')), # API 경로

    # quiz
    path('quiz/', quiz_views.quiz_page, name = 'quiz'),
    
    # API endpoints
    path('api/quiz/', quiz_views.get_quiz, name='api_quiz'),

    # main 일단 보류 구현 안할시 로그인페이지로
    # path('', main_views.main_page, name = 'main'),
]
