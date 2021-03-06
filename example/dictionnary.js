/* eslint-disable no-use-before-define */

/*
dictionnary, entry, context, definition

import Dictionnary from 'env/dictionnary';

let dict = Dictionnary.create();

dict.registerFilter('young', function(user) {
    return user.age < 25;
});

dict.append({
    "greetings": {
        "young": "hi",
        "": "hello"
    },
    "greetings-scope": "#{greetings} {name}"
});

dict.look('greeting'); // 'hello'
dict.look('greetings', {age: 20}); // 'hi'
dict.look('greetings-scope', {age: 20, name: 'dam'}); // 'hi dam'
*/

import {compose} from '../index.js';

// we may rename it lexion as dictionnary has a strong meaning in computer science which may confuse
// however lexicon is more for words only not sentence or term
// we may use glossary, a glassry is a specialized dictionnary like a computer glossary vs a cook dictionnary will
// not tell you the same thing about the word "compose"
// eccyclopedia would be ok because it's an ambitious dictionnary
// but encyclopedia contains article more than definition & fact more than language explanation
const Dictionnary = compose({
    terms: [],
    constructor(terms) {
        if (terms) {
            this.terms.push(...terms);
        }
    },

    look(id, context) {
        // first find the term using this id
        const term = this.terms.find(function(term) {
            return term.id === id;
        });
        const contextualizedTerm = term.contextualize(context);
        return contextualizedTerm.read();
    }
});
const Term = compose({
    definitions: [],
    constructor(id, definitions) {
        this.id = id;
        if (definitions) {
            this.definitions.push(...definitions);
        }
    },

    contextualize(context) {
        this.definitions = this.definitions.sort(function(a, b) {
            return b.score(context) - a.score(context);
        });
        return this;
    },

    read() {
        return this.definitions[0].read();
    }
});
const Condition = compose({
    score(context) {
        return context.lang === this.lang;
    }
});
const Definition = compose({
    value: '',
    condition: Condition.construct(),

    constructor(value, condition) {
        this.value = value;
        if (condition) {
            this.condition = condition;
        }
    },

    score(context) {
        return this.condition.score(context);
    },

    read() {
        return this.value;
    }
});
const LanguageCondition = Condition.compose({
    lang: '',
    score(context) {
        return this.lang === context.lang ? 1 : 0;
    },
    constructor(lang) {
        this.lang = lang;
    }
});
const greetingFRDefinition = Definition.construct('Bonjour', LanguageCondition.construct('fr'));
const greetingENDefinition = Definition.construct('Hello', LanguageCondition.construct('en'));
const greetingTerm = Term.construct('greetings', [greetingFRDefinition, greetingENDefinition]);
const dict = Dictionnary.construct([
    greetingTerm
]);

console.log(dict.look('greetings', {lang: 'fr'})); // 'Bonjour'
console.log(dict.look('greetings', {lang: 'en'})); // 'Hello'
