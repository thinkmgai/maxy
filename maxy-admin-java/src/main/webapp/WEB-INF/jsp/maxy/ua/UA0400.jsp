<%--suppress HtmlFormInputWithoutLabel --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%-- 사용자 분석 새창 열기 --%>
<title data-t="menu.user.analysis"></title>
<jsp:include page="../common/import.jsp"/>
<jsp:include page="../common/import-hc.jsp"/>
<jsp:include page="../common/import-components.jsp"/>
<jsp:include page="../common/commonScript.jsp"/>
<jsp:include page="../common/sessionHandler.jsp"/>
<jsp:include page="../common/chartScript.jsp"/>

<header class="main_header">
    <div class="h_left">
        <span class="logo_img">
            <img class="maxy_logo_dk" alt="">
        </span>
    </div>
</header>

<body>
<article class="contents_wrap" id="ua0400"></article>
<script type="text/javascript" src="${pageContext.request.contextPath}/js/common/uaScript.js"></script>