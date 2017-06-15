"use strict";

function ColorMapper(colors) {
    // var csScale = chroma.scale(Constants.COLORBREWER.Spectral[7]);
    var cmScale = chroma.scale(colors);

    var cmInvert = 1;
    Object.defineProperty(this, "cmInvert", {
        get: function () {
            return cmInvert;
        },
        set: function (value) {
            cmInvert = value;
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
    var cmColors = cmScale.colors(cmClasses);
    var cmIndexed = chroma.scale(cmColors).classes(cmClasses);

    var encodeColor = function (val) {
        if (cmInvert) val = 1 - val;
        return ((cmSmooth) ? cmScale(val) : cmIndexed(val)).hex();
    };
    this.encodeColor = encodeColor;

    var encodeTwoTone = function (val) {
        var t = val * (cmClasses - 1);
        var index = Math.floor(t);
        var ratio = 1 - (t - index);
        var next = 1;
        if (cmInvert) {
            index = (cmClasses - 1) - index;
            next = -1;
        }
        return {
            colors: [cmColors[index], cmColors[index + next]],
            ratio: ratio
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

        for (x = 0; x < canvas.width; x++) {
            gc.fillStyle = encodeColor(x / canvas.width);
            gc.fillRect(x, 0, 2, height);

        }

        return canvas.toDataURL();
    };
    this.gradient = gradient;

    var legend = function (container) {
        var legendContainer = container ? $(container) : $(".legend-container");
        var canvas = document.createElement("canvas");
        canvas.width = legendContainer.innerWidth();
        canvas.height = legendContainer.innerHeight();
        var gc = canvas.getContext("2d");
        var x, i, t, str;

        var format = new Intl.NumberFormat('en-US');
        var labels = (cmTwoTone) ? cmClasses - 1 : cmClasses;
        var fontHeight = 14;
        var labelHeight = fontHeight + 3;
        var xPosOffset;
        gc.font = fontHeight + "px Helvetica, Arial, sans-serif";

        var gradientHeight = canvas.height - labelHeight;

        if (!cmTwoTone) {
            for (x = 0; x < canvas.width; x++) {
                gc.fillStyle = encodeColor(x / canvas.width);
                gc.fillRect(x, 0, 2, gradientHeight);

            }
        }
        else {
            var tt;
            for (x = 0; x < canvas.width; x++) {
                tt = encodeTwoTone(x / canvas.width);
                gc.fillStyle = tt.colors[0];
                gc.fillRect(x, 0, 2, tt.ratio * gradientHeight);

                gc.fillStyle = tt.colors[1];
                gc.fillRect(x, tt.ratio * gradientHeight, 2, gradientHeight - tt.ratio * gradientHeight);
            }
        }

        gc.fillStyle = "rgb(117, 117, 117)";
        for (i = 0; i <= labels; i++) {
            t = i / labels;
            x = t * canvas.width;
            str = format.format(cmRange[0] + t * (cmRange[1] - cmRange[0]));
            xPosOffset = (i == 0) ? 0 : (i == labels) ? -gc.measureText(str).width : -gc.measureText(str).width / 2
            gc.fillText(str, x + xPosOffset, canvas.height - 2);
        }

        legendContainer.css("background-image", 'url("' + canvas.toDataURL() + '")');
    };
    this.legend = legend;

    legend();
}