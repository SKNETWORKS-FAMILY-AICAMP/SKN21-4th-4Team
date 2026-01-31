"""
에러 핸들링 미들웨어
모든 API 요청에서 발생하는 예외를 JSON 형식으로 반환
"""

from django.http import JsonResponse
import traceback


class ErrorHandlerMiddleware:
    """
    전역 에러 핸들링 미들웨어
    API 요청에서 발생하는 모든 예외를 캐치하여 JSON으로 반환
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        return self.get_response(request)

    def process_exception(self, request, exception):
        """
        예외 발생 시 호출되는 메서드
        
        Args:
            request: Django HttpRequest 객체
            exception: 발생한 예외 객체
            
        Returns:
            JsonResponse: 에러 정보를 담은 JSON 응답
        """
        # 개발 모드에서는 전체 스택 트레이스 출력
        print("=" * 60)
        print("🔥 ErrorHandlerMiddleware: 예외 발생")
        print("=" * 60)
        traceback.print_exc()
        print("=" * 60)
        
        # API 요청인 경우 JSON 응답 반환
        if request.path.startswith('/api/'):
            return JsonResponse({
                'success': False,
                'error': str(exception),
                'type': type(exception).__name__,
                'message': '서버 오류가 발생했습니다. 관리자에게 문의하세요.'
            }, status=500)
        
        # API가 아닌 경우 None 반환 (Django 기본 에러 핸들러 사용)
        return None
