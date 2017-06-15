$(document).ready(function (){
    var colorScale = chroma.scale("Spectral").domain([1,7]);
    $.get("data/data.json", function (data) {
        console.log(data);
        d3.select("body").selectAll("div")
            .data(data)
            .enter()
            .append("div")
            .attr("class", "bar")
            .style("background-color", function(d) {
                return colorScale(d["car-type"]);
            })
            .style("height", function(d) {
                //var barHeight = d["car-type"] * 5;
                var barHeight = 40;
                return barHeight + "px";
            });
    });
});