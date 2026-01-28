from django.shortcuts import render

# Create your views here.

def quiz_page(request):
    return render(request, 'quiz.html')