# Repository Guidelines

## Project Structure & Module Organization
- `src/main/java/com/thinkm/maxy` contains the Spring Boot application: `controller`, `scheduler`, `repository`, `mapper`, `dto`, `vo`, and `assembler`. Add new modules at this level to keep package scanning predictable.
- `src/main/resources` hosts `application*.yml`, Logback, Thymeleaf mail templates, plus subfolders for MyBatis mappers (`mybatis/mapper`) and Elastic query payloads (`elastic/*`). Align any new SQL or JSON definitions with the existing folder naming so deployment scripts pick them up.
- Admin UI assets live in `src/main/webapp`, while release fonts (`resources/font`) and symbolication binaries (`resources/cli/dsym`) should only change during coordinated release tasks.

## Build, Test, and Development Commands
- `mvn spring-boot:run -Dspring-boot.run.profiles=local` — run the app with devtools and `.env` overrides.
- `mvn clean verify` — compile, test, and package the WAR into `target/maxy-admin.war`.
- `mvn package -DskipTests` — quick packaging once tests already passed elsewhere.
- `mvn test -Dtest=SessionReplayServiceTest` — targeted regression checks when iterating on a single module.

## Coding Style & Naming Conventions
- Java 17 with 4-space indentation and same-line braces; rely on Lombok to eliminate boilerplate constructors and getters.
- Name REST entrypoints `<Feature>Controller`, services `<Feature>Service`, and persistence layers `<Feature>Repository` or `<Feature>Mapper`.
- DTO/VO classes describe payload contracts (`LogSearchDto`, `DeviceStatsVo`), while configuration belongs in YAML; secret values must come from environment variables (`dotenv-java` reads `.env` during local runs).

## Testing Guidelines
- Mirror the production package tree under `src/test/java`. Use JUnit Jupiter with Mockito, and prefer slice tests (`@WebMvcTest`, `@DataJpaTest`) before reaching for `@SpringBootTest`.
- Test classes end with `Test` and methods read `should<Behavior>()`.
- Run `mvn test` before every PR; include coverage or manual test notes whenever you touch schedulers or introduce new mappers.

## Commit & Pull Request Guidelines
- Follow the observed history: prefix summaries with the domain (`MAXY/로그팝업 css 수정`, `MAXY/analytics add crash drilldown`) and keep messages imperative under ~70 characters.
- PRs should link an issue, enumerate modules touched (controller, mapper, webapp), attach UI screenshots when visual output changes, and paste the command output (`mvn test`, curl smoke test) that proves the fix.

## Security & Configuration Notes
- `.env` overrides `application.yml`; production credentials stay outside the repo and are injected through deployment secrets mapped to `application-prod.yml`.
- Treat `resources/cli/dsym` binaries and Pretendard fonts as release artifacts—update them only with build-owner approval.

Answer in Korean.