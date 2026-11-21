from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'review_type', 'rating', 'title', 'is_approved', 'created_at']
    list_filter = ['review_type', 'rating', 'is_approved', 'created_at']
    search_fields = ['title', 'comment', 'user__username']
