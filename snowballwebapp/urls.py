"""mysite URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import include, path, re_path

from snowball_main import views

urlpatterns = [
    path("admin/", admin.site.urls, "admin", "admin"),
    path("", include("django.contrib.auth.urls"), "auth", "auth"),
    path("", include("social_django.urls", namespace="social")),
    re_path("^auth/", include("drf_social_oauth2.urls", namespace="drf")),
    re_path("^o/", include("oauth2_provider.urls", namespace="oauth2_provider")),
    path("", include("snowball_main.urls", namespace="snowball_main")),
    path("blog/", include("snowball_blog.urls", namespace="snowball_blog")),
    path(
        "",
        include("snowball_authentication.urls", namespace="snowball_authentication"),
    ),
]

handler404 = views.page_not_found
handler500 = views.server_error
handler403 = views.permission_denied
handler400 = views.bad_request
