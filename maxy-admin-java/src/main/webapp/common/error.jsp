<%@ page contentType="text/html; charset=utf-8" pageEncoding="utf-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="spring" uri="http://www.springframework.org/tags" %>
<!DOCTYPE html>
<html>
<head>
    <meta
        content='width=device-width, user-scalable=yes, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0'
        name='viewport'>
    <meta charset='utf-8'>
    <meta content='IE=edge' http-equiv='X-UA-Compatible'>
    <title>Error</title>
    <link rel="shortcut icon" href="<c:url value="/favicon.ico"/>" type="image/x-icon">
    <link rel="icon" href="<c:url value="/favicon.ico"/>" type="image/x-icon">
    <!-- css load -->
    <link href="<c:url value="/css/common/reset.css"/>" rel="stylesheet"/>
    <link href="<c:url value="/css/common/common.css"/>" rel="stylesheet"/>
    <!-- //css load -->

    <!-- js load -->
    <script src='<c:url value="/vendor/jquery/jquery-3.6.0.min.js"/>'></script>
    <script src='<c:url value="/js/common/common.js"/>'></script>
    <!--// js load -->

    <style>
        .err_wrap {
            width: 100vw;
            height: 100vh;
            background: url(/images/maxy/img-error-bg.png) no-repeat center /96% 94%, var(--black-7);
            position: relative;
            padding: 52px 56px;
        }

        .err_wrap .logo_m {
            position: absolute;
            right: 56px;
            bottom: 52px;
        }

        .err_wrap .err_box {
            width: 280px;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }

        .err_box > img {
            margin: 0 auto 32px;
        }

        .err_box > h4 {
            font-size: 24px;
            font-weight: var(--bold);
            margin-top: 32px;
        }

        .err_box > p {
            color: var(--black-6);
            line-height: 2;
            margin-top: 24px;
        }

        .err_box .go_btn {
            display: block;
            width: 100%;
            height: 40px;
            line-height: 40px;
            text-align: center;
            background-color: var(--green-1);
            border-radius: var(--radius);
            color: var(--black-0);
            font-weight: var(--bold);
            margin-top: 32px;
        }
    </style>
</head>
<body>

<div class="err_wrap">
    <div class="err_box">
        <img src="<c:url value="/images/maxy/img-error.svg"/>" alt="">
        <h4>404 PAGE NOT FOUND</h4>
        <p>
            페이지를 찾을 수 없습니다.<br>
            로그아웃 후 로그인 화면으로 이동합니다.
        </p>
        <a href="#" class="go_btn" id="btnGoLogin">로그인 페이지로 이동</a>
    </div>
    <span class="logo_m">
        <img src="<c:url value="/images/maxy/logo-m.svg"/>" alt="">
    </span>
</div>
</body>
<script>
    $('#btnGoLogin').on('click', () => {
        location.href = '<c:url value="/ln/doLogout.maxy" />'
    })
</script>
</html>