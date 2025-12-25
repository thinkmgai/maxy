package com.thinkm.common.util;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletRequestWrapper;
import java.util.Iterator;
import java.util.Map;

public class HTMLTagFilterRequestWrapper extends HttpServletRequestWrapper {
    public HTMLTagFilterRequestWrapper(HttpServletRequest request) {
        super(request);
    }

    public String[] getParameterValues(String parameter) {
        String[] values = super.getParameterValues(parameter);
        if (values == null) {
            return null;
        } else {
            for (int i = 0; i < values.length; ++i) {
                if (values[i] != null) {
                    values[i] = this.getSafeParamData(values[i]);
                } else {
                    values[i] = null;
                }
            }

            return values;
        }
    }

    public String getParameter(String parameter) {
        String value = super.getParameter(parameter);
        if (value == null) {
            return null;
        } else {
            value = this.getSafeParamData(value);
            return value;
        }
    }

    public Map<String, String[]> getParameterMap() {
        Map<String, String[]> valueMap = super.getParameterMap();
        Iterator var3 = valueMap.keySet().iterator();

        while (var3.hasNext()) {
            String key = (String) var3.next();
            String[] values = (String[]) valueMap.get(key);

            for (int i = 0; i < values.length; ++i) {
                if (values[i] != null) {
                    values[i] = this.getSafeParamData(values[i]);
                } else {
                    values[i] = null;
                }
            }
        }

        return valueMap;
    }

    public String getSafeParamData(String value) {
        StringBuilder stringBuilder = new StringBuilder();

        for (int i = 0; i < value.length(); ++i) {
            char c = value.charAt(i);
            switch (c) {
                case '"':
                    stringBuilder.append("&quot;");
                    break;
                case '&':
                    stringBuilder.append("&amp;");
                    break;
                case '\'':
                    stringBuilder.append("&apos;");
                    break;
                case '<':
                    stringBuilder.append("&lt;");
                    break;
                case '>':
                    stringBuilder.append("&gt;");
                    break;
                default:
                    stringBuilder.append(c);
            }
        }

        value = stringBuilder.toString();
        return value;
    }
}
