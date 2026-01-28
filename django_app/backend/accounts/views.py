from django.shortcuts import render, redirect
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import SignUpForm, LoginForm


def login_page(request):
    """로그인 페이지"""
    if request.method == 'POST':
        form = LoginForm(request.POST)

        if form.is_valid():
            username = form.cleaned_data['username']
            password = form.cleaned_data['password']
            user = authenticate(request, username=username, password=password)

            # 로그인 성공 후 채팅 페이지로
            if user is not None:
                login(request, user)
                messages.success(request, f"{username}님 환영합니다!")
                return redirect('chat')

            # 로그인 실패
            else:
                messages.error(request, '아이디 또는 비밀번호가 틀렸습니다.')
    else:
        form = LoginForm()

    return render(request, 'accounts/login.html', {'form': form})

def signup_page(request):
    """회원가입 페이지"""

    if request.method == 'POST':
        form = SignUpForm(request.POST)

        if form.is_valid():
            user = form.save()
            login(request, user) # 가입 후 자동 로그인
            messages.success(request, '회원가입이 완료되었습니다!')
            return redirect('chat')
        
        else:
            # 각 필드별 에러 메시지 표시
            for field, errors in form.errors.items():
                for error in errors:
                    if field == '__all__':
                        messages.error(request, error)
                    else:
                        messages.error(request, f'{field}: {error}')

    else:
        form = SignUpForm()

    return render(request, 'accounts/signup.html', {'form': form})

def logout_view(request):
    """로그아웃"""
    logout(request)
    messages.info(request, '로그아웃되었습니다.')
    return redirect('login')

@login_required
def mypage_page(request):
    return render(request, 'accounts/mypage.html')