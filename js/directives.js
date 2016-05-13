
function stringStartsWith (string, prefix) {
    return string.slice(0, prefix.length) == prefix;
}
function stringEndsWith (string, prefix) {
    return string.slice(string.length-prefix.length, string.length) == prefix;
}


angular.module('builder', []);

angular.module('builder').directive('plotly', function () {

  var link = function($scope, $el){

    var format = d3.time.format("%Y-%m-%d %H:%M:%S");
    var parseDate = format.parse;

    var update = function(){

      var data = plotlytypes($scope.data, $scope.filter);

      if(_.get($scope.filter.agg, "name") === "mean"){
        data = chart_mean(data);
      };
      if(_.get($scope.filter.agg, "name") === "sum"){
        data = chart_sum(data);
      };
      if(_.get($scope.filter.agg, "name") === "mean + std error"){
        data = chart_meanstd(data);
      };
      if(_.get($scope.filter.agg, "name") === "mean + data"){
        data = chart_meandata(data);
      };
      if(_.get($scope.filter.agg, "name") === "boxplot"){
        data = chart_boxplot(data);
      };

      if(_.get($scope.filter.agg, "name")=== undefined){
        data = _.pluck(data, "trace");
      }

      // console.log("=-----------=");
      // console.log(data);
      // console.log($scope.data);
      // _.zip($scope.data, data).forEach(function(d){
      //     console.log(d[0]);
      //     console.log(d[1]);
      // });

      $scope.chart_data = data;
      draw_chart();
  }; //update

  var draw_chart = function(){

    // function stackedArea(traces) {
    // 	for(var i=1; i<traces.length; i++) {
    // 		for(var j=0; j<(Math.min(traces[i]['y'].length, traces[i-1]['y'].length)); j++) {
    // 			traces[i]['y'][j] += traces[i-1]['y'][j];
    // 		}
    // 	}
    // 	return traces;
    // }

    var title_str = "";

    if( _.get($scope.filter.agg, "name")){
      title_str += $scope.filter.agg.name + " of ";
    }
    if(_.get($scope.filter.attr, "name")){
      title_str +=  $scope.filter.attr.name;
    }
    if(_.get($scope.filter.obj, "name")){
      title_str += " for all " + $scope.filter.obj.name + " objects";
    }

    bottom_margin = 50;
    if(_.get($scope.filter.agg, "name") === "boxplot"){
      bottom_margin = 100;
    }


    var layout = {
      title: title_str,
      showlegend: (($scope.chart_data.length < 12) ? true : false),
      hovermode: "closest",
      margin: {l: 80,
               r: (($scope.chart_data.length < 8) ? 100 : 50),
               t: 50,
               b: bottom_margin},
      boxmode: 'group',
      xaxis: {
        title: 'time of day',
        showgrid: false,
        zeroline: false
      },
      yaxis: {
        title: $scope.filter.attr.name,
        showline: false,
        zeroline: false
      }};

    Plotly.newPlot($el[0], $scope.chart_data, layout,  {displaylogo: false});

    }; //draw

    $scope.$watch("data", update, true);
    $scope.$watch("filter.groupby", update, true);



  }; //link


  return {
    restrict: 'E',
    scope: {
      data: '=',
      filter: '='
    },
    replace: true,
    link: link,
    template: function(tElem, tAttrs){
        var tmp_str = '<div class="chart"></div>';
        return tmp_str;
    }
    // controller: controller,
    // templateUrl: 'partials/aggregate.html'
    };
});


angular.module('builder').directive('aggregate', function () {

  var link = function($scope, $el){

    var format = d3.time.format("%Y-%m-%d %H:%M:%S");
    var parseDate = format.parse;

    var svg = d3.select($el[0]).append("svg")
    .style("height", "400px")
    .style("width", "900px");

    var update = function(){

      // What dimension is this?
      var dimension = 1;
      var experiments = _.keys($scope.data).length;
      _.keys($scope.data).forEach(function(id){
          dimension =  _.keys($scope.data[id]['values'][0]).length-1;
      });

      var data = [];
      if(dimension === 1){
        data = _.keys($scope.data).map(function(id){
              var new_key = $scope.data[id]['key']
              if(experiments > 1){
                new_key += "_" + id
              }
              return {'key': new_key,
                      'values': $scope.data[id]['values'].map(function(row){
                          return {'x': parseDate(row['x']), 'y': +row['y']};
                      })
                    };
          });
      }

      if(dimension > 1){
        // Ah...sorry.
        data = _.chain(_.flatten(_.keys($scope.data).map(function(id){
            var main_key = $scope.data[id]['key'];
            return  _.flatten($scope.data[id]['values'].map(function(row){
               var xval = parseDate(row['x']);
               return _.keys(row).map(function(key){
                 var new_key = main_key+"-"+key
                 if(experiments > 1){
                   new_key = id + "_"  + new_key
                 }
                    return {'x': xval, 'y': row[key], 'key': new_key};
               });
            }));
          }))).groupBy("key")
          .pairs().map(function(x){
            return {"key": x[0], "values": x[1]}
          })
          .filter(function(x){
              // console.log(x['key'], stringEndsWith(x['key'], "-x"));
              return ! stringEndsWith(x['key'], "-x");
          })
          .value();
      }

      $scope.chart_data = data;
      draw_chart();
  }; //update

  var draw_chart = function(){

    d3.select($el[0]).select('svg').remove();
    var svg = d3.select($el[0]).append("svg")
                .style("height", "400px")
                .style("width", "800px");

      // console.log(data);
      if($scope.kind == "area"){
        var chart = nv.models.stackedAreaChart()
                      .useInteractiveGuideline(true)
                      .showControls(true)
                      .showLegend(false);
      };


                    //.style('expand');
                    // .stacked(true);
                    // .expanded(true)
      if($scope.kind == "line"){
        var chart = nv.models.lineChart()
                      .useInteractiveGuideline(true)
                      .showLegend(false);
      }

      if($scope.chart_data.length < 5) chart.showLegend(true);

      //chart.xAxis.tickFormat(format);
      chart.xAxis.tickFormat(function(d) { return format(new Date(d)); })
      chart.yAxis.tickFormat(d3.format('.02f'));

      svg.datum($scope.chart_data).transition().call(chart);


    }; //draw

    $scope.$watch("data", update, true);
    $scope.$watch("kind", draw_chart, true);



  }; //link


  return {
    restrict: 'E',
    scope: {
      data: '=',
      kind: '='
    },
    replace: true,
    link: link,
    template: function(tElem, tAttrs){
        var tmp_str = '<div class="chart"></div>';
        return tmp_str;
    }
    // controller: controller,
    // templateUrl: 'partials/aggregate.html'
    };
});

angular.module('builder').directive('selectTable', function () {

    var link = function ($scope) {

      $scope.Math = Math;
      $scope.currentPage = 1;
      $scope.select = 10;

      var update = function(){
        $scope.currentPage = 1;
        updateDisplay();
        //$scope.sort($scope.header[2]);

      };

      var updateDisplay = function(){
        var begin = (($scope.currentPage - 1) * $scope.select);
        var end = begin + $scope.select;
        $scope.display = $scope.data.slice(begin, end);
        $scope.display.forEach(function(row){
          row['houses'] = _.get(row['houses'], 'number', row['houses']);
          row['solar'] = _.get(row['solar'], 'number', row['solar']);
          row['evs'] = _.get(row['evs'], 'number', row['evs']);
          //row['id'] = "..." + row['id'].slice(id.length-5, id.length);
          //row['evs'] = row['evs'] + row['ctrl'];
          // console.log(row['id']);
          //console.log(row);
        });
        // console.log($scope.display);

      };

      $scope.$watch("currentPage", updateDisplay, true);
      $scope.$watch("data", update, true);

    };

    var controller = function($scope){

      $scope.firstPage = function(){
         $scope.currentPage = 1;
       };

       $scope.lastPage = function(){
         $scope.currentPage = Math.ceil($scope.data.length/$scope.select);
       };

       $scope.nextPage = function(){
         if(Math.ceil($scope.data.length/$scope.select) > $scope.currentPage){
           $scope.currentPage = $scope.currentPage+1;
         }
       };

       $scope.goToPage = function(pageNumber){
         $scope.currentPage = pageNumber;
       };

       $scope.previousPage = function(){
         if($scope.currentPage > 1){
           $scope.currentPage = $scope.currentPage-1;
         };
       };

       $scope.selectRow = function(id){
         _.forEach($scope.data, function(row){
           if(row['id'] === id){
             row['selected'] = !row['selected'];
           }
         })
       };

      $scope.sort = function(head){
        var key = head.name;
        head.reverse = !head.reverse;
        // console.log(key);

        var sort_function = function(a, b){

           //console.log(_.get(a, key));
           if(isNaN(_.get(a, key, 0))){
               //console.log("isNAN")
               if (head.reverse) {
                   return d3.ascending(_.get(a, key, 0), _.get(b, key, 0));
               }else{
                   return d3.descending(_.get(a, key, 0), _.get(b, key, 0));
               }
           }else{
               if (head.reverse) {
                   if (+_.get(a, key, 0) > +_.get(b, key, 0)) return -1;
                   if (+_.get(a, key, 0) < +_.get(b, key, 0)) return 1;
                   return 0;
               }else{
                   if (+_.get(a, key, 0) > +_.get(b, key, 0)) return 1;
                   if (+_.get(a, key, 0) < +_.get(b, key, 0)) return -1;
                   return 0;
               }
           }
        };

        $scope.data.sort(sort_function);
    }; // sort

    };

    return {
      restrict: 'E',
      scope: {
        data: '=',
        header: '='
      },
      replace: true,
      link: link,
      controller: controller,
      templateUrl: 'partials/select_table.html'
    };
});

// Constructs the networkx graph..
angular.module('builder').directive('networkGraph', function () {

    var link = function ($scope, $el) {

      var element = d3.select($el[0]);

      var update = function(){
        if($scope.data['groups']){
          var chart = networkGraph($scope);
          element.datum($scope.data).call(chart);
        }
      };

      $scope.$watch("data", update, true);
      $scope.$watch("evlist", function(){

      }, true);
    };

    return {
      scope: false,
      link: link
    };
});

angular.module('builder').directive('editGraph', function () {

    var link = function ($scope, $el) {

      var element = d3.select($el[0]);

      var update = function(){
        if($scope.data['groups']){
          var chart = editGraph($scope);
          element.datum($scope.data).call(chart);
        }
      };

      $scope.$watch("data", update, true);
      $scope.$watch("evlist", function(){

      }, true);
    };

    return {
      scope: false,
      link: link
    };
});
