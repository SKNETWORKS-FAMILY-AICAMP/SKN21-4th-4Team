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
from django.shortcuts import redirect
from django.urls import path, include
from app.backend.chat import views as chat_views
from app.backend.quiz import views as quiz_views
from app.backend.accounts import views as accounts_views

urlpatterns = [
    path('admin/', admin.site.urls),

    path('chat/', include('app.backend.chat.urls')),
    path('quiz/', include('app.backend.quiz.urls')),
    path('code/', include('app.backend.code.urls')),

    # API 경로 추가 (JS 호환성)
    path('api/chat/', include(('app.backend.chat.urls', 'chat'), namespace='api_chat')),
    path('api/quiz/', include(('app.backend.quiz.urls', 'quiz'), namespace='api_quiz')),
    path('api/code/', include(('app.backend.code.urls', 'code'), namespace='api_code')),
    path('', include('app.backend.accounts.urls')), # login, mypage 등 (짧은 URL)
    path('', include('app.backend.chat.urls')),  # 루트 접속 시 chat으로 (로그인 되어있을 경우)
    # path('', main_views.main_page, name = 'main'),
]

from django.conf import settings
from django.conf.urls.static import static

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
