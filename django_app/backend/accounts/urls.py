from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.login_page, name='login'),
    path('signup/', views.signup_page, name='signup'),
    path('logout/', views.logout_view, name='logout'),
    path('mypage/', views.mypage_page, name='mypage'),
    path('mypage/update/', views.update_profile, name='update_profile'),
    path('mypage/password/', views.change_password, name='change_password'),
    path('mypage/delete/', views.delete_user, name='delete_user'),
]
