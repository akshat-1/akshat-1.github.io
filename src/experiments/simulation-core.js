const MODEL_DEFAULTS = Object.freeze({
    duffingVanderpol: Object.freeze({ alpha: 1, beta: 1, mu: 0.3, delta: 0.05, F: 0.3, omega: 1.2 }),
    vanderpol: Object.freeze({ alpha: 1, beta: 0, mu: 1, delta: 0, F: 0, omega: 1 }),
    duffing: Object.freeze({ alpha: -1, beta: 1, mu: 0, delta: 0.2, F: 0.3, omega: 1.2 })
});

export const MODEL_DEFINITIONS = Object.freeze({
    duffingVanderpol: Object.freeze({
        label: 'Duffing–Van der Pol',
        equation: 'x″ + [δ + μ(x² − 1)]x′ + αx + βx³ = F cos(ωt)'
    }),
    vanderpol: Object.freeze({
        label: 'Van der Pol',
        equation: 'x″ + μ(x² − 1)x′ + αx = F cos(ωt)'
    }),
    duffing: Object.freeze({
        label: 'Duffing',
        equation: 'x″ + δx′ + αx + βx³ = F cos(ωt)'
    })
});

export const PARAMETER_KEYS = Object.freeze(['alpha', 'beta', 'mu', 'delta', 'F', 'omega']);

const VARIABLE_ALIASES = Object.freeze({
    t: 't',
    time: 't',
    x: 'x',
    v: 'v',
    dxdt: 'v',
    velocity: 'v',
    a: 'a',
    d2xdt2: 'a',
    acceleration: 'a',
    forcing: 'forcing',
    force: 'forcing',
    alpha: 'alpha',
    beta: 'beta',
    mu: 'mu',
    delta: 'delta',
    f: 'F',
    omega: 'omega',
    pi: 'pi',
    e: 'e'
});

const FUNCTIONS = Object.freeze({
    abs: { min: 1, max: 1, fn: Math.abs },
    cos: { min: 1, max: 1, fn: Math.cos },
    exp: { min: 1, max: 1, fn: Math.exp },
    log: { min: 1, max: 1, fn: Math.log },
    max: { min: 2, max: Infinity, fn: Math.max },
    min: { min: 2, max: Infinity, fn: Math.min },
    sin: { min: 1, max: 1, fn: Math.sin },
    sqrt: { min: 1, max: 1, fn: Math.sqrt },
    tan: { min: 1, max: 1, fn: Math.tan }
});

const OPERATORS = Object.freeze({
    '+': { precedence: 1, associativity: 'left', fn: (left, right) => left + right },
    '-': { precedence: 1, associativity: 'left', fn: (left, right) => left - right },
    '*': { precedence: 2, associativity: 'left', fn: (left, right) => left * right },
    '/': { precedence: 2, associativity: 'left', fn: (left, right) => left / right },
    '^': { precedence: 3, associativity: 'right', fn: (left, right) => left ** right }
});

function cloneDefaults(model) {
    const defaults = MODEL_DEFAULTS[model] || MODEL_DEFAULTS.duffingVanderpol;
    return { ...defaults };
}

export function defaultParameters(model) {
    return cloneDefaults(model);
}

export function acceleration(model, state, time, parameters, forced = true) {
    const alpha = Number(parameters.alpha) || 0;
    const beta = Number(parameters.beta) || 0;
    const mu = Number(parameters.mu) || 0;
    const delta = Number(parameters.delta) || 0;
    const amplitude = forced ? (Number(parameters.F) || 0) : 0;
    const omega = Number(parameters.omega) || 0;
    const drive = amplitude * Math.cos(omega * time);
    const damping = model === 'duffing'
        ? delta
        : delta + mu * (state.x ** 2 - 1);
    const nonlinearStiffness = model === 'vanderpol' ? 0 : beta * (state.x ** 3);
    return drive - damping * state.v - alpha * state.x - nonlinearStiffness;
}

function derivative(model, state, time, parameters, forced) {
    return {
        x: state.v,
        v: acceleration(model, state, time, parameters, forced)
    };
}

export function rk4Step(model, state, time, step, parameters, forced = true) {
    const first = derivative(model, state, time, parameters, forced);
    const secondState = { x: state.x + first.x * step / 2, v: state.v + first.v * step / 2 };
    const second = derivative(model, secondState, time + step / 2, parameters, forced);
    const thirdState = { x: state.x + second.x * step / 2, v: state.v + second.v * step / 2 };
    const third = derivative(model, thirdState, time + step / 2, parameters, forced);
    const fourthState = { x: state.x + third.x * step, v: state.v + third.v * step };
    const fourth = derivative(model, fourthState, time + step, parameters, forced);
    return {
        x: state.x + (step / 6) * (first.x + 2 * second.x + 2 * third.x + fourth.x),
        v: state.v + (step / 6) * (first.v + 2 * second.v + 2 * third.v + fourth.v)
    };
}

export function forcingValue(parameters, time, forced = true) {
    if (!forced) {
        return 0;
    }
    return (Number(parameters.F) || 0) * Math.cos((Number(parameters.omega) || 0) * time);
}

export function buildVariableContext(model, state, time, parameters, forced = true) {
    const context = {
        t: time,
        x: state.x,
        v: state.v,
        a: acceleration(model, state, time, parameters, forced),
        forcing: forcingValue(parameters, time, forced),
        alpha: Number(parameters.alpha) || 0,
        beta: Number(parameters.beta) || 0,
        mu: Number(parameters.mu) || 0,
        delta: Number(parameters.delta) || 0,
        F: Number(parameters.F) || 0,
        omega: Number(parameters.omega) || 0,
        pi: Math.PI,
        e: Math.E
    };
    return context;
}

function tokenize(source) {
    const tokens = [];
    let position = 0;
    while (position < source.length) {
        const character = source[position];
        if (/\s/.test(character)) {
            position += 1;
            continue;
        }
        const number = source.slice(position).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
        if (number) {
            tokens.push({ type: 'number', value: Number(number[0]) });
            position += number[0].length;
            continue;
        }
        const identifier = source.slice(position).match(/^[A-Za-z_][A-Za-z0-9_]*/);
        if (identifier) {
            tokens.push({ type: 'identifier', value: identifier[0] });
            position += identifier[0].length;
            continue;
        }
        if ('+-*/^(),'.includes(character)) {
            tokens.push({ type: character, value: character });
            position += 1;
            continue;
        }
        throw new Error(`Unexpected character “${character}” at position ${position + 1}.`);
    }
    if (tokens.length > 120) {
        throw new Error('Formula is too long. Keep it under 120 tokens.');
    }
    return tokens;
}

function parseFormula(source) {
    if (typeof source !== 'string' || !source.trim()) {
        throw new Error('Enter a formula.');
    }
    if (source.length > 240) {
        throw new Error('Formula is too long. Keep it under 240 characters.');
    }
    const tokens = tokenize(source);
    let position = 0;
    const peek = () => tokens[position];
    const consume = (type) => {
        const token = peek();
        if (!token || token.type !== type) {
            throw new Error(`Expected “${type}”.`);
        }
        position += 1;
        return token;
    };

    const parsePrimary = () => {
        const token = peek();
        if (!token) {
            throw new Error('Expected a value.');
        }
        if (token.type === 'number') {
            position += 1;
            return { type: 'number', value: token.value };
        }
        if (token.type === '(') {
            position += 1;
            const expression = parseBinary(0);
            consume(')');
            return expression;
        }
        if (token.type === 'identifier') {
            position += 1;
            const name = token.value.toLowerCase();
            if (peek()?.type === '(') {
                position += 1;
                const definition = FUNCTIONS[name];
                if (!definition) {
                    throw new Error(`Unknown function “${token.value}”.`);
                }
                const argumentsList = [];
                if (peek()?.type !== ')') {
                    while (true) {
                        argumentsList.push(parseBinary(0));
                        if (peek()?.type !== ',') {
                            break;
                        }
                        position += 1;
                    }
                }
                consume(')');
                if (argumentsList.length < definition.min || argumentsList.length > definition.max) {
                    throw new Error(`Function “${token.value}” expects ${definition.min === definition.max ? definition.min : `${definition.min} or more`} argument(s).`);
                }
                return { type: 'function', name, argumentsList };
            }
            const variable = VARIABLE_ALIASES[name];
            if (!variable) {
                throw new Error(`Unknown variable “${token.value}”.`);
            }
            return { type: 'variable', name: variable };
        }
        throw new Error(`Unexpected token “${token.value}”.`);
    };

    const parseUnary = () => {
        const token = peek();
        if (token?.type === '+' || token?.type === '-') {
            position += 1;
            return { type: 'unary', operator: token.type, value: parseUnary() };
        }
        return parsePrimary();
    };

    function parseBinary(minimumPrecedence) {
        let left = parseUnary();
        while (true) {
            const token = peek();
            const operator = token && OPERATORS[token.type];
            if (!operator || operator.precedence < minimumPrecedence) {
                break;
            }
            position += 1;
            const nextMinimum = operator.associativity === 'right'
                ? operator.precedence
                : operator.precedence + 1;
            const right = parseBinary(nextMinimum);
            left = { type: 'binary', operator: token.type, left, right };
        }
        return left;
    }

    const tree = parseBinary(0);
    if (position !== tokens.length) {
        throw new Error(`Unexpected token “${tokens[position].value}”.`);
    }
    return tree;
}

function evaluateTree(tree, context) {
    switch (tree.type) {
    case 'number':
        return tree.value;
    case 'variable':
        return context[tree.name];
    case 'unary': {
        const value = evaluateTree(tree.value, context);
        return tree.operator === '-' ? -value : value;
    }
    case 'binary': {
        const definition = OPERATORS[tree.operator];
        return definition.fn(evaluateTree(tree.left, context), evaluateTree(tree.right, context));
    }
    case 'function': {
        const definition = FUNCTIONS[tree.name];
        return definition.fn(...tree.argumentsList.map((argument) => evaluateTree(argument, context)));
    }
    default:
        return NaN;
    }
}

export function compileFormula(source) {
    const tree = parseFormula(source);
    return (context) => evaluateTree(tree, context);
}

export function evaluateFormula(source, context) {
    return compileFormula(source)(context);
}
