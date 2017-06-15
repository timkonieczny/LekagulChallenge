"use strict";

function ColorSelector(container, init) {
    var colorselector = document.createElement("div");
    colorselector.classList.add("colorselector");
    container.appendChild(colorselector);

    var head = document.createElement("div");
    head.classList.add("colorselector-head");
    head.onclick = function (evt) {
        toggleEntries();
    };
    colorselector.appendChild(head);

    var bars = document.createElement("i");
    bars.classList.add("fa");
    bars.classList.add("fa-bars");
    head.appendChild(bars);

    var label = document.createElement("span");
    label.classList.add("colorselector-label");
    label.textContent = init || "Spectral";
    head.appendChild(label);

    var list = document.createElement("div");
    list.classList.add("colorselector-entries");
    colorselector.appendChild(list);

    var brewerMaps = Object.keys(Constants.COLORBREWER).sort();
    brewerMaps.forEach(function (colormapname) {
        var entry = document.createElement("div");
        entry.classList.add("colorselector-entry");
        entry.textContent = colormapname;
        list.appendChild(entry);

        var mapper = new ColorMapper(Constants.COLORBREWER[colormapname]["7"]);
        entry.style.backgroundImage = 'url("' + mapper.gradient() + '")';

        entry.onclick = function (evt) {
            label.textContent = evt.target.textContent;
            toggleEntries();
            this.onselect(evt.target.textContent)
        }.bind(this);
    }, this);

    var toggleEntries = function () {
        if (colorselector.classList.contains("colorselector-expand")) {
            colorselector.classList.remove("colorselector-expand");
        }
        else {
            colorselector.classList.add("colorselector-expand");
        }
    };

    this.onselect = function (colormapname) {

    };
}