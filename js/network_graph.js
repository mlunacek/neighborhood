

function stringStartsWith (string, prefix) {
    return string.slice(0, prefix.length) == prefix;
}

function networkGraph($scope) {

    var margin = {top: 0, right: 20, bottom: 0, left: 20},
        width = 850 - margin.left - margin.right,
        height = 450 - margin.top - margin.bottom;

    var y_scale = d3.scale.linear(),
        x_scale = d3.scale.linear();

    var duration = 500;
    var nodes, edges, groups;

    var voronoi = d3.geom.voronoi()
        .x(function(d) { return x_scale(d.x); })
        .y(function(d) { return y_scale(d.y); });

  function chart(selection) {
    selection.each(function(data) {

        var nodes = data['nodes'];
        var edges = data['edges'];
        var groups = data['groups'];

        nodes.forEach(function(d) {
            d.x = +d.x;
            d.y = +d.y;
            d.size = ( d.size ? +d.size : 5);
            d.font_size = ( d.font_size ? +d.font_size : 10);
            d.stroke_width = ( d.stroke_width ? +d.stroke_width : 1);

        });

        var yvals = _.uniq(_.pluck(nodes, 'y')),
            xvals = _.uniq(_.pluck(nodes, 'x'));

        y_scale.domain(d3.extent(yvals))
              .range([height - margin.top - margin.bottom, 0]);

        x_scale.domain(d3.extent(xvals))
              .range([0, width - margin.left - margin.right]);

        var node_map = {};
        nodes.forEach(function(d) {
            d.x = +d.x;
            d.y = +d.y;
            node_map[d.name] = d;
        });

        edges.forEach(function(d) {
            d.x1 = node_map[d.source].x;
            d.y1 = node_map[d.source].y;
            d.x2 = node_map[d.target].x;
            d.y2 = node_map[d.target].y;
        });

      // Select the svg element, if it exists.
      d3.select(this).select('svg').remove();
      $scope.svg = d3.select(this)
                    .append("svg")
                    .attr("width", width)
                    .attr("height", height)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


      var edge_group = $scope.svg.append("g")
                        .attr("class", "edges")
                        .selectAll("line")
                        .data(edges);


      $scope.svg.append('defs')
                    .append('pattern')
                      .attr('id', 'diagonalHatch')
                      .attr('patternUnits', 'userSpaceOnUse')
                      .attr('width', 4)
                      .attr('height', 4)
                    .append('path')
                      .attr('d', 'M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2')
                      .attr('stroke', '#000000')
                      .attr('stroke-width', 0.5)
                      .attr('stroke-opacity', 0.5);


      // edges enter
      edge_group.enter()
        .append("line")
        // .attr("class", "edges")
        .attr("x1", function(d) { return x_scale(d.x1); })
        .attr("y1", function(d) { return y_scale(d.y1); })
        .attr("x2", function(d) { return x_scale(d.x2); })
        .attr("y2", function(d) { return y_scale(d.y2); })
        .attr("id", function(d) { return d.target+"_edge";})
        .attr("opacity", function(d){
            return ( _.includes($scope.hidden, d.target) ? 0.0 : $scope.alpha  );
        });

      // update
      edge_group.attr("x1", function(d) { return x_scale(d.x1); })
        .attr("y1", function(d) { return y_scale(d.y1); })
        .attr("x2", function(d) { return x_scale(d.x2); })
        .attr("y2", function(d) { return y_scale(d.y2); });

      // exit
      edge_group.exit().remove();

      var nodes_group = $scope.svg.append("g")
          .attr("class", "nodes")
          .selectAll("circle")
          .data(nodes, function(d){ return d.name} );

      // enter
      nodes_group.enter()
          .append("circle")
          .attr("cx", function(d){ return x_scale(d.x) })
          .attr("cy", function(d){ return y_scale(d.y) })
          .attr("r", function(d){ return d.scale*5})
          .attr("id", function(d) { return d['name']+"_node"})
          .attr("opacity", function(d){
                return ( _.includes($scope.hidden, d.name) ? 0.0 : $scope.alpha  );
           })
          // .attr("class", function(d){
          //       return ( ( _.indexOf(hidden, d.name)>=0) ? "hidden-node" : "" );
          //  })
          // .attr("fill",  function(d) { return d3.rgb(d['color'][0]*255,
          //                                                  d['color'][1]*255,
          //                                                  d['color'][2]*255)});
          .attr("fill",  function(d) {
              // console.log(d['color']);
              return d['color']
            });

      // update
      nodes_group.attr("cx", function(d){ return x_scale(d.x) })
          .attr("cy", function(d){ return y_scale(d.y) })
          .attr("r", function(d){ return d.scale*5});

      // exit
      nodes_group.exit().remove();


    // nodes.forEach(function(d){ console.log(d.name); });
    var select_nodes = _.filter(nodes, function(d){
                        return _.includes( $scope.voronoi_lines, d.name)
                      });

    $scope.svg.append("g")
        .selectAll("path")
        .data(voronoi(select_nodes))
        .enter()
        .append("path")
        .attr("class", "voronoi")
        .attr("id", function(d) { return d.point.name + "_voronoi"})
        .attr("d", function(d) { return "M" + d.join("L") + "Z"; })
        .on("click", mouseclick)
        .on("mouseover", mouseover)
        .on("touchover", touchover);


        function voronoi_ev_on(d){
          if($scope.config.voronoi === true){
            d3.select("#" + d.point.name + "_voronoi")
              .classed("voronoi-ev", true );
          }
        };

        function voronoi_ev_off(d){
          if($scope.config.voronoi === true){
              d3.select("#" + d.point.name + "_voronoi")
                .classed("voronoi-ev", false );
          };
        };

        function voronoi_solar_on(d){
            if($scope.config.voronoi === true){
                d3.select("#" + d.point.name + "_voronoi")
                  .classed("voronoi-solar", true );
            };
        };

        function voronoi_solar_off(d){
          if($scope.config.voronoi === true){
              d3.select("#" + d.point.name + "_voronoi")
                .classed("voronoi-solar", false );
          };
        };


      function touchover(d) {

          if($scope.config.select === 'solar'){
              $scope.solar_lookup[d.point.name].forEach(function(node){
                 $scope.show_node(node);
              });
              voronoi_on(d);
              $scope.$apply();
          }

          if($scope.config.select === 'evs'){
              $scope.evs_lookup[d.point.name].forEach(function(node){
                  $scope.show_node(node);
              });
              voronoi_on(d);
              $scope.$apply();
          }
      };

      function mouseover(d) {

        if (d3.event.shiftKey) {

            if($scope.config.select === 'solar'){
                $scope.solar_lookup[d.point.name].forEach(function(node){
                   $scope.show_node(node);
                });
                voronoi_solar_on(d);
                $scope.$apply();
            }

            if($scope.config.select === 'evs'){
                $scope.evs_lookup[d.point.name].forEach(function(node){
                    $scope.show_node(node);
                });
                voronoi_ev_on(d);
                $scope.$apply();
            }
         }
      };

      function mouseclick(d){

        // console.log($scope.config)

        if($scope.config.select === 'solar'){
            var node = $scope.solar_lookup[d.point.name][0];
            var tmp = $scope.inv[node];

            if( _.get($scope.solar, tmp)['selected'] === false){
                $scope.solar_lookup[d.point.name].forEach(function(node){
                    $scope.show_node(node);
                });
                voronoi_solar_on(d);
            }
            else{
                $scope.solar_lookup[d.point.name].forEach(function(node){
                    $scope.hide_node(node);
                });
                voronoi_solar_off(d);

            }
            $scope.$apply();
        }

        if($scope.config.select === 'evs'){
            var node = $scope.evs_lookup[d.point.name][0];
            var tmp = $scope.inv[node];

            if( _.get($scope.evs, tmp)['selected'] === false){
                $scope.evs_lookup[d.point.name].forEach(function(node){
                    $scope.show_node(node);
                });
                voronoi_ev_on(d);
            }
            else{
                $scope.evs_lookup[d.point.name].forEach(function(node){
                    $scope.hide_node(node);
                });
                voronoi_ev_off(d);
            }

            $scope.$apply();
        }
      };



    });
  }




  return chart;
}
