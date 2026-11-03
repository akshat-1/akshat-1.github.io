import {
    MODEL_DEFINITIONS,
    PARAMETER_KEYS,
    buildVariableContext,
    compileFormula,
    defaultParameters,
    forcingValue,
    rk4Step
} from './simulation-core.js';

const MAX_HISTORY = 12000;
const MAX_PEAKS = 10;
const DEFAULT_BOUNDS = Object.freeze({ xMin: -3, xMax: 3, vMin: -3, vMax: 3 });
const COLORS = Object.freeze({
    dark: Object.freeze({
        axis: '#94a4c0',
        grid: 'rgba(157, 187, 230, .16)',
        trajectory: '#927aff',
        particle: '#ff809c',
        start: '#ffc96b',
        curve: ['#62eed1', '#927aff', '#ffc96b']
    }),
    light: Object.freeze({
        axis: '#536681',
        grid: 'rgba(31, 57, 89, .18)',
        trajectory: '#6951bf',
        particle: '#c94c68',
        start: '#956000',
        curve: ['#087f79', '#6951bf', '#956000']
    })
});

const BUILTIN_VARIABLES = Object.freeze([
    ['t', 'Simulation time (t)'],
    ['x', 'Position (x)'],
    ['v', 'Velocity (dx/dt)'],
    ['a', 'Acceleration (d²x/dt²)'],
    ['forcing', 'Forcing'],
    ['alpha', 'α coefficient'],
    ['beta', 'β coefficient'],
    ['mu', 'μ coefficient'],
    ['delta', 'δ coefficient'],
    ['F', 'F coefficient'],
    ['omega', 'ω coefficient']
]);

const PLOT_DEFAULTS = Object.freeze([
    Object.freeze({ x: 't', y: 'x' }),
    Object.freeze({ x: 't', y: 'v' }),
    Object.freeze({ x: 'x', y: 'v' })
]);

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback = 0) {
    return Number.isFinite(value) ? value : fallback;
}

function formatNumber(value, digits = 3) {
    if (!Number.isFinite(value)) {
        return '—';
    }
    const normalized = Math.abs(value) < 0.0005 ? 0 : value;
    return normalized.toFixed(digits);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function createMarkup(documentRef) {
    const wrapper = documentRef.createElement('section');
    wrapper.className = 'simulation-lab';
    wrapper.setAttribute('aria-label', 'Numerical oscillator simulation lab');
    wrapper.innerHTML = `
        <div class="simulation-lab__topline">
            <div>
                <p class="micro-label">DYNAMICAL SYSTEMS / NUMERICAL LAB</p>
                <h3>Choose a point.<br><em>Watch it move.</em></h3>
            </div>
            <p class="simulation-lab__intro">Explore Duffing, Van der Pol, and combined Duffing–Van der Pol dynamics. Click the phase diagram to choose the initial state, then follow the trajectory and three live variable plots.</p>
        </div>
        <div class="simulation-lab__workspace">
            <div class="simulation-lab__panel simulation-lab__panel--controls">
                <fieldset data-role="locked-controls">
                    <legend class="micro-label">SYSTEM CONTROLS</legend>
                    <div class="simulation-lab__control-grid">
                        <label class="simulation-lab__field simulation-lab__field--wide">Model
                            <select data-role="model" aria-label="Oscillator model"></select>
                        </label>
                        <label class="simulation-lab__field">Forcing
                            <select data-role="forced" aria-label="Forcing mode"><option value="true">Forced</option><option value="false">Unforced</option></select>
                        </label>
                        <label class="simulation-lab__field">Step dt
                            <input data-role="dt" type="number" min="0.0001" max="0.25" step="0.0001" value="0.01" inputmode="decimal">
                        </label>
                        <label class="simulation-lab__field">Speed
                            <input data-role="speed" type="number" min="0.25" max="20" step="0.25" value="4" inputmode="decimal">
                        </label>
                    </div>
                    <p class="simulation-lab__equation" data-role="equation"></p>
                    <div class="simulation-lab__parameter-grid" data-role="parameters"></div>
                    <div class="simulation-lab__initial-grid">
                        <label class="simulation-lab__field">Initial x
                            <input data-role="initial-x" type="number" min="-100" max="100" step="0.01" value="0.5" inputmode="decimal">
                        </label>
                        <label class="simulation-lab__field">Initial dx/dt
                            <input data-role="initial-v" type="number" min="-100" max="100" step="0.01" value="0" inputmode="decimal">
                        </label>
                    </div>
                    <p class="simulation-lab__hint">Click the phase diagram to choose the starting point, or enter it above.</p>
                    <div class="simulation-lab__plots-heading">
                        <span class="micro-label">LIVE PLOTS / 3 SLOTS</span>
                        <span class="simulation-lab__hint">Custom formulas support t, x, v, a, forcing, and coefficients.</span>
                    </div>
                    <div class="simulation-lab__plot-controls" data-role="plot-controls"></div>
                </fieldset>
                <div class="simulation-lab__actions">
                    <button class="button button-primary" type="button" data-role="start">Start simulation <span>▶</span></button>
                    <button class="button button-danger" type="button" data-role="stop" disabled>Stop simulation <span>■</span></button>
                    <button class="button button-ghost" type="button" data-role="reset">Reset</button>
                </div>
                <p class="simulation-lab__lock-status" data-role="lock-status" role="status" aria-live="polite">Simulation ready.</p>
            </div>
            <div class="simulation-lab__panel simulation-lab__panel--phase">
                <div class="simulation-lab__panel-heading"><div><span class="micro-label">PHASE DIAGRAM</span><h4>x / dx/dt</h4></div><span class="simulation-lab__phase-readout" data-role="phase-readout">Start: (0.500, 0.000)</span></div>
                <canvas class="simulation-lab__phase-canvas" data-role="phase-canvas" tabindex="0" aria-label="Phase diagram. Click to choose the initial position and velocity."></canvas>
                <p class="simulation-lab__canvas-hint">Click to set the initial position and velocity. The violet line is the trajectory; the pink marker is the current particle.</p>
            </div>
        </div>
        <div class="simulation-lab__status-grid">
            <div><span>MODEL TIME</span><strong data-role="time">0.000 s</strong></div>
            <div><span>REAL ELAPSED</span><strong data-role="real-time">0.000 s</strong></div>
            <div><span>SPEED MULTIPLIER</span><strong data-role="speed-readout">4×</strong></div>
            <div><span>PERIOD</span><strong data-role="period">Not detected</strong></div>
            <div><span>FREQUENCY</span><strong data-role="frequency">—</strong></div>
            <div><span>STATE</span><strong data-role="status">Ready</strong></div>
        </div>
        <div class="simulation-lab__plot-grid" data-role="plots"></div>
        <p class="simulation-lab__error" data-role="error" role="alert" hidden></p>
    `;
    return wrapper;
}

function optionMarkup(options, selected) {
    return options.map(([value, label]) => `<option value="${escapeHtml(value)}"${value === selected ? ' selected' : ''}>${escapeHtml(label)}</option>`).join('');
}

function makeParameterMarkup(documentRef, parameters) {
    const labels = { alpha: 'α', beta: 'β', mu: 'μ', delta: 'δ', F: 'F', omega: 'ω' };
    const descriptions = { alpha: 'linear stiffness', beta: 'nonlinear stiffness', mu: 'Van der Pol damping', delta: 'linear damping', F: 'forcing amplitude', omega: 'forcing frequency' };
    const root = documentRef.createElement('div');
    root.className = 'simulation-lab__parameter-grid';
    root.innerHTML = PARAMETER_KEYS.map((key) => `
        <label class="simulation-lab__field" title="${descriptions[key]}">${labels[key]}
            <input data-parameter="${key}" type="number" step="0.01" value="${parameters[key]}" inputmode="decimal" aria-label="${labels[key]} coefficient">
        </label>
    `).join('');
    return root;
}

function makePlotControlMarkup(documentRef, config, index) {
    const root = documentRef.createElement('div');
    root.className = 'simulation-lab__plot-control';
    root.dataset.plotIndex = String(index);
    root.innerHTML = `
        <div class="simulation-lab__plot-control-heading"><label><input type="checkbox" data-plot-enabled ${config.enabled ? 'checked' : ''}> Plot ${index + 1}</label><span data-plot-error></span></div>
        <div class="simulation-lab__plot-axis-grid">
            <label>Horizontal
                <select data-plot-axis="x">${optionMarkup([...BUILTIN_VARIABLES, ['custom', 'Custom formula']], config.xMode === 'custom' ? 'custom' : config.x)}</select>
            </label>
            <input class="simulation-lab__formula" data-plot-formula="x" type="text" placeholder="e.g. sin(t) * x" value="${escapeHtml(config.xCustom || '')}" hidden>
            <label>Vertical
                <select data-plot-axis="y">${optionMarkup([...BUILTIN_VARIABLES, ['custom', 'Custom formula']], config.yMode === 'custom' ? 'custom' : config.y)}</select>
            </label>
            <input class="simulation-lab__formula" data-plot-formula="y" type="text" placeholder="e.g. x^2 + v^2" value="${escapeHtml(config.yCustom || '')}" hidden>
        </div>
    `;
    root.querySelector('[data-plot-formula="x"]').hidden = config.xMode !== 'custom';
    root.querySelector('[data-plot-formula="y"]').hidden = config.yMode !== 'custom';
    return root;
}

function getThemeColors(documentRef) {
    return documentRef.documentElement.dataset.theme === 'light' ? COLORS.light : COLORS.dark;
}

function resizeCanvas(canvas) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(canvas.clientWidth, 320);
    const height = Math.max(canvas.clientHeight, 260);
    if (canvas.width !== Math.floor(width * ratio) || canvas.height !== Math.floor(height * ratio)) {
        canvas.width = Math.floor(width * ratio);
        canvas.height = Math.floor(height * ratio);
    }
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, width, height };
}

function drawGrid(context, width, height, colors, padding = { left: 48, right: 18, top: 18, bottom: 34 }) {
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;
    context.clearRect(0, 0, width, height);
    context.strokeStyle = colors.grid;
    context.lineWidth = 1;
    for (let i = 0; i <= 10; i += 1) {
        const x = padding.left + (plotWidth * i) / 10;
        const y = padding.top + (plotHeight * i) / 10;
        context.beginPath(); context.moveTo(x, padding.top); context.lineTo(x, height - padding.bottom); context.stroke();
        context.beginPath(); context.moveTo(padding.left, y); context.lineTo(width - padding.right, y); context.stroke();
    }
    return { plotWidth, plotHeight, padding };
}

function drawLabel(context, value, x, y, colors, align = 'left') {
    context.fillStyle = colors.axis;
    context.font = '10px SFMono-Regular, Consolas, monospace';
    context.textAlign = align;
    context.fillText(value, x, y);
}

function niceBounds(values, fallbackMin, fallbackMax) {
    const finite = values.filter(Number.isFinite);
    if (!finite.length) {
        return [fallbackMin, fallbackMax];
    }
    let min = Math.min(...finite);
    let max = Math.max(...finite);
    if (min === max) {
        const padding = Math.max(Math.abs(min) * 0.2, 1);
        min -= padding;
        max += padding;
    } else {
        const padding = (max - min) * 0.1;
        min -= padding;
        max += padding;
    }
    return [min, max];
}

function formatPeriod(period) {
    return Number.isFinite(period) && period > 0 ? `${formatNumber(period)} s` : 'Not detected';
}

function formatFrequency(period) {
    return Number.isFinite(period) && period > 0 ? `${formatNumber(1 / period)} Hz` : '—';
}

function createPlotCard(documentRef, index) {
    const card = documentRef.createElement('article');
    card.className = 'simulation-lab__plot-card';
    card.dataset.plotCard = String(index);
    card.innerHTML = `
        <div class="simulation-lab__plot-card-heading"><span class="micro-label">LIVE CURVE / ${String(index + 1).padStart(2, '0')}</span><strong data-role="plot-label">t → x</strong></div>
        <canvas data-role="plot-canvas" aria-label="Live variable plot"></canvas>
        <p class="simulation-lab__plot-message" data-role="plot-message" hidden></p>
    `;
    return card;
}

export function createSimulationLab(root) {
    if (!root || root.nodeType !== 1 || typeof root.appendChild !== 'function') {
        throw new TypeError('createSimulationLab(root) requires a DOM element as root.');
    }

    const documentRef = root.ownerDocument || document;
    const windowRef = documentRef.defaultView || window;
    const wrapper = createMarkup(documentRef);
    root.appendChild(wrapper);

    const modelSelect = wrapper.querySelector('[data-role="model"]');
    const forcedSelect = wrapper.querySelector('[data-role="forced"]');
    const dtInput = wrapper.querySelector('[data-role="dt"]');
    const speedInput = wrapper.querySelector('[data-role="speed"]');
    const parametersRoot = wrapper.querySelector('[data-role="parameters"]');
    const plotControlsRoot = wrapper.querySelector('[data-role="plot-controls"]');
    const plotsRoot = wrapper.querySelector('[data-role="plots"]');
    const phaseCanvas = wrapper.querySelector('[data-role="phase-canvas"]');
    const equation = wrapper.querySelector('[data-role="equation"]');
    const initialXInput = wrapper.querySelector('[data-role="initial-x"]');
    const initialVInput = wrapper.querySelector('[data-role="initial-v"]');
    const startButton = wrapper.querySelector('[data-role="start"]');
    const stopButton = wrapper.querySelector('[data-role="stop"]');
    const resetButton = wrapper.querySelector('[data-role="reset"]');
    const lockedControls = wrapper.querySelector('[data-role="locked-controls"]');
    const lockStatus = wrapper.querySelector('[data-role="lock-status"]');
    const errorElement = wrapper.querySelector('[data-role="error"]');
    const phaseReadout = wrapper.querySelector('[data-role="phase-readout"]');
    const timeOutput = wrapper.querySelector('[data-role="time"]');
    const realTimeOutput = wrapper.querySelector('[data-role="real-time"]');
    const speedOutput = wrapper.querySelector('[data-role="speed-readout"]');
    const periodOutput = wrapper.querySelector('[data-role="period"]');
    const frequencyOutput = wrapper.querySelector('[data-role="frequency"]');
    const statusOutput = wrapper.querySelector('[data-role="status"]');

    Object.entries(MODEL_DEFINITIONS).forEach(([key, definition]) => {
        modelSelect.insertAdjacentHTML('beforeend', `<option value="${key}">${escapeHtml(definition.label)}</option>`);
    });

    const state = {
        model: 'duffingVanderpol',
        forced: true,
        parameters: defaultParameters('duffingVanderpol'),
        initial: { x: 0.5, v: 0 },
        current: { x: 0.5, v: 0 },
        time: 0,
        dt: 0.01,
        speed: 4,
        running: false,
        animationFrame: 0,
        frameTime: 0,
        accumulator: 0,
        startedAt: 0,
        realElapsed: 0,
        history: [{ t: 0, x: 0.5, v: 0 }],
        previousSample: null,
        previousPreviousSample: null,
        peaks: [],
        period: null,
        bounds: { ...DEFAULT_BOUNDS },
        plotConfigs: PLOT_DEFAULTS.map((config) => ({ ...config, enabled: true, xMode: config.x, yMode: config.y, xCustom: '', yCustom: '', xEvaluator: null, yEvaluator: null, error: '' })),
        numericalError: ''
    };

    modelSelect.value = state.model;
    parametersRoot.replaceChildren(makeParameterMarkup(documentRef, state.parameters));
    state.plotConfigs.forEach((config, index) => plotControlsRoot.appendChild(makePlotControlMarkup(documentRef, config, index)));
    state.plotConfigs.forEach((_, index) => plotsRoot.appendChild(createPlotCard(documentRef, index)));

    const getNow = () => (windowRef.performance && typeof windowRef.performance.now === 'function'
        ? windowRef.performance.now()
        : Date.now());

    const setError = (message = '') => {
        errorElement.textContent = message;
        errorElement.hidden = !message;
    };

    const currentColors = () => getThemeColors(documentRef);

    const updateEquation = () => {
        const definition = MODEL_DEFINITIONS[state.model];
        const p = state.parameters;
        const force = state.forced ? `${formatNumber(p.F, 2)} cos(${formatNumber(p.omega, 2)}t)` : '0';
        const coefficientLine = state.model === 'vanderpol'
            ? `α=${formatNumber(p.alpha, 2)} · μ=${formatNumber(p.mu, 2)}`
            : `α=${formatNumber(p.alpha, 2)} · β=${formatNumber(p.beta, 2)} · μ=${formatNumber(p.mu, 2)} · δ=${formatNumber(p.delta, 2)}`;
        equation.textContent = `${definition.equation}   |   ${coefficientLine} · F=${formatNumber(p.F, 2)} · ω=${formatNumber(p.omega, 2)} · drive=${force}`;
    };

    const updateReadouts = () => {
        timeOutput.textContent = `${formatNumber(state.time)} s`;
        const realElapsed = state.realElapsed + (state.running ? (getNow() - state.startedAt) / 1000 : 0);
        realTimeOutput.textContent = `${formatNumber(realElapsed)} s`;
        speedOutput.textContent = `${formatNumber(state.speed, 2)}×`;
        periodOutput.textContent = formatPeriod(state.period);
        frequencyOutput.textContent = formatFrequency(state.period);
        statusOutput.textContent = state.numericalError ? 'Numerical error' : state.running ? 'Running' : state.time > 0 ? 'Stopped' : 'Ready';
        phaseReadout.textContent = `Start: (${formatNumber(state.initial.x)}, ${formatNumber(state.initial.v)}) · Now: (${formatNumber(state.current.x)}, ${formatNumber(state.current.v)})`;
    };

    const updateForcedInputs = () => {
        const fInput = parametersRoot.querySelector('[data-parameter="F"]');
        const omegaInput = parametersRoot.querySelector('[data-parameter="omega"]');
        if (fInput) fInput.disabled = !state.forced;
        if (omegaInput) omegaInput.disabled = !state.forced;
    };

    const ensureBounds = (x, v) => {
        const expand = (value, minimumKey, maximumKey) => {
            const span = state.bounds[maximumKey] - state.bounds[minimumKey];
            if (value < state.bounds[minimumKey] + span * 0.05) {
                state.bounds[minimumKey] = value - span * 0.2;
            }
            if (value > state.bounds[maximumKey] - span * 0.05) {
                state.bounds[maximumKey] = value + span * 0.2;
            }
        };
        expand(x, 'xMin', 'xMax');
        expand(v, 'vMin', 'vMax');
    };

    const resetBounds = () => {
        state.bounds = { ...DEFAULT_BOUNDS };
        ensureBounds(state.initial.x, state.initial.v);
    };

    const resetHistory = () => {
        state.time = 0;
        state.current = { ...state.initial };
        state.history = [{ t: 0, x: state.current.x, v: state.current.v }];
        state.previousSample = null;
        state.previousPreviousSample = null;
        state.peaks = [];
        state.period = null;
        state.numericalError = '';
        state.accumulator = 0;
        resetBounds();
        setError('');
        updateReadouts();
    };

    const compilePlot = (config, index) => {
        try {
            config.xEvaluator = config.xMode === 'custom'
                ? compileFormula(config.xCustom)
                : (context) => context[config.xMode];
            config.yEvaluator = config.yMode === 'custom'
                ? compileFormula(config.yCustom)
                : (context) => context[config.yMode];
            config.error = '';
        } catch (compileError) {
            config.xEvaluator = null;
            config.yEvaluator = null;
            config.error = compileError.message;
        }
        const control = plotControlsRoot.querySelector(`[data-plot-index="${index}"]`);
        const error = control?.querySelector('[data-plot-error]');
        if (error) error.textContent = config.error;
    };

    const readPlotConfig = (index) => {
        const config = state.plotConfigs[index];
        const control = plotControlsRoot.querySelector(`[data-plot-index="${index}"]`);
        if (!control) return;
        const xSelect = control.querySelector('[data-plot-axis="x"]');
        const ySelect = control.querySelector('[data-plot-axis="y"]');
        config.enabled = control.querySelector('[data-plot-enabled]').checked;
        config.xMode = xSelect.value;
        config.yMode = ySelect.value;
        config.xCustom = control.querySelector('[data-plot-formula="x"]').value;
        config.yCustom = control.querySelector('[data-plot-formula="y"]').value;
        control.querySelector('[data-plot-formula="x"]').hidden = config.xMode !== 'custom';
        control.querySelector('[data-plot-formula="y"]').hidden = config.yMode !== 'custom';
        compilePlot(config, index);
    };

    const contextForSample = (sample) => buildVariableContext(
        state.model,
        { x: sample.x, v: sample.v },
        sample.t,
        state.parameters,
        state.forced
    );

    const drawPhase = () => {
        const { context, width, height } = resizeCanvas(phaseCanvas);
        const colors = currentColors();
        const chart = drawGrid(context, width, height, colors);
        const { padding, plotWidth, plotHeight } = chart;
        const toCanvas = (x, v) => ({
            x: padding.left + ((x - state.bounds.xMin) / (state.bounds.xMax - state.bounds.xMin)) * plotWidth,
            y: height - padding.bottom - ((v - state.bounds.vMin) / (state.bounds.vMax - state.bounds.vMin)) * plotHeight
        });
        const zeroX = toCanvas(0, 0).x;
        const zeroY = toCanvas(0, 0).y;
        context.strokeStyle = colors.axis;
        context.globalAlpha = 0.45;
        context.beginPath(); context.moveTo(zeroX, padding.top); context.lineTo(zeroX, height - padding.bottom); context.stroke();
        context.beginPath(); context.moveTo(padding.left, zeroY); context.lineTo(width - padding.right, zeroY); context.stroke();
        context.globalAlpha = 1;
        drawLabel(context, formatNumber(state.bounds.xMin, 1), padding.left, height - 10, colors);
        drawLabel(context, formatNumber(state.bounds.xMax, 1), width - padding.right, height - 10, colors, 'right');
        drawLabel(context, formatNumber(state.bounds.vMax, 1), padding.left - 8, padding.top + 4, colors, 'right');
        drawLabel(context, formatNumber(state.bounds.vMin, 1), padding.left - 8, height - padding.bottom, colors, 'right');
        drawLabel(context, 'x', width - padding.right, height - 10, colors, 'right');
        drawLabel(context, 'dx/dt', padding.left, padding.top - 5, colors);

        if (state.history.length > 1) {
            context.strokeStyle = colors.trajectory;
            context.lineWidth = 2;
            context.shadowColor = colors.trajectory;
            context.shadowBlur = 7;
            context.beginPath();
            state.history.forEach((sample, index) => {
                const point = toCanvas(sample.x, sample.v);
                if (index === 0) context.moveTo(point.x, point.y);
                else context.lineTo(point.x, point.y);
            });
            context.stroke();
            context.shadowBlur = 0;
        }

        const start = toCanvas(state.initial.x, state.initial.v);
        context.fillStyle = colors.start;
        context.beginPath(); context.arc(start.x, start.y, 4, 0, Math.PI * 2); context.fill();
        context.strokeStyle = colors.start;
        context.lineWidth = 1;
        context.beginPath(); context.arc(start.x, start.y, 8, 0, Math.PI * 2); context.stroke();

        const particle = toCanvas(state.current.x, state.current.v);
        context.fillStyle = colors.particle;
        context.shadowColor = colors.particle;
        context.shadowBlur = 14;
        context.beginPath(); context.arc(particle.x, particle.y, 5.5, 0, Math.PI * 2); context.fill();
        context.shadowBlur = 0;
    };

    const drawPlot = (index) => {
        const config = state.plotConfigs[index];
        const card = plotsRoot.querySelector(`[data-plot-card="${index}"]`);
        const label = card.querySelector('[data-role="plot-label"]');
        const message = card.querySelector('[data-role="plot-message"]');
        const canvas = card.querySelector('[data-role="plot-canvas"]');
        const xLabel = config.xMode === 'custom' ? config.xCustom || 'custom' : config.xMode;
        const yLabel = config.yMode === 'custom' ? config.yCustom || 'custom' : config.yMode;
        label.textContent = `${xLabel} → ${yLabel}`;
        canvas.hidden = !config.enabled;
        message.hidden = config.enabled;
        if (!config.enabled) {
            message.textContent = 'Plot disabled.';
            return;
        }
        if (config.error || !config.xEvaluator || !config.yEvaluator) {
            message.textContent = config.error || 'Enter valid formulas for both axes.';
            return;
        }
        const samples = [];
        state.history.forEach((sample) => {
            const context = contextForSample(sample);
            const x = config.xEvaluator(context);
            const y = config.yEvaluator(context);
            if (Number.isFinite(x) && Number.isFinite(y)) samples.push({ x, y });
        });
        if (!samples.length) {
            message.textContent = 'No finite values to plot.';
            return;
        }
        message.hidden = true;
        const { context, width, height } = resizeCanvas(canvas);
        const colors = currentColors();
        const chart = drawGrid(context, width, height, colors, { left: 50, right: 18, top: 18, bottom: 32 });
        const xBounds = niceBounds(samples.map((sample) => sample.x), -1, 1);
        const yBounds = niceBounds(samples.map((sample) => sample.y), -1, 1);
        const { padding, plotWidth, plotHeight } = chart;
        const toCanvas = (x, y) => ({
            x: padding.left + ((x - xBounds[0]) / (xBounds[1] - xBounds[0])) * plotWidth,
            y: height - padding.bottom - ((y - yBounds[0]) / (yBounds[1] - yBounds[0])) * plotHeight
        });
        drawLabel(context, formatNumber(xBounds[0], 1), padding.left, height - 9, colors);
        drawLabel(context, formatNumber(xBounds[1], 1), width - padding.right, height - 9, colors, 'right');
        drawLabel(context, formatNumber(yBounds[1], 1), padding.left - 8, padding.top + 4, colors, 'right');
        drawLabel(context, formatNumber(yBounds[0], 1), padding.left - 8, height - padding.bottom, colors, 'right');
        context.strokeStyle = colors.curve[index];
        context.lineWidth = 1.8;
        context.shadowColor = colors.curve[index];
        context.shadowBlur = 5;
        context.beginPath();
        samples.forEach((sample, sampleIndex) => {
            const point = toCanvas(sample.x, sample.y);
            if (sampleIndex === 0) context.moveTo(point.x, point.y);
            else context.lineTo(point.x, point.y);
        });
        context.stroke();
        context.shadowBlur = 0;
        const latest = toCanvas(samples.at(-1).x, samples.at(-1).y);
        context.fillStyle = colors.particle;
        context.beginPath(); context.arc(latest.x, latest.y, 3.5, 0, Math.PI * 2); context.fill();
    };

    const renderAll = () => {
        drawPhase();
        state.plotConfigs.forEach((_, index) => drawPlot(index));
        updateReadouts();
    };

    const lockInterface = (running) => {
        state.running = running;
        lockedControls.disabled = running;
        startButton.disabled = running;
        stopButton.disabled = !running;
        resetButton.disabled = running;
        phaseCanvas.tabIndex = running ? -1 : 0;
        phaseCanvas.setAttribute('aria-disabled', String(running));
        if (running && documentRef.activeElement === phaseCanvas) phaseCanvas.blur();
        wrapper.classList.toggle('is-running', running);
        lockStatus.textContent = running
            ? 'Simulation running — all controls are locked. Stop simulation to edit.'
            : 'Simulation stopped. Controls are unlocked.';
        if (running) {
            statusOutput.textContent = 'Running';
        }
    };

    const stopSimulation = (message = 'Simulation stopped.') => {
        if (!state.running && !state.animationFrame) return;
        if (state.animationFrame) windowRef.cancelAnimationFrame(state.animationFrame);
        state.animationFrame = 0;
        if (state.running) state.realElapsed += (getNow() - state.startedAt) / 1000;
        lockInterface(false);
        updateReadouts();
        if (message) lockStatus.textContent = message;
        renderAll();
    };

    const recordSample = () => {
        const sample = { t: state.time, x: state.current.x, v: state.current.v };
        state.history.push(sample);
        if (state.history.length > MAX_HISTORY) state.history.splice(0, state.history.length - MAX_HISTORY);
        const before = state.history.at(-3);
        const peak = state.history.at(-2);
        const after = state.history.at(-1);
        state.previousPreviousSample = before || null;
        state.previousSample = peak || null;
        if (before && peak && after && peak.x > before.x && peak.x >= after.x && peak.x > 0) {
            state.peaks.push(peak.t);
            if (state.peaks.length > MAX_PEAKS) state.peaks.shift();
            const intervals = state.peaks.slice(1).map((time, index) => time - state.peaks[index]).filter((interval) => interval > state.dt * 2);
            if (intervals.length) state.period = intervals.slice(-5).reduce((sum, interval) => sum + interval, 0) / Math.min(intervals.length, 5);
        }
    };

    const advanceOneStep = () => {
        const next = rk4Step(state.model, state.current, state.time, state.dt, state.parameters, state.forced);
        state.time += state.dt;
        state.current = next;
        if (!Number.isFinite(next.x) || !Number.isFinite(next.v) || Math.abs(next.x) > 1e7 || Math.abs(next.v) > 1e7) {
            state.numericalError = 'The numerical solution became unstable. Reduce dt or adjust the coefficients, then reset.';
            stopSimulation(state.numericalError);
            return false;
        }
        ensureBounds(next.x, next.v);
        recordSample();
        return true;
    };

    const frame = (now) => {
        if (!state.running) return;
        const wallDelta = Math.min(Math.max((now - state.frameTime) / 1000, 0), 0.1);
        state.frameTime = now;
        state.accumulator += wallDelta * state.speed;
        let steps = 0;
        while (state.accumulator >= state.dt && steps < 2500 && state.running) {
            state.accumulator -= state.dt;
            if (!advanceOneStep()) return;
            steps += 1;
        }
        renderAll();
        state.animationFrame = windowRef.requestAnimationFrame(frame);
    };

    const startSimulation = () => {
        if (state.running) return;
        state.numericalError = '';
        state.startedAt = getNow();
        state.frameTime = state.startedAt;
        state.accumulator = 0;
        lockInterface(true);
        state.animationFrame = windowRef.requestAnimationFrame(frame);
        renderAll();
    };

    const readInitialPoint = () => {
        const x = Number(initialXInput.value);
        const v = Number(initialVInput.value);
        if (!Number.isFinite(x) || !Number.isFinite(v)) {
            setError('Initial x and dx/dt must be finite numbers.');
            return false;
        }
        state.initial = { x, v };
        resetHistory();
        return true;
    };

    const bindParameterInputs = () => {
        parametersRoot.querySelectorAll('[data-parameter]').forEach((input) => {
            input.addEventListener('change', () => {
                const key = input.dataset.parameter;
                const value = Number(input.value);
                if (!Number.isFinite(value)) {
                    input.value = state.parameters[key];
                    setError(`${key} must be a finite number.`);
                    return;
                }
                state.parameters[key] = value;
                updateEquation();
                resetHistory();
                setError('');
            });
        });
    };

    const applyModel = () => {
        state.model = modelSelect.value;
        state.parameters = defaultParameters(state.model);
        parametersRoot.replaceChildren(makeParameterMarkup(documentRef, state.parameters));
        bindParameterInputs();
        updateForcedInputs();
        updateEquation();
        resetHistory();
    };

    const updatePlotFromControl = (event) => {
        const control = event.target.closest('[data-plot-index]');
        if (!control) return;
        const index = Number(control.dataset.plotIndex);
        readPlotConfig(index);
        renderAll();
    };

    const phasePointFromEvent = (event) => {
        const rect = phaseCanvas.getBoundingClientRect();
        const width = Math.max(rect.width, 320);
        const height = Math.max(rect.height, 260);
        const padding = { left: 48, right: 18, top: 18, bottom: 34 };
        const x = state.bounds.xMin + ((event.clientX - rect.left - padding.left) / (width - padding.left - padding.right)) * (state.bounds.xMax - state.bounds.xMin);
        const v = state.bounds.vMax - ((event.clientY - rect.top - padding.top) / (height - padding.top - padding.bottom)) * (state.bounds.vMax - state.bounds.vMin);
        return { x: clamp(x, -100, 100), v: clamp(v, -100, 100) };
    };

    modelSelect.addEventListener('change', applyModel);
    forcedSelect.addEventListener('change', () => {
        state.forced = forcedSelect.value === 'true';
        updateForcedInputs();
        updateEquation();
        resetHistory();
    });
    dtInput.addEventListener('change', () => {
        const value = Number(dtInput.value);
        if (!Number.isFinite(value) || value <= 0 || value > 0.25) {
            dtInput.value = state.dt;
            setError('dt must be greater than 0 and no larger than 0.25.');
            return;
        }
        state.dt = value;
        resetHistory();
        setError('');
    });
    speedInput.addEventListener('change', () => {
        const value = Number(speedInput.value);
        if (!Number.isFinite(value) || value < 0.25 || value > 20) {
            speedInput.value = state.speed;
            setError('Speed must be between 0.25× and 20×.');
            return;
        }
        state.speed = value;
        setError('');
        renderAll();
    });
    initialXInput.addEventListener('change', readInitialPoint);
    initialVInput.addEventListener('change', readInitialPoint);
    startButton.addEventListener('click', startSimulation);
    stopButton.addEventListener('click', () => stopSimulation());
    resetButton.addEventListener('click', () => {
        state.realElapsed = 0;
        resetHistory();
        lockStatus.textContent = 'Simulation ready.';
        renderAll();
    });
    plotControlsRoot.addEventListener('change', updatePlotFromControl);
    plotControlsRoot.addEventListener('input', updatePlotFromControl);
    phaseCanvas.addEventListener('click', (event) => {
        if (state.running) return;
        const point = phasePointFromEvent(event);
        state.initial = point;
        initialXInput.value = point.x.toFixed(3);
        initialVInput.value = point.v.toFixed(3);
        resetHistory();
        lockStatus.textContent = 'Starting point updated from phase diagram.';
        renderAll();
    });
    wrapper.addEventListener('click', (event) => {
        if (state.running && !event.target.closest('[data-role="stop"]')) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, true);

    bindParameterInputs();
    state.plotConfigs.forEach((config, index) => compilePlot(config, index));
    updateForcedInputs();
    updateEquation();
    resetHistory();
    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => renderAll());
        observer.observe(wrapper);
    } else {
        windowRef.addEventListener('resize', renderAll, { passive: true });
    }
    renderAll();

    return {
        stop: stopSimulation,
        reset: resetHistory
    };
}
