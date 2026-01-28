from django.shortcuts import render

# Create your views here.

def login_page(request):
    return render(request, 'accounts/login.html')

def signup_page(request):
    return render(request, 'accounts/signup.html')

def mypage_page(request):
    return render(request, 'accounts/mypage.html')