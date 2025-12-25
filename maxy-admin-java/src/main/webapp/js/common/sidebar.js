$(function () {
    /* 세부 메뉴 열기,닫기 */
    $('.menu_group').on('click', function () {
        $('.menu_group').removeClass('selected');
        $(this).addClass('selected');
        if ($(this).next('.menu_detail').hasClass('open')) { //세부 메뉴가 열렸을때
            $(this).next('.menu_detail').removeClass('open').hide();
        } else { //세부 메뉴가 닫혔을때
            $('.menu_detail.open').removeClass('open').hide();
            const $detail = $(this).next('.menu_detail')
            $detail.addClass('open').show()
            const offset = $('#' + $detail.data('group')).offset()
            if (offset) {
                $detail.css('left', (offset.left - 10))
            }
        }
    })

    /* 세부 메뉴 선택 */
    $('.menu_detail > a').on('click', function () {
        $('.menu_detail > a').removeClass('active');
        $(this).addClass('active');
    })

})