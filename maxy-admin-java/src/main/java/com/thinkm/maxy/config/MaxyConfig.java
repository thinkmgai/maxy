package com.thinkm.maxy.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MaxyConfig {
    
    @Value("${maxy.userid-masking:false}")
    private boolean userIdMasking;
    
    public boolean isUserIdMasking() {
        return userIdMasking;
    }
}