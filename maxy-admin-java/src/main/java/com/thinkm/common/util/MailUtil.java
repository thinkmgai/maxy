package com.thinkm.common.util;

import lombok.extern.slf4j.Slf4j;

import javax.mail.internet.InternetAddress;
import java.util.ArrayList;
import java.util.List;

@Slf4j
public class MailUtil {

    public static InternetAddress[] listToArray(List<String> addressList) {
        InternetAddress[] result = null;
        try {
            if (addressList == null) {
                addressList = new ArrayList<>();
            }
            int size = addressList.size();
            result = new InternetAddress[size];
            for (int i = 0; i < size; i++) {
                result[i] = new InternetAddress(addressList.get(i));
            }
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
        return result;
    }
}
