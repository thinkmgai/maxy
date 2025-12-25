package com.thinkm.common.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "MAXY Admin API",
                version = "v1.6.0",
                description = "This is a MAXY Admin API documentation."
        )
)
public class SwaggerConfig {
    private static final String[] FRONT_PATHS = {"/mf/**", "/fm/**", "/fr/**", "/fu/**", "/fw/**"};
    private static final String CONTROLLER_PACKAGE = "com.thinkm.maxy.controller";
    private static final String FRONT_PACKAGE = CONTROLLER_PACKAGE + ".front";

    @Bean
    public GroupedOpenApi frontApi() {
        return GroupedOpenApi.builder()
                .group("MAXY Front API v1.0.0")
                .pathsToMatch(FRONT_PATHS)
                .packagesToScan(FRONT_PACKAGE)
                .build();
    }

    @Bean
    public GroupedOpenApi maxyApi() {
        return GroupedOpenApi.builder()
                .group("MAXY Admin API v1.6.0")
                .pathsToMatch("/**")
                .pathsToExclude(FRONT_PATHS)
                .packagesToScan(CONTROLLER_PACKAGE)
                .packagesToExclude(FRONT_PACKAGE)
                .build();
    }

    @Bean
    public OpenAPI customOpenAPI() {
        return new OpenAPI()
                .addSecurityItem(new SecurityRequirement().addList("JSESSIONID"))
                .components(new io.swagger.v3.oas.models.Components()
                        .addSecuritySchemes("JSESSIONID",
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.APIKEY)
                                        .in(SecurityScheme.In.COOKIE)
                                        .name("JSESSIONID")));
    }
}
