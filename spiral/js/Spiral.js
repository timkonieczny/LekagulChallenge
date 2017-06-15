"use strict";

function Spiral(gc, repaint) {

    this.gc = gc;
    this.repaint = repaint;

    this.offscreenImg = document.createElement("canvas");
    this.offscreenGC = this.offscreenImg.getContext("2d");
    this.offscreenValid = false;

    this.pickedSegment = undefined;

    var params = {
        segmentsPerCycle: new Parameter(this, "slider", "Segments per Cycle", 365, 1, 999),
        maxCycles: new Parameter(this, "slider", "Spiral Cycles", 5, 1, 100),
        spiralWidth: new Parameter(this, "slider", "Spiral Width", 85, 1, 100),
        centerOffset: new Parameter(this, "slider", "Center Offset", 15, 0, 99),
        rotation: new Parameter(this, "slider", "Rotation", 270, 0, 359),
        colorMap: new Parameter(this, "colorselector", "Color Map", "Spectral"),
        smoothColors: new Parameter(this, "switch", "Smooth Colors", 1, 0, 1),
        invertColors: new Parameter(this, "switch", "Invert Colors", 1, 0, 1),
        twoToneColors: new Parameter(this, "switch", "Two-tone Colors", 0, 0, 1)
    };

    this.parameters = function () { // Others can query available parameters
        return Object.keys(params);
    };

    this.parameter = function (key) { // Others can access each parameter
        return params[key];
    };

    this.onParameterChange = function (param) {
        var cmParam;
        switch (param) {
            case params.spiralWidth:
            case params.rotation:
                this.offscreenValid = false;
                break;
            case params.colorMap:
                var cm = new ColorMapper(Constants.COLORBREWER[param.value][7]);
                cm.cmInvert = this.colorMapper.cmInvert;
                cm.cmSmooth = this.colorMapper.cmSmooth;
                cm.cmTwoTone = this.colorMapper.cmTwoTone;
                this.colorMapper = cm;
                this.recolor();
                break;
            case params.smoothColors:
                cmParam = cmParam || "cmSmooth";
            case params.invertColors:
                cmParam = cmParam || "cmInvert";
            case params.twoToneColors:
                cmParam = cmParam || "cmTwoTone";
                // TODO: Very awkward mechanism to propagate parameter value to color mapper, this should be inline
                this.colorMapper[cmParam] = param.value;
                this.recolor();
                break;
            case params.segmentsPerCycle:
            case params.maxCycles:
            case params.centerOffset:
                this.reshape();
        }
    };

    this.pV = {}; // Make parameter values accessible via pV.paramName
    this.parameters().forEach(function (p) {
        Object.defineProperty(this.pV, p,
            {
                get: function () {
                    return params[p].value;
                },
                set: function (value) {
                    params[p].value = value;
                }
            }
        );
    }, this);

    this.colorMapper = new ColorMapper(Constants.COLORBREWER[params.colorMap.value][7]);

    this.init({
            Date: new Array(this.pV.segmentsPerCycle).fill().map(function (val, i) {
                return i;
            }),
            Temp: new Array(this.pV.segmentsPerCycle).fill().map(function (val, i) {
                return i;
            })
        },
        "Temp"
    );
}

Spiral.prototype.init = function (data, attr) {
    this.data = data;
    this.encode(attr);
};

Spiral.prototype.encode = function (attr) {
    attr = attr || this.attr; // If no attr is provided, simply encode the previous attr again

    this.attr = attr;
    this.values = this.data[attr];

    this.start = 0;
    this.end = this.values.length - 1;

    this.rangeSlider = document.getElementById("range");
    if (this.rangeSlider.noUiSlider) this.rangeSlider.noUiSlider.destroy();

    var toDate = (function (vals) {
        return {
            to: function (i) {
                return vals[Math.floor(i)];
            }
        }
    })(this.data["Date"]);

    noUiSlider.create(this.rangeSlider, {
        range: {
            min: this.start,
            max: this.end
        },
        start: [this.start, this.end],
        connect: true,
        step: 1,
        behaviour: "drag",
        animate: false,
        tooltips: [toDate, toDate]
    });
    // this.rangeSlider.setAttribute("disabled", true);

    this.rangeSlider.noUiSlider.on("slide", function (values, handle) {
        var range = this.end - this.start;
        if (handle == 0) {
            this.start = parseInt(values[handle]);
            this.end = this.start + range;
            if (this.end > this.values.length - 1) {
                this.end = this.values.length - 1;
                this.start = this.end - range;
            }
            this.rangeSlider.noUiSlider.set([this.start, this.end]);
        }
        else if (handle == 1) {
            this.end = parseInt(values[handle]);
            this.start = this.end - range;
            if (this.start < 0) {
                this.start = 0;
                this.end = this.start + range;
            }
            this.rangeSlider.noUiSlider.set([this.start, this.end]);
        }
        this.reshape();
        this.recolor();
        this.repaint();
    }.bind(this));

    $(".noUi-target").filter("#range").css({"border-radius": "2px"});
    $("#range .noUi-handle").first().css({left: "-34px"});
    $("#range .noUi-handle").last().css({left: "0px"});
    $("#range .noUi-tooltip").first().css({left: "auto", right: "0%", transform: "none"});
    $("#range .noUi-tooltip").last().css({left: "0%", right: "auto", transform: "none"});

    this.recolor();
    this.reshape();
};

Spiral.prototype.recolor = function () {
    this.min = this.values[0];
    this.max = this.values[0];
    this.values.forEach(function (v) {
        this.min = Math.min(this.min, v);
        this.max = Math.max(this.max, v);
    }, this);

    // Override actual min/max to get better color labels
    // this.min = -20;
    // this.max = 40;

    this.colorMapper.cmRange = [this.min, this.max];

    var normalized = this.values.map(function (value) {
        return (value - this.min) / (this.max - this.min);
    }, this);

    this.colors = normalized.map(this.colorMapper.encodeColor, this);
    this.twoTone = normalized.map(this.colorMapper.encodeTwoTone, this);

    this.offscreenValid = false;
};

Spiral.prototype.reshape = function () {
    var segments = this.pV.maxCycles * this.pV.segmentsPerCycle;
    var range = this.end - this.start + 1;

    if (range > segments) { // If there are more values in the range than segments
        // Shrink the range of values
        this.end = this.start + segments - 1;
    }
    else { // Else there are more segments than values in the range
        var delta = segments - range;
        // Expand the range to include more values
        if (this.end < this.values.length - 1) { // Expand until we reach the end
            var expandBack = Math.min(delta, this.values.length - 1 - this.end); // Number of segments needed and actually available at the back
            this.end += expandBack;
            delta -= expandBack;
        }

        if (delta > 0) { // Still more segments needed, expand until we reach the front
            this.start = Math.max(0, this.start - delta);
        }
    }

    this.rangeSlider.noUiSlider.set([this.start, this.end]);
    this.rangeSlider.noUiSlider.updateOptions({step: this.pV.segmentsPerCycle});

    this.cycles = (this.end - this.start + 1) / this.pV.segmentsPerCycle;
    this.phi = Constants.MATH_PI_DOUBLE * this.cycles;
    this.anglePerSegment = Constants.MATH_PI_DOUBLE / this.pV.segmentsPerCycle;

    this.center = [this.gc.canvas.width / 2, this.gc.canvas.height / 2];
    this.radius = Math.min(this.center[0], this.center[1]);
    this.radiusStart = this.radius * this.pV.centerOffset / 100;
    this.radiusEnd = this.radius;
    this.radiusPerCycle = (this.radiusEnd - this.radiusStart) / (this.cycles + 1);

    this.offscreenValid = false;
};

Spiral.prototype.shiftDataWindow = function (amount) {
    if (amount < 0) { // Decrement window position
        var dec = Math.min(Math.abs(amount), this.start);
        this.start -= dec;
        this.end -= dec;
        if (this.pickedSegment != undefined) this.pickedSegment -= dec;
    }
    else { // Increment window position
        var inc = Math.min(amount, this.values.length - 1 - this.end);
        this.start += inc;
        this.end += inc;
        if (this.pickedSegment != undefined) this.pickedSegment += inc;
    }
    this.reshape();
};

Spiral.prototype.pick = function (evt) {
    var oldPick = this.pickedSegment;
    this.pickedSegment = undefined;

    var x = evt.screenCoords[0];
    var y = evt.screenCoords[1];

    var rx = x - this.center[0];
    var ry = y - this.center[1];

    var cos = Math.cos(-this.pV.rotation * Constants.MATH_TO_RAD);
    var sin = Math.sin(-this.pV.rotation * Constants.MATH_TO_RAD);

    x = rx * cos - ry * sin;
    y = ry * cos + rx * sin;

    var a = Math.atan2(y, x); // Angle
    if (a < 0) a = Constants.MATH_PI_DOUBLE + a; // Map angle from -PI .. PI to 0 .. 2*PI
    a /= Constants.MATH_PI_DOUBLE; // Map angle from 0 .. 2*PI to 0 .. 1

    var d = Math.sqrt(x * x + y * y); // Distance from center
    d -= this.radiusStart + a * this.radiusPerCycle; // Subtract the offset from the center (radiusStart) and the amount that the spiral radius has already advanced at angle a (a is already relative 0 .. 1)
    d /= (this.radiusEnd - this.radiusStart); // Map distance to 0 .. 1

    var ring = Math.floor(d * (this.cycles + 1)); // The ring at relative distance d (+1 to account for spiral band width)

    var segmentIndex = Math.floor(this.start + (a + ring) * this.pV.segmentsPerCycle);

    if (segmentIndex >= this.start && segmentIndex <= this.end) {
        this.pickedSegment = segmentIndex;
    }

    return this.pickedSegment != undefined;
};

Spiral.prototype.onmousedown = function (evt) {
    if (evt.button == 0) {

        this.doclick = {
            down: evt.screenCoords // Coordinates where drag started
        };

        this.dodrag = {
            down: evt.screenCoords, // Coordinates where drag started
            dragged: false, // Actually dragged after threshold has been reached ?
        };

        return true; // Event consumed
    }
    // Event not consumed
};

Spiral.prototype.onmousemove = function (evt) {
    if (this.dodrag) {

        var dx = this.dodrag.down[0] - evt.screenCoords[0];
        var dy = this.dodrag.down[1] - evt.screenCoords[1];
        this.dodrag.dragged = (this.dodrag.dragged || dx >= Constants.DRAG_THRESHOLD || dx < -Constants.DRAG_THRESHOLD || dy >= Constants.DRAG_THRESHOLD || dy < -Constants.DRAG_THRESHOLD);

        if (this.dodrag.dragged) {
            // Do something
        }
        return true; // Event consumed
    }
    // Event not consumed
};

Spiral.prototype.onmouseup = function (evt) {
    if (evt.button == 0) {
        if (this.dodrag) {
            if (this.dodrag.dragged) {
                // Actual drag was performed, so this up event should NOT become a click
                delete this.doclick;
            }
            delete this.dodrag;
        }

        if (this.doclick) {
            if (evt.ctrlKey) {
                // Do something
            }
            else {
                // Do something
            }
            delete this.doclick;
        }

        return true; // Event consumed
    }
    // Event not consumed
};

Spiral.prototype.ondblclick = function (evt) {
    // Event not consumed
};

Spiral.prototype.update = function (time) {
    var needUpdate = false;

    this.delta = time - (this.time || time);
    this.time = time;

    return needUpdate;
};

Spiral.prototype.path = function (gc, pts) {
    gc.beginPath();
    gc.moveTo(pts[0][0], pts[0][1]);
    var j, n;
    for (j = 1, n = pts.length; j < n; j++) {
        gc.lineTo(pts[j][0], pts[j][1]);
    }
    gc.closePath();
};

Spiral.prototype.draw = function () {
    // var time = Date.now();

    var gc;
    var pts;
    var i;
    var str;

    if (!this.offscreenValid) {
        // Maintain identical size of canvas and offscreen image
        if (this.offscreenImg.width != this.gc.canvas.width || this.offscreenImg.height != this.gc.canvas.height) {
            this.offscreenImg.width = this.gc.canvas.width;
            this.offscreenImg.height = this.gc.canvas.height;
        }

        // var ctx = new C2S(1024, 1024);

        gc = this.offscreenGC;
        // gc = ctx;
        gc.clearRect(0, 0, this.offscreenImg.width, this.offscreenImg.height);
        // gc = this.gc;
        gc.save();
        gc.lineWidth = 1;
        gc.translate(gc.canvas.width / 2, gc.canvas.height / 2);
        gc.rotate(this.pV.rotation * Constants.MATH_TO_RAD);

        if (!this.colorMapper.cmTwoTone) {
            for (i = this.start; i <= this.end; i++) {
                pts = this.generateSpiralSegment(i);
                this.path(gc, pts);
                gc.fillStyle = this.colors[i];
                gc.fill();
            }
        }
        else {
            for (i = this.start; i <= this.end; i++) {
                pts = this.generateSpiralSegment(i, 0, this.twoTone[i].ratio * this.pV.spiralWidth / 100);
                this.path(gc, pts);
                gc.fillStyle = this.twoTone[i].colors[0];
                gc.fill();
                pts = this.generateSpiralSegment(i, this.twoTone[i].ratio * this.pV.spiralWidth / 100, this.pV.spiralWidth / 100);
                this.path(gc, pts);
                gc.fillStyle = this.twoTone[i].colors[1];
                gc.fill();
            }
        }
        gc.restore();
        // console.log(ctx.getSvg());
        this.offscreenValid = true;
    }

    gc = this.gc;
    gc.drawImage(this.offscreenImg, 0, 0);

    gc.save();
    gc.lineWidth = 1;
    gc.translate(gc.canvas.width / 2, gc.canvas.height / 2);
    gc.rotate(this.pV.rotation * Constants.MATH_TO_RAD);
    if (this.pickedSegment != undefined) {
        pts = this.generateSpiralSegment(this.pickedSegment);
        this.path(gc, pts);
        gc.strokeStyle = '#666';
        gc.stroke();
    }
    gc.restore();

    gc.font = "14px Helvetica, Arial, sans-serif";
    gc.fillStyle = "rgb(117, 117, 117)";
    str = "Temperature in Rostock"
    gc.fillText(str, gc.canvas.width - gc.measureText(str).width - 10, 14);

    if (this.pickedSegment != undefined) {
        str = this.data["Date"][this.pickedSegment]
        gc.fillText(str, gc.canvas.width - gc.measureText(str).width - 10, 14 + 18 * 1);
        str = this.values[this.pickedSegment] + "°C";
        gc.fillText(str, gc.canvas.width - gc.measureText(str).width - 10, 14 + 18 * 2);
    }

    // time = Date.now() - time;
    // console.log("Repaint: "+time+"ms");
};

Spiral.prototype.generateSpiralArc = function (arcStart, arcEnd, scale, pts) {

    // For computing a, the actual radius range is the radius of the drawing space (radius) minus
    // the fractional offset (centerOffset) from the center of the spiral. This is divided by phi plus
    // one full spiral cycle (2*Math.PI). The 2*Math.PI is necessary to account for the fact that
    // we allow the scaling of the spiral between 0 and 1.

    var a = (this.radiusEnd - this.radiusStart) / (this.phi + Constants.MATH_PI_DOUBLE);

    // Let the spiral start at the top (not to the right)
    //arcStart -= Math.PI / 2;
    //arcEnd -= Math.PI / 2;

    var scaleOffset = scale * Constants.MATH_PI_DOUBLE * a;
    var angle = arcStart;
    var rad = angle * a + scaleOffset + this.radiusStart;
    if (rad < 0) rad = 0;

    var segmentLength = 10; // Tolerance error when using line segment length
    var segmentHeight = 0.1; // Tolerance error when using arc segment height

    var px = rad * Math.cos(angle);
    var py = rad * Math.sin(angle);

    pts.length = 0;
    pts.push([px, py]);

    while (angle < arcEnd) {

        // For formulas see http://en.wikipedia.org/wiki/Circular_segment
        // Choose one of the following solutions
        // angle +=  segmentLength / rad; // Compute angle step based on equidistant arc lengths
        angle += 2 * Math.acos(1 - segmentHeight / rad); // Compute angle step based on a maximum arc height, i.e., max. difference between actual spiral and our linear approximation
        if (angle > arcEnd) angle = arcEnd;

        rad = angle * a + scaleOffset + this.radiusStart;
        if (rad < 0) rad = 0;

        px = rad * Math.cos(angle);
        py = rad * Math.sin(angle);

        pts.push([px, py]);
    }
};

Spiral.prototype.generateSpiralSegment = function (i, inner, outer) {

    inner = inner || 0;
    outer = outer || this.pV.spiralWidth / 100;

    var angle = Constants.MATH_PI_DOUBLE * (i - this.start) / this.pV.segmentsPerCycle;

    var points = [];

    this.generateSpiralArc(angle, angle + this.anglePerSegment, inner, points);
    var segment = points.slice();

    this.generateSpiralArc(angle, angle + this.anglePerSegment, outer, points);

    points.reverse();
    points.forEach(function (p) {
        segment.push(p)
    });

    return segment;
};
