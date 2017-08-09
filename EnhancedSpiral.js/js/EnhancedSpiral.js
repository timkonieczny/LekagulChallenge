"use strict";

function EnhancedSpiral() {

    var canvas = document.getElementById("vis");
    canvas.tabIndex = 0;
    var gc = canvas.getContext("2d");

    var spiral = new Spiral(gc, requestUpdate);

    var requestID = 0; // The requested animation frame's id
    function requestUpdate() {
        if (requestID == 0) {
            requestID = window.requestAnimationFrame(update);
        }
    }

    function update(time) {
        var needUpdate = false;
        needUpdate = spiral.update(time) || needUpdate;

        // Draw
        gc.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        gc.beginPath();

        spiral.draw(); // Draw the spiral

        // Request next animation frame if needed
        requestID = needUpdate ? window.requestAnimationFrame(update) : 0;
    }

    var lock; // Object locking during drag operations
    function handle(handler, evt) {
        // handler is the method name of the handle (e.g., "onclick", "onmousemove", or "onwheel")
        // evt is the corresponding event object

        // console.log(evt);
        var clientRect = canvas.getBoundingClientRect();
        evt.screenCoords = [evt.clientX - clientRect.left, evt.clientY - clientRect.top];

        // If a dragging operation is going on remain locked on that operation
        if (lock && lock[handler] && lock[handler](evt)) {
            requestUpdate();
            return lock;
        }

        // The trick is as follows:
        // xyz[handler] checks if a handler method exists for xyz
        // xyz.pick(evt) checks if xyz is under pointer
        // xyz[handler](evt) actually calls the handler method, which returns true if the evt has been consumed

        // These tests are done in a cascade, which continues until evt has been consumed
        // In opposite drawing order:
        // 1. spiral
        // else viewport

        var handledBy; // Store the handle that consumed the event
        if (spiral[handler] && spiral.pick(evt) && spiral[handler](evt)) {
            handledBy = spiral;
        }

        requestUpdate();
        return handledBy;
    }

    function onmousedown(evt) {
        if (evt.target == canvas) {
            evt.preventDefault();
            canvas.focus();
            if (!lock) lock = handle("onmousedown", evt); // Lock onto object that handled mousedown
        }
    }

    function onmouseup(evt) {
        if (evt.target == canvas || lock) {
            evt.preventDefault();
            if (lock == handle("onmouseup", evt)) lock = undefined; // Release lock on object
        }
    }

    function onmousemove(evt) {
        if (evt.target == canvas || lock) {
            evt.preventDefault();
            handle("onmousemove", evt);
        }
    }

    function onclick(evt) {
        evt.preventDefault();
        handle("onclick", evt);
    }

    function ondblclick(evt) {
        evt.preventDefault();
        handle("ondblclick", evt);
    }

    function onwheel(evt) {
        evt.preventDefault();
        handle("onwheel", evt);
    }

    function oncontextmenu(evt) {
        // evt.preventDefault();
    }

    function onkeydown(evt) {
        switch (evt.keyCode) {
            case Constants.KEY_UP:
                spiral.shiftDataWindow(spiral.pV.segmentsPerCycle);
                requestUpdate();
                break;
            case Constants.KEY_DOWN:
                spiral.shiftDataWindow(-spiral.pV.segmentsPerCycle);
                requestUpdate();
                break;
            case Constants.KEY_LEFT:
                spiral.shiftDataWindow(-1);
                requestUpdate();
                break;
            case Constants.KEY_RIGHT:
                spiral.shiftDataWindow(1);
                requestUpdate();
                break;
        }
    }

    function onresize(evt) {
        $('.main').css("height", window.innerHeight); // Set height of main container
        var $placeholder = $(".canvas-container"); // The canvas placeholder should have resized automatically thanks to flex layout
        canvas.width = $placeholder.innerWidth(); // Set the canvas width and height according to the placeholder
        canvas.height = $placeholder.innerHeight();
        $(canvas).css("top", $placeholder.position().top); // Position the canvas exactly on top of the placeholder
        $(canvas).css("left", $placeholder.position().left);

        spiral.reshape();
        spiral.colorMapper.legend();
        requestUpdate();
    }

    function resizeAnimated() {
        var id = window.setInterval(onresize, 10);
        window.setTimeout(function () {
            window.clearInterval(id);
        }, 500);
    }

    canvas.addEventListener("click", onclick);
    canvas.addEventListener("dblclick", ondblclick);
    canvas.addEventListener("wheel", onwheel);
    canvas.addEventListener("contextmenu", oncontextmenu);
    canvas.addEventListener("keydown", onkeydown);

    window.addEventListener("mousedown", onmousedown);
    window.addEventListener("mouseup", onmouseup);
    window.addEventListener("mousemove", onmousemove);
    window.addEventListener("resize", onresize);

    onresize();

    $('.bars').on("click", function () {
        $('.ui').toggleClass("ui-hidden");
        $('.main').toggleClass("main-shrunk");
        resizeAnimated();
    });

    function appendSlider(key, div) {
        var input = document.createElement("input"); // Create an input field for keyboard input
        input.classList.add("param-input");
        input.type = "text";
        input.value = spiral.parameter(key).value;
        div.appendChild(input);

        var slider = document.createElement("div");
        slider.classList.add("param-slider");
        var xSlider = Xlider.ValueXlider(slider, {
            min: spiral.parameter(key).min,
            max: spiral.parameter(key).max,
            marks: [spiral.parameter(key).value],
        });
        div.appendChild(slider);

        spiral.parameter(key).addChangeListener(function (param) {
            input.value = spiral.parameter(key).value;
            xSlider.model.setModel({marks: [spiral.parameter(key).value]});
        });

        xSlider.addChangeListener(function (evt) {
            spiral.parameter(key).value = evt.value;
            input.value = spiral.parameter(key).value;
        });

        input.addEventListener("input", function () {
            spiral.parameter(key).value = parseFloat(this.value);
            xSlider.model.setModel({marks: [spiral.parameter(key).value]});
        });

        input.addEventListener("keydown", function (evt) {
            switch (evt.keyCode) {
                case Constants.KEY_UP:
                    evt.preventDefault();
                    spiral.parameter(key).value += 1;
                    break;
                case Constants.KEY_DOWN:
                    evt.preventDefault();
                    spiral.parameter(key).value -= 1;
                    break;
            }
        });
    }

    function appendSwitch(key, div) {
        var span = document.createElement("span");
        span.classList.add("param-switch");
        var xSwitch = Xlider.Xwitch(span, {
            marks: [spiral.parameter(key).value],
        });
        div.appendChild(span);

        spiral.parameter(key).addChangeListener(function (param) {
            xSwitch.model.setModel([spiral.parameter(key).value]);
        });

        xSwitch.addChangeListener(function (evt) {
            spiral.parameter(key).value = evt.value;
        });
    }

    function appendColorSelector(key, div) {
        var cs = new ColorSelector(div, spiral.parameter(key).value);
        cs.onselect = function (cmname) {
            spiral.parameter(key).value = cmname;
        };
    }

    spiral.parameters().forEach(function (key) {
        var div = document.createElement("div"); // Create div element for the parameter container
        div.classList.add("param-container");

        var label = document.createElement("span"); // Create a span for the label
        label.textContent = spiral.parameter(key).label;
        label.classList.add("param-label");
        div.appendChild(label);

        if (spiral.parameter(key).type == "slider") {
            appendSlider(key, div);
        }
        else if (spiral.parameter(key).type == "switch") {
            appendSwitch(key, div);
        }
        else if (spiral.parameter(key).type == "colorselector") {
            appendColorSelector(key, div);
        }

        var uicontainer = document.getElementById('ui-container'); // Add all to the ui container
        uicontainer.appendChild(div);
    });

    function reset() {
        spiral.reshape();
        requestUpdate();
    }
    this.init = function (file) {
        // Load map from TopoJSON file
        var req = new XMLHttpRequest();
        //req.open("GET", "data/RostockWeather.csv");
        req.open("GET", file);
        // req.open("GET", "data/health.csv");
        req.onload = function () {

            var lines = this.responseText.split("\n");

            var data = [];

            var attr = lines[0].split(";");

            var i, j;


            for (i = 0; i < attr.length; i++) {
                attr[i] = attr[i].trim();
                data[attr[i]] = [];
            }

            /*attr.forEach(function (a) {
                a = a.trim();
                data[a] = [];
            });*/


            var vals;
            for (i = 2; i < lines.length; i++) {
                vals = lines[i].split(";");
                for (j = 0; j < vals.length; j++) {
                    //console.log(JSON.stringify(vals[j].trim()));
                    data[attr[j]].push(vals[j].trim());
                }
            }
            console.log(JSON.stringify(data));

            console.log("onload");


            spiral.init(data, "Temp");
            // spiral.init(data, "Influenza");
            reset();
        };
        req.onerror = function (e) {
            console.log(e);
        };
        req.send();

        // Start rendering
        reset();
    }
}