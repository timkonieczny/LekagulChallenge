"use strict";

function Spiral(gc, repaint) {

    this.gc = gc;
    this.repaint = repaint;

    this.offscreenImg = document.createElement("canvas");
    this.offscreenGC = this.offscreenImg.getContext("2d");
    this.offscreenValid = false;

    this.pickedSegment = undefined;

    var params = {
        segmentsPerCycle: Parameter("slider", "Segments per Cycle", 365, 1, 999),
        numberOfCycles: Parameter("slider", "Number of Cycles", 5, 0, 100),
        delimiterStrength: Parameter("slider", "Delimiter Strength", 80, 0, 100),
        bandScale: Parameter("slider", "Band Scale", 85, 1, 100),
        offset: Parameter("slider", "Border/Center Offset", 15, 0, 99),
        rotation: Parameter("slider", "Rotation", 270, 0, 360),
        colorMap: Parameter("colorselector", "Color Map", "Spectral"),
        colorLegend: Parameter("switch", "Color Legend", 1, 0, 1),
        smoothColors: Parameter("switch", "Smooth Colors", 1, 0, 1),
        reverseColors: Parameter("switch", "Reverse Colors", 1, 0, 1),
        twoToneColors: Parameter("switch", "Two-tone Colors", 0, 0, 1),
        twoToneFlip: Parameter("switch", "Two-tone Flip", 0, 0, 1),
        visualRepresentation: Parameter("switch", "Heatmap / Spiral", 1, 0, 1),
        guidance: Parameter("switch", "Guidance", 1, 0, 1),
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
            case params.visualRepresentation:
                if (param.value) {
                    this.generateSegment = this.generateSpiralSegment;
                    this.pickSegment = this.pickSpiralSegment;
                    this.generateOutline = this.generateSpiralOutline;
                    params.rotation.value = 270;
                }
                else {
                    this.generateSegment = this.generateHeatmapSegment;
                    this.pickSegment = this.pickHeatmapSegment;
                    this.generateOutline = this.generateHeatmapOutline;
                    params.rotation.value = 0;
                }
                this.offscreenValid = false;
                break;
            case params.delimiterStrength:
            case params.bandScale:
            case params.rotation:
                this.offscreenValid = false;
                break;
            case params.colorMap:
                var cm = new ColorMapper(Constants.COLORBREWER[param.value][7]);
                cm.cmReverse = this.colorMapper.cmReverse;
                cm.cmSmooth = this.colorMapper.cmSmooth;
                cm.cmTwoTone = this.colorMapper.cmTwoTone;
                this.colorMapper = cm;
                this.recolor();
                break;
            case params.smoothColors:
                cmParam = cmParam || "cmSmooth";
            case params.reverseColors:
                cmParam = cmParam || "cmReverse";
            case params.twoToneColors:
                cmParam = cmParam || "cmTwoTone";
            case params.twoToneFlip:
                cmParam = cmParam || "cmTwoToneFlip";
                // TODO: Very awkward mechanism to propagate parameter value to color mapper, this should be inline
                this.colorMapper[cmParam] = param.value;
                this.recolor();
                break;
            case params.segmentsPerCycle:
            case params.numberOfCycles:
            case params.offset:
                this.reshape();
        }
        repaint();
    };

    this.colorMapper = new ColorMapper(Constants.COLORBREWER[params.colorMap.value][7]);

    this.info = $("#info")[0];

    this.rangeSlider = Xlider.RangeXlider($(".range-container")[0], {
        domain: Object.create(Xlider.Domain.Integer) // Custom domain to be overridden for custom labeling
    });

    this.rangeSlider.addChangeListener(function (evt) {
        if (evt.type == "mark") {
            // TODO: Prevent slider handles being moved beyond the allowed numberOfCycles
            if (evt.index == 0) {
                this.start = evt.value;
                params.numberOfCycles.value = (this.end - this.start) / params.segmentsPerCycle.value;
            }
            else if (evt.index == 1) {
                this.end = evt.value;
                params.numberOfCycles.value = (this.end - this.start) / params.segmentsPerCycle.value;
            }
        }
        else if (evt.type == "range") {
            this.start = evt.value[0];
            this.end = evt.value[1];
            this.offscreenValid = false;
            this.repaint();
        }
    }.bind(this));

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

    this.parameters().forEach(function (p) {
        params[p].addChangeListener(this.onParameterChange.bind(this));
    }, this);
}

Spiral.prototype.init = function (data, attr, caption = "", unit = "") {
    this.data = data;
    this.caption = caption;
    this.unit = unit;

    // Override slider's label function to use labels from data array
    this.rangeSlider.domain.toLabel = function labelFromDataArray(value) {
        return this.data["Date"][Math.floor(value)];
    }.bind(this);

    this.encode(attr);
};

Spiral.prototype.encode = function (attr) {
    attr = attr || this.attr; // If no attr is provided, simply encode the previous attr again

    this.attr = attr;
    this.values = this.data[attr].map(function (v) {
        return +v; // Implicit conversion to Number
    });

    this.start = 0;
    this.end = this.values.length - 1;

    this.rangeSlider.model.setModel({
        min: 0,
        max: this.values.length - 1,
        marks: [this.start, this.end]
    });

    this.recolor();
    this.reshape();
};

Spiral.prototype.recolor = function () {
    var min = this.values[0];
    var max = this.values[0];
    this.values.forEach(function (v) {
        if (v < min) {
            min = v;
        }
        else if (v > max) {
            max = v;
        }
    });

    [min, max] = this.colorMapper.autoExpand(min, max);

    // Override actual min/max to get better color labels
    // min = -20;
    // max = 40;

    this.colorMapper.cmRange = [min, max];

    var normalized = this.values.map(function (value) {
        return (value - min) / (max - min);
    }, this);

    this.colors = normalized.map(this.colorMapper.encodeColor, this);
    this.twoTone = normalized.map(this.colorMapper.encodeTwoTone, this);

    this.offscreenValid = false;
};

Spiral.prototype.reshape = function () {
    var segments = this.pV.numberOfCycles * this.pV.segmentsPerCycle;
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

    this.rangeSlider.model.setModel({
        marks: [this.start, this.end]
    });

    this.cycles = (this.end - this.start + 1) / this.pV.segmentsPerCycle;
    this.phi = Constants.MATH_PI_DOUBLE * this.cycles;
    this.anglePerSegment = Constants.MATH_PI_DOUBLE / this.pV.segmentsPerCycle;

    this.center = [this.gc.canvas.width / 2, this.gc.canvas.height / 2];
    this.radius = Math.min(this.center[0], this.center[1]);
    this.radiusStart = this.radius * this.pV.offset / 100;
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

    this.pickSegment(x, y);

    if (oldPick != this.pickedSegment) {
        var str = this.caption;
        if (this.pickedSegment != undefined) {
            str += "\n";
            str += this.data["Date"][this.pickedSegment];
            str += "\n";
            str += this.values[this.pickedSegment] + this.unit;
        }
        this.info.textContent = str;
    }

    return this.pickedSegment != undefined;
};

Spiral.prototype.pickSpiralSegment = function (x, y) {

    var a = Math.atan2(y, x); // Angle in range [-PI .. PI]
    if (a < 0) a += Constants.MATH_PI_DOUBLE; // Map negative angles from [-PI .. 0] to [PI .. 2*PI]
    a /= Constants.MATH_PI_DOUBLE; // Normailze angle from [0 .. 2*PI] to [0 .. 1]

    var d = Math.sqrt(x * x + y * y); // Distance from center
    d -= this.radiusStart + a * this.radiusPerCycle; // Subtract the offset from the center (radiusStart) and the amount that the radius has already advanced at angle a (a is normalized per cycle)
    d /= (this.radiusEnd - this.radiusStart); // Normalize distance from [radiusStart .. radiusEnd] to [0 .. 1]

    var ring = Math.floor(d * (this.cycles + 1)); // The ring at relative distance d (+1 to account for spiral band width)
    var index = Math.floor(this.start + (a + ring) * this.pV.segmentsPerCycle);

    if (index >= this.start && index <= this.end) {
        this.pickedSegment = index;
    }
};

Spiral.prototype.pickHeatmapSegment = function (x, y) {

    var w = this.gc.canvas.width * (100 - this.pV.offset) / 100;
    var h = this.gc.canvas.height * (100 - this.pV.offset) / 100;
    var sw = w / this.pV.segmentsPerCycle;
    var sh = h / this.pV.numberOfCycles;

    x += w / 2;
    y += h / 2;

    if (x >= 0 && x <= w && y >= 0 && y <= h) {
        var row = Math.floor(y / sh);
        var col = Math.floor(x / sw);
        this.pickedSegment = this.start + col + row * this.pV.segmentsPerCycle;
    }
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

        gc.translate(Math.floor(gc.canvas.width / 2) + 0.5, Math.floor(gc.canvas.height / 2) + 0.5);
        gc.rotate(this.pV.rotation * Constants.MATH_TO_RAD);

        var delimiters = [];

        for (i = this.start; i <= this.end; i++) {
            if (!this.colorMapper.cmTwoTone) {
                pts = this.generateSegment(i);
                gc.beginPath();
                this.path(gc, pts);
                gc.fillStyle = this.colors[i];
                gc.fill();
                delimiters.push(pts[0]); // First and ...
                delimiters.push(pts[pts.length - 1]); // ... last point of segment serve as delimiting line
            }
            else {
                pts = this.generateSegment(i, 0, this.twoTone[i].ratio * this.pV.bandScale / 100);
                gc.beginPath();
                this.path(gc, pts);
                gc.fillStyle = this.twoTone[i].colors[0];
                gc.fill();
                delimiters.push(pts[0]); // First and ...

                pts = this.generateSegment(i, this.twoTone[i].ratio * this.pV.bandScale / 100, this.pV.bandScale / 100);
                gc.beginPath();
                this.path(gc, pts);
                gc.fillStyle = this.twoTone[i].colors[1];
                gc.fill();
                delimiters.push(pts[pts.length - 1]); // ... last point of segment serve as delimiting line
            }
        }

        if (this.pV.delimiterStrength > 0) {
            gc.beginPath();
            if (this.pV.visualRepresentation == 0) gc.translate(-0.5, -0.5);
            for (i = 0; i < delimiters.length; i += 2) {
                gc.moveTo(delimiters[i][0], delimiters[i][1]);
                gc.lineTo(delimiters[i + 1][0], delimiters[i + 1][1]);
            }
            gc.lineWidth = this.pV.delimiterStrength / 100;
            gc.strokeStyle = '#FFF';
            gc.stroke();
        }

        gc.restore();
        // console.log(ctx.getSvg());
        this.offscreenValid = true;
    }

    gc = this.gc;
    gc.drawImage(this.offscreenImg, 0, 0);

    gc.save();
    gc.lineWidth = 1;
    gc.translate(Math.floor(gc.canvas.width / 2), Math.floor(gc.canvas.height / 2));
    gc.rotate(this.pV.rotation * Constants.MATH_TO_RAD);
    if (this.pickedSegment != undefined && this.pickedSegment >= this.start && this.pickedSegment <= this.end) {
        pts = this.generateSegment(this.pickedSegment);
        gc.beginPath();
        this.path(gc, pts);
        gc.strokeStyle = '#666';
        gc.stroke();
    }

    if (this.pV.guidance) {
        var glowBlur = 50;
        pts = [];
        this.generateOutline(pts);

        gc.beginPath();
        gc.rect(-gc.canvas.width / 2 - glowBlur, -gc.canvas.height / 2 - glowBlur, gc.canvas.width + 2 * glowBlur, gc.canvas.height + 2 * glowBlur);
        this.path(gc, pts);
        gc.clip('evenodd');

        gc.beginPath();
        this.path(gc, pts);
        gc.fillStyle = '#FFF';
        gc.shadowColor = '#008000';
        gc.shadowBlur = glowBlur;
        gc.fill();
    }

    gc.restore();

    // time = Date.now() - time;
    // console.log("Repaint: "+time+"ms");
};

Spiral.prototype.generateSpiralArc = function (arcStart, arcEnd, scale, pts) {

    // For computing a, the actual radius range is the radius of the drawing space (radius) minus
    // the fractional offset from the center of the spiral. This is divided by phi plus
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

Spiral.prototype.generateSpiralSegment = function (i, inner = 0, outer = this.pV.bandScale / 100) {

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

Spiral.prototype.generateSpiralOutline = function (outline) {
    this.generateSpiralArc(this.phi, this.phi + Constants.MATH_PI_DOUBLE, 0, outline);
    return outline;
};

Spiral.prototype.generateHeatmapSegment = function (i, inner = 0, outer = this.pV.bandScale / 100) {

    var w = this.gc.canvas.width * (100 - this.pV.offset) / 100;
    var h = this.gc.canvas.height * (100 - this.pV.offset) / 100;
    var sw = w / this.pV.segmentsPerCycle;
    var sh = h / Math.ceil(this.pV.numberOfCycles);

    i -= this.start;

    var x = (i % this.pV.segmentsPerCycle) * sw - w / 2;
    var y = Math.floor(i / this.pV.segmentsPerCycle) * sh - h / 2;

    var left = Math.floor(x) + 0.5;
    var right = left + Math.ceil(sw);
    var top = Math.floor(y + (1 - inner) * sh) + 0.5;
    var bottom = Math.floor(y + (1 - outer) * sh) + 0.5;

    var segment = [];
    segment[0] = [left, top];
    segment[1] = [right, top];
    segment[2] = [right, bottom];
    segment[3] = [left, bottom];

    return segment;
};

Spiral.prototype.generateHeatmapOutline = function (outline) {

    var w = this.gc.canvas.width * (100 - this.pV.offset) / 100;
    var h = this.gc.canvas.height * (100 - this.pV.offset) / 100;

    var x = -w / 2;
    var y = -h / 2;

    var left = Math.floor(x) + 0.5;
    var right = left + Math.ceil(w);
    var top = Math.floor(y) + 0.5;
    var bottom = top + Math.ceil(h);

    outline[0] = [left, top];
    outline[1] = [right, top];
    outline[2] = [right, bottom];
    outline[3] = [left, bottom];

    return outline;
};
