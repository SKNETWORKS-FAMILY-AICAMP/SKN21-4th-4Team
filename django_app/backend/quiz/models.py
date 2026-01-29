from django.db import models
from django.conf import settings

# Create your models here.
class QuizBookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_bookmarks')
    quiz_id = models.CharField(max_length=255) # Qdrant Point ID
    question = models.TextField()
    answer = models.CharField(max_length=10) # O/X
    explanation = models.TextField()
    source = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'quiz_id') # 중복 북마크 방지
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.question[:20]}..."
