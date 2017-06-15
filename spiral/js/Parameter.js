"use strict";

function Parameter(owner, type, label, value, min, max) {
    Object.defineProperties(this, {
        type: {
            get: function () {
                return type;
            }
        },
        label: {
            get: function () {
                return label;
            }
        },
        min: {
            get: function () {
                return min;
            }
        },
        max: {
            get: function () {
                return max;
            }
        },
        value: {
            get: function () {
                return value;
            },
            set: function (val) {
                if (val != val) return; // Is NaN?
                if (val < min || val > max) return; // I out of range?
                if (val == value) return; // Is same value?
                value = val;
                if (owner["onParameterChange"]) owner["onParameterChange"](this);
            }
        }
    });
}