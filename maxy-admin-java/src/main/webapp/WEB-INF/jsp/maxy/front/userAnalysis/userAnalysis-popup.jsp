<%--suppress HtmlFormInputWithoutLabel --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<title data-t="menu.user.analysis"></title>
<jsp:include page="../../common/import.jsp"/>
<jsp:include page="../../common/import-hc.jsp"/>
<jsp:include page="../../common/import-components.jsp"/>
<jsp:include page="../../common/commonScript.jsp"/>
<jsp:include page="../../common/sessionHandler.jsp"/>
<jsp:include page="../../common/chartScript.jsp"/>
<style>
    .user_flow_wrap .graph_wrap .user_behavior_analysis_wrap .page .page_content.act {
        height: 120px;
    }
</style>
<header class="main_header">
    <div class="h_left">
        <span class="logo_img">
            <img class="maxy_logo_dk" alt="">
            <img class="maxy_logo_front">
        </span>
    </div>
</header>

<!-- 사용자 분석 -->
<div class="contents_wrap" id="userAnalysisPopup"></div>
<div class="s_replay_dimmed" data-content="dimmed"></div>
<script type="text/javascript" src="${pageContext.request.contextPath}/js/front/frontUaScript.js"></script>