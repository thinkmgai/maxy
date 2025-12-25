'use strict';

const jennifer = {
    tooltip: '',
    getJenniferData (v, jdomain, jtime, jtxid) {
        let jenniferUrl = sessionStorage.getItem('jenniferUrl')
        jenniferUrl = jenniferUrl.replace("[jdomain]", jdomain).replace("[jtime]", jtime).replace("[jtxid]", jtxid)

        $.ajax({
            url: jenniferUrl,
            type: 'GET',
            success: function (data) {
                const {result} = data

                if (result.length > 0) {
                    const jenniferData = result[0]
                    const {txid, responseTime, externalcallTime, sqlTime, fetchTime} = jenniferData
                    jennifer.setJenniferData(v.responseTime, txid, responseTime, externalcallTime, sqlTime, fetchTime)
                }
            },
            error: function (xhr, status, error) {
                console.error(status, error)
            }
        });
    },
    setJenniferData (data) {
        try {
            const {
                intervaltime,
                txid,
                responseTime,
                externalcallTime,
                sqlTime,
                fetchTime
            } = data
            const maxyResponseTime = checkNaN(intervaltime)
            const jenniferResponseTime = checkNaN(responseTime)
            const jenniferExternalcallTime = checkNaN(externalcallTime)
            let jenniferSqlFetchTime = checkNaN(sqlTime) + checkNaN(fetchTime)

            // network time (전체 response time - jennifer response time)
            const networkTime = checkNaN(maxyResponseTime - jenniferResponseTime)

            // txid 세팅
            if (txid) {
                $('#txid').text(txid)
            }

            // WAS time = 전체 response time - (network time + external call time + sql + fetch time)
            const wasTime = checkNaN(maxyResponseTime - (networkTime + jenniferExternalcallTime + jenniferSqlFetchTime))

            if (maxyResponseTime < jenniferSqlFetchTime && !wasTime && !jenniferExternalcallTime && !networkTime) {
                jenniferSqlFetchTime = maxyResponseTime
            }

            const jenniferTimeArr = []
            if (wasTime) {
                jenniferTimeArr.push({'was': wasTime})
            }
            if (jenniferExternalcallTime) {
                jenniferTimeArr.push({'externalcall': jenniferExternalcallTime})
            }
            if (jenniferSqlFetchTime) {
                jenniferTimeArr.push({'sqlfetch': jenniferSqlFetchTime})
            }
            if (networkTime) {
                jenniferTimeArr.push({'network': networkTime})
            }

            // 전체 response time 중 was time이 차지하는 비율이 몇 % 인지 계산
            const wasTimePct = (wasTime / maxyResponseTime) * 100
            // 전체 response time중 externalcall time이 차지하는 비율이 몇 %인지 계산
            const externalCallTimePct = (jenniferExternalcallTime / maxyResponseTime) * 100
            // 전체 response time중 sql time + fetch time이 차지하는 비율이 몇 %인지 계산
            const sqlFetchTimePct = (jenniferSqlFetchTime / maxyResponseTime) * 100
            // 전체 response time중 network time이 차지하는 비율이 몇 %인지 계산
            const networkTimePct = (networkTime / maxyResponseTime) * 100

            // All 그래프 내 Was time 영역 세팅
            const $allWasTimeBar = $('#all > .bar:nth-child(1)')
            $allWasTimeBar.width(wasTimePct + '%')
            $allWasTimeBar.attr('data-value', util.comma(wasTime) + 'ms')
            // was time 그래프 세팅
            $('#wasTime').text(util.comma(wasTime) + 'ms')
            $('#wasTimeWrap > span').width(wasTimePct + '%')
            $('#pWasTime').text(util.comma(wasTime) + 'ms')

            // All 그래프 내 externalcall 영역 세팅
            const $allExternalCallBar = $('#all > .bar:nth-child(2)')

            // All 그래프의 두번째 값은 external call
            if (wasTimePct === 0) {
                $allExternalCallBar.css('left', 0 + '%')
            } else {
                $allExternalCallBar.css('left', wasTimePct + '%')
            }
            $allExternalCallBar.width(externalCallTimePct + '%')
            $allExternalCallBar.attr('data-value', util.comma(jenniferExternalcallTime) + 'ms')
            $('#externalcallTime').text(util.comma(jenniferExternalcallTime) + 'ms')
            $('#pExternalCall').text(util.comma(jenniferExternalcallTime) + 'ms')
            $('#externalCallTimeWrap > span').width(externalCallTimePct + '%')

            // All 그래프의 세번째 값은 sql time + fetch time
            // left는 첫번째 + 두번째 값의 width로 세팅
            // externalCallTime이 0%인 경우 , 첫번째 + 두번째 값의 width 로 left 세팅
            const $allSqlFetchBar = $('#all > .bar:nth-child(3)')

            if (externalCallTimePct === 0) {
                $allSqlFetchBar.css('left', wasTimePct + '%')
            } else {
                $allSqlFetchBar.css('left', wasTimePct + externalCallTimePct + '%')
            }
            $allSqlFetchBar.width(sqlFetchTimePct + '%')
            $allSqlFetchBar.attr('data-value', util.comma(jenniferSqlFetchTime) + 'ms')
            $('#sqlTime').text(util.comma(jenniferSqlFetchTime) + 'ms')
            $('#pSqlFetch').text(util.comma(jenniferSqlFetchTime) + 'ms')
            $('#sqlFetchTimeWrap > span').width(sqlFetchTimePct + '%')

            // All 그래프 내 Network time 영역 세팅
            const $allNetworkBar = $('#all > .bar:nth-child(4)')

            if (sqlFetchTimePct === 0) {
                $allNetworkBar.css('left', wasTimePct + externalCallTimePct + '%')
            } else {
                $allNetworkBar.css('left', wasTimePct + externalCallTimePct + sqlFetchTimePct + '%')
            }
            $allNetworkBar.width(networkTimePct + '%')
            $allNetworkBar.attr('data-value', util.comma(networkTime) + 'ms')
            // network time 그래프 세팅
            $('#networkTime').text(util.comma(networkTime) + 'ms')
            $('#pNetworkTime').text(util.comma(networkTime) + 'ms')
            $('#networkTimeWrap > span').width(networkTimePct + '%')

            const jenniferTimeArrLength = jenniferTimeArr.length

            if (jenniferTimeArrLength > 0) {
                if (jenniferTimeArr[jenniferTimeArrLength - 1]['network'] > 0) {
                    $allNetworkBar.css('border-top-right-radius', '25px')
                    $allNetworkBar.css('border-bottom-right-radius', '25px')
                } else {
                    $allNetworkBar.css('border-top-right-radius', '0')
                    $allNetworkBar.css('border-bottom-right-radius', '0')
                }

                if (jenniferTimeArr[jenniferTimeArrLength - 1]['externalcall'] > 0) {
                    $allExternalCallBar.css('border-top-right-radius', '25px')
                    $allExternalCallBar.css('border-bottom-right-radius', '25px')
                } else {
                    $allExternalCallBar.css('border-top-right-radius', '0')
                    $allExternalCallBar.css('border-bottom-right-radius', '0')
                }

                jennifer.addTooltip()
            }
        } catch (e) {
            console.log(e)
        }
    },
    addTooltip() {
        const target = $('#all > .bar').filter(function() {
            return $(this).width() > 0;
        });

        target.each(function() {
            const $this = $(this);

            const value = $this.attr('data-value')

            // 기존 tippy 인스턴스가 있으면 content만 업데이트
            if ($this.data('tippyInstance')) {
                $this.data('tippyInstance').setContent(value);
            } else {
                // 새로운 tippy 인스턴스 생성
                const instance = tippy(this, {
                    content: value,
                    arrow: false,
                    placement: 'bottom',
                    allowHTML: true,
                    theme: 'maxy-tooltip'
                })

                // tippy 인스턴스를 jQuery 데이터에 저장
                $this.data('tippyInstance', instance)
            }
        })
    },
    setJenniferNoData() {
        const $allTime = $('.response_time')
        $('#txid').text('-')
        if (!$allTime.hasClass('empty_time')) {
            $allTime.addClass('empty_time')
        }
        $('#wasTime').text('-')
        $('#networkTime').text('-')
        $('#externalcallTime').text('-')
        $('#sqlTime').text('-')
        $('#pWasTime').text('-')
        $('#pNetworkTime').text('-')
        $('#pExternalCall').text('-')
        $('#pSqlFetch').text('-')
        $('#all > .bar').width('0')
        $('#wasTimeWrap > span').width(0 + '%')
        $('#networkTimeWrap > span').width(0 + '%')
        $('#externalCallTimeWrap > span').width(0 + '%')
        $('#sqlFetchTimeWrap > span').width(0 + '%')
    }
}
