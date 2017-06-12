$(document).ready(function (){
    $.get("data/Lekagul Sensor Data.csv", function (data) {
    // $.get("data/test.csv", function (data) {

        var dataset = [];

        Papa.parse(
            data,
            {
                header: true,
                dynamicTyping: true,
                step: function (row) {
                    row.data[0].Timestamp = Date.parse(row.data[0].Timestamp);
                    dataset.push(row.data[0]);
                    if(row.data[0]["car-type"] === "2P") row.data[0]["car-type"] = 7;    // car types in dataset: {1, 2, 3, 4, 5, 6, 2P}
                    /*if(!isNaN(row.data[0]["car-type"])){
                        if(Number(row.data[0]["car-type"])>maxTime) maxTime = Number(row.data[0]["car-type"]);
                    }else{
                        console.log(row.data[0]["car-type"]);
                    }*/
                }
            }
        );

        console.log(dataset);

        d3.select("body").selectAll("div")
            .data(dataset)
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