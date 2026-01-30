from django.shortcuts import render
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
import json
import os
import sys
import subprocess
from openai import OpenAI

@login_required
def code_page(request):
    """코딩 페이지 렌더링"""
    return render(request, 'code.html')

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def execute_code(request):
    """파이썬 코드 실행 API"""
    try:
        data = json.loads(request.body)
        code = data.get('code', '')
        
        if not code:
            return JsonResponse({'success': False, 'error': '코드가 없습니다.'}, status=400)

        # 보안상 위험한 키워드 필터링
        forbidden = ['import os', 'import sys', 'subprocess', 'open(', 'eval(', 'exec(']
        for word in forbidden:
            if word in code:
                return JsonResponse({
                    'success': True, 
                    'output': '', 
                    'error': f'보안 경고: "{word}" 사용이 제한됩니다.'
                })

        # 코드 실행 (subprocess)
        # 타임아웃 5초 설정
        result = subprocess.run(
            [sys.executable, '-c', code], 
            capture_output=True, 
            text=True, 
            timeout=5
        )
        
        output = result.stdout
        error = result.stderr
        
        return JsonResponse({
            'success': True,
            'output': output,
            'error': error
        })

    except subprocess.TimeoutExpired:
        return JsonResponse({
            'success': False,
            'error': '시간 초과: 코드가 5초 내에 종료되지 않았습니다.'
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def ai_review(request):
    """AI 코드 리뷰 스트리밍 API"""
    try:
        data = json.loads(request.body)
        code = data.get('code', '')

        if not code:
            return JsonResponse({'error': '코드가 없습니다.'}, status=400)

        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

        def generate():
            try:
                stream = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "당신은 친절한 파이썬 튜터입니다. 학생의 코드를 리뷰하고 개선점, 잠재적 버그, 더 나은 구현 방법을 알려주세요."},
                        {"role": "user", "content": f"다음 코드를 리뷰해주세요:\n\n```python\n{code}\n```"}
                    ],
                    stream=True,
                    max_tokens=1000,
                    temperature=0.7
                )

                full_response = ""
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        content = chunk.choices[0].delta.content
                        full_response += content
                        yield f"data: {json.dumps({'type': 'chunk', 'data': content})}\n\n"

                yield f"data: {json.dumps({'type': 'done'})}\n\n"

            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

        return StreamingHttpResponse(generate(), content_type='text/event-stream')

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
