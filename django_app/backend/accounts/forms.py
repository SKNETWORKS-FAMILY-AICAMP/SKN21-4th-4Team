# accounts/forms.py

from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from django.core.validators import RegexValidator

class SignUpForm(UserCreationForm):
    """회원가입 폼"""
    
    # 아이디: 영어+숫자만, 최대 20글자
    username = forms.CharField(
        max_length=20,
        validators=[
            RegexValidator(
                regex='^[a-zA-Z0-9]+$',
                message='아이디는 영어와 숫자만 가능합니다.'
            )
        ]
    )
    
    # 이름: 최대 50글자
    name = forms.CharField(max_length=50, required=True)
    
    # 이메일
    email = forms.EmailField(required=True)
    
    # 비밀번호: 4~20글자 (password1, password2)
    password1 = forms.CharField(
        min_length=4,
        max_length=20,
        widget=forms.PasswordInput
    )
    password2 = forms.CharField(
        min_length=4,
        max_length=20,
        widget=forms.PasswordInput
    )
    class Meta:
        model = User
        fields = ('username', 'name', 'email', 'password1', 'password2')

class LoginForm(forms.Form):
    """로그인 폼"""
    username = forms.CharField(max_length=20)
    password = forms.CharField(widget=forms.PasswordInput)

from .models import UserProfile

class UserUpdateForm(forms.ModelForm):
    email = forms.EmailField(required=True)
    
    class Meta:
        model = User
        fields = ['username', 'email']
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['username'].disabled = True # 아이디는 수정 불가
        self.fields['username'].help_text = None

class ProfileUpdateForm(forms.ModelForm):
    class Meta:
        model = UserProfile
        fields = ['nickname']
        labels = {
            'nickname': '닉네임'
        }