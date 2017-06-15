$(document).ready(function (){
    $.get("data/data.json", function (data) {
        d3.select("body").selectAll("div")
            .data(data)
            .enter()
            .append("div")
            .attr("class", "bar")
            .style("height", function(d) {
                // console.log(d["car-type"]);
                var barHeight = d["car-type"] * 5;
                return barHeight + "px";
            });
    });
});