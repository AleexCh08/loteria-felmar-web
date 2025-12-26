from django.contrib.auth import logout

class OneSessionPerUserMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            current_key = request.session.session_key
            
            if hasattr(request.user, 'profile'):
                db_key = request.user.profile.last_session_key
                if db_key and current_key != db_key:
                    logout(request)

        response = self.get_response(request)
        return response