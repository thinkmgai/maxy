$(function () {
    const $dim = $(".dimmed");                      //dimmed 마스크
    const $day_night = $(".day_night_btn");         //다크모드 전환 버튼
    const $date_box = $(".date_box");               //날짜 입력창
    const $time = $(".time_box input");             //시간 입력창
    const $paging = $(".paging_wrap > a");          //페이징 숫자
    const $chg_pw_btn = $(".chg_pw_btn");           //비밀번호 변경 열기 버튼
    const $chg_pw_wrap = $(".chg_pw_wrap");         //비밀번호 입력창
    const $popup_op = $(".popup_op");               //팝업 열기 버튼
    const $popup_cls = $(".popup_cls");             //팝업 닫기 버튼

    /* 페이지 전환 */
    $paging.on("click", function () {
        $paging.removeClass("selected");
        $(this).addClass("selected");
    })

    if ($date_box.length > 0) {
        /* 데이트 픽커 호출 */
        $date_box.datepicker({
            dateFormat: "yy-mm-dd"
        });
    }

    /* 시간 입력 - 숫자 제한 */
    $time.on("propertychange change keyup paste input", function () {
        this.value = this.value
            .replace(/[^\d.]/g, '')
            .replace(/(\..*)\./g, '$1');
    });

    /* 비밀번호 변경 */
    $chg_pw_btn.on("click", () => {
        $chg_pw_wrap.slideToggle(100);
    })

    /* 팝업 */
    $popup_op.on("click", function () {
        let op_target = $(this).data("op");
        $dim.show();
        $("#" + op_target).show();
    });
    $popup_cls.on("click", function () {
        let cls_target = $(this).data("cls");
        $("#" + cls_target).hide();
        $($dim).hide();
    });

    /* 다크모드 전환 */
    if ($day_night.length > 0) {
        $day_night.get(0).addEventListener("click", function () {
            if (sessionStorage.getItem("maxyDarkYn") === "Y") {
                sessionStorage.setItem("maxyDarkYn", "N")
            } else {
                sessionStorage.setItem("maxyDarkYn", "Y")
            }
            location.reload()
        }, true);
    }

    if (sessionStorage.getItem("maxyDarkYn") === "Y") {
        $day_night.addClass("on");
        $("body").addClass("dark_mode");
    } else {
        $day_night.removeClass("on");
        $("body").removeClass("dark_mode");
    }
})