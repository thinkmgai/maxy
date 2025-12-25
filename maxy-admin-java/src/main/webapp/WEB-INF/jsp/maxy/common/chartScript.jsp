<%@ page contentType="text/html;charset=UTF-8" %>
<%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>

<script>
    'use strict'
    // Define a custom symbol path
    Highcharts.SVGRenderer.prototype.symbols.cross = function (x, y, w, h) {
        return ['M', x, y, 'L', x + w, y + h, 'M', x + w, y, 'L', x, y + h, 'z'];
    };

    /**
     * Highcharts 에서 logarithmic 을 사용할 때 0 값이 들어왔을 때를 위한 custom 요소
     * Custom Axis extension to allow emulation of negative values on a logarithmic
     * Y axis. Note that the scale is not mathematically correct, as a true
     * logarithmic axis never reaches or crosses zero.
     */
    (function (H) {
        H.addEvent(H.Axis, 'afterInit', function () {
            const logarithmic = this.logarithmic;

            if (logarithmic && this.options.custom.allowNegativeLog) {

                // Avoid errors on negative numbers on a log axis
                this.positiveValuesOnly = false;

                // Override the converter functions
                logarithmic.log2lin = num => {
                    const isNegative = num < 0;

                    let adjustedNum = Math.abs(num);

                    if (adjustedNum < 10) {
                        adjustedNum += (10 - adjustedNum) / 10;
                    }

                    const result = Math.log(adjustedNum) / Math.LN10;
                    return isNegative ? -result : result;
                };

                logarithmic.lin2log = num => {
                    const isNegative = num < 0;

                    let result = Math.pow(10, Math.abs(num));
                    if (result < 10) {
                        result = (10 * (result - 1)) / (10 - 1);
                    }
                    return isNegative ? -result : result;
                };
            }
        });
    }(Highcharts));
    const hcColors = {
        'day-font': 'black',
        'dark-font': 'white',
        // 버블차트 색 정의
        'pageview': {
            background: {
                normal: {
                    // light: '#449af7',
                    light: '#C2E8FE',
                    dark: '#00507C'
                },
                error: {
                    // light: '#FFB831',
                    light: '#FFF0BB',
                    dark: '#755008'
                },
                crash: {
                    // light: '#E3778C',
                    light: '#FFCBCB',
                    dark: '#7F3434'
                }
            },
            line: {
                normal: {
                    light: '#6CCAFF',
                    dark: '#009FF9'
                },
                error: {
                    light: '#FFC700',
                    dark: '#FFA800'
                },
                crash: {
                    light: '#FF8F8F',
                    dark: '#FF6969'
                }
            }
        },
        // rendering.response 차트 색 정의
            'stock': {
                background: {
                    light: [
                        [0, '#adc3f1'],
                        [1, '#f3f8ff']
                    ],
                    dark: [
                        [0, 'rgba(0, 152, 238, 0.64)'],
                        [1, 'rgba(0, 152, 238, 0)']
                    ],
                    error: {
                        light: [
                            [0, '#FFC700'],
                            [1, '#FFF']
                        ],
                        dark: [
                            [0, 'rgba(255, 199, 0, 0.64)'],
                            [1, 'rgba(255, 199, 0, 0)']
                        ]
                    }
                },
                line: {
                    max: {
                        light: '#6560ff',
                        dark: '#7277ff'
                    },
                    min: {
                        light: '#00b39c',
                        dark: '#24F2A7'
                    }
                }
            },
            font: {
                title:
                    {
                        pv: {
                            light: '#0098ee',
                            dark: '#24F2A7'
                        },
                        login: {
                            light: '#8baaee',
                            dark: '#0098EE'
                        }

                    }
            },
        // pie 차트 색 정의
        'pie': {
            background: {
                light: [
                    '#7378FE',
                    '#9DA0FF',
                    '#D273FE',
                    '#FD8E90',
                    '#6C8DC2',
                    '#53C8E2',
                    '#3D92F3',
                    '#92D897',
                    '#6FB15F',
                    '#D4F349',
                    '#FFBD76',
                    '#DB6B6B'
                ],
                ios: {
                    light: [
                        '#7ED6B6',
                        '#2B7B5E',
                        '#4D5653',
                        '#109B69',
                        '#29A87A',
                        '#47BD92'
                    ],
                    dark: [
                        '#004B30',
                        '#006842',
                        '#008F5B',
                        '#00B573',
                        '#00D386',
                        '#24f2a7',
                    ]
                },
                android: {
                    light: [
                        '#7EBBD6',
                        '#2B637B',
                        '#4D5356',
                        '#10829B',
                        '#2991A8',
                        '#47A1BD'
                    ],
                    dark: [
                        '#005E93',
                        '#00456C',
                        '#0071B1',
                        '#0084CE',
                        '#009FF9',
                        '#34B6FF',
                    ]
                }
            }
        },
        'bar': {
            background: {
                indigo: [
                    '#0D47A1',
                    '#1259A8',
                    '#1565C0',
                    '#1976D2',
                    '#1E88E5',
                    '#2196F3',
                    '#42A5F5',
                    '#64B5F6',
                    '#90CAF9',
                    '#AEDAFB',
                    '#BBDEFB',
                    '#E3F2FD',
                ],
                teal: [
                    '#004D40',
                    '#00594A',
                    '#00695C',
                    '#00796B',
                    '#00897B',
                    '#009688',
                    '#26A69A',
                    '#4DB6AC',
                    '#6FCBC5',
                    '#80CBC4',
                    '#B2DFDB',
                    '#E0F2F1'
                ]
            }
        },
        'device': {
            android: {
                fillColor: [
                    [0, 'rgba(255,255,255,0.5)'],
                    [1, Highcharts.color(Highcharts.getOptions().colors[0]).setOpacity(0.5).get('rgba')]
                ],
                lineColor: Highcharts.color(Highcharts.getOptions().colors[0]).setOpacity(0.6).get('rgba')
            },
            ios: {
                fillColor: [
                    [0, 'rgba(255,255,255,0.5)'],
                    [1, Highcharts.color(Highcharts.getOptions().colors[1]).setOpacity(0.5).get('rgba')]
                ],
                lineColor: Highcharts.color(Highcharts.getOptions().colors[1]).setOpacity(0.6).get('rgba')
            },
        },
        'scatter': {
            cpu: '#ffbf00',
            network: '#c00000',
            light: {
                // low: '#c5dcf1',
                low: '#CEEBFF',
                // normal: '#8bb8e1',
                normal: '#82A2FF',
                // high: '#327ec4',
                high: '#7C76FF',
                native: 'rgba(255,42,194,0.8)',
            },
            dark: {
                // low: '#b9cfdb',
                low: '#4B7C99',
                // normal: '#73ccff',
                normal: '#5494DD',
                // high: '#b78aff',
                high: '#6C70EE',
                native: 'rgba(255,42,194,0.8)',
            }
        },
        'multiBar':
            ['#2CAFFE', '#544FC5', '#A9D7D8', '#5C7DA0', '#3DA2A6', '#3DA2A6'],
        'multiColumns':
            ['#2CAFFE', '#544FC5', '#2DBF7C', '#F4B400', '#FB8C00', '#E53935'],
        "sankey":
            ['#2CAFFE', '#7277FF', '#2DBF7C', '#F4B400', '#FB8C00', '#E53935', '#22D7E0', '#9A4A1B', '#43A047', '#FDD835', '#D81B60'],
        'waterfall': {
            'plotline': {
                'light': {
                    'fcp': '#A178D4',
                    'lcp': '#FF5733',
                    'loadTime': '#66CC66',
                    'fid': '#E3C23E',
                    'ttfb': '#1E90FF',
                    'fetchTime': '#FF8C00',
                    'dnsLookupTime': '#20B2AA',
                    'connectionTime': '#CD5C5C',
                    'redirectTime': '#FFB6C1',
                    'domInteractive': '#4682B4',
                    'dclTime': '#DAA520'
                },
                'dark': {
                    'fcp': '#B08CFF',
                    'lcp': '#FF6F50',
                    'loadTime': '#4DFF4D',
                    'fid': '#FFD700',
                    'ttfb': '#3399FF',
                    'fetchTime': '#FFA500',
                    'dnsLookupTime': '#40E0D0',
                    'connectionTime': '#F08080',
                    'redirectTime': '#FF69B4',
                    'domInteractive': '#5DADE2',
                    'dclTime': '#FFDE59'
                }
            }
        }
    }

    const darkYn = sessionStorage.getItem('maxyDarkYn')

    Highcharts.setOptions({
        loading: {
            style: {
                opacity: 1
            }
        },
        chart: {
            animation: false
        },
        credits: {
            enabled: false
        },
        yAxis: {
          title: {
              text: null
          }
        },
        title: {
            text: '',
            align: 'left'
        },
        noData: {
            style: {
                align: 'center',
                fontSize: '11px',
                color: '#D5DCDF'
            },
            attr: {
                width: 80,
                height: 107
            }
        },
        // export 관련
        exporting: {
            enabled: false
        },
        time: {
            useUTC: false
        },
        tooltip: {
            shared: true
        },
        responsive: {
            rules: [{
                condition: {
                    maxWidth: 500
                },
                chartOptions: {
                    legend: {
                        floating: false,
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'bottom',
                        x: 0,
                        y: 0
                    },
                    yAxis: [{
                        labels: {
                            align: 'right',
                            x: 0,
                            y: -6
                        },
                        showLastLabel: false
                    }, {
                        labels: {
                            align: 'left',
                            x: 0,
                            y: -6
                        },
                        showLastLabel: false
                    }, {
                        visible: false
                    }]
                }
            }]
        },
        lang: {
            noData: 'Data is being processed',
            thousandsSep: ',',
            useHTML: true,
            // noDataImage: '../../images/maxy/noData.svg'
            // noDataImage: '../../images/maxy/maxy-no-data.svg',
            text: 'no Data',
        }
    })

    const chart = {
        d3: {
            /**
             * d3 sankey 차트 생성
             * @param param {{
             * id:String,
             * data: {
             *     links: Array,
             *     nodes: Array
             * },
             * options: {
             *          nodeWidth,
             *          nodeHeight,
             *          nodePadding,
             *          strokeWidth
             *      }
             * }}
             */
            sankey(param) {
                const id = '#' + param.id
                const data = param.data
                let target_tmp = [];
                let totalIntervaltime = 0;

                const margin = {top: 20, right: 20, bottom: 20, left: 20}

                // 데이터 없을 경우 리턴
                if (data.links.length === 0 || data.nodes.length === 0) {
                    console.log('no data')
                    return
                }
                // flowOrder max 값 가져오기 (width)
                const linksArray = data.nodes
                const maxFlowOrder = linksArray.reduce((a, b) => {
                    return (Number(a.flowOrder) > Number(b.flowOrder)) ? a.flowOrder : b.flowOrder
                })
                // flowOrder 하나에 가장 긴 갯수 가져오기 (height)
                const groupedObj = linksArray.reduce((a, b) => {
                    const group = b.flowOrder
                    if (a[group] === undefined) {
                        a[group] = []
                    }
                    a[group].push(b)
                    return a
                })

                let maxLength = 0
                for (let i = 1; i <= maxFlowOrder; i++) {
                    try {
                        const length = groupedObj[i].length
                        if (maxLength < length) {
                            maxLength = length
                        }
                    } catch (e) {
                        maxLength = 1
                    }

                }
                // sankey wrapper 의 높이 / 너비
                const height = maxLength * param.options.nodeHeight * 1.5
                const width = maxFlowOrder * param.options.nodeWidth * 3 / 2

                // sankey class 를 가진 div
                const div = d3.select(id)
                    .style('width', width + margin.right + margin.left)
                    .style('height', height + margin.bottom + margin.top)
                // sankey 에서 사용하는 width / height 값과 다름

                // sankey 함수로 생성
                const sankey = d3.sankey()
                    .nodeWidth(param.options.nodeWidth)
                    .nodeHeight(param.options.nodeHeight)
                    .nodePadding(param.options.nodePadding)
                    .size([width, height])

                // sankey 의 link 를 path 로 받아옴
                const path = sankey.link()

                // data 의 nodes, links 데이터 변환
                sankey
                    .nodes(data.nodes)
                    .links(data.links)
                    .layout(0)

                const followPath = (d) => {
                    // 자식 노드
                    totalIntervaltime += Number(d.sumIntervaltime)
                    target_tmp.push(d);
                    const sourceLinks = d.sourceLinks
                    if (sourceLinks.length > 0) {
                        let tmp = {value: 0}
                        for (const x of sourceLinks) {
                            if (Number(tmp.value) < Number(x.value)) {
                                tmp = x
                            }
                        }
                        if (tmp.target) {
                            d3.select('.page[data-seq="' + tmp.target.seq + '"]')
                                .classed('active', true)

                            d3.select('.path-wrapper[data-path-seq="'
                                + tmp.source.seq + 't'
                                + tmp.target.seq + '"]')
                                .classed('active', true)

                            followPath(tmp.target)
                        }
                    }
                }

                const activePath = (d, t) => {
                    totalIntervaltime = 0;
                    target_tmp = [];
                    div.selectAll('.path-wrapper')
                        .classed('active', false)

                    if (d3.select(t).classed('parent')) {
                        div.selectAll('.page')
                            .classed('active parent', false)
                        div.selectAll('.path-wrapper .link')
                            .classed('disable', false)
                    } else {
                        div.selectAll('.page')
                            .classed('active parent', false)

                        d3.select(t)
                            .classed('active parent', true)

                        div.selectAll('.path-wrapper .link')
                            .classed('disable', true)

                        followPath(d)
                    }
                }

                // page 노드 구현
                const node = div.selectAll('.page')
                    .data(data.nodes)
                    .enter().append('div')
                    .classed('page', true)
                    .style('left', (d) => {
                        return d.x + margin.left + 'px'
                    })
                    .style('top', (d) => {
                        return d.y + margin.top + 'px'
                    })
                    .style('height', (d) => {
                        return d.dy + 'px'
                    })
                    .style('width', param.options.nodeWidth + 'px')
                    .attr('data-seq', (d) => {
                        return d.seq
                    })
                    .on('click', function (d) {
                        activePath(d, this)
                    })

                // title
                node.append('div')
                    .classed('page-title', true)
                    .html((d) => {
                        let content = '<span class="flow-order">' + '[' + d.flowOrder + ']' + '</span>';

                        if (!d.pageNm) {
                            const packageNm = sessionStorage.getItem('packageNm')
                            const serverType = sessionStorage.getItem('serverType')
                            content += '<span class="name">' + getPageList(packageNm, serverType, d.reqUrl) + '</span>';
                        } else {
                            content += '<span class="name">' + d.pageNm + '</span>';
                        }

                        content += '<span class="value">' + '(' + d.value + ')' + '</span>';

                        return content;
                    });

                // 내용
                const contents = node.append('div')
                    .classed('page-contents', true)

                contents.append('div')
                    .classed('page-sub', true)
                    .text('로딩 시간 ')
                    .append('span')
                    .text((d) => {
                        return util.convertSec(Number((d.avgLoadingTime))).toLocaleString()
                    })

                contents.append('div')
                    .classed('page-sub', true)
                    .text('응답 시간 ')
                    .append('span')
                    .text((d) => {
                        return util.convertSec(Number((d.avgResponseTime))).toLocaleString()
                    })

                contents.append('div')
                    .classed('page-sub', true)
                    .text('CPU ')
                    .append('span')
                    .text((d) => {
                        return Number(d.avgCpuUsage).toFixed(2) + ' %'
                    })

                contents.append('div')
                    .classed('page-sub', true)
                    .text('Memory ')
                    .append('span')
                    .text((d) => {
                        return util.convertMem('kb', d.avgMemUsage)
                    })

                contents.append('div')
                    .classed('page-sub', true)
                    .append('span')
                    .classed('gray', true)
                    .html('<i class="circle_yellow"></i> Error');

                contents.selectAll('.page-sub:last-of-type')
                    .append('span')
                    .text((d) => {
                        return Number(d.errorCount) + ' 건';
                    });

                contents.append('div')
                    .classed('page-sub', true)
                    .append('span')
                    .classed('gray', true)
                    .html('<i class="circle_red"></i> Crash');

                contents.selectAll('.page-sub:last-of-type')
                    .append('span')
                    .text((d) => {
                        return Number(d.crashCount) + ' 건';
                    });

                // path 를 담을 svg 객체
                const svg = d3.select(id).append('svg')
                    .attr('width', width)
                    .attr('height', height)
                    .append('g')
                    .attr('transform', 'translate(' + margin.left + ', 0)')

                // link
                const link = svg.selectAll('.link')
                    .data(data.links)
                    .enter()

                // path
                const g = link.append('g')
                    .attr('data-path-seq', (d) => {
                        return d.source.seq + 't' + d.target.seq
                    })
                    .classed('path-wrapper', true)
                g.append('path')
                    .attr('class', 'link')
                    .attr('d', path)
                    .style('stroke-width', () => {
                        return param.options.strokeWidth
                    })
                    .attr('title', (d) => {
                        let title = ''
                        const packageNm = sessionStorage.getItem('packageNm')
                        const serverType = sessionStorage.getItem('serverType')

                        if (!d.source.pageNm) {
                            title += getPageList(packageNm, serverType, d.source.reqUrl) + ' → ' + getPageList(packageNm, serverType, d.target.reqUrl) + '\n: ' + d.value
                        } else {
                            title += d.source.pageNm + ' → ' + d.target.pageNm + '\n: ' + d.value
                        }

                        return title
                    })
                    .attr('class', (d) => {
                        const sourceLinks = d.source.sourceLinks
                        let sum = 0
                        sourceLinks.forEach(x => {
                            sum += Number(x.value)
                        })
                        const percent = (Number(d.value) / sum) * 100
                        if (percent <= 25) {
                            return 'link link-1'
                        } else if (percent > 25 && percent <= 50) {
                            return 'link link-2'
                        } else if (percent > 50 && percent <= 75) {
                            return 'link link-3'
                        } else {
                            return 'link link-4'
                        }
                    })

                const linkCenter = sankey.linkCenter()
                g.append('text').append('tspan')
                    .text((d) => {
                        return d.value
                    })
                    .attr('x', (d) => {
                        const xy = linkCenter(d)
                        return Number(xy.split(',')[0]) - 10
                    })
                    .attr('y', (d) => {
                        const xy = linkCenter(d)
                        return Number(xy.split(',')[1]) + 5
                    })
                    .style('display', 'none')

                for (const item of target_tmp) {
                    totalIntervaltime += item.sumIntervaltime;
                }
            },
        },
    }
</script>