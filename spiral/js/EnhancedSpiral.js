"use strict";

function EnhancedSpiral(canvasId) {

    var canvas = document.getElementById(canvasId);
    canvas.tabIndex = 0;
    var gc = canvas.getContext("2d");
    var lock; // Object locking during drag operations
    var requestID = 0; // The requested animation frame's id

    var requestUpdate = function () {
        if (requestID == 0) {
            requestID = window.requestAnimationFrame(update);
        }
    };

    var spiral = new Spiral(gc, requestUpdate);

    var update = function (time) {
        var needUpdate = false;
        needUpdate = spiral.update(time) || needUpdate;

        // Draw
        gc.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
        gc.beginPath();

        spiral.draw(); // Draw the spiral

        // Request next animation frame if needed
        requestID = needUpdate ? window.requestAnimationFrame(update) : 0;
    };

    var handle = function (handler, evt) {
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
    };

    var onmousedown = function (evt) {
        if (evt.target == canvas) {
            evt.preventDefault();
            canvas.focus();
            if (!lock) lock = handle("onmousedown", evt); // Lock onto object that handled mousedown
        }
    };

    var onmouseup = function (evt) {
        if (evt.target == canvas || lock) {
            evt.preventDefault();
            if (lock == handle("onmouseup", evt)) lock = undefined; // Release lock on object
        }
    };

    var onmousemove = function (evt) {
        if (evt.target == canvas || lock) {
            evt.preventDefault();
            handle("onmousemove", evt);
        }
    };

    var onclick = function (evt) {
        evt.preventDefault();
        handle("onclick", evt);
    };

    var ondblclick = function (evt) {
        evt.preventDefault();
        handle("ondblclick", evt);
    };

    var onwheel = function (evt) {
        evt.preventDefault();
        handle("onwheel", evt);
    };

    var oncontextmenu = function (evt) {
        // evt.preventDefault();
    };

    var onkeydown = function (evt) {
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
    };

    var onresize = function () {
        $('.main').css("height", window.innerHeight); // Set height of main container
        var $placeholder = $(".canvas-placeholder"); // The canvas placeholder should have resized automatically thanks to flex layout
        canvas.width = $placeholder.innerWidth(); // Set the canvas width and height according to the placeholder
        canvas.height = $placeholder.innerHeight();
        $(canvas).css("top", $placeholder.position().top); // Position the canvas exactly on top of the placeholder
        $(canvas).css("left", $placeholder.position().left);

        spiral.reshape();
        spiral.colorMapper.legend();
        requestUpdate();
    };

    var resizeAnim = function () {
        var resId = window.setInterval(onresize, 100);
        window.setTimeout(function () {
            window.clearInterval(resId);
        }, 500);
    };

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
        resizeAnim();
    });

    function appendSlider(key, div) {
        var input = document.createElement("input"); // Create an input field for keyboard input
        input.classList.add("param-input");
        input.type = "text";
        input.value = spiral.parameter(key).value;
        div.appendChild(input);

        var nouiSlider = document.createElement("div"); // Create a div for the slider
        nouiSlider.classList.add("param-slider");
        noUiSlider.create(nouiSlider, {
            range: {
                min: spiral.parameter(key).min,
                max: spiral.parameter(key).max
            },
            start: [spiral.parameter(key).value],
            connect: [true, false],
            step: 1,
            animate: false
        });
        nouiSlider.noUiSlider.on("slide", function (values, handle) {
            sliderValueUpdate(values[handle]);
        });
        div.appendChild(nouiSlider);

        // var nativeSlider = document.createElement("input");
        // nativeSlider.classList.add("param-slider");
        // nativeSlider.type = "range";
        // nativeSlider.min = spiral.parameter(key).min;
        // nativeSlider.max = spiral.parameter(key).max;
        // nativeSlider.value = spiral.parameter(key).value;
        // nativeSlider.addEventListener("input", function () {
        //     sliderValueUpdate(this.value);
        // });
        // div.appendChild(nativeSlider);

        // var mdlSlider = document.createElement("input");
        // mdlSlider.classList.add("param-slider");
        // mdlSlider.type = "range";
        // mdlSlider.min = spiral.parameter(key).min;
        // mdlSlider.max = spiral.parameter(key).max;
        // mdlSlider.value = spiral.parameter(key).value;
        // mdlSlider.classList.add("mdl-slider");
        // mdlSlider.classList.add("mdl-js-slider");
        // mdlSlider.addEventListener("input", function () {
        //     sliderValueUpdate(this.value);
        // });
        // div.appendChild(mdlSlider);
        // componentHandler.upgradeElement(mdlSlider);

        var sliderValueUpdate = function (value) {
            spiral.parameter(key).value = parseInt(value);
            input.value = spiral.parameter(key).value;
            nouiSlider.noUiSlider.set([spiral.parameter(key).value]);
            // nativeSlider.value = spiral.parameter(key).value;
            // mdlSlider.MaterialSlider.change(spiral.parameter(key).value);
            requestUpdate();
        };

        input.addEventListener("input", function () {
            sliderValueUpdate(this.value);
        });

        input.addEventListener("keydown", function (evt) {
            switch (evt.keyCode) {
                case Constants.KEY_UP:
                    evt.preventDefault();
                    sliderValueUpdate(spiral.parameter(key).value + 1);
                    break;
                case Constants.KEY_DOWN:
                    evt.preventDefault();
                    sliderValueUpdate(spiral.parameter(key).value - 1);
                    break;
            }
        });
    }

    function appendSwitch(key, div) {
        var nouiSwitch = document.createElement("span"); // Create a div for the slider
        nouiSwitch.classList.add("param-switch");
        noUiSlider.create(nouiSwitch, {
            range: {
                min: [0, 1],
                max: 1
            },
            start: [spiral.parameter(key).value],
            connect: [true, false],
            step: 1,
            animate: false
        });
        nouiSwitch.noUiSlider.on("slide", function (values, handle) {
            switchValueUpdate(values[handle]);
        });
        div.appendChild(nouiSwitch);

        // var nativeSwitch = document.createElement("input");
        // nativeSwitch.classList.add("param-switch");
        // nativeSwitch.type = "range";
        // nativeSwitch.min = 0;
        // nativeSwitch.max = 1;
        // nativeSwitch.value = spiral.parameter(key).value;
        // nativeSwitch.addEventListener("input", function () {
        //     switchValueUpdate(this.value);
        // });
        // div.appendChild(nativeSwitch);

        // var mdlSwitch = document.createElement("label");
        // mdlSwitch.htmlFor = "p"+key;
        // var checkbox = document.createElement("input");
        // checkbox.type = "checkbox";
        // checkbox.id = "p"+key;
        // checkbox.checked = spiral.parameter(key).value;
        // checkbox.classList.add("mdl-switch__input");
        // mdlSwitch.appendChild(checkbox);
        // mdlSwitch.classList.add("param-switch");
        // mdlSwitch.classList.add("mdl-switch");
        // mdlSwitch.classList.add("mdl-js-switch");
        // mdlSwitch.classList.add("mdl-js-ripple-effect");
        // mdlSwitch.addEventListener("change", function () {
        //     switchValueUpdate(checkbox.checked ? 1 : 0);
        // });
        // div.appendChild(mdlSwitch);
        // componentHandler.upgradeElement(mdlSwitch);
        // componentHandler.upgradeElement(mdlSwitch.MaterialSwitch.rippleContainerElement_);

        var switchValueUpdate = function (value) {
            spiral.parameter(key).value = parseInt(value);
            nouiSwitch.noUiSlider.set([spiral.parameter(key).value]);
            // nativeSwitch.value = spiral.parameter(key).value;
            // checkbox.checked = spiral.parameter(key).value;
            // mdlSwitch.MaterialSwitch.checkToggleState();
            requestUpdate();
        };
    };

    function appendColorSelector(key, div) {
        var cs = new ColorSelector(div, spiral.parameter(key).value);
        cs.onselect = function (cmname) {
            spiral.parameter(key).value = cmname;
            requestUpdate();
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

    var reset = function () {
        spiral.reshape();
        requestUpdate();
    };
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