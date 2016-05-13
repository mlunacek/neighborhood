
// angular.module('lodash', []).factory('_', ['$window', function ($window) {
//     return $window._;
//   }]);
//

var app = angular.module('app', ['builder', 'ui.bootstrap']);

app.controller('Ctrl', function ($scope, $http) {

  $scope.data = [];
  // List of things to toggle
  $scope.config = {};
  $scope.config.showtoolbars = false;
  $scope.config.show = {};
  $scope.config.show.settings = false;
  //$scope.config.select = "evs";
  $scope.config.select = "edit";
  $scope.config.voronoi = true;
  $scope.config.menu = true;
  $scope.config.ev_ctrl = false;
  $scope.alpha = 0.85;
  $scope.num_evs = 0;
  $scope.num_solar = 0;
  $scope.num_evs_input = 0;
  $scope.num_solar_input = 0;
  // $scope.name = "";


  $scope.lodash = _;

  $scope.constructions = [ {"filename": "data/construct_5.json",
                            "name": "ieee 4 node 5 houses",
                            "short":"ieee4-5" },
                           {"filename": "data/construct_10.json",
                            "short":"ieee13-10",
                            "name": "ieee 13 node 10 houses" },
                           {"filename": "data/construct_20.json",
                            "short":"ieee13-20",
                            "name": "ieee 13 node 20 houses" },
                           {"filename": "data/construct_30.json",
                            "short":"ieee13-30",
                            "name": "ieee 13 node 30 houses" },
                          //  {"filename": "data/construct_simple_30.json",
                          //   "name": "ieee 13 node 30 houses LITE" },
                           {"filename": "data/construct_40.json",
                            "short":"ieee13-40",
                            "name": "ieee 13 node 40 houses" },
                          //  {"filename": "data/construct_simple_40.json",
                          //   "name": "ieee 13 node 40 houses LITE" },
                          //  {"filename": "data/construct_50.json",
                          //   "name": "ieee 13 node 50 houses" }
                          ];

    $scope.recorders = [ {"name": "steering"},
                         {"name": "itemc"}];

    $scope.configuration = {
      templateUrl: 'partials/configure.html'
      // title: 'configure'
    };


  $scope.filename = $scope.constructions[4];
  $scope.configuration.filename = $scope.constructions[4];
  $scope.configuration.recorders = $scope.recorders[0];
  $scope.$watch("configuration.filename", function(){
      $scope.filename = $scope.configuration.filename;
  }, true);

  var update_data = function(){
    $http.get($scope.filename.filename)
        .success(function(data) {
            $scope.data = data['graph'];
            $scope.feeder = data['feeder'];
            $scope.subgraphs = data['subgraphs'];
            $scope.links = data['links'];
            update();
        });
  }




  $scope.$watch("filename", update_data, true);

  var update = function(){
        // $scope.data = data['results']['graph'];

        // console.log($scope.data.groups);

        var get_key = function(list){
            // works because solar is single, house and ev < line and triplex meter
            return list[0].replace("evcharger_det", "ev");
        };

        var make_key_pairs = function(list){
            return list.map(function(d){
                return { "key": get_key(d.split("::")),
                         "value": { "nodes": d.split("::"),
                                    "selected": false,
                                    "key": get_key(d.split("::"))}
                        };
            });
        };

        var unique_groups = function(key){
            return _.unique(_.map(_.values($scope.data['groups'][key]), function(d){
                return _.sortBy(d).join('::')
            }));
        };

        var voronoi_lookup = function(key){
            not_lines = _.filter(_.keys($scope.data.groups[key]), function(d){
                            return d.slice(0, "line".length) != "line";
                        });
            return _.omit($scope.data.groups[key], not_lines)
        };

        var inverse = function(base){
          return _.chain(base)
                .mapValues( function(d){ return d.nodes })
                .pairs()
                .map(function(x){ return x[1].map(function(item){
                    return {"key": item, "value": x[0]} }) })
                .flatten()
                .reduce(function(result, item) {
                    result[item['key']] = item['value']; return result;}, {})
                .value();
        }

        $scope.evs =  _.chain(make_key_pairs(unique_groups('ev')))
                          .indexBy('key')
                          .mapValues('value')
                          .value();

        //console.log("scope evs", $scope.evs)

        $scope.houses =  _.chain(make_key_pairs(unique_groups('house')))
                          .indexBy('key')
                          .mapValues('value')
                          .value();

        $scope.solar =  _.chain(make_key_pairs(unique_groups('solar')))
                          .indexBy('key')
                          .mapValues('value')
                          .value();

        var evs_inv = inverse($scope.evs);
        var sol_inv = inverse($scope.solar);

        $scope.inv = _.merge(evs_inv, sol_inv);

        $scope.max_evs = _.keys($scope.evs).length;
        $scope.max_solar = _.keys($scope.solar).length;
        $scope.max_houses = _.keys($scope.houses).length;

        // These go together
        $scope.hidden = _.chain(_.values($scope.evs).concat(_.values($scope.solar)))
                                .pluck("nodes")
                                .flatten()
                                .value();

        $scope.evs_lookup = voronoi_lookup('ev');
        $scope.solar_lookup = voronoi_lookup('solar');
        $scope.house_lookup = voronoi_lookup('house');
        // console.log($scope.evs_lookup);
        // console.log($scope.house_lookup);

        $scope.voronoi_lines = _.unique(_.keys($scope.evs_lookup)
                                          .concat(_.keys($scope.solar_lookup)));

        $scope.voronoi_evs_lookup = _.chain($scope.evs_lookup)
                                    .pairs()
                                    .map(function (x){ return x[1].map(function(item){
                                           return {"key": item, "value": x[0]}})})
                                    .flatten()
                                    .reduce(function(result, item) {
                                           result[item['key']] = item['value']; return result;}, {})
                                    .value();

        $scope.voronoi_solar_lookup = _.chain($scope.solar_lookup)
                                    .pairs()
                                    .map(function (x){ return x[1].map(function(item){
                                           return {"key": item, "value": x[0]}})})
                                    .flatten()
                                    .reduce(function(result, item) {
                                           result[item['key']] = item['value']; return result;}, {})
                                    .value();


    };

      var update_table_view = function(){

        $scope.table_view = []

        var keys = _.zip(_.keys($scope.evs),
                            _.keys($scope.solar));

        keys.forEach(function(d){
            var ev_select = $scope.evs[d[0]]['selected'];
            var sol_select = $scope.solar[d[1]]['selected'];

            $scope.table_view.push({'ev': {'name': d[0],
                                           'selected': ev_select},
                                           'solar': {'name': d[1],
                                           'selected': sol_select}});
        });

      };

      // $scope.$watch("alpha", function(){
      //     console.log("alpha");
      // });
      //
      $scope.$watch("evs", update_table_view, true);
      $scope.$watch("solar", update_table_view, true);

      $scope.$watch("alpha", function(){
        console.log("update!!!!", $scope.alpha);

      });

      $scope.$watch("num_evs_input", function(){
        console.log("update!!!!", $scope.num_evs_input);

      });




  $scope.create_export_json = function(){

    function stringStartsWith (string, prefix) {
        return string.slice(0, prefix.length) == prefix;
    };

    var tmp = _.map(_.keys($scope.evs), function(d){ return $scope.evs[d];});
    var remove = _.filter(tmp, function(d){ return !d['selected'];});

    // console.log(remove);
    var ev_list = _.map(remove, function(d){
        return _.filter(d['nodes'], function(node){
          //return node;
          return stringStartsWith(node, "evcharger")
        })[0];
    });

    var tmp = _.map(_.keys($scope.solar), function(d){ return $scope.solar[d];});
    var remove = _.filter(tmp, function(d){ return !d['selected'];});
    var solar_list = _.map(remove, function(d){
        return _.filter(d['nodes'], function(node){
          return stringStartsWith(node, "solar")
        })[0];
    });

    var remove_list = ev_list.concat(solar_list);

    var remove = _.flatten(_.map(remove_list, function(node){
        return _.get($scope.subgraphs, node, node);
    }));

    var new_graph = _.filter($scope.feeder.nodes, function(d){
        return !_.includes(remove, d.name)
    });
    var new_edges = _.filter($scope.feeder.edges, function(d){
        return !_.include(remove, d.target)
    })

    // Update the solar in config file.
    var tmp = _.filter(_.keys($scope.solar), function(d){
                    return $scope.solar[d]['selected'];
              });

    $scope.feeder.config['solar']['number'] = tmp.length;
    $scope.feeder.config['solar']['houses'] = tmp.map(function(d){ return $scope.links[d]});

    // Update the ev in config file.
    var tmp = _.filter(_.keys($scope.evs), function(d){
                    return $scope.evs[d]['selected'];
              });


    $scope.feeder.config['evs']['number'] = tmp.length;

    if( $scope.config.ev_ctrl === true ){
      $scope.feeder.config['evs']['controller'] = "tou"
    }

    $scope.feeder.config['evs']['houses'] = tmp.map(function(d){
      return $scope.links[d.replace("ev", "evcharger_det")];
    });

    var new_graph = {'meta': $scope.feeder.meta,
                     'directory': $scope.feeder.directory,
                     'nodes': new_graph,
                     'name': $scope.config.name,
                     'config': $scope.feeder.config,
                     'edges': new_edges};

    return new_graph;
  };


  $scope.submit = function(){

      var new_graph = $scope.create_export_json();
      var json_str = JSON.stringify(new_graph);

      //Submit to rest server
      $http.post('/gridlabd/api/', json_str);

  };

  $scope.showToolbars = function(){
    // console.log("show");
    $scope.config.showtoolbars = !$scope.config.showtoolbars ;
  };

  $scope.show_settings = function(){
    $scope.config.show.settings = !$scope.config.show.settings
  }

  $scope.download = function(){
    // console.log("download")
    var new_graph = $scope.create_export_json();

    var json_str = JSON.stringify(new_graph);
    var blob = new Blob([json_str], {type: "text/plain; charset=utf-8"});

    //Download this data
    saveAs(blob, "tdshub_builder_" +
                  $scope.max_houses + "_" +
                  $scope.num_evs + "_" +
                  $scope.num_solar + ".json");

  };


  $scope.toggle = function(kind){

    d3.selectAll(".voronoi")
      .classed("voronoi-ev", false )
      .classed("voronoi-solar", false );

    $scope.toggle_voronoi();

  };

  $scope.toggle_voronoi = function(){

    if( $scope.config.voronoi === false){
      d3.selectAll(".voronoi")
        .classed("voronoi-ev", false )
        .classed("voronoi-solar", false );
    }
    else{

      if( $scope.config.select == "evs"){

          _.keys($scope.evs).forEach(function(ev){
              var tmp = _.get($scope.evs, ev)
              if( tmp['selected'] === true){
                  var name = $scope.voronoi_evs_lookup[tmp.nodes[0]];
                  d3.select("#" + name + "_voronoi")
                    .classed("voronoi-ev", true );
              }
          });
      }
      if( $scope.config.select == "solar"){

          _.keys($scope.solar).forEach(function(x){
              var tmp = _.get($scope.solar, x)
              if( tmp['selected'] === true){
                  var name = $scope.voronoi_solar_lookup[tmp.nodes[0]];
                  d3.select("#" + name + "_voronoi")
                    .classed("voronoi-solar", true );
              }
          });
      };
    };

  };

  $scope.hide_node = function(node){
    d3.select("#" + node + "_node").transition().attr("opacity", 0.0);
    d3.select("#" + node + "_edge").transition().attr("opacity", 0.0);
    var tmp = $scope.inv[node];

    if( _.has($scope.evs, tmp)){
        $scope.evs[tmp]["selected"] = false;
        $scope.update_ev_count();
    }
    if( _.has($scope.solar, tmp)){
        $scope.solar[tmp]["selected"] = false;
        $scope.update_solar_count();
    }


  };

  $scope.update_ev_count = function(){
    $scope.num_evs = 0;

    _.forEach(_.keys($scope.evs), function(d){
        if( $scope.evs[d]["selected"] == true){
              $scope.num_evs += 1;
        }
    });
   };

   $scope.update_solar_count = function(){
    $scope.num_solar = 0;
    _.forEach(_.keys($scope.solar), function(d){
        if( $scope.solar[d]["selected"] == true){
              $scope.num_solar += 1;
        }
    });
  };

  $scope.show_node = function(node){
    // console.log("app: show", node);

    d3.select("#" + node + "_node").transition().attr("opacity", $scope.alpha);
    d3.select("#" + node + "_edge").transition().attr("opacity", $scope.alpha);
    var tmp = $scope.inv[node];

    if( _.has($scope.evs, tmp)){
        $scope.evs[tmp]["selected"] = true;
        $scope.update_ev_count();

    }
    if( _.has($scope.solar, tmp)){
        $scope.solar[tmp]["selected"] = true;
        $scope.update_solar_count();

    }

  };

  $scope.resetbutton = function(){
    $scope.reset();
    $scope.num_evs_input = 0;
    $scope.num_solar_input = 0;

  }

  $scope.reset = function(){

      $scope.num_evs = 0;
      $scope.num_solar = 0;

      if( $scope.config.voronoi === true){
        d3.selectAll(".voronoi")
          .classed("voronoi-ev", false )
          .classed("voronoi-solar", false );
      };

      _.forEach(_.keys($scope.evs), function(d){
          $scope.evs[d]["selected"] = false;
      });

      _.forEach(_.keys($scope.solar), function(d){
          $scope.solar[d]["selected"] = false;
      });

      $scope.hidden.forEach(function(node){
          $scope.hide_node(node);
      });

      $scope.update_ev_count();
      $scope.update_solar_count();
  };

  $scope.select_all = function(){

    if( $scope.config.voronoi === true){
      d3.selectAll(".voronoi")
        .classed("voronoi-ev", true )
        .classed("voronoi-solar", true );
    };

     $scope.num_evs = $scope.max_evs;
     $scope.num_solar = $scope.max_solar;

     _.forEach(_.keys($scope.evs), function(d){
         $scope.evs[d]["selected"] = true;
     });

     _.forEach(_.keys($scope.solar), function(d){
         $scope.solar[d]["selected"] = true;
     });

      $scope.hidden.forEach(function(node){
          $scope.show_node(node);
      });
  };

  $scope.random = function(){

    $scope.reset();
    // console.log("input ----> ", $scope.num_evs_input);
    // console.log($scope.num_evs);

    if( $scope.num_evs_input === 0 ){
      $scope.num_evs_input = Math.floor((Math.random() * $scope.max_evs) + 1);
    }

    if( $scope.num_solar_input === 0 ){
      $scope.num_solar_input = Math.floor((Math.random() * $scope.max_solar) + 1);
    }

    var tmp_evs = _.shuffle(_.cloneDeep($scope.evs)).slice(0, $scope.num_evs_input);
    tmp_evs.map(function(d){
        $scope.evs[d["key"]]['selected'] = true;
    });

    _.forEach(_.pluck(tmp_evs, "nodes"), function(d){
        d.forEach(function(node){
            $scope.show_node(node);
        });
    });

    var tmp_solar = _.shuffle(_.cloneDeep($scope.solar)).slice(0, $scope.num_solar_input);
    tmp_solar.forEach(function(d){
      $scope.solar[d["key"]]['selected'] = true;
    });

    _.forEach(_.pluck(tmp_solar, "nodes"), function(d){
        d.forEach(function(node){
            $scope.show_node(node);
        });
    });

    $scope.update_ev_count();
    $scope.update_solar_count();

    // console.log("next  ----> ", $scope.num_evs_input);
    // console.log($scope.num_evs);

    // console.log("scope", _.values($scope.evs));
    // console.log(_.pluck(_.values($scope.evs), "selected"));
  };

  // $scope.toggle_node = function(node, kind){
  //
  //   if(kind=='ev'){
  //     $scope.evs[node].selected = !$scope.evs[node].selected;
  //     if($scope.evs[node].selected == true){
  //       $scope.evs[node].nodes.forEach(function(x){ $scope.show_node(x); });
  //     }
  //     else{
  //       $scope.evs[node].nodes.forEach(function(x){ $scope.hide_node(x); });
  //     }
  //   }
  //   if(kind=='solar'){
  //     $scope.solar[node].selected = !$scope.solar[node].selected;
  //     if($scope.solar[node].selected == true){
  //       $scope.solar[node].nodes.forEach(function(x){ $scope.show_node(x); });
  //     }
  //     else{
  //       $scope.solar[node].nodes.forEach(function(x){ $scope.hide_node(x); });
  //     }
  //
  //   }
  //
  // };



});
