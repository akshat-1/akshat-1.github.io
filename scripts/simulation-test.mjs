import assert from 'node:assert/strict';
import {
    acceleration,
    buildVariableContext,
    compileFormula,
    defaultParameters,
    forcingValue,
    rk4Step
} from '../src/experiments/simulation-core.js';

const harmonicParameters = { alpha: 1, beta: 0, mu: 0, delta: 0, F: 0, omega: 1 };
assert.equal(acceleration('duffing', { x: 2, v: 0 }, 0, harmonicParameters, false), -2);
assert.equal(forcingValue({ F: 3, omega: 2 }, 0, true), 3);
assert.equal(forcingValue({ F: 3, omega: 2 }, 0, false), 0);

let state = { x: 1, v: 0 };
const step = 0.001;
for (let index = 0; index < Math.round((Math.PI / 2) / step); index += 1) {
    state = rk4Step('duffing', state, index * step, step, harmonicParameters, false);
}
assert.ok(Math.abs(state.x) < 0.002, `harmonic oscillator position drifted: ${state.x}`);
assert.ok(Math.abs(state.v + 1) < 0.002, `harmonic oscillator velocity drifted: ${state.v}`);

const parameters = defaultParameters('duffingVanderpol');
const context = buildVariableContext('duffingVanderpol', { x: 2, v: -1 }, 0.5, parameters, true);
const formula = compileFormula('sin(t) * x + max(v, 0) + alpha - pi');
assert.ok(Number.isFinite(formula(context)));
assert.throws(() => compileFormula('globalThis.process'), /Unexpected character|Unknown variable/);
assert.throws(() => compileFormula('sin(t'), /Expected “\)”/);

console.log('Simulation core test passed: models, forcing, RK4 integration, variable context, and safe formulas verified.');
