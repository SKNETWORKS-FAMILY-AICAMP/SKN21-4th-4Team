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
                # 환영 메시지를 chat 페이지에서 표시하지 않고 바로 리다이렉트
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

from django_app.backend.quiz.models import QuizBookmark
from django_app.backend.chat.models import ChatBookmark

from django.contrib.auth.forms import PasswordChangeForm
from django.contrib.auth import update_session_auth_hash
from .forms import UserUpdateForm, ProfileUpdateForm
from .models import UserProfile

@login_required
def mypage_page(request):
    # 프로필 없으면 생성 (Signal 적용 전 유저 대비)
    if not hasattr(request.user, 'profile'):
        UserProfile.objects.create(user=request.user)

    quiz_bookmarks = QuizBookmark.objects.filter(user=request.user)
    chat_bookmarks = ChatBookmark.objects.filter(user=request.user)
    
    u_form = UserUpdateForm(instance=request.user)
    p_form = ProfileUpdateForm(instance=request.user.profile)
    pw_form = PasswordChangeForm(request.user)
    
    context = {
        'quiz_bookmarks': quiz_bookmarks,
        'chat_bookmarks': chat_bookmarks,
        'u_form': u_form,
        'p_form': p_form,
        'pw_form': pw_form,
        'profile': request.user.profile
    }
    return render(request, 'accounts/mypage.html', context)

@login_required
def update_profile(request):
    if request.method == 'POST':
        if not hasattr(request.user, 'profile'):
            UserProfile.objects.create(user=request.user)
            
        u_form = UserUpdateForm(request.POST, instance=request.user)
        p_form = ProfileUpdateForm(request.POST, instance=request.user.profile)
        
        if u_form.is_valid() and p_form.is_valid():
            u_form.save()
            p_form.save()
            messages.success(request, '프로필이 업데이트되었습니다!')
            return redirect('mypage')
        else:
            messages.error(request, '프로필 업데이트 실패. 입력값을 확인해주세요.')
    
    return redirect('mypage')

@login_required
def change_password(request):
    if request.method == 'POST':
        form = PasswordChangeForm(request.user, request.POST)
        if form.is_valid():
            user = form.save()
            update_session_auth_hash(request, user)  # 중요: 암호 변경 후 로그아웃 방지
            messages.success(request, '비밀번호가 성공적으로 변경되었습니다!')
            return redirect('mypage')
        else:
            messages.error(request, '비밀번호 변경 실패. 입력값을 확인해주세요.')
    return redirect('mypage')

@login_required
def delete_user(request):
    if request.method == 'POST':
        user = request.user
        user.delete()
        logout(request)
        messages.success(request, '회원 탈퇴가 완료되었습니다.')
        return redirect('login')
    return redirect('mypage')