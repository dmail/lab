/* eslint-disable no-use-before-define */

import {Lab, Element} from './lab.js';
import {PrimitiveProperties} from './primitive.js';

function createConstructedByProperties(Constructor) {
    return {
        constructedBy: Constructor
    };
}

const ObjectElement = Element.extend('Object', createConstructedByProperties(Object), {
    fill(value) {
        this.readProperties(value);
        // freeze after so that property descriptor remains intact
        // Object.freeze(value);
    },

    readProperties(value) {
        return this.listProperties(value).map(function(name) {
            return this.readProperty(value, name);
        }, this);
    },

    listProperties(value) {
        return Object.getOwnPropertyNames(value);
    },

    readProperty(value, name) {
        const propertyNode = this.createProperty(name);
        this.addProperty(propertyNode);

        const descriptor = Object.getOwnPropertyDescriptor(value, name);
        if (descriptor === null || descriptor === undefined) {
            throw new Error('value has no property named ' + name + ' (value : ' + value + ' )');
        }
        propertyNode.fill(descriptor);

        return propertyNode;
    },

    createProperty(name) {
        return ObjectPropertyElement.create(name);
    },

    addProperty(property) {
        return this.appendChild(property);
    },

    hasProperty(name) {
        return this.children.some(function(property) {
            return property.name === name;
        });
    },

    getProperty(name) {
        return this.children.find(function(property) {
            return property.name === name;
        });
    }
});
// maybe rename compositePropertyElement
const ObjectPropertyElement = Element.extend('ObjectProperty', {
    effect() {
        const object = this.parentNode;
        if (object) {
            // console.log('define property', this.name, '=', this.descriptor, 'on', object.value);
            Object.defineProperty(object.value, this.name, this.descriptor);
        }
    },

    fill(descriptor) {
        this.descriptor = descriptor;

        if (descriptor.hasOwnProperty('value')) {
            const propertyValue = descriptor.value;
            // on retoruve le concept de transformation
            // ou on doit dabord créer le produit, puis l'insérer et enfin le remplir
            const valueNode = Lab.match(propertyValue);
            this.appendChild(valueNode);
            valueNode.fill(propertyValue);
        } else {
            if (descriptor.hasOwnProperty('get')) {
                const propertyGetter = descriptor.get;
                const getterNode = Lab.match(propertyGetter);
                this.appendChild(getterNode);
                getterNode.fill(propertyGetter);
            }
            if (descriptor.hasOwnProperty('set')) {
                const propertySetter = descriptor.set;
                const setterNode = Lab.match(propertySetter);
                this.appendChild(setterNode);
                setterNode.fill(propertySetter);
            }
        }
    },

    get name() {
        return this.value;
    },

    set name(name) {
        this.value = name;
    },

    get valueNode() {
        const descriptor = this.descriptor;
        return descriptor.hasOwnProperty('value') ? this.children[0] : null;
    },

    get getterNode() {
        const descriptor = this.descriptor;
        if (descriptor.hasOwnProperty('get')) {
            return this.children[0];
        }
        return null;
    },

    get setterNode() {
        const descriptor = this.descriptor;
        if (descriptor.hasOwnProperty('set')) {
            return this.children.length === 1 ? this.children[0] : this.children[1];
        }
        return null;
    },

    get propertyValue() {
        const valueNode = this.valueNode;
        return valueNode ? valueNode.value : undefined;
    },

    setValue(value) {
        this.valueNode.value = value;
        this.descriptor.value = value;
    },

    incrementValue() {
        this.setValue(this.valueNode.value + 1);
        // in case the descriptor is not configurable we may have an error here
        // but spec it works for length property because even if not configurable it's writable
        // a defineProperty will only update the value
        this.effect();
    },

    isIndex: (function() {
        const STRING = 0; // name is a string it cannot be an array index
        const INFINITE = 1; // name is casted to Infinity, NaN or -Infinity, it cannot be an array index
        const FLOATING = 2; // name is casted to a floating number, it cannot be an array index
        const NEGATIVE = 3; // name is casted to a negative integer, it cannot be an array index
        const TOO_BIG = 4; // name is casted to a integer above Math.pow(2, 32) - 1, it cannot be an array index
        const VALID = 5; // name is a valid array index
        const maxArrayIndexValue = Math.pow(2, 32) - 1;

        function getArrayIndexStatusForString(name) {
            if (isNaN(name)) {
                return STRING;
            }
            const number = Number(name);
            if (isFinite(number) === false) {
                return INFINITE;
            }
            if (Math.floor(number) !== number) {
                return FLOATING;
            }
            if (number < 0) {
                return NEGATIVE;
            }
            if (number > maxArrayIndexValue) {
                return TOO_BIG;
            }
            return VALID;
        }

        function isPropertyNameValidArrayIndex(propertyName) {
            return getArrayIndexStatusForString(propertyName) === VALID;
        }

        return function() {
            return isPropertyNameValidArrayIndex(this.name);
        };
    })()
});
Element.refine({
    effect() {
        const parentNode = this.parentNode;
        if (ObjectPropertyElement.isPrototypeOf(parentNode)) {
            if (parentNode.valueNode === this) {
                parentNode.descriptor.value = this.value;
            } else if (parentNode.getterNode === this) {
                parentNode.descriptor.get = this.value;
            } else if (parentNode.setterNode === this) {
                parentNode.descriptor.set = this.value;
            }
        }
    }
});
const ArrayElement = ObjectElement.extend('Array', createConstructedByProperties(Array), {
    createProperty(name) {
        return ArrayPropertyElement.create(name);
    },

    getPropertyTrackingEntries() {
        return this.getProperty('length');
    }
});
ObjectElement.refine({
    getPropertyTrackingEntries() {
        let trackingProperty;
        const lengthProperty = this.getProperty('length');
        if (lengthProperty) {
            const value = lengthProperty.propertyValue;
            if (typeof value === 'number') {
                trackingProperty = lengthProperty;
            } else {
                trackingProperty = null;
            }
        } else {
            trackingProperty = null;
        }
        return trackingProperty;
    }
});
const ArrayPropertyElement = ObjectPropertyElement.extend('ArrayProperty');
ArrayPropertyElement.refine({
    effect() {
        const parentNode = this.parentNode;
        if (parentNode && this.isIndex()) {
            const propertyTrackingEntries = parentNode.getPropertyTrackingEntries();
            if (propertyTrackingEntries) {
                propertyTrackingEntries.incrementValue();
            }
        }
        return ObjectPropertyElement.effect.apply(this, arguments);
    }
});

const BooleanElement = ObjectElement.extend('Boolean', createConstructedByProperties(Boolean));
const NumberElement = ObjectElement.extend('Number', createConstructedByProperties(Number));
const StringElement = ObjectElement.extend('String', createConstructedByProperties(String));
const RegExpElement = ObjectElement.extend('RegExp', createConstructedByProperties(RegExp));
const DateElement = ObjectElement.extend('Date', createConstructedByProperties(Date));
// handle function as primitive because perf
const FunctionElement = ObjectElement.extend('Function',
    createConstructedByProperties(Function),
    PrimitiveProperties,
    {
        listProperties(value) {
            return Object.getOwnPropertyNames(value).filter(function(name) {
                // do as if prototype property does not exists for now
                // because every function.prototype is a circular structure
                // due to prototype.constructor
                return name !== 'prototype';
            });
        }
    }
);
// handle error as primitive because hard to preserve stack property
const ErrorElement = ObjectElement.extend('Error',
    createConstructedByProperties(Error),
    PrimitiveProperties
);
// to add : MapElement, MapEntryElement, SetElement, SetEntryElement

export {
    ObjectElement,
    ObjectPropertyElement,
    BooleanElement,
    NumberElement,
    StringElement,
    ArrayElement,
    ArrayPropertyElement,
    FunctionElement,
    ErrorElement,
    RegExpElement,
    DateElement
};
