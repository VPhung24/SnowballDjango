from django.urls import path
from . import views

app_name = "snowball_main"

urlpatterns = [path("", views.home, name="home")]
