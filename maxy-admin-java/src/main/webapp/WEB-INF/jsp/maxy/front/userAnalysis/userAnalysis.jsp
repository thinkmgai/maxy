<%--suppress HtmlFormInputWithoutLabel --%>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<title data-t="menu.user.analysis"></title>
<style>
    .user_flow_wrap .graph_wrap .user_behavior_analysis_wrap .page .page_content.act {
        height: 120px;
    }

    .user_behavior_analysis_wrap .icon_os_ver {
        content: url(/images/maxy/icon-setting-small.svg);
        height: 12px;
    }


    .user_behavior_analysis_wrap .icon_web_type {
        content: url(/images/maxy/icon-web-type.svg);
        height: 12px;
    }
</style>
<!-- 사용자 분석 -->
<div class="contents_wrap" id="userAnalysis"></div>
<script type="text/javascript" src="${pageContext.request.contextPath}/js/front/frontUaScript.js"></script>