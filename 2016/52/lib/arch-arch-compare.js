/* GLOBALS */
'use strict';

var width = document.documentElement.clientWidth; // width of svg image
var height = document.documentElement.clientHeight; // height of svg image
var margin = 40; // amount of margin around plot area
//var pad = margin / 2; // actual padding amount
var radius = width < 1600 ? 20 : 40; // fixed node radius
var childR = width < 1600 ? 200 : 350;
var yfixed = height / 2; // y position for all nodes
var xfixed = radius;
var linkScale = void 0;
var strokeScale = void 0;
var nodeColorScale = void 0;
var nodeScale = void 0;
var processed2016 = void 0;
var processed2015 = void 0;
var detailHover = false;

var children2015 = void 0,
    children2016 = void 0;
d3.json("finaldata/2016_supergraph.json", function (error, data1) {
    if (error) return console.warn(error);

    processed2016 = processData(data1);
    d3.json("finaldata/2015_supergraph.json", function (error, data2) {
        if (error) return console.warn(error);

        processed2015 = processData(data2);
        arcDiagram(processed2015, processed2016);
    });
});

d3.json("finaldata/2016_all_supergraph.json", function (error, data) {
    if (error) return console.warn(error);

    var all = processData(data);

    var nodes = all.nodes;
    var map = {};
    nodes.forEach(function (data) {
        var d = data.data;

        if (map[d.subType]) {
            map[d.subType].push(d);
        } else {
            map[d.subType] = [d];
        }
    });
    children2016 = map;
});

d3.json("finaldata/2015_all_supergraph.json", function (error, data) {
    if (error) return console.warn(error);

    var all = processData(data);

    var nodes = all.nodes;
    var map = {};
    nodes.forEach(function (data) {
        var d = data.data;

        if (map[d.subType]) {
            map[d.subType].push(d);
        } else {
            map[d.subType] = [d];
        }
    });
    children2015 = map;
});

function processData(data) {
    var output = {
        nodes: [],
        edges: []
    };
    var graph = data.graphml.graph;

    var startNode = void 0,
        endNode = void 0;
    // Build nodes
    for (var i = 0; i < graph.node.length; i++) {
        var node = graph.node[i];

        var _data = {};
        for (var j = 0; j < node.data.length; j++) {
            var datum = node.data[j];
            if (datum["@key"] == "d0") _data.count = +datum["#text"];else if (datum["@key"] == "d1") _data.type = datum["#text"];else if (datum["@key"] == "d2") _data.subType = datum["#text"];else if (datum["@key"] == "d3") _data.weight = +datum["#text"];else if (datum["@key"] == "d4") _data.label = datum["#text"];
        }

        var nodeObj = {
            "name": node["@id"],
            "data": _data,
            "active": true,
            "selected": false
        };
        if (nodeObj.name == "start") {
            startNode = nodeObj;
            continue;
        } else if (nodeObj.name == "end") {
            endNode = nodeObj;
            continue;
        }
        //        console.log(nodeObj.name + ',' + nodeObj.data.count);
        output.nodes.push(nodeObj);
    }

    // maps actions before attributes
    var map = {
        action: 0,
        attribute: 1
    };
    output.nodes.sort(function (a, b) {
        //        console.log(a.data.type-b.data.type);
        return map[a.data.type] - map[b.data.type];
    });

    // adds start and end nodes
    output.nodes.unshift(startNode);
    output.nodes.push(endNode);

    // Build edges

    var _loop = function _loop(_i) {
        var edge = graph.edge[_i];

        // Find Source
        var sourceName = edge["@source"];
        var sourceNode = output.nodes.filter(function (node) {
            return node.name == sourceName;
        })[0];

        // Find Target
        var targetName = edge["@target"];
        var targetNode = output.nodes.filter(function (node) {
            return node.name == targetName;
        })[0];

        var data = {};

        for (var _j = 0; _j < edge.data.length; _j++) {
            var _datum = edge.data[_j];

            if (_datum["@key"] == "d5") data.count = +_datum["#text"];else if (_datum["@key"] == "d6") data.direction = _datum["#text"];else if (_datum["@key"] == "d7") data.weight = +_datum["#text"];else if (_datum["@key"] == "d8") data.label = _datum["#text"];
        }

        if (sourceNode.name == targetNode.name) return "continue";

        output.edges.push({
            source: sourceNode,
            target: targetNode,
            data: data,
            active: true
        });
        //                        if (data.direction == "forward") {
        //                            output.edges.push({
        //                                source: sourceNode,
        //                                target: targetNode,
        //                                data: data
        //                            });
        //                        } else {
        //                            output.edges.push({
        //                                source: targetNode,
        //                                target: sourceNode,
        //                                data: data
        //                            });
        //                        }
    };

    for (var _i = 0; _i < graph.edge.length; _i++) {
        var _ret = _loop(_i);

        if (_ret === "continue") continue;
    }

    //    console.log(output);
    return output;
}

/* HELPER FUNCTIONS */

// Generates a tooltip for a SVG circle element based on its ID
function addTooltip(circle) {
    var data = d3.select(circle).node().datum();
    //    console.log(data);
    var x = data.x + radius;
    var y = data.y - radius;
    var r = 10;
    var text = data.data.label;

    var split = text.split('.');
    if (split.length == 1) text = split[0];else text = split[1];
    if (d3.selectAll('#' + text + 'tooltip').size() > 0) return;
    var tooltip = d3.select("#plot").append("text").text(text.toUpperCase()).attr("transform", "translate(" + x + "," + y + ")rotate(-45)").attr("class", function () {
        if (split.length == 2) {
            return split[0] + " tooltip";
        }
        return "tooltip";
    }).attr('id', function () {
        return text + 'tooltip';
    }).style('opacity', 0).transition().style('opacity', 1);

    var offset = tooltip.node().getBBox().width / 2;
}

/* MAIN DRAW METHOD */

// Draws an arc diagram for the provided undirected graph
function arcDiagram(graphTop, graphBottom) {
    // create svg image
    var svg = d3.select("body").append("svg").attr("id", "arc").attr("width", width).attr("height", height);

    // draw border around svg image
    // svg.append("rect")
    //     .attr("class", "outline")
    //     .attr("width", width)
    //     .attr("height", height);

    // create plot area within svg image
    var offset = width / 2 - (margin + height - margin) / 2;

    svg.append('rect').attr('x', 0).attr('y', 0).attr('id', 'backRect').attr('width', width).attr('height', height).style('opacity', 0).on('mouseover', function () {
        detailHover = false;

        d3.selectAll('.nodeCount').transition().style('opacity', 0);
        d3.selectAll('.arch').transition().style('opacity', function (d) {
            if (!d.active) return 0;
            return linkScale(d.data.count);
        });

        d3.selectAll('.node').each(function (d) {
            if (d.active && !d.selected) {
                addTooltip(d3.select(this));
            }
        }).transition().style("fill", function (d, i) {
            if (d.name == "start" || d.name == "end") {
                return "#d1d3d4";
            }
            if (d.selected) return 'slategray';
            return nodeColorScale(d.data.count);
        });
    });
    svg.append('rect').attr('class', 'hiddenRect').attr('x', offset).attr('y', height / 2 - radius * 2).attr('height', radius * 4).attr('width', height).style('opacity', 0).on('mouseover', function () {
        //            console.log('over');
        detailHover = true;
    });
    //        .on('mouseout', function () {
    //        console.log('out');
    //            detailHover = false;
    //        });
    var plot = svg.append("g").attr("id", "plot").attr("transform", "translate(" + offset + ", 0)");

    //    let wp = (width+margin)/2+width*.4;
    svg.append("text").text("2015 DBIR ATTACK GRAPH").attr('class', 'label interface').style('text-anchor', 'middle').attr('transform', 'translate(' + width / 2 + ',' + margin + ')');
    //
    var wp = height - margin;
    svg.append("text").text("2016 DBIR ATTACK GRAPH").attr('class', 'label interface').style('text-anchor', 'middle').attr('transform', 'translate(' + width / 2 + ',' + wp + ')');

    svg.append("text").text("INCIDENT COUNT").attr('class', 'label interface').style('text-anchor', 'end').attr('dy', '.35em').attr('transform', 'translate(' + offset + ',' + height / 2 + ')');

    svg.on('click', function () {
        processed2015.nodes.forEach(function (d) {
            d.selected = false;
            d.active = true;
        });

        processed2016.nodes.forEach(function (d) {
            d.selected = false;
            d.active = true;
        });
        processed2015.edges.forEach(function (d) {
            return d.active = true;
        });
        processed2016.edges.forEach(function (d) {
            return d.active = true;
        });
        d3.selectAll('.child').remove();
        //        d3.select('#backRect').style('cursor', 'default');
        showElements();
        update(processed2015, processed2016);
    });
    update(graphTop, graphBottom);
}

function update(graphTop, graphBottom) {
    setScales();
    linearLayout(graphTop.nodes);
    linearLayout(graphBottom.nodes);

    drawLinksTop(graphTop.edges);
    drawLinksBottom(graphBottom.edges);

    drawOutline(graphTop);

    // draw nodes last
    drawNodesTop(graphTop.nodes);
    drawNodesBottom(graphBottom.nodes);
}

function drawOutline(graph) {

    var nodes = graph.nodes;
    var node = d3.select("#plot").selectAll(".nodeOutline").data(nodes);
    var nodeEnter = node.enter();

    var outline = nodeEnter.append("circle").attr("class", "nodeOutline").attr('fill', 'white').attr('stroke', 'black').attr('stroke-width', '1px').attr('r', 0).on('mouseover', function (d, i) {
        var thisData = d;
        if (d.selected) {
            return;
        }
        d3.selectAll('.tooltip').remove();
        d3.selectAll('.nodeCount').transition().style('opacity', 0);
        d3.selectAll('.arch').transition().style('opacity', function (d) {
            if (!d.active) return 0;
            return 0.04;
            //                return linkScale(d.data.count) * .25;
        });

        d3.selectAll('.node').style("fill", function (d, i) {
            return "#d1d3d4";
        });

        //            console.log(nodeGroup.select('.node'));
        d3.selectAll('.node').filter(function (dN) {
            return dN.name == d.name;
        }).style('fill', function (d) {
            if (d.name == "start" || d.name == "end") {
                return "#d1d3d4";
            }
            return nodeColorScale(d.data.count);
        }).each(function (d) {
            addTooltip(d3.select(this));
        });

        d3.selectAll('.nodeCount').filter(function (d) {
            return thisData.name == d.name;
        }).transition().style('opacity', 1);

        d3.selectAll('.arch').filter(function (d) {
            if (d.source.name == thisData.name) return true;
            return false;
        }).transition().style('opacity', function (d) {
            if (!d.active) return 0;
            return linkScale(d.data.count) + .2;
        }).each(function (d) {
            var nodeTarget = d.target.name;
            d3.selectAll('.node').filter(function (d) {
                return d.name == nodeTarget;
            }).style("fill", function (d, i) {
                if (d.name == "start" || d.name == "end") {
                    return "#d1d3d4";
                }
                return nodeColorScale(d.data.count);
            }).each(function (d) {
                if (d.active) addTooltip(d3.select(this));
            });
        });
    }).on('mouseout', function (d, i) {
        if (detailHover || d.selected) return;
        d3.selectAll('.nodeCount').transition().style('opacity', 0);
        d3.selectAll('.arch').transition().style('opacity', function (d) {
            if (!d.active) return 0;
            return linkScale(d.data.count);
        });

        d3.selectAll('.node').style("fill", function (d, i) {
            if (d.name == "start" || d.name == "end") {
                return "#d1d3d4";
            }
            return nodeColorScale(d.data.count);
        }).each(function (d) {
            if (d.active) addTooltip(d3.select(this));
        });
    }).on('click', function (d, i) {
        d3.event.stopPropagation();

        if (d.name == "start" || d.name == "end") {
            return;
        }
        processed2015.nodes.forEach(function (d) {
            return d.active = false;
        });
        processed2015.nodes[i].active = true;
        processed2015.nodes[i].selected = true;
        processed2015.edges.forEach(function (d) {
            return d.active = false;
        });

        processed2016.nodes.forEach(function (d) {
            return d.active = false;
        });
        processed2016.nodes[i].active = true;
        processed2016.nodes[i].selected = true;
        processed2016.edges.forEach(function (d) {
            return d.active = false;
        });
        d3.selectAll('.nodeCount').transition().style('opacity', 0);
        hideElements();
        update(processed2015, processed2016);
        //            d3.select('#backRect').style('cursor', 'pointer');
        d3.selectAll('.tooltip').remove();
    });

    node.attr("cx", function (d, i) {
        return d.x;
    }).attr("cy", function (d, i) {
        return d.y;
    }).each(function (d) {
        addTooltip(d3.select(this));
    }).each(function (d) {
        if (d.selected) {
            micro(d);
        }
    }).attr('stroke-dasharray', function (d) {
        if (d.data.type == "attribute") {
            return "4, 4";
        }
    }).style('cursor', function (d) {
        //            console.log(d)
        if (d.name == "start" || d.name == "end") {
            return 'default';
        }
        if (d.selected) return 'default';

        return 'pointer';
    }).transition().attr('stroke-width', function (d) {
        if (d.selected) return 0;else return '1px';
    }).attr("r", function (d, i) {
        if (!d.active) return 0;
        if (d.name == "start" || d.name == "end") return radius / 2;
        if (d.selected) {
            return childR;
        }
        return radius + 2;
    }).style("fill", function (d, i) {
        if (d.selected) return 'slategray';
        return 'white';
    }).attr('opacity', function (d) {
        if (d.selected) return 1;else return 0.4;
    });
}

function setScales() {
    var maxEdge2015 = d3.max(processed2015.edges, function (edge) {
        return edge.data.count;
    });

    var minEdge2015 = d3.min(processed2015.edges, function (edge) {
        return edge.data.count;
    });

    var maxEdge2016 = d3.max(processed2016.edges, function (edge) {
        return edge.data.count;
    });

    var minEdge2016 = d3.min(processed2016.edges, function (edge) {
        return edge.data.count;
    });

    var minEdge = Math.min(minEdge2015, minEdge2016);
    var maxEdge = Math.max(maxEdge2015, maxEdge2016);

    linkScale = d3.scale.linear().domain([minEdge, maxEdge]).range([0.2, 0.8]);
    strokeScale = d3.scale.linear().domain([minEdge, maxEdge]).range([4, radius]);

    var colorArray = ['#f5ee57', '#f8b74d', '#fb5152', '#d60005'];
    var maxNodes2015 = d3.max(processed2015.nodes, function (node) {
        return node.data.count;
    });

    var minNodes2015 = d3.min(processed2015.nodes, function (node) {
        return node.data.count;
    });

    var maxNodes2016 = d3.max(processed2016.nodes, function (node) {
        return node.data.count;
    });

    var minNodes2016 = d3.min(processed2016.nodes, function (node) {
        return node.data.count;
    });

    var minNode = Math.min(minNodes2015, minNodes2016);
    var maxNode = Math.max(maxNodes2015, maxNodes2016);
    nodeScale = d3.scale.linear().domain([minNode, maxNode]).range([6, radius]);
    nodeColorScale = d3.scale.quantize().domain([minNode, maxNode]).range(colorArray);
}

// Layout nodes linearly, sorted by group
function linearLayout(nodes) {

    var newWidth = height;
    // used to scale node index to x position
    var xscale = d3.scale.linear().domain([0, nodes.length - 1]).range([margin, newWidth - margin]);

    var yscale = d3.scale.linear().domain([0, nodes.length - 1]).range([radius, height - margin - radius]);

    // calculate pixel location for each node
    nodes.forEach(function (d, i) {
        d.x = xscale(i);
        d.y = yfixed;
    });
}

// Draws nodes on plot
function drawNodesTop(nodes) {

    var node = d3.select("#plot").selectAll(".nodeGroupTop").data(nodes);

    var nodeEnter = node.enter();

    var nodeGroup = nodeEnter.append("g").attr('class', 'nodeGroupTop');

    var arc = d3.svg.arc().innerRadius(0).outerRadius(function (d) {
        if (d.name == "start" || d.name == "end") return radius / 2;
        return nodeScale(d.data.count);
    }).startAngle(Math.PI / 2).endAngle(-1 / 2 * Math.PI);

    var circle = nodeGroup.append("path").attr("class", "node").attr("id", function (d, i) {
        return d.name;
    }).attr("transform", function (d, i) {
        return 'translate(' + d.x + ',' + d.y + ')';
    }).style("fill", function (d, i) {
        if (d.name == "start" || d.name == "end") {
            return "#d1d3d4";
        }
        if (d.selected) return 'slategray';
        return nodeColorScale(d.data.count);
    }).attr('d', arc).style('opacity', 0);

    node.select('.node').each(function (d) {
        //            addTooltip(d3.select(this));
    }).transition('growNodes').style("fill", function (d, i) {
        if (d.name == "start" || d.name == "end") {
            return "#d1d3d4";
        }
        if (d.selected) return 'slategray';
        return nodeColorScale(d.data.count);
    }).style('opacity', function (d) {
        if (d.active && !d.selected) return 1;
        return 0;
    });

    var text = nodeGroup.append("text").text(function (d) {
        if (!d.active) return "";
        if (d.name == "start" || d.name == "end") {
            return "";
        } else return d3.format(',')(d.data.count);
    }).attr('class', 'nodeCount').style('pointer-events', 'none').style('text-anchor', 'middle').style('alignment-baseline', 'middle').style('opacity', 0).attr('dy', '-.7em');

    node.select('.nodeCount').attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });

    var nodeExit = node.exit();
    nodeExit.select('.node').transition().attr('r', 0).remove();
    nodeExit.select('.nodeCount').transition().style('opacity', 0).remove();
    //    nodeExit.select('.nodeOutline').transition().attr('r', 0).remove();
}

// Draws nice arcs for each link on plot
function drawLinksTop(links) {

    // scale to generate radians (just for lower-half of circle)

    // add links
    var linksSelection = d3.select("#plot").selectAll(".archTop").data(links);

    linksSelection.enter().append("path").attr("class", "arch archTop").style('opacity', 0);

    linksSelection.attr("transform", function (d, i) {
        // arc will always be drawn around (0, 0)
        // shift so (0, 0) will be between source and target
        var xshift = d.source.x + (d.target.x - d.source.x) / 2;
        //            var yshift = d.source.y + (d.target.y - d.source.y) / 2;
        var yshift = yfixed;
        return "translate(" + xshift + ", " + yshift + ")";
    }).style('fill', function (d) {
        //            if (d.data.direction == 'forward') {
        //                return 'green';
        //            } else return 'red';
        return 'steelgray';
    }).attr("d", shapedEdgePointy).transition().duration(500).style('opacity', function (d) {
        //            console.log([d.data.weight, linkScale(d.data.weight)]);
        if (!d.active) return 0;

        return linkScale(d.data.count);
    });

    linksSelection.exit().transition().style('opacity', 0).remove();

    function shapedEdgePointy(d, i) {
        var areaArc = d3.svg.area().interpolate("basis");

        // get x distance between source and target
        var rawXDist = d.source.x - d.target.x;
        var xdist = Math.abs(rawXDist);
        var strokeDisplacement = strokeScale(d.data.count);
        var arcPoints = [];

        var step = 67;
        var factor = 0.96;

        if (rawXDist < 0) {
            var tmp = strokeDisplacement;

            // Inner
            for (var _i2 = Math.PI; _i2 < 2 * Math.PI; _i2 += Math.PI / step) {
                var r = xdist / 2;
                var theta = _i2;

                var x = (r - tmp) * Math.cos(theta);
                var y = (r - tmp) * Math.sin(theta);
                tmp = tmp * factor;
                arcPoints.push([x, y]);
            }
            // Outer
            for (var _i3 = 2 * Math.PI; _i3 > Math.PI; _i3 -= Math.PI / step) {
                var _r = xdist / 2;
                var _theta = _i3;

                var _x = (_r + tmp) * Math.cos(_theta);
                var _y = (_r + tmp) * Math.sin(_theta);
                tmp = tmp / factor;
                arcPoints.push([_x, _y]);
            }
            //                arcPoints = [[0, -strokeScale(d.data.count)], [-ydist / 2 - strokeScale(d.data.count), ydist / 2], [0, ydist + 2], [0, ydist - 2], [-ydist / 2 + strokeScale(d.data.count), ydist / 2], [0, strokeScale(d.data.count)]];
        } else {
                // Outer
                var _tmp = strokeDisplacement;
                for (var _i4 = 2 * Math.PI; _i4 > Math.PI; _i4 -= Math.PI / step) {
                    var _r2 = xdist / 2;
                    var _theta2 = _i4;

                    var _x2 = (_r2 + _tmp) * Math.cos(_theta2);
                    var _y2 = (_r2 + _tmp) * Math.sin(_theta2);
                    _tmp = _tmp * factor;
                    arcPoints.push([_x2, _y2]);
                }

                // Inner
                for (var _i5 = Math.PI; _i5 < 2 * Math.PI; _i5 += Math.PI / step) {
                    var _r3 = xdist / 2;
                    var _theta3 = _i5;

                    var _x3 = (_r3 - _tmp) * Math.cos(_theta3);
                    var _y3 = (_r3 - _tmp) * Math.sin(_theta3);
                    _tmp = _tmp / factor;
                    arcPoints.push([_x3, _y3]);
                }
                //               
                //                arcPoints = [[0, ydist - strokeScale(d.data.count)], [-ydist / 2 + strokeScale(d.data.count), ydist / 2], [0, -2], [0, 2], [-ydist / 2 - strokeScale(d.data.count), ydist / 2], [0, ydist + strokeScale(d.data.count)]];
            }
        //        } else {
        //            if (rawXDist < 0) {
        //                let tmp = strokeDisplacement;
        //                // Outer
        //                for (let i = Math.PI; i > 0; i -= Math.PI / step) {
        //                    let r = xdist / 2;
        //                    let theta = i;
        //
        //                    let x = (r + tmp) * Math.cos(theta);
        //                    let y = (r + tmp) * Math.sin(theta);
        //                    tmp = tmp * factor;
        //                    arcPoints.push([x, y]);
        //                }
        //
        //                // Inner
        //                for (let i = 0; i < Math.PI; i += Math.PI / step) {
        //                    let r = xdist / 2;
        //                    let theta = i;
        //
        //                    let x = (r - tmp) * Math.cos(theta);
        //                    let y = (r - tmp) * Math.sin(theta);
        //                    tmp = tmp / factor;
        //                    arcPoints.push([x, y]);
        //                }
        //
        //                //                arcPoints = [[0, -strokeScale(d.data.count)], [ydist / 2 + strokeScale(d.data.count), ydist / 2], [0, ydist + 2], [0, ydist - 2], [ydist / 2 - strokeScale(d.data.count), ydist / 2], [0, strokeScale(d.data.count)]];
        //            } else {
        //                let tmp = strokeDisplacement;
        //
        //                // Inner
        //                for (let i = 0; i < Math.PI; i += Math.PI / step) {
        //                    let r = xdist / 2;
        //                    let theta = i;
        //
        //                    let x = (r - tmp) * Math.cos(theta);
        //                    let y = (r - tmp) * Math.sin(theta);
        //                    tmp = tmp * factor;
        //                    arcPoints.push([x, y]);
        //                }
        //
        //                // Outer
        //                for (let i = Math.PI; i > 0; i -= Math.PI / step) {
        //                    let r = xdist / 2;
        //                    let theta = i;
        //
        //                    let x = (r + tmp) * Math.cos(theta);
        //                    let y = (r + tmp) * Math.sin(theta);
        //                    tmp = tmp / factor;
        //                    arcPoints.push([x, y]);
        //                }
        //
        //                //                arcPoints = [[0, ydist - strokeScale(d.data.count)], [ydist / 2 - strokeScale(d.data.count), ydist / 2], [0, -2], [0, 2], [ydist / 2 + strokeScale(d.data.count), ydist / 2], [0, ydist + strokeScale(d.data.count)]];
        //            }
        //        }

        return areaArc(arcPoints);
    }
}

// Draws nodes on plot
function drawNodesBottom(nodes) {

    var node = d3.select("#plot").selectAll(".nodeGroupBottom").data(nodes);

    var nodeEnter = node.enter();

    var nodeGroup = nodeEnter.append("g").attr('class', 'nodeGroupBottom');

    var arc = d3.svg.arc().innerRadius(0).outerRadius(function (d) {
        if (d.name == "start" || d.name == "end") return radius / 2;
        return nodeScale(d.data.count);
    }).startAngle(Math.PI / 2).endAngle(3 / 2 * Math.PI);

    var circle = nodeGroup.append("path").attr("class", "node").attr("id", function (d, i) {
        return d.name;
    }).attr("transform", function (d, i) {
        return 'translate(' + d.x + ',' + d.y + ')';
    }).style("fill", function (d, i) {
        if (d.name == "start" || d.name == "end") {
            return "#d1d3d4";
        }
        if (d.selected) return 'slategray';
        return nodeColorScale(d.data.count);
    }).attr('d', arc).style('opacity', 0);

    node.select('.node').each(function (d) {
        //            addTooltip(d3.select(this));
    }).transition('growNodes').style("fill", function (d, i) {
        if (d.name == "start" || d.name == "end") {
            return "#d1d3d4";
        }
        if (d.selected) return 'slategray';
        return nodeColorScale(d.data.count);
    }).style('opacity', function (d) {
        if (d.active && !d.selected) return 1;
        return 0;
    });

    var text = nodeGroup.append("text").text(function (d) {
        if (!d.active) return "";
        if (d.name == "start" || d.name == "end") {
            return "";
        } else return d3.format(',')(d.data.count);
    }).attr('class', 'nodeCount').style('pointer-events', 'none').style('text-anchor', 'middle').style('alignment-baseline', 'middle').style('opacity', 0).attr('dy', '.7em');

    node.select('.nodeCount').attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });

    var nodeExit = node.exit();
    nodeExit.select('.node').transition().attr('r', 0).remove();
    nodeExit.select('.nodeCount').transition().style('opacity', 0).remove();
    //    nodeExit.select('.nodeOutline').transition().attr('r', 0).remove();
}

// Draws nice arcs for each link on plot
function drawLinksBottom(links) {

    // add links
    var linksSelection = d3.select("#plot").selectAll(".archBottom").data(links);

    linksSelection.enter().append("path").attr("class", "arch archBottom").style('opacity', 0);

    linksSelection.attr("transform", function (d, i) {
        // arc will always be drawn around (0, 0)
        // shift so (0, 0) will be between source and target
        var xshift = d.source.x + (d.target.x - d.source.x) / 2;
        //            var yshift = d.source.y + (d.target.y - d.source.y) / 2;
        var yshift = yfixed;
        return "translate(" + xshift + ", " + yshift + ")";
    }).style('fill', function (d) {
        //            if (d.data.direction == 'forward') {
        //                return 'green';
        //            } else return 'red';
        return 'steelgray';
    }).attr("d", shapedEdgePointy).transition().duration(500).style('opacity', function (d) {
        //            console.log([d.data.weight, linkScale(d.data.weight)]);
        if (!d.active) return 0;

        return linkScale(d.data.count);
    });

    linksSelection.exit().transition().style('opacity', 0).remove();

    function shapedEdgePointy(d, i) {
        var areaArc = d3.svg.area().interpolate("basis");

        // get x distance between source and target
        var rawXDist = d.source.x - d.target.x;
        var xdist = Math.abs(rawXDist);
        var strokeDisplacement = strokeScale(d.data.count);
        var arcPoints = [];

        var step = 67;
        var factor = 0.96;

        if (rawXDist < 0) {
            var tmp = strokeDisplacement;
            // Outer
            for (var _i6 = Math.PI; _i6 > 0; _i6 -= Math.PI / step) {
                var r = xdist / 2;
                var theta = _i6;

                var x = (r + tmp) * Math.cos(theta);
                var y = (r + tmp) * Math.sin(theta);
                tmp = tmp * factor;
                arcPoints.push([x, y]);
            }

            // Inner
            for (var _i7 = 0; _i7 < Math.PI; _i7 += Math.PI / step) {
                var _r4 = xdist / 2;
                var _theta4 = _i7;

                var _x4 = (_r4 - tmp) * Math.cos(_theta4);
                var _y4 = (_r4 - tmp) * Math.sin(_theta4);
                tmp = tmp / factor;
                arcPoints.push([_x4, _y4]);
            }

            //                arcPoints = [[0, -strokeScale(d.data.count)], [ydist / 2 + strokeScale(d.data.count), ydist / 2], [0, ydist + 2], [0, ydist - 2], [ydist / 2 - strokeScale(d.data.count), ydist / 2], [0, strokeScale(d.data.count)]];
        } else {
                var _tmp2 = strokeDisplacement;

                // Inner
                for (var _i8 = 0; _i8 < Math.PI; _i8 += Math.PI / step) {
                    var _r5 = xdist / 2;
                    var _theta5 = _i8;

                    var _x5 = (_r5 - _tmp2) * Math.cos(_theta5);
                    var _y5 = (_r5 - _tmp2) * Math.sin(_theta5);
                    _tmp2 = _tmp2 * factor;
                    arcPoints.push([_x5, _y5]);
                }

                // Outer
                for (var _i9 = Math.PI; _i9 > 0; _i9 -= Math.PI / step) {
                    var _r6 = xdist / 2;
                    var _theta6 = _i9;

                    var _x6 = (_r6 + _tmp2) * Math.cos(_theta6);
                    var _y6 = (_r6 + _tmp2) * Math.sin(_theta6);
                    _tmp2 = _tmp2 / factor;
                    arcPoints.push([_x6, _y6]);
                }

                //                arcPoints = [[0, ydist - strokeScale(d.data.count)], [ydist / 2 - strokeScale(d.data.count), ydist / 2], [0, -2], [0, 2], [ydist / 2 + strokeScale(d.data.count), ydist / 2], [0, ydist + strokeScale(d.data.count)]];
            }

        return areaArc(arcPoints);
    }
}

function hideElements() {
    d3.selectAll('.interface').transition().style('opacity', 0);
    d3.select('#legend').transition().style('opacity', 0);
}

function showElements() {
    d3.selectAll('.interface').transition().style('opacity', 1);
    d3.select('#legend').transition().style('opacity', 1);
}

function micro(datum) {
    var c2015 = children2015[datum.name];
    var c2016 = children2016[datum.name];
    var dR = nodeScale(datum.data.count) * 10;
    dR = childR;

    var child = d3.select('#plot').append('g').attr('class', 'child');

    //    console.log(datum);

    var datum2015 = datum;
    var datum2016 = processed2016.nodes.find(function (d) {
        return datum.name == d.name;
    });

    var arc = d3.svg.arc().innerRadius(0).outerRadius(dR).startAngle(Math.PI / 2).endAngle(-Math.PI / 2);

    child.append('path').datum(datum).attr('d', arc).attr("transform", function (d, i) {
        return 'translate(' + d.x + ',' + d.y + ')';
    }).attr('fill', '#7E929F').style('opacity', 0).transition().style('opacity', 1);

    var title = datum.name.split('.');
    child.append('text').text(title[0].toUpperCase() + ': ' + title[1].toUpperCase()).attr('class', 'childLabel').attr('x', datum.x).attr('y', datum.y - dR / 2).style('text-anchor', 'middle').style('opacity', 0).transition().style('opacity', 1);

    child.append('text').attr('class', 'childLabel').text('2015: ' + d3.format(',')(datum2015.data.count) + ' INCIDENTS').attr('x', datum.x).attr('y', datum.y - dR / 2).attr('dy', '1.5em').style('text-anchor', 'middle').style('opacity', 0).transition().style('opacity', 1);

    child.append('text').attr('class', 'childLabel').text('2016: ' + d3.format(',')(datum2016.data.count) + ' INCIDENTS').attr('x', datum.x).attr('y', datum.y - dR / 2).attr('dy', '2.5em').style('text-anchor', 'middle').style('opacity', 0).transition().style('opacity', 1);

    // children
    child.append('text').attr('class', 'childName childLabel').attr('x', datum.x).attr('y', datum.y + dR / 2).style('text-anchor', 'middle').text('').style('opacity', 0).transition().style('opacity', 1);

    child.append('text').attr('class', 'childCount2015 childLabel').attr('x', datum.x).attr('y', datum.y + dR / 2).attr('dy', '1.5em').style('text-anchor', 'middle').text('').style('opacity', 0).transition().style('opacity', 1);

    child.append('text').attr('class', 'childCount2016 childLabel').attr('x', datum.x).attr('y', datum.y + dR / 2).attr('dy', '2.5em').style('text-anchor', 'middle').text('').style('opacity', 0).transition().style('opacity', 1);

    var dataMap = {};
    c2015.forEach(function (d) {
        dataMap[d.label] = {
            count2015: d.count,
            count2016: 0
        };
    });

    c2016.forEach(function (d) {
        if (dataMap[d.label]) dataMap[d.label].count2016 = d.count;else dataMap[d.label] = {
            count2016: d.count,
            count2015: 0
        };
    });

    var dataArray = [];
    Object.keys(dataMap).forEach(function (key) {
        dataArray.push({
            label: key,
            count2015: dataMap[key].count2015,
            count2016: dataMap[key].count2016
        });
    });

    // used to scale node index to x position
    var xscale = d3.scale.linear().domain([0, dataArray.length - 1]).range([datum.x - dR + radius, datum.x + dR - radius]);

    // calculate pixel location for each node
    dataArray.forEach(function (d, i) {
        d.x = xscale(i);
        d.y = yfixed;
    });

    var dist = xscale(1) - xscale(0);

    var colorArray = ['#f5ee57', '#f8b74d', '#fb5152', '#d60005'];
    var max2015 = d3.max(c2015, function (node) {
        return node.count;
    });

    var min2015 = d3.min(c2015, function (node) {
        return node.count;
    });

    var max2016 = d3.max(c2016, function (node) {
        return node.count;
    });

    var min2016 = d3.min(c2016, function (node) {
        return node.count;
    });

    var max = Math.max(max2015, max2016);
    var min = Math.min(min2015, min2016);

    var childrenScale = d3.scale.linear().domain([min, max]).range([Math.max(2, dist / 32), Math.min(radius, dist / 2)]);
    var childrenColorScale = d3.scale.quantize().domain([min, max]).range(colorArray);

    var childNodes = child.selectAll('.children').data(dataArray);
    var childEnter = childNodes.enter();

    var arcTop = d3.svg.arc().innerRadius(0).outerRadius(function (d) {
        return d.count2015 != 0 ? childrenScale(d.count2015) : 0;
    }).startAngle(Math.PI / 2).endAngle(-Math.PI / 2);

    childEnter.append('path').attr('class', 'children c2015').attr('id', function (d) {
        return d.label;
    }).attr("transform", function (d, i) {
        return 'translate(' + d.x + ',' + d.y + ')';
    }).attr('fill', function (d) {
        return childrenColorScale(d.count2015);
    }).style('opacity', 0).attr('d', arcTop).transition().style('opacity', 1);

    var arcBottom = d3.svg.arc().innerRadius(0).outerRadius(function (d) {
        return d.count2016 != 0 ? childrenScale(d.count2016) : 0;
    }).startAngle(Math.PI / 2).endAngle(3 / 2 * Math.PI);

    childEnter.append('path').attr('class', 'children c2016').attr('id', function (d) {
        return d.label;
    }).attr("transform", function (d, i) {
        return 'translate(' + d.x + ',' + d.y + ')';
    }).attr('fill', function (d) {
        return childrenColorScale(d.count2016);
    }).style('opacity', 0).attr('d', arcBottom).transition().style('opacity', 1);

    childEnter.append('rect').attr('class', 'childRect').attr('x', function (d) {
        return d.x - dist / 2;
    }).attr('y', function (d) {
        return d.y - dR;
    }).attr('height', dR * 2).attr('width', function (d) {
        return dist;
    }).style('opacity', 0).on('mouseover', function (d) {
        // child Title
        var split = d.label.split('.');
        var title = split[split.length - 1].toUpperCase();
        child.select('.childName').text(title);
        child.select('.childCount2015').text('2015: ' + d3.format(',')(d.count2015) + ' INCIDENTS');
        child.select('.childCount2016').text('2016: ' + d3.format(',')(d.count2016) + ' INCIDENTS');

        d3.selectAll('.c2015').attr('fill', function (d) {
            return childrenColorScale(d.count2015);
        });
        d3.selectAll('.c2016').attr('fill', function (d) {
            return childrenColorScale(d.count2016);
        });
        d3.selectAll('.children').filter(function (cD) {
            return cD.label == d.label;
        }).attr('fill', 'white');
    });
}