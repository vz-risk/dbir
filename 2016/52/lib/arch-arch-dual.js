/* GLOBALS */
'use strict';

var width = 1920; // width of svg image
var height = 1920; // height of svg image
var margin = 40; // amount of margin around plot area
var pad = margin / 2; // actual padding amount
var radius = 10; // fixed node radius
var yfixed = pad + radius; // y position for all nodes
var xfixed = width / 2;
var linkScale = void 0,
    strokeScale = void 0;
var linkMin = void 0,
    linkMax = void 0;
var nodeMin = void 0,
    nodeMax = void 0;
var colorArray = ['#f5ee57', '#f8b74d', '#fb5152', '#d60005'];
var nodeScale = void 0,
    nodeColorScale = void 0;

d3.json("finaldata/2016_supergraph.json", function (error, dataR) {
    if (error) return console.warn(error);

    var processedRight = processData(dataR);

    d3.json("finaldata/2015_supergraph.json", function (error, dataL) {
        if (error) return console.warn(error);

        var processedLeft = processData(dataL);
        arcDiagram(processedLeft, processedRight);
    });
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
            "data": _data
        };
        if (nodeObj.name == "start") {
            startNode = nodeObj;
            continue;
        } else if (nodeObj.name == "end") {
            endNode = nodeObj;
            continue;
        }
        //        console.log(nodeObj.name+',' +nodeObj.data.count);
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

        if (sourceNode.name == targetNode.name) return 'continue';

        output.edges.push({
            source: sourceNode,
            target: targetNode,
            data: data
        });
        //        if (data.direction == "forward") {
        //            output.edges.push({
        //                source: sourceNode,
        //                target: targetNode,
        //                data: data
        //            });
        //        } else {
        //            output.edges.push({
        //                source: targetNode,
        //                target: sourceNode,
        //                data: data
        //            });
        //        }
    };

    for (var _i = 0; _i < graph.edge.length; _i++) {
        var _ret = _loop(_i);

        if (_ret === 'continue') continue;
    }

    //    console.log(output);
    return output;
}

/* HELPER FUNCTIONS */

// Generates a tooltip for a SVG circle element based on its ID
function addTooltip(element) {
    var translate = d3.transform(element.attr('transform')).translate;
    //    console.log(translate);
    var x = translate[0];
    var y = translate[1];
    var r = 30;
    var text = element.attr("id");

    var tooltip = d3.select("#plot").append("text").text(text).attr("x", x).attr("y", y).attr("dy", -r * 2).attr("class", "tooltip");

    var offset = tooltip.node().getBBox().width / 2;

    if (x - offset < 0) {
        tooltip.attr("text-anchor", "start");
        tooltip.attr("dx", -r);
    } else if (x + offset > width - margin) {
        tooltip.attr("text-anchor", "end");
        tooltip.attr("dx", r);
    } else {
        tooltip.attr("text-anchor", "middle");
        tooltip.attr("dx", 0);
    }
}

/* MAIN DRAW METHOD */

// Draws an arc diagram for the provided undirected graph
function arcDiagram(graphL, graphR) {
    // create svg image
    var svg = d3.select("body").append("svg").attr("id", "arc").attr("width", width).attr("height", height);

    // draw border around svg image
    // svg.append("rect")
    //     .attr("class", "outline")
    //     .attr("width", width)
    //     .attr("height", height);

    // create plot area within svg image
    var plot = svg.append("g").attr("id", "plot").attr("transform", "translate(" + pad + ", " + pad + ")");

    // must be done AFTER links are fixed
    linearLayout(graphR.nodes);
    linearLayout(graphL.nodes);

    getMinMax(graphL, graphR);

    // draw links first, so nodes appear on top
    drawLinksLeft(graphL.edges);
    drawLinksRight(graphR.edges);

    // draw nodes last
    drawNodesLeft(graphL.nodes);
    drawNodesRight(graphR.nodes);
}

function getMinMax(graphL, graphR) {
    var nodes = graphL.nodes.slice(0).concat(graphR.nodes.slice(0));
    nodeMin = d3.min(nodes, function (node) {
        return node.data.count;
    });
    nodeMax = d3.max(nodes, function (node) {
        return node.data.count;
    });

    var links = graphL.edges.slice(0).concat(graphR.edges.slice(0));
    linkMin = d3.min(links, function (link) {
        return link.data.count;
    });
    linkMax = d3.max(links, function (link) {
        return link.data.count;
    });

    linkScale = d3.scale.linear().domain([linkMin, linkMax]).range([0.2, 0.8]);
    strokeScale = d3.scale.linear().domain([linkMin, linkMax]).range([4, 50]);

    nodeScale = d3.scale.linear().domain([nodeMin, nodeMax]).range([6, 50]);
    nodeColorScale = d3.scale.quantize().domain([nodeMin, nodeMax]).range(colorArray);
}

// Layout nodes linearly, sorted by group
function linearLayout(nodes) {

    // used to scale node index to x position
    var xscale = d3.scale.linear().domain([0, nodes.length - 1]).range([radius, width - margin - radius]);

    var yscale = d3.scale.linear().domain([0, nodes.length - 1]).range([radius + pad, height - margin - radius]);

    // calculate pixel location for each node
    nodes.forEach(function (d, i) {
        d.x = xfixed;
        d.y = yscale(i);
    });
}

// Draws nodes on plot
function drawNodesLeft(nodes) {
    // used to assign nodes color by group
    //    var color = d3.scale.category10();

    var arc = d3.svg.arc().innerRadius(0).outerRadius(function (d) {
        if (d.name == "start" || d.name == "end") return 20;
        return nodeScale(d.data.count);
    }).startAngle(0).endAngle(-Math.PI);

    d3.select("#plot").selectAll(".leftNode").data(nodes).enter().append("path").attr("class", "leftNode node").attr("id", function (d, i) {
        return d.name;
    }).attr("transform", function (d, i) {
        return "translate(" + d.x + "," + d.y + ")";
    }).attr("d", arc).style("fill", function (d, i) {
        if (d.name == "start" || d.name == "end") {
            return "#d1d3d4";
        }
        return nodeColorScale(d.data.count);
    });

    //    d3.select("#plot").selectAll(".node")
    //        .data(nodes)
    //        .enter()
    //        .append("circle")
    //        .attr("class", "node")
    //        .attr("id", function (d, i) {
    //            return d.name;
    //        })
    //        .attr("cx", function (d, i) {
    //            return d.x;
    //        })
    //        .attr("cy", function (d, i) {
    //            return d.y;
    //        })
    //        .attr("r", function (d, i) {
    //            if (d.name == "start" || d.name == "end")
    //                return 20;
    //            return nodeScale(d.data.weight);
    //        })
    //        .style("fill", function (d, i) {
    //            if (d.name == "start" || d.name == "end") {
    //                return "#d1d3d4";
    //            }
    //            return nodeColorScale(d.data.weight);
    //        })
    //        .each(function (d) {
    //            addTooltip(d3.select(this));
    //        });
}

// Draws nodes on plot
function drawNodesRight(nodes) {
    // used to assign nodes color by group
    //    var color = d3.scale.category10();

    var arc = d3.svg.arc().innerRadius(0).outerRadius(function (d) {
        if (d.name == "start" || d.name == "end") return 20;
        return nodeScale(d.data.count);
    }).startAngle(0).endAngle(Math.PI);

    d3.select("#plot").selectAll(".rightNode").data(nodes).enter().append("path").attr("class", "rightNode node").attr("id", function (d, i) {
        return d.name;
    }).attr("transform", function (d, i) {
        return "translate(" + d.x + "," + d.y + ")";
    }).attr("d", arc).style("fill", function (d, i) {
        if (d.name == "start" || d.name == "end") {
            return "#d1d3d4";
        }
        return nodeColorScale(d.data.count);
    }).each(function (d) {
        addTooltip(d3.select(this));
    });
    //    d3.select("#plot").selectAll(".node")
    //        .data(nodes)
    //        .enter()
    //        .append("circle")
    //        .attr("class", "node")
    //        .attr("id", function (d, i) {
    //            return d.name;
    //        })
    //        .attr("cx", function (d, i) {
    //            return d.x;
    //        })
    //        .attr("cy", function (d, i) {
    //            return d.y;
    //        })
    //        .attr("r", function (d, i) {
    //            if (d.name == "start" || d.name == "end")
    //                return 20;
    //            return nodeScale(d.data.weight);
    //        })
    //        .style("fill", function (d, i) {
    //            if (d.name == "start" || d.name == "end") {
    //                return "#d1d3d4";
    //            }
    //            return nodeColorScale(d.data.weight);
    //        })
    //        .each(function (d) {
    //            addTooltip(d3.select(this));
    //        });
}

// Draws nice arcs for each link on plot
function drawLinksLeft(links) {

    // add links
    d3.select("#plot").selectAll(".archL").data(links).enter().append("path").attr("class", "archL arch").style('opacity', function (d) {
        //            console.log([d.data.weight, linkScale(d.data.weight)]);
        return linkScale(d.data.count);
    }).attr("transform", function (d, i) {
        // arc will always be drawn around (0, 0)
        // shift so (0, 0) will be between source and target
        var xshift = xfixed;
        var yshift = d.source.y + (d.target.y - d.source.y) / 2;
        return "translate(" + xshift + ", " + yshift + ")";
    }).style('fill', function (d) {
        if (d.data.direction == 'forward') {
            return 'green';
        } else return 'red';
    }).attr("d", shapedEdge);

    function shapedEdge(d, i) {
        // get x distance between source and target
        var ydist = Math.abs(d.source.y - d.target.y);

        var arc = d3.svg.arc().innerRadius(ydist / 2 - strokeScale(d.data.count)).outerRadius(ydist / 2 + strokeScale(d.data.count));

        //        if (d.target.data.type == "action") {
        //
        //            arc.startAngle(Math.PI);
        //            arc.endAngle(2 * Math.PI);
        //            return arc(d);
        //        } else {
        //
        //            arc.startAngle(0);
        //            arc.endAngle(Math.PI);
        //
        //            return arc(d);
        //        }
        arc.startAngle(Math.PI);
        arc.endAngle(2 * Math.PI);
        console.log(arc(d));
        return arc(d);
    }
}

// Draws nice arcs for each link on plot
function drawLinksRight(links) {

    // scale to generate radians (just for lower-half of circle)

    // add links
    d3.select("#plot").selectAll(".archR").data(links).enter().append("path").attr("class", "archR arch").style('opacity', function (d) {
        //            console.log([d.data.weight, linkScale(d.data.weight)]);
        return linkScale(d.data.count);
    }).attr("transform", function (d, i) {
        // arc will always be drawn around (0, 0)
        // shift so (0, 0) will be between source and target
        var xshift = xfixed;
        var yshift = d.source.y + (d.target.y - d.source.y) / 2;
        return "translate(" + xshift + ", " + yshift + ")";
    }).style('fill', function (d) {
        if (d.data.direction == 'forward') {
            return 'green';
        } else return 'red';
    }).attr("d", shapedEdge);

    function shapedEdge(d, i) {
        // get x distance between source and target
        var ydist = Math.abs(d.source.y - d.target.y);

        var arc = d3.svg.arc().innerRadius(ydist / 2 - strokeScale(d.data.count)).outerRadius(ydist / 2 + strokeScale(d.data.count));

        //        if (d.target.data.type == "action") {
        //
        //            arc.startAngle(Math.PI);
        //            arc.endAngle(2 * Math.PI);
        //            return arc(d);
        //        } else {
        //
        //            arc.startAngle(0);
        //            arc.endAngle(Math.PI);
        //
        //            return arc(d);
        //        }

        arc.startAngle(0);
        arc.endAngle(Math.PI);
        return arc(d);
    }
}