/* GLOBALS */
'use strict';

var width = document.documentElement.clientWidth; // width of svg image
var height = document.documentElement.clientHeight; // height of svg image
var margin = 40; // amount of margin around plot area
//var pad = margin / 2; // actual padding amount
var radius = width < 1600 ? 20 : 40; // fixed node radius
let childR = width < 1600 ? 200 : 350;
var yfixed = height / 2; // y position for all nodes
var xfixed = radius;
let linkScale;
let strokeScale;
let nodeColorScale;
let nodeScale;
let processed2016;
let processed2015
let detailHover = false;

let children2015, children2016;
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

    let all = processData(data);

    let nodes = all.nodes;
    let map = {};
    nodes.forEach((data) => {
        let d = data.data;

        if (map[d.subType]) {
            map[d.subType].push(d);
        } else {
            map[d.subType] = [d];
        }
    })
    children2016 = map;
});

d3.json("finaldata/2015_all_supergraph.json", function (error, data) {
    if (error) return console.warn(error);

    let all = processData(data);

    let nodes = all.nodes;
    let map = {};
    nodes.forEach((data) => {
        let d = data.data;

        if (map[d.subType]) {
            map[d.subType].push(d);
        } else {
            map[d.subType] = [d];
        }
    })
    children2015 = map;
});

function processData(data) {
    let output = {
        nodes: [],
        edges: []
    };
    let graph = data.graphml.graph;

    let startNode, endNode;
    // Build nodes
    for (let i = 0; i < graph.node.length; i++) {
        let node = graph.node[i];

        let data = {};
        for (let j = 0; j < node.data.length; j++) {
            let datum = node.data[j];
            if (datum["@key"] == "d0")
                data.count = +datum["#text"];
            else if (datum["@key"] == "d1")
                data.type = datum["#text"];
            else if (datum["@key"] == "d2")
                data.subType = datum["#text"];
            else if (datum["@key"] == "d3")
                data.weight = +datum["#text"];
            else if (datum["@key"] == "d4")
                data.label = datum["#text"];
        }

        let nodeObj = {
            "name": node["@id"],
            "data": data,
            "active": true,
            "selected": false
        }
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
    let map = {
        action: 0,
        attribute: 1
    }
    output.nodes.sort(function (a, b) {
        //        console.log(a.data.type-b.data.type);
        return map[a.data.type] - map[b.data.type];
    });

    // adds start and end nodes
    output.nodes.unshift(startNode);
    output.nodes.push(endNode);

    // Build edges
    for (let i = 0; i < graph.edge.length; i++) {
        let edge = graph.edge[i];

        // Find Source
        let sourceName = edge["@source"];
        let sourceNode = output.nodes.filter(function (node) {
            return node.name == sourceName;
        })[0];

        // Find Target
        let targetName = edge["@target"];
        let targetNode = output.nodes.filter(function (node) {
            return node.name == targetName;
        })[0];

        let data = {};

        for (let j = 0; j < edge.data.length; j++) {
            let datum = edge.data[j];

            if (datum["@key"] == "d5")
                data.count = +datum["#text"];
            else if (datum["@key"] == "d6")
                data.direction = datum["#text"];
            else if (datum["@key"] == "d7")
                data.weight = +datum["#text"];
            else if (datum["@key"] == "d8")
                data.label = datum["#text"];
        }

        if (sourceNode.name == targetNode.name)
            continue;

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

    }

    //    console.log(output);
    return output;
}

/* HELPER FUNCTIONS */

// Generates a tooltip for a SVG circle element based on its ID
function addTooltip(circle) {
    let data = d3.select(circle).node().datum();
    //    console.log(data);
    var x = data.x + radius;
    var y = data.y - radius;
    var r = 10;
    var text = data.data.label;

    var split = text.split('.');
    if (split.length == 1)
        text = split[0];
    else
        text = split[1];
    if (d3.selectAll('#' + text + 'tooltip').size() > 0) return;
    var tooltip = d3.select("#plot")
        .append("text")
        .text(text.toUpperCase())
        .attr("transform", "translate(" + x + "," + y + ")rotate(-45)")
        .attr("class", function () {
            if (split.length == 2) {
                return split[0] + " tooltip";
            }
            return "tooltip";
        })
        .attr('id', function () {
            return text + 'tooltip';
        })
        .style('opacity', 0).transition().style('opacity', 1);

    var offset = tooltip.node().getBBox().width / 2;

}

/* MAIN DRAW METHOD */

// Draws an arc diagram for the provided undirected graph
function arcDiagram(graphTop, graphBottom) {
    // create svg image
    var svg = d3.select("body")
        .append("svg")
        .attr("id", "arc")
        .attr("width", width)
        .attr("height", height);

    // draw border around svg image
    // svg.append("rect")
    //     .attr("class", "outline")
    //     .attr("width", width)
    //     .attr("height", height);

    // create plot area within svg image
    let offset = width / 2 - (margin + height - margin) / 2;

    svg.append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('id', 'backRect')
        .attr('width', width)
        .attr('height', height)
        .style('opacity', 0)
        .on('mouseover', function () {
            detailHover = false;

            d3.selectAll('.nodeCount').transition().style('opacity', 0);
            d3.selectAll('.arch').transition().style('opacity', function (d) {
                if (!d.active) return 0;
                return linkScale(d.data.count);
            });

            d3.selectAll('.node')
                .each(function (d) {
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
    svg.append('rect')
        .attr('class', 'hiddenRect')
        .attr('x', offset)
        .attr('y', height / 2 - radius * 2)
        .attr('height', radius * 4)
        .attr('width', height)
        .style('opacity', 0)
        .on('mouseover', function () {
            //            console.log('over');
            detailHover = true;
        });
    //        .on('mouseout', function () {
    //        console.log('out');
    //            detailHover = false;
    //        });
    var plot = svg.append("g")
        .attr("id", "plot")
        .attr("transform", "translate(" + offset + ", 0)");

    //    let wp = (width+margin)/2+width*.4;
    svg.append("text")
        .text("2015 DBIR ATTACK GRAPH")
        .attr('class', 'label interface')
        .style('text-anchor', 'middle')
        .attr('transform', 'translate(' + width / 2 + ',' + margin + ')');
    //
    let wp = height - margin;
    svg.append("text")
        .text("2016 DBIR ATTACK GRAPH")
        .attr('class', 'label interface')
        .style('text-anchor', 'middle')
        .attr('transform', 'translate(' + width / 2 + ',' + wp + ')');

    svg.append("text")
        .text("INCIDENT COUNT")
        .attr('class', 'label interface')
        .style('text-anchor', 'end')
        .attr('dy', '.35em')
        .attr('transform', 'translate(' + offset + ',' + height / 2 + ')');

    svg.on('click', function () {
        processed2015.nodes.forEach(d => {
            d.selected = false;
            d.active = true;
        });

        processed2016.nodes.forEach(d => {
            d.selected = false;
            d.active = true;
        });
        processed2015.edges.forEach(d => d.active = true);
        processed2016.edges.forEach(d => d.active = true);
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

    let nodes = graph.nodes;
    let node = d3.select("#plot").selectAll(".nodeOutline").data(nodes);
    let nodeEnter = node.enter();

    let outline = nodeEnter.append("circle")
        .attr("class", "nodeOutline")
        .attr('fill', 'white')
        .attr('stroke', 'black')
        .attr('stroke-width', '1px')
        .attr('r', 0)
        .on('mouseover', function (d, i) {
            let thisData = d;
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
            d3.selectAll('.node').filter(dN => dN.name == d.name).style('fill', function (d) {
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
                    if (d.source.name == thisData.name)
                        return true;
                    return false;
                }).transition().style('opacity', function (d) {
                    if (!d.active) return 0;
                    return linkScale(d.data.count) + .2;
                })
                .each(function (d) {
                    let nodeTarget = d.target.name;
                    d3.selectAll('.node').filter(function (d) {
                            return d.name == nodeTarget;
                        }).style("fill", function (d, i) {
                            if (d.name == "start" || d.name == "end") {
                                return "#d1d3d4";
                            }
                            return nodeColorScale(d.data.count);
                        })
                        .each(function (d) {
                            if (d.active)
                                addTooltip(d3.select(this));
                        });
                });
        })
        .on('mouseout', function (d, i) {
            if (detailHover || d.selected) return;
            d3.selectAll('.nodeCount').transition().style('opacity', 0);
            d3.selectAll('.arch').transition().style('opacity', function (d) {
                if (!d.active) return 0;
                return linkScale(d.data.count);
            });

            d3.selectAll('.node')
                .style("fill", function (d, i) {
                    if (d.name == "start" || d.name == "end") {
                        return "#d1d3d4";
                    }
                    return nodeColorScale(d.data.count);
                })
                .each(function (d) {
                    if (d.active)
                        addTooltip(d3.select(this));
                });
        })
        .on('click', function (d, i) {
            d3.event.stopPropagation();

            if (d.name == "start" || d.name == "end") {
                return;
            }
            processed2015.nodes.forEach(d => d.active = false);
            processed2015.nodes[i].active = true;
            processed2015.nodes[i].selected = true;
            processed2015.edges.forEach(d => d.active = false);

            processed2016.nodes.forEach(d => d.active = false);
            processed2016.nodes[i].active = true;
            processed2016.nodes[i].selected = true;
            processed2016.edges.forEach(d => d.active = false);
            d3.selectAll('.nodeCount').transition().style('opacity', 0);
            hideElements();
            update(processed2015, processed2016);
            //            d3.select('#backRect').style('cursor', 'pointer');
            d3.selectAll('.tooltip').remove();
        });

    node.attr("cx", function (d, i) {
            return d.x;
        })
        .attr("cy", function (d, i) {
            return d.y;
        })
        .each(function (d) {
            addTooltip(d3.select(this));
        })
        .each(function (d) {
            if (d.selected) {
                micro(d);
            }
        })
        .attr('stroke-dasharray', function (d) {
            if (d.data.type == "attribute") {
                return "4, 4";
            }
        })
        .style('cursor', d => {
            //            console.log(d)
            if (d.name == "start" || d.name == "end") {
                return 'default';
            }
            if (d.selected)
                return 'default';

            return 'pointer';
        })
        .transition()
        .attr('stroke-width', function (d) {
            if (d.selected) return 0;
            else return '1px';
        })
        .attr("r", function (d, i) {
            if (!d.active) return 0;
            if (d.name == "start" || d.name == "end")
                return radius / 2;
            if (d.selected) {
                return childR;
            }
            return radius + 2;
        })
        .style("fill", function (d, i) {
            if (d.selected) return 'slategray';
            return 'white';
        })
        .attr('opacity', function (d) {
            if (d.selected) return 1;
            else return 0.4;
        });

}

function setScales() {
    let maxEdge2015 = d3.max(processed2015.edges, function (edge) {
        return edge.data.count;
    });

    let minEdge2015 = d3.min(processed2015.edges, function (edge) {
        return edge.data.count;
    });

    let maxEdge2016 = d3.max(processed2016.edges, function (edge) {
        return edge.data.count;
    });

    let minEdge2016 = d3.min(processed2016.edges, function (edge) {
        return edge.data.count;
    });

    let minEdge = Math.min(minEdge2015, minEdge2016);
    let maxEdge = Math.max(maxEdge2015, maxEdge2016);

    linkScale = d3.scale.linear().domain([minEdge, maxEdge]).range([0.2, 0.8]);
    strokeScale = d3.scale.linear().domain([minEdge, maxEdge]).range([4, radius]);

    let colorArray = ['#f5ee57', '#f8b74d', '#fb5152', '#d60005'];
    let maxNodes2015 = d3.max(processed2015.nodes, function (node) {
        return node.data.count;
    });

    let minNodes2015 = d3.min(processed2015.nodes, function (node) {
        return node.data.count;
    });

    let maxNodes2016 = d3.max(processed2016.nodes, function (node) {
        return node.data.count;
    });

    let minNodes2016 = d3.min(processed2016.nodes, function (node) {
        return node.data.count;
    });

    let minNode = Math.min(minNodes2015, minNodes2016);
    let maxNode = Math.max(maxNodes2015, maxNodes2016);
    nodeScale = d3.scale.linear().domain([minNode, maxNode]).range([6, radius]);
    nodeColorScale = d3.scale.quantize().domain([minNode, maxNode]).range(colorArray);
}


// Layout nodes linearly, sorted by group
function linearLayout(nodes) {

    let newWidth = height;
    // used to scale node index to x position
    var xscale = d3.scale.linear()
        .domain([0, nodes.length - 1])
        .range([margin, newWidth - margin]);

    var yscale = d3.scale.linear()
        .domain([0, nodes.length - 1])
        .range([radius, height - margin - radius]);

    // calculate pixel location for each node
    nodes.forEach(function (d, i) {
        d.x = xscale(i);
        d.y = yfixed;
    });
}

// Draws nodes on plot
function drawNodesTop(nodes) {


    var node = d3.select("#plot").selectAll(".nodeGroupTop")
        .data(nodes);

    let nodeEnter = node.enter();

    var nodeGroup = nodeEnter.append("g").attr('class', 'nodeGroupTop');


    let arc = d3.svg.arc().innerRadius(0).outerRadius(function (d) {
        if (d.name == "start" || d.name == "end") return radius / 2;
        return nodeScale(d.data.count);
    }).startAngle(Math.PI / 2).endAngle(-1 / 2 * Math.PI);

    let circle = nodeGroup.append("path")
        .attr("class", "node")
        .attr("id", function (d, i) {
            return d.name;
        }).attr("transform", function (d, i) {
            return 'translate(' + d.x + ',' + d.y + ')';
        })
        .style("fill", function (d, i) {
            if (d.name == "start" || d.name == "end") {
                return "#d1d3d4";
            }
            if (d.selected) return 'slategray';
            return nodeColorScale(d.data.count);
        })
        .attr('d', arc)
        .style('opacity', 0);

    node.select('.node')
        .each(function (d) {
            //            addTooltip(d3.select(this));
        })
        .transition('growNodes')
        .style("fill", function (d, i) {
            if (d.name == "start" || d.name == "end") {
                return "#d1d3d4";
            }
            if (d.selected) return 'slategray';
            return nodeColorScale(d.data.count);
        })
        .style('opacity', function (d) {
            if (d.active && !d.selected) return 1;
            return 0;
        });


    let text = nodeGroup.append("text")
        .text(function (d) {
            if (!d.active) return "";
            if (d.name == "start" || d.name == "end") {
                return "";
            } else return d3.format(',')(d.data.count);
        })
        .attr('class', 'nodeCount')
        .style('pointer-events', 'none')
        .style('text-anchor', 'middle')
        .style('alignment-baseline', 'middle')
        .style('opacity', 0)
        .attr('dy', '-.7em');

    node.select('.nodeCount').attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });

    let nodeExit = node.exit();
    nodeExit.select('.node').transition().attr('r', 0).remove();
    nodeExit.select('.nodeCount').transition().style('opacity', 0).remove();
    //    nodeExit.select('.nodeOutline').transition().attr('r', 0).remove();
}

// Draws nice arcs for each link on plot
function drawLinksTop(links) {

    // scale to generate radians (just for lower-half of circle)

    // add links
    let linksSelection = d3.select("#plot").selectAll(".archTop")
        .data(links);

    linksSelection.enter()
        .append("path")
        .attr("class", "arch archTop")
        .style('opacity', 0);

    linksSelection
        .attr("transform", function (d, i) {
            // arc will always be drawn around (0, 0)
            // shift so (0, 0) will be between source and target
            var xshift = d.source.x + (d.target.x - d.source.x) / 2;
            //            var yshift = d.source.y + (d.target.y - d.source.y) / 2;
            var yshift = yfixed;
            return "translate(" + xshift + ", " + yshift + ")";
        })
        .style('fill', function (d) {
            //            if (d.data.direction == 'forward') {
            //                return 'green';
            //            } else return 'red';
            return 'steelgray';
        })
        .attr("d", shapedEdgePointy)
        .transition().duration(500).style('opacity', function (d) {
            //            console.log([d.data.weight, linkScale(d.data.weight)]);
            if (!d.active) return 0;

            return linkScale(d.data.count);
        });

    linksSelection.exit().transition().style('opacity', 0).remove();

    function shapedEdgePointy(d, i) {
        var areaArc = d3.svg.area()
            .interpolate("basis");

        // get x distance between source and target
        var rawXDist = d.source.x - d.target.x;
        var xdist = Math.abs(rawXDist);
        let strokeDisplacement = strokeScale(d.data.count);
        let arcPoints = [];

        let step = 67;
        let factor = 0.96;

        if (rawXDist < 0) {
            let tmp = strokeDisplacement;

            // Inner
            for (let i = Math.PI; i < 2 * Math.PI; i += Math.PI / step) {
                let r = xdist / 2;
                let theta = i;

                let x = (r - tmp) * Math.cos(theta);
                let y = (r - tmp) * Math.sin(theta);
                tmp = tmp * factor;
                arcPoints.push([x, y]);
            }
            // Outer
            for (let i = 2 * Math.PI; i > Math.PI; i -= Math.PI / step) {
                let r = xdist / 2;
                let theta = i;

                let x = (r + tmp) * Math.cos(theta);
                let y = (r + tmp) * Math.sin(theta);
                tmp = tmp / factor;
                arcPoints.push([x, y]);
            }
            //                arcPoints = [[0, -strokeScale(d.data.count)], [-ydist / 2 - strokeScale(d.data.count), ydist / 2], [0, ydist + 2], [0, ydist - 2], [-ydist / 2 + strokeScale(d.data.count), ydist / 2], [0, strokeScale(d.data.count)]];
        } else {
            // Outer
            let tmp = strokeDisplacement;
            for (let i = 2 * Math.PI; i > Math.PI; i -= Math.PI / step) {
                let r = xdist / 2;
                let theta = i;

                let x = (r + tmp) * Math.cos(theta);
                let y = (r + tmp) * Math.sin(theta);
                tmp = tmp * factor;
                arcPoints.push([x, y]);
            }

            // Inner
            for (let i = Math.PI; i < 2 * Math.PI; i += Math.PI / step) {
                let r = xdist / 2;
                let theta = i;

                let x = (r - tmp) * Math.cos(theta);
                let y = (r - tmp) * Math.sin(theta);
                tmp = tmp / factor;
                arcPoints.push([x, y]);
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

    var node = d3.select("#plot").selectAll(".nodeGroupBottom")
        .data(nodes);

    let nodeEnter = node.enter();

    var nodeGroup = nodeEnter.append("g").attr('class', 'nodeGroupBottom');

    let arc = d3.svg.arc().innerRadius(0).outerRadius(function (d) {
        if (d.name == "start" || d.name == "end") return radius / 2;
        return nodeScale(d.data.count);
    }).startAngle(Math.PI / 2).endAngle(3 / 2 * Math.PI);

    let circle = nodeGroup.append("path")
        .attr("class", "node")
        .attr("id", function (d, i) {
            return d.name;
        }).attr("transform", function (d, i) {
            return 'translate(' + d.x + ',' + d.y + ')';
        })
        .style("fill", function (d, i) {
            if (d.name == "start" || d.name == "end") {
                return "#d1d3d4";
            }
            if (d.selected) return 'slategray';
            return nodeColorScale(d.data.count);
        })
        .attr('d', arc)
        .style('opacity', 0);

    node.select('.node')
        .each(function (d) {
            //            addTooltip(d3.select(this));
        })
        .transition('growNodes')
        .style("fill", function (d, i) {
            if (d.name == "start" || d.name == "end") {
                return "#d1d3d4";
            }
            if (d.selected) return 'slategray';
            return nodeColorScale(d.data.count);
        })
        .style('opacity', function (d) {
            if (d.active && !d.selected) return 1;
            return 0;
        });


    let text = nodeGroup.append("text")
        .text(function (d) {
            if (!d.active) return "";
            if (d.name == "start" || d.name == "end") {
                return "";
            } else return d3.format(',')(d.data.count);
        })
        .attr('class', 'nodeCount')
        .style('pointer-events', 'none')
        .style('text-anchor', 'middle')
        .style('alignment-baseline', 'middle')
        .style('opacity', 0)
        .attr('dy', '.7em');

    node.select('.nodeCount').attr('transform', function (d) {
        return 'translate(' + d.x + ',' + d.y + ')';
    });

    let nodeExit = node.exit();
    nodeExit.select('.node').transition().attr('r', 0).remove();
    nodeExit.select('.nodeCount').transition().style('opacity', 0).remove();
    //    nodeExit.select('.nodeOutline').transition().attr('r', 0).remove();
}

// Draws nice arcs for each link on plot
function drawLinksBottom(links) {

    // add links
    let linksSelection = d3.select("#plot").selectAll(".archBottom")
        .data(links);

    linksSelection.enter()
        .append("path")
        .attr("class", "arch archBottom")
        .style('opacity', 0);

    linksSelection
        .attr("transform", function (d, i) {
            // arc will always be drawn around (0, 0)
            // shift so (0, 0) will be between source and target
            var xshift = d.source.x + (d.target.x - d.source.x) / 2;
            //            var yshift = d.source.y + (d.target.y - d.source.y) / 2;
            var yshift = yfixed;
            return "translate(" + xshift + ", " + yshift + ")";
        })
        .style('fill', function (d) {
            //            if (d.data.direction == 'forward') {
            //                return 'green';
            //            } else return 'red';
            return 'steelgray';
        })
        .attr("d", shapedEdgePointy)
        .transition().duration(500).style('opacity', function (d) {
            //            console.log([d.data.weight, linkScale(d.data.weight)]);
            if (!d.active) return 0;

            return linkScale(d.data.count);
        });

    linksSelection.exit().transition().style('opacity', 0).remove();

    function shapedEdgePointy(d, i) {
        var areaArc = d3.svg.area()
            .interpolate("basis");

        // get x distance between source and target
        var rawXDist = d.source.x - d.target.x;
        var xdist = Math.abs(rawXDist);
        let strokeDisplacement = strokeScale(d.data.count);
        let arcPoints = [];

        let step = 67;
        let factor = 0.96;

        if (rawXDist < 0) {
            let tmp = strokeDisplacement;
            // Outer
            for (let i = Math.PI; i > 0; i -= Math.PI / step) {
                let r = xdist / 2;
                let theta = i;

                let x = (r + tmp) * Math.cos(theta);
                let y = (r + tmp) * Math.sin(theta);
                tmp = tmp * factor;
                arcPoints.push([x, y]);
            }

            // Inner
            for (let i = 0; i < Math.PI; i += Math.PI / step) {
                let r = xdist / 2;
                let theta = i;

                let x = (r - tmp) * Math.cos(theta);
                let y = (r - tmp) * Math.sin(theta);
                tmp = tmp / factor;
                arcPoints.push([x, y]);
            }

            //                arcPoints = [[0, -strokeScale(d.data.count)], [ydist / 2 + strokeScale(d.data.count), ydist / 2], [0, ydist + 2], [0, ydist - 2], [ydist / 2 - strokeScale(d.data.count), ydist / 2], [0, strokeScale(d.data.count)]];
        } else {
            let tmp = strokeDisplacement;

            // Inner
            for (let i = 0; i < Math.PI; i += Math.PI / step) {
                let r = xdist / 2;
                let theta = i;

                let x = (r - tmp) * Math.cos(theta);
                let y = (r - tmp) * Math.sin(theta);
                tmp = tmp * factor;
                arcPoints.push([x, y]);
            }

            // Outer
            for (let i = Math.PI; i > 0; i -= Math.PI / step) {
                let r = xdist / 2;
                let theta = i;

                let x = (r + tmp) * Math.cos(theta);
                let y = (r + tmp) * Math.sin(theta);
                tmp = tmp / factor;
                arcPoints.push([x, y]);
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
    let c2015 = children2015[datum.name];
    let c2016 = children2016[datum.name];
    let dR = nodeScale(datum.data.count) * 10;
    dR = childR;

    let child = d3.select('#plot').append('g').attr('class', 'child');

    //    console.log(datum);


    let datum2015 = datum;
    let datum2016 = processed2016.nodes.find(d => datum.name == d.name);


    let arc = d3.svg.arc().innerRadius(0).outerRadius(dR).startAngle(Math.PI / 2).endAngle(-Math.PI / 2);

    child.append('path')
        .datum(datum)
        .attr('d', arc)
        .attr("transform", function (d, i) {
            return 'translate(' + d.x + ',' + d.y + ')';
        })
        .attr('fill', '#7E929F')
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);

    let title = datum.name.split('.');
    child.append('text')
        .text(title[0].toUpperCase() + ': ' + title[1].toUpperCase())
        .attr('class', 'childLabel')
        .attr('x', datum.x)
        .attr('y', datum.y - dR / 2)
        .style('text-anchor', 'middle')
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);

    child.append('text')
        .attr('class', 'childLabel')
        .text('2015: ' + d3.format(',')(datum2015.data.count) + ' INCIDENTS')
        .attr('x', datum.x)
        .attr('y', datum.y - dR / 2)
        .attr('dy', '1.5em')
        .style('text-anchor', 'middle')
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);

    child.append('text')
        .attr('class', 'childLabel')
        .text('2016: ' + d3.format(',')(datum2016.data.count) + ' INCIDENTS')
        .attr('x', datum.x)
        .attr('y', datum.y - dR / 2)
        .attr('dy', '2.5em')
        .style('text-anchor', 'middle')
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);

    // children
    child.append('text')
        .attr('class', 'childName childLabel')
        .attr('x', datum.x)
        .attr('y', datum.y + dR / 2)
        .style('text-anchor', 'middle')
        .text('')
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);

    child.append('text')
        .attr('class', 'childCount2015 childLabel')
        .attr('x', datum.x)
        .attr('y', datum.y + dR / 2)
        .attr('dy', '1.5em')
        .style('text-anchor', 'middle')
        .text('')
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);

    child.append('text')
        .attr('class', 'childCount2016 childLabel')
        .attr('x', datum.x)
        .attr('y', datum.y + dR / 2)
        .attr('dy', '2.5em')
        .style('text-anchor', 'middle')
        .text('')
        .style('opacity', 0)
        .transition()
        .style('opacity', 1);


    let dataMap = {};
    c2015.forEach(d => {
        dataMap[d.label] = {
            count2015: d.count,
            count2016: 0
        };
    });

    c2016.forEach(d => {
        if (dataMap[d.label])
            dataMap[d.label].count2016 = d.count;
        else
            dataMap[d.label] = {
                count2016: d.count,
                count2015: 0
            };
    });


    let dataArray = [];
    Object.keys(dataMap).forEach(function (key) {
        dataArray.push({
            label: key,
            count2015: dataMap[key].count2015,
            count2016: dataMap[key].count2016
        });
    });

    // used to scale node index to x position
    var xscale = d3.scale.linear()
        .domain([0, dataArray.length - 1])
        .range([datum.x - dR + radius, datum.x + dR - radius]);

    // calculate pixel location for each node
    dataArray.forEach(function (d, i) {
        d.x = xscale(i);
        d.y = yfixed;
    });

    let dist = xscale(1) - xscale(0);

    let colorArray = ['#f5ee57', '#f8b74d', '#fb5152', '#d60005'];
    let max2015 = d3.max(c2015, function (node) {
        return node.count;
    });

    let min2015 = d3.min(c2015, function (node) {
        return node.count;
    });

    let max2016 = d3.max(c2016, function (node) {
        return node.count;
    });

    let min2016 = d3.min(c2016, function (node) {
        return node.count;
    });

    let max = Math.max(max2015, max2016);
    let min = Math.min(min2015, min2016);

    let childrenScale = d3.scale.linear().domain([min, max]).range([Math.max(2, dist / 32), Math.min(radius, dist / 2)]);
    let childrenColorScale = d3.scale.quantize().domain([min, max]).range(colorArray);

    let childNodes = child.selectAll('.children').data(dataArray);
    let childEnter = childNodes.enter();

    let arcTop = d3.svg.arc().innerRadius(0).outerRadius(d => d.count2015 != 0 ? childrenScale(d.count2015) : 0).startAngle(Math.PI / 2).endAngle(-Math.PI / 2);

    childEnter.append('path')
        .attr('class', 'children c2015')
        .attr('id', d => d.label)
        .attr("transform", function (d, i) {
            return 'translate(' + d.x + ',' + d.y + ')';
        })
        .attr('fill', (d) => childrenColorScale(d.count2015))
        .style('opacity', 0)
        .attr('d', arcTop)
        .transition()
        .style('opacity', 1);

    let arcBottom = d3.svg.arc().innerRadius(0).outerRadius(d => d.count2016 != 0 ? childrenScale(d.count2016) : 0).startAngle(Math.PI / 2).endAngle(3 / 2 * Math.PI);

    childEnter.append('path')
        .attr('class', 'children c2016')
        .attr('id', d => d.label)
        .attr("transform", function (d, i) {
            return 'translate(' + d.x + ',' + d.y + ')';
        })
        .attr('fill', (d) => childrenColorScale(d.count2016))
        .style('opacity', 0)
        .attr('d', arcBottom)
        .transition()
        .style('opacity', 1);

    childEnter.append('rect')
        .attr('class', 'childRect')
        .attr('x', (d) => d.x - dist / 2)
        .attr('y', (d) => d.y - dR)
        .attr('height', dR * 2)
        .attr('width', (d) => dist)
        .style('opacity', 0)
        .on('mouseover', function (d) {
            // child Title
            let split = d.label.split('.');
            let title = split[split.length - 1].toUpperCase();
            child.select('.childName').text(title);
            child.select('.childCount2015').text('2015: ' + d3.format(',')(d.count2015) + ' INCIDENTS');
            child.select('.childCount2016').text('2016: ' + d3.format(',')(d.count2016) + ' INCIDENTS');

            d3.selectAll('.c2015').attr('fill', (d) => childrenColorScale(d.count2015));
            d3.selectAll('.c2016').attr('fill', (d) => childrenColorScale(d.count2016));
            d3.selectAll('.children').filter((cD) => cD.label == d.label).attr('fill', 'white');
        });
}
