"use strict";

function Parameter(type, label, value, min, max) {

    const listeners = [];

    function fireChange() {
        listeners.forEach(function (l) {
            l(parameter);
        });
    }

    const parameter = {

        get type() {
            return type;
        },

        get label() {
            return label;
        },

        get min() {
            return min;
        },

        get max() {
            return max;
        },

        get value() {
            return value;
        },

        set value(val) {
            if (val != val) return; // Is NaN?
            if (val < min || val > max) return; // I out of range?
            if (val == value) return; // Is same value?
            value = val;
            fireChange(parameter);

        },

        removeChangeListener: function (l) {
            const i = listeners.indexOf(l);
            if (i != -1) listeners.splice(i, 1);
        },

        addChangeListener: function (l) {
            listeners.push(l);
            l(parameter);
        }
    };

    return parameter;
}