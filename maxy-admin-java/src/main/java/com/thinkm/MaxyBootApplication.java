package com.thinkm;

import com.thinkm.common.config.BootInitialization;
import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.ImportResource;

@SpringBootApplication(scanBasePackages = "com.thinkm")
@ImportResource({
        "classpath:/spring/dispatcher-servlet.xml"
        , "classpath*:/spring/context-transaction.xml"
})
@Import(BootInitialization.class)
public class MaxyBootApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        // profiles 가져와서 비었거나 local 이면 빈값으로, profile 이 있다면 ".profile" 로 설정
        String profile = System.getProperty("spring.profiles.active");
        if (profile == null || profile.isEmpty() || profile.equals("local")) {
            profile = "";
        } else {
            profile = "." + profile;
        }
        // Load `.env` for development environment
        Dotenv dotenv = Dotenv.configure()
                // `.env` 파일이 기본, profiles 에 따라 `.env.prod`, `.env.dev` 등의 파일로 설정
                .filename(".env" + profile)
                // `.env` 파일 없는 경우에 에러 발생하지 않도록 함
                .ignoreIfMissing()
                .load();
        dotenv.entries().forEach(entry -> System.setProperty(entry.getKey(), entry.getValue()));

        SpringApplication springApplication = new SpringApplication(MaxyBootApplication.class);
        springApplication.setBannerMode(Banner.Mode.OFF);
        springApplication.setLogStartupInfo(false);
        springApplication.run(args);
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(MaxyBootApplication.class);
    }
}
