package com.thinkm.maxy.vo;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@RequiredArgsConstructor
public class MailVO extends MessageVO {

    private List<String> toEmailList;
    private List<String> ccEmailList;
    private List<String> bccEmailList;
    private List<String> attachFileList;

    private String subject;
    private String fromAddress;
    private String content;
}
