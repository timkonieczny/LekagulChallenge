"use strict";

function ColorMapper(colors) {

    var cmReverse = 1;
    Object.defineProperty(this, "cmReverse", {
        get: function () {
            return cmReverse;
        },
        set: function (value) {
            cmReverse = value;
            legend();
        }
    });

    var cmSmooth = 1;
    Object.defineProperty(this, "cmSmooth", {
        get: function () {
            return cmSmooth;
        },
        set: function (value) {
            cmSmooth = value;
            legend();
        }
    });

    var cmTwoTone = 0;
    Object.defineProperty(this, "cmTwoTone", {
        get: function () {
            return cmTwoTone;
        },
        set: function (value) {
            cmTwoTone = value;
            legend();
        }
    });

    var cmTwoToneFlip = 0;
    Object.defineProperty(this, "cmTwoToneFlip", {
        get: function () {
            return cmTwoToneFlip;
        },
        set: function (value) {
            cmTwoToneFlip = value;
            legend();
        }
    });

    var cmRange = [0, 1];
    Object.defineProperty(this, "cmRange", {
        get: function () {
            return cmRange;
        },
        set: function (value) {
            cmRange = value;
            legend();
        }
    });

    var cmClasses = 7;
    Object.defineProperty(this, "cmClasses", {
        get: function () {
            return (cmTwoTone) ? cmClasses - 1 : cmClasses;
        }
    });

    var cmSmoothScale = chroma.scale(colors).mode('lab');
    var cmColors = cmSmoothScale.colors(cmClasses);
    var cmIndexedScale = chroma.scale(cmColors).classes(cmClasses);

    var encodeColor = function (val) {
        if (cmReverse) val = 1 - val;
        return ((cmSmooth) ? cmSmoothScale(val) : cmIndexedScale(val)).hex();
    };
    this.encodeColor = encodeColor;

    var encodeTwoTone = function (val) {
        var t = val * (cmClasses - 1);
        var index = Math.floor(t);
        var ratio = t - index;
        var next = 1;
        if (cmReverse) {
            index = (cmClasses - 1) - index;
            next = -1;
        }
        return {
            colors: (cmTwoToneFlip) ? [cmColors[index], cmColors[index + next]] : [cmColors[index + next], cmColors[index]],
            ratio: (cmTwoToneFlip) ? (1 - ratio) : ratio
        };
    };
    this.encodeTwoTone = encodeTwoTone;

    var gradient = function (width, height) {
        width = width || 30;
        height = height || 1;
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var gc = canvas.getContext("2d");
        var x, i, t;

        if (!cmTwoTone) {
            for (x = 0; x < canvas.width; x++) {
                gc.fillStyle = encodeColor(x / canvas.width);
                gc.fillRect(x, 0, 2, height);
            }
        }
        else {
            var tt;
            for (x = 0; x < canvas.width; x++) {
                tt = encodeTwoTone(x / canvas.width);
                gc.fillStyle = tt.colors[0];
                gc.fillRect(x, 0, 2, tt.ratio * height);

                gc.fillStyle = tt.colors[1];
                gc.fillRect(x, tt.ratio * height, 2, (1 - tt.ratio) * height);
            }
        }

        return canvas.toDataURL();
    };
    this.gradient = gradient;

    var legend = function (container) {
        var containerClass = container || ".legend-container";

        var colorContainer = $(containerClass + " .colors");
        colorContainer.css("background-image", 'url("' + gradient(colorContainer.innerWidth(), colorContainer.innerHeight()) + '")');

        var labelsContainer = $(containerClass + " .labels");
        labelsContainer.empty();

        var format = new Intl.NumberFormat('en-US');
        var n = (cmTwoTone) ? cmClasses - 1 : cmClasses;
        var i, t, l;

        for (i = 0; i <= n; i++) {
            t = i / n;
            l = $("<div>");
            l.text(format.format(cmRange[0] + t * (cmRange[1] - cmRange[0])));
            l.css({
                position: "absolute",
                left: ((i / n) * 100) + "%",
                transform: "translate(" + ((i == 0) ? 0 : (i == n) ? -100 : -50) + "%, 0)"
            });
            labelsContainer.append(l);
        }
    };
    this.legend = legend;

    var autoExpand = function (min, max, classes = this.cmClasses) {

        // Expand min max to reasonable range (see https://dx.doi.org/10.1117/12.766440)

        function orderOfMagnitude(value) {
            var n = 0;

            while (value <= 10) {
                value *= 10;
                n++;
            }

            while (value > 100) {
                value /= 10;
                n--;
            }

            return n;
        }

        function nextMultiple10(value) {
            if (value == 0) return 0;
            if (value < 10) return 10;

            var next = value;
            if (value % 10 != 0) {
                next /= 10;
                next = Math.round(next) * 10;
                if (next < value) next += 10;
            }
            return next;
        }

        function nextMultiple2(value) {
            var next = Math.round(value);
            if (next % 2 != 0) next++;
            if (next < value) next += 2;
            return next;
        }

        // Calc range from min to max
        var range = max - min;
        // Get n so that range*pow(10,n)>=10 (order of magnitude of range)
        var n = (range > 0) ? orderOfMagnitude(range) : 0;
        // Shift min and max to order of magnitude of range
        max = max * Math.pow(10, n);
        min = min * Math.pow(10, n);
        // Get multiple of 10 for max
        max = nextMultiple10(max);

        // Calc range with new max
        range = Math.abs(max - min);

        // ORIGINAL step 4. from TTTL paper
        // // Calc range for one interval
        // var classRange = range / classes;
        // // Get multiple of 2 for class range
        // classRange = nextMultiple2(classRange);
        // // Set range min to new min so that the range of one interval is multiple of 2

        // OVERRIDE behavior of step 4. described in TTTL paper, use simple ceiling instead of looking for multiple of 2
        var classRange = Math.ceil(range / classes);
        min = max - classRange * classes;

        // Shift back
        max *= Math.pow(10, -n);
        min *= Math.pow(10, -n);

        return [min, max];
    };
    this.autoExpand = autoExpand;

    legend();
}