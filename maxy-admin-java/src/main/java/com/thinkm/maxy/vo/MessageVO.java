package com.thinkm.maxy.vo;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@RequiredArgsConstructor
public class MessageVO {

    private UserVO user;
    private List<UserVO> users;

    private Long seq;
    private Long userNo;
    private Long targetNo;
    private String phoneNo;
    private String emailAddr;
    private String sendType;
    private String sendYn;
    private String sendDt;
}
