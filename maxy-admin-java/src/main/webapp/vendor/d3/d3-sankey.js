// https://github.com/vasturiano/d3-sankey Version 0.4.2.
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(
            exports, require('d3-array'), require('d3-collection'),
            require('d3-interpolate')) :
        typeof define === 'function' && define.amd ? define(
                ['exports', 'd3-array', 'd3-collection', 'd3-interpolate'], factory)
            :
            (factory((global.d3 = global.d3 || {}), global.d3, global.d3,
                global.d3));
}(this, (function (exports, d3Array, d3Collection, d3Interpolate) {
    'use strict';

    exports.sankey = function () {
        let sankey = {},
            nodeWidth = 24,
            nodeHeight = 100,
            nodePadding = 8,
            size = [1, 1],
            nodes = [],
            links = [];

        sankey.nodeHeight = function (_) {
            if (!arguments.length) {
                return nodeHeight;
            }
            nodeHeight = +_;
            return sankey;
        };

        sankey.nodeWidth = function (_) {
            if (!arguments.length) {
                return nodeWidth;
            }
            nodeWidth = +_;
            return sankey;
        };

        sankey.nodePadding = function (_) {
            if (!arguments.length) {
                return nodePadding;
            }
            nodePadding = +_;
            return sankey;
        };

        sankey.nodes = function (_) {
            if (!arguments.length) {
                return nodes;
            }
            nodes = _;
            return sankey;
        };

        sankey.links = function (_) {
            if (!arguments.length) {
                return links;
            }
            links = _;
            return sankey;
        };

        sankey.size = function (_) {
            if (!arguments.length) {
                return size;
            }
            size = _;
            return sankey;
        };

        sankey.layout = function (iterations) {
            computeNodeLinks();
            computeNodeValues();
            computeNodeBreadths();
            computeNodeDepths(iterations);
            computeLinkDepths();
            return sankey;
        };

        sankey.relayout = function () {
            computeLinkDepths();
            return sankey;
        };

        sankey.link = function () {
            let curvature = .5;

            function link(d) {
                const x0 = d.source.x + d.source.dx,
                    x1 = d.target.x,
                    xi = d3Interpolate.interpolateNumber(x0, x1),
                    x2 = xi(curvature),
                    x3 = xi(1 - curvature),
                    y0 = d.source.y + d.sy + d.dy / 4, // y0 = d.source.y + d.sy + d.dy / 2,
                    y1 = d.target.y + d.ty + d.dy / 4; //y1 = d.target.y + d.ty + d.dy / 2;
                return "M" + x0 + "," + y0
                    + "C" + x2 + "," + y0
                    + " " + x3 + "," + y1
                    + " " + x1 + "," + y1;
            }

            link.curvature = function (_) {
                if (!arguments.length) {
                    return curvature;
                }
                curvature = +_;
                return link;
            };

            return link;
        };

        sankey.linkCenter = function () {
            function linkCenter(d) {
                const x0 = d.source.x + d.source.dx,
                    x1 = d.target.x,
                    y0 = d.source.y + d.sy + d.dy / 4,
                    y1 = d.target.y + d.ty + d.dy / 4;
                return ((x0 + x1) / 2) + "," + ((y0 + y1) / 2);
            }

            return linkCenter;
        };

        // Populate the sourceLinks and targetLinks for each node.
        // Also, if the source and target are not objects, assume they are indices.
        function computeNodeLinks() {
            nodes.forEach(function (node) {
                node.sourceLinks = [];
                node.targetLinks = [];
            });
            links.forEach(function (link) {
                let source = link.source,
                    target = link.target;
                if (typeof source === "number") {
                    source = link.source = nodes[link.source];
                }
                if (typeof target === "number") {
                    target = link.target = nodes[link.target];
                }
                source.sourceLinks.push(link);
                target.targetLinks.push(link);
            });
        }

        // Compute the value (size) of each node by summing the associated links.
        function computeNodeValues() {
            nodes.forEach(function (node) {
                node.value = Math.max(
                    d3Array.sum(node.sourceLinks, value),
                    d3Array.sum(node.targetLinks, value)
                );
            });
        }

        // Iteratively assign the breadth (x-position) for each node.
        // Nodes are assigned the maximum breadth of incoming neighbors plus one;
        // nodes with no incoming links are assigned breadth zero, while
        // nodes with no outgoing links are assigned the maximum breadth.
        function computeNodeBreadths() {
            let remainingNodes = nodes,
                nextNodes,
                x = 0; // Reverse traversal direction

            while (remainingNodes.length) {
                nextNodes = [];
                remainingNodes.forEach(function (node) {
                    node.x = x;
                    node.dx = nodeWidth;
                    node.sourceLinks.forEach(function (link) {
                        const nextNode = link.target;
                        if (nextNodes.indexOf(nextNode) < 0) {
                            nextNodes.push(nextNode);
                        }
                    });
                });
                remainingNodes = nextNodes;
                ++x;
            }

            scaleNodeBreadths((size[0] - nodeWidth) / (x - 1));
        }

        function scaleNodeBreadths(kx) {
            nodes.forEach(function (node) {
                node.x *= kx;
            });
        }

        function computeNodeDepths() {
            const nodesByBreadth = d3Collection.nest()
            .key(function (d) {
                return d.x;
            })
            .sortKeys(d3Array.ascending)
            .entries(nodes)
            .map(function (d) {
                return d.values;
            });

            //
            initializeNodeDepth();
            resolveCollisions();
            // for (let alpha = 1; iterations > 0; --iterations) {
            //     relaxRightToLeft(alpha *= .99);
            //     resolveCollisions();
            //     relaxLeftToRight(alpha);
            //     resolveCollisions();
            // }

            function initializeNodeDepth() {
                // const ky = d3Array.min(nodesByBreadth, function (nodes) {
                //     return (size[1] - (nodes.length - 1) * nodePadding)
                //         / d3Array.sum(nodes, value);
                // });

                nodesByBreadth.forEach(function (nodes) {
                    nodes.forEach(function (node, i) {
                        node.y = i;
                        node.dy = nodeHeight // node.dy = node.value * ky
                    });
                });

                links.forEach(function (link) {
                    link.dy = nodeHeight // link.dy = link.value * ky;
                });
            }

            // function relaxLeftToRight(alpha) {
            //     nodesByBreadth.forEach(function (nodes) {
            //         nodes.forEach(function (node) {
            //             if (node.targetLinks.length) {
            //                 const y = d3Array.sum(node.targetLinks,
            //                     weightedSource) / d3Array.sum(node.targetLinks,
            //                     value);
            //                 node.y += (y - center(node)) * alpha;
            //             }
            //         });
            //     });
            //
            //     function weightedSource(link) {
            //         return center(link.source) * link.value;
            //     }
            // }

            // function relaxRightToLeft(alpha) {
            //     nodesByBreadth.slice().reverse().forEach(function (nodes) {
            //         nodes.forEach(function (node) {
            //             if (node.sourceLinks.length) {
            //                 const y = d3Array.sum(node.sourceLinks,
            //                     weightedTarget) / d3Array.sum(node.sourceLinks,
            //                     value);
            //                 node.y += (y - center(node)) * alpha;
            //             }
            //         });
            //     });
            //
            //     function weightedTarget(link) {
            //         return center(link.target) * link.value;
            //     }
            // }

            function resolveCollisions() {
                nodesByBreadth.forEach(function (nodes) {
                    let node,
                        dy,
                        y0 = 0,
                        n = nodes.length,
                        i;

                    // Push any overlapping nodes down.
                    nodes.sort(ascendingDepth);
                    for (i = 0; i < n; ++i) {
                        node = nodes[i];
                        dy = y0 - node.y;
                        if (dy > 0) {
                            node.y += dy;
                        }
                        y0 = node.y + node.dy + nodePadding;
                    }

                    // If the bottommost node goes outside the bounds, push it back up.
                    dy = y0 - nodePadding - size[1];
                    if (dy > 0) {
                        y0 = node.y -= dy;

                        // Push any overlapping nodes back up.
                        for (i = n - 2; i >= 0; --i) {
                            node = nodes[i];
                            dy = node.y + node.dy + nodePadding - y0;
                            if (dy > 0) {
                                node.y -= dy;
                            }
                            y0 = node.y;
                        }
                    }
                });
            }

            function ascendingDepth(a, b) {
                return a.y - b.y;
            }
        }

        function computeLinkDepths() {
            nodes.forEach(function (node) {
                node.sourceLinks.sort(ascendingTargetDepth);
                node.targetLinks.sort(ascendingSourceDepth);
            });
            nodes.forEach(function (node) {
                let sy = 0, ty = 0;
                node.sourceLinks.forEach(function (link) {
                    link.sy = sy;
                    sy += 10 // sy += link.dy;
                });
                node.targetLinks.forEach(function (link) {
                    link.ty = ty;
                    ty += 10 // ty += link.dy;
                });
            });

            function ascendingSourceDepth(a, b) {
                return a.source.y - b.source.y;
            }

            function ascendingTargetDepth(a, b) {
                return a.target.y - b.target.y;
            }
        }

        // function center(node) {
        //     return node.y + node.dy / 2;
        // }

        function value(link) {
            return link.value;
        }

        return sankey;
    };

    Object.defineProperty(exports, '__esModule', {value: true});

})));