<%@ page import="com.thinkm.maxy.vo.MaxyUser" %>
<%@ page import="com.thinkm.maxy.service.common.UserService" %>
<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>

<c:set var="protocol" value="http"/>
<c:if test="<%=request.isSecure()%>">
    <c:set var="protocol" value="https"/>
</c:if>

<%
    String url = request.getContextPath();
    if (request.getSession().getAttribute("loginUser") == null
        || "".equals(request.getSession().getAttribute("loginUser"))) {

        MaxyUser user = null; // UserService.getSessionLoginInfo(request);

        if (user == null) {
            response.sendRedirect(url + "/ln/doLogout.maxy");
            return;
        }
    }

    MaxyUser loginUser = (MaxyUser) request.getSession().getAttribute("loginUser");
%>
<c:set var="loginUser" value="<%=loginUser %>"/>