import * as THREE from 'three';

import './neural.css';

const INPUT_VALUES = Object.freeze([0.72, -0.36, 0.55]);
const TARGET_VALUE = 0.68;
const LEARNING_RATE = 0.08;

const INITIAL_PARAMETERS = Object.freeze({
    hiddenWeights: Object.freeze([
        Object.freeze([0.9, -0.4, 0.7]),
        Object.freeze([-0.6, 0.8, 0.2]),
        Object.freeze([0.45, 0.55, -0.75]),
        Object.freeze([-0.5, -0.3, 0.85])
    ]),
    hiddenBiases: Object.freeze([0.05, -0.1, 0.12, -0.08]),
    outputWeights: Object.freeze([0.48, -0.7, 0.6, 0.58]),
    outputBias: -0.16
});

const PHASES = Object.freeze([
    Object.freeze({ label: 'Forward · inputs', direction: 'forward' }),
    Object.freeze({ label: 'Forward · hidden layer', direction: 'forward' }),
    Object.freeze({ label: 'Forward · output', direction: 'forward' }),
    Object.freeze({ label: 'Forward · loss', direction: 'forward' }),
    Object.freeze({ label: 'Backward · loss gradient', direction: 'backward' }),
    Object.freeze({ label: 'Backward · output gradients', direction: 'backward' }),
    Object.freeze({ label: 'Backward · hidden gradients', direction: 'backward' }),
    Object.freeze({ label: 'Backward · parameter update', direction: 'backward' })
]);

const NODE_ORDER = Object.freeze([
    'input-0',
    'input-1',
    'input-2',
    'hidden-0',
    'hidden-1',
    'hidden-2',
    'hidden-3',
    'output-0',
    'loss-0'
]);

const NODE_LABELS = Object.freeze({
    'input-0': 'x₁',
    'input-1': 'x₂',
    'input-2': 'x₃',
    'hidden-0': 'h₁',
    'hidden-1': 'h₂',
    'hidden-2': 'h₃',
    'hidden-3': 'h₄',
    'output-0': 'ŷ',
    'loss-0': 'L'
});

function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
}

function formatNumber(value, digits = 3) {
    const safeValue = Number.isFinite(value) ? value : 0;
    const normalized = Math.abs(safeValue) < 0.0005 ? 0 : safeValue;
    return normalized.toFixed(digits);
}

function formatSigned(value, digits = 3) {
    const safeValue = Number.isFinite(value) ? value : 0;
    return `${safeValue >= 0 ? '+' : ''}${formatNumber(safeValue, digits)}`;
}

function formatVector(values, digits = 3) {
    return `[ ${values.map((value) => formatNumber(value, digits)).join(', ')} ]`;
}

function formatSignedVector(values, digits = 3) {
    return `[ ${values.map((value) => formatSigned(value, digits)).join(', ')} ]`;
}

function dot(left, right) {
    return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function relu(value) {
    return Math.max(0, value);
}

function sigmoid(value) {
    if (value >= 0) {
        const exponential = Math.exp(-value);
        return 1 / (1 + exponential);
    }
    const exponential = Math.exp(value);
    return exponential / (1 + exponential);
}

function cloneParameters(parameters = INITIAL_PARAMETERS) {
    return {
        hiddenWeights: parameters.hiddenWeights.map((row) => row.slice()),
        hiddenBiases: parameters.hiddenBiases.slice(),
        outputWeights: parameters.outputWeights.slice(),
        outputBias: parameters.outputBias
    };
}

function forwardPass(parameters) {
    const hiddenZ = parameters.hiddenWeights.map((weights, index) => (
        dot(weights, INPUT_VALUES) + parameters.hiddenBiases[index]
    ));
    const hiddenA = hiddenZ.map(relu);
    const outputZ = dot(parameters.outputWeights, hiddenA) + parameters.outputBias;
    const outputA = sigmoid(outputZ);
    const loss = 0.5 * (outputA - TARGET_VALUE) ** 2;

    return {
        hiddenZ,
        hiddenA,
        outputZ,
        outputA,
        loss
    };
}

function backwardPass(parameters, forward) {
    const outputActivationGradient = forward.outputA - TARGET_VALUE;
    const outputActivationDerivative = forward.outputA * (1 - forward.outputA);
    const outputDelta = outputActivationGradient * outputActivationDerivative;
    const outputWeightGradients = forward.hiddenA.map((activation) => outputDelta * activation);
    const hiddenActivationGradients = parameters.outputWeights.map((weight) => weight * outputDelta);
    const hiddenDeltas = forward.hiddenZ.map((z, index) => (
        hiddenActivationGradients[index] * (z > 0 ? 1 : 0)
    ));
    const hiddenWeightGradients = hiddenDeltas.map((delta) => (
        INPUT_VALUES.map((input) => delta * input)
    ));
    const inputGradients = INPUT_VALUES.map((unusedInput, inputIndex) => (
        hiddenDeltas.reduce(
            (sum, delta, hiddenIndex) => sum + delta * parameters.hiddenWeights[hiddenIndex][inputIndex],
            0
        )
    ));

    return {
        outputActivationGradient,
        outputDelta,
        outputWeightGradients,
        outputBiasGradient: outputDelta,
        hiddenActivationGradients,
        hiddenDeltas,
        hiddenWeightGradients,
        hiddenBiasGradients: hiddenDeltas.slice(),
        inputGradients
    };
}

function createMarkup(documentRef) {
    const wrapper = documentRef.createElement('section');
    wrapper.className = 'neural-lab';
    wrapper.setAttribute('aria-label', 'Interactive deep-learning visualization');
    wrapper.innerHTML = `
        <header class="neural-lab__header">
            <div>
                <p class="neural-lab__eyebrow">Interactive deep-learning study</p>
                <h2 class="neural-lab__title">Neural Lab <span>01</span></h2>
                <p class="neural-lab__intro">
                    Trace one sample through a multilayer perceptron, inspect every perceptron calculation, and watch gradients travel back to the weights.
                </p>
            </div>
            <div class="neural-lab__status" data-role="status" data-state="ready">READY</div>
        </header>
        <div class="neural-lab__toolbar" role="toolbar" aria-label="Neural network playback controls">
            <div class="neural-lab__toolbar-group">
                <button class="neural-lab__button neural-lab__button--forward" type="button" data-action="forward-play" aria-pressed="false">▶ Forward play</button>
                <button class="neural-lab__button neural-lab__button--backward" type="button" data-action="backward-play" aria-pressed="false">◀ Backward play</button>
            </div>
            <div class="neural-lab__toolbar-group">
                <button class="neural-lab__button" type="button" data-action="forward-step">Step →</button>
                <button class="neural-lab__button" type="button" data-action="backward-step">← Step</button>
                <button class="neural-lab__button neural-lab__button--quiet" type="button" data-action="pause">Pause</button>
                <button class="neural-lab__button neural-lab__button--quiet" type="button" data-action="reset">Reset</button>
            </div>
            <span class="neural-lab__toolbar-hint">Click a neuron to inspect its computation · Space pauses</span>
        </div>
        <div class="neural-lab__content">
            <div class="neural-lab__viewport">
                <canvas class="neural-lab__canvas" tabindex="0" data-role="canvas" aria-label="Three-dimensional multilayer perceptron. Click a neuron to inspect it."></canvas>
                <div class="neural-lab__layer-labels" aria-hidden="true">
                    <span>INPUT <small>3 features</small></span>
                    <span>HIDDEN <small>ReLU × 4</small></span>
                    <span>OUTPUT <small>sigmoid</small></span>
                    <span>LOSS <small>MSE</small></span>
                </div>
                <div class="neural-lab__fallback" data-role="fallback" hidden>
                    <div class="neural-lab__fallback-card">
                        <h3 class="neural-lab__fallback-title">3D preview unavailable</h3>
                        <p class="neural-lab__fallback-copy" data-role="fallback-copy">WebGL could not be initialized in this browser or device. The live forward and backward calculation panel is still available.</p>
                    </div>
                </div>
                <div class="neural-lab__legend" aria-hidden="true">
                    <span><i class="neural-lab__legend-dot neural-lab__legend-dot--positive"></i> positive weight</span>
                    <span><i class="neural-lab__legend-dot neural-lab__legend-dot--negative"></i> negative weight</span>
                    <span><i class="neural-lab__legend-dot neural-lab__legend-dot--selected"></i> selected path</span>
                </div>
            </div>
            <aside class="neural-lab__panel" aria-label="Selected perceptron calculations">
                <div class="neural-lab__panel-header">
                    <div>
                        <p class="neural-lab__panel-kicker">Read-only trace</p>
                        <h3 class="neural-lab__panel-title">Perceptron inspector</h3>
                    </div>
                    <span class="neural-lab__selected" data-role="selected">h₂ · hidden</span>
                </div>
                <div class="neural-lab__selector" role="group" aria-label="Select a perceptron">
                    <button type="button" data-neuron="input-0">x₁</button>
                    <button type="button" data-neuron="input-1">x₂</button>
                    <button type="button" data-neuron="input-2">x₃</button>
                    <button type="button" data-neuron="hidden-0">h₁</button>
                    <button type="button" data-neuron="hidden-1" aria-pressed="true">h₂</button>
                    <button type="button" data-neuron="hidden-2">h₃</button>
                    <button type="button" data-neuron="hidden-3">h₄</button>
                    <button type="button" data-neuron="output-0">ŷ</button>
                    <button type="button" data-neuron="loss-0">L</button>
                </div>
                <div class="neural-lab__phase" data-role="phase" aria-live="polite">Step 1 / 8 · Forward · inputs</div>
                <div class="neural-lab__readout-scroll">
                    <section class="neural-lab__readout-card neural-lab__readout-card--forward">
                        <div class="neural-lab__readout-card-header"><h4>Forward computation</h4><span>f(x)</span></div>
                        <dl class="neural-lab__readout-list">
                            <div><dt>inputs x</dt><dd data-readout="inputs"></dd></div>
                            <div><dt>weights w</dt><dd data-readout="weights"></dd></div>
                            <div><dt>products x · w</dt><dd data-readout="products"></dd></div>
                            <div><dt>bias b</dt><dd data-readout="bias"></dd></div>
                            <div><dt>z = Σ(x · w) + b</dt><dd data-readout="z"></dd></div>
                            <div><dt>activation a</dt><dd class="neural-lab__value--accent" data-readout="activation"></dd></div>
                        </dl>
                    </section>
                    <section class="neural-lab__readout-card neural-lab__readout-card--backward">
                        <div class="neural-lab__readout-card-header"><h4>Backward computation</h4><span>∂L</span></div>
                        <dl class="neural-lab__readout-list">
                            <div><dt>gradient ∂L / ∂a</dt><dd data-readout="gradient"></dd></div>
                            <div><dt>local gradient δ</dt><dd data-readout="delta"></dd></div>
                            <div><dt>weight gradients ∂L / ∂w</dt><dd data-readout="weight-gradients"></dd></div>
                            <div><dt>bias gradient ∂L / ∂b</dt><dd data-readout="bias-gradient"></dd></div>
                            <div><dt>updates −η · gradient</dt><dd class="neural-lab__value--accent" data-readout="updates"></dd></div>
                        </dl>
                    </section>
                    <section class="neural-lab__readout-card neural-lab__readout-card--wide">
                        <div class="neural-lab__readout-card-header"><h4>Network snapshot</h4><span>η = ${formatNumber(LEARNING_RATE, 2)}</span></div>
                        <pre class="neural-lab__network-summary" data-role="network-summary"></pre>
                    </section>
                </div>
                <p class="neural-lab__panel-note" data-role="motion-note">Pulses are live · click nodes or use the selector above</p>
            </aside>
        </div>
    `;
    return wrapper;
}

function addListener(target, type, handler, options, cleanupTasks) {
    target.addEventListener(type, handler, options);
    cleanupTasks.push(() => target.removeEventListener(type, handler, options));
}

function createCylinderBetween(start, end, radius, material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), material);
    mesh.userData.axis = new THREE.Vector3(0, 1, 0);
    mesh.userData.direction = new THREE.Vector3();
    mesh.userData.midpoint = new THREE.Vector3();
    mesh.userData.radius = radius;
    updateCylinderBetween(mesh, start, end);
    return mesh;
}

function updateCylinderBetween(mesh, start, end) {
    const { direction, midpoint, axis, radius } = mesh.userData;
    direction.subVectors(end, start);
    const length = Math.max(direction.length(), 0.0001);
    midpoint.addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(midpoint);
    mesh.scale.set(radius, length, radius);
    direction.normalize();
    mesh.quaternion.setFromUnitVectors(axis, direction);
}

function disposeObject(root) {
    root.traverse((object) => {
        if (object.geometry) {
            object.geometry.dispose();
        }
        if (object.material) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            materials.forEach((material) => {
                if (material.map) {
                    material.map.dispose();
                }
                material.dispose();
            });
        }
    });
}

export function createNeuralLab(root) {
    if (!root || root.nodeType !== 1 || typeof root.appendChild !== 'function') {
        throw new TypeError('createNeuralLab(root) requires a DOM element as root.');
    }

    const documentRef = root.ownerDocument || (typeof document !== 'undefined' ? document : null);
    const windowRef = documentRef && documentRef.defaultView
        ? documentRef.defaultView
        : (typeof window !== 'undefined' ? window : null);
    if (!documentRef) {
        throw new TypeError('createNeuralLab(root) requires a document-backed DOM element.');
    }

    const wrapper = createMarkup(documentRef);
    root.appendChild(wrapper);

    const canvas = wrapper.querySelector('[data-role="canvas"]');
    const fallback = wrapper.querySelector('[data-role="fallback"]');
    const fallbackCopy = wrapper.querySelector('[data-role="fallback-copy"]');
    const status = wrapper.querySelector('[data-role="status"]');
    const pauseButton = wrapper.querySelector('[data-action="pause"]');
    const motionNote = wrapper.querySelector('[data-role="motion-note"]');
    const selectedOutput = wrapper.querySelector('[data-role="selected"]');
    const phaseOutput = wrapper.querySelector('[data-role="phase"]');
    const networkSummary = wrapper.querySelector('[data-role="network-summary"]');
    const outputs = {
        inputs: wrapper.querySelector('[data-readout="inputs"]'),
        weights: wrapper.querySelector('[data-readout="weights"]'),
        products: wrapper.querySelector('[data-readout="products"]'),
        bias: wrapper.querySelector('[data-readout="bias"]'),
        z: wrapper.querySelector('[data-readout="z"]'),
        activation: wrapper.querySelector('[data-readout="activation"]'),
        gradient: wrapper.querySelector('[data-readout="gradient"]'),
        delta: wrapper.querySelector('[data-readout="delta"]'),
        weightGradients: wrapper.querySelector('[data-readout="weight-gradients"]'),
        biasGradient: wrapper.querySelector('[data-readout="bias-gradient"]'),
        updates: wrapper.querySelector('[data-readout="updates"]')
    };
    const selectorButtons = Array.from(wrapper.querySelectorAll('[data-neuron]'));
    const cleanupTasks = [];
    const state = {
        parameters: cloneParameters(),
        selectedId: 'hidden-1',
        phaseIndex: 0,
        playDirection: 'forward',
        playing: false,
        hasStarted: false,
        reducedMotion: Boolean(
            windowRef
            && windowRef.matchMedia
            && windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches
        ),
        lastUpdate: null,
        disposed: false
    };

    let renderer = null;
    let scene = null;
    let camera = null;
    let stage = null;
    let animationFrame = 0;
    let resizeObserver = null;
    let lastFrameTime = 0;
    let lastStepTime = 0;
    let raycaster = null;
    let pointer = null;
    let pointerDown = null;
    const nodeVisuals = new Map();
    const hitAreas = [];
    const edgeVisuals = [];

    const getForward = () => forwardPass(state.parameters);
    const getBackward = (forward = getForward()) => backwardPass(state.parameters, forward);

    const setStatus = (label, stateName) => {
        status.textContent = label;
        status.dataset.state = stateName;
        pauseButton.textContent = state.playing ? 'Pause' : (state.hasStarted ? 'Resume' : 'Pause');
        pauseButton.setAttribute('aria-pressed', String(state.playing));
        wrapper.querySelector('[data-action="forward-play"]').setAttribute(
            'aria-pressed',
            String(state.playing && state.playDirection === 'forward')
        );
        wrapper.querySelector('[data-action="backward-play"]').setAttribute(
            'aria-pressed',
            String(state.playing && state.playDirection === 'backward')
        );
    };

    const setReadyStatus = () => {
        setStatus(renderer ? 'READY' : 'WEBGL UNAVAILABLE', renderer ? 'ready' : 'fallback');
    };

    const updateSelector = () => {
        selectorButtons.forEach((button) => {
            const selected = button.dataset.neuron === state.selectedId;
            button.setAttribute('aria-pressed', String(selected));
            button.dataset.selected = String(selected);
        });
    };

    const selectedParts = () => {
        const [layer, indexText] = state.selectedId.split('-');
        return { layer, index: Number(indexText) };
    };

    const selectedName = () => {
        const { layer, index } = selectedParts();
        if (layer === 'input') {
            return `${NODE_LABELS[state.selectedId]} · input`;
        }
        if (layer === 'hidden') {
            return `${NODE_LABELS[state.selectedId]} · hidden[${index + 1}]`;
        }
        if (layer === 'output') {
            return 'ŷ · output';
        }
        return 'L · loss';
    };

    const selectedForwardAndBackward = () => {
        const forward = getForward();
        const backward = getBackward(forward);
        const { layer, index } = selectedParts();
        if (layer === 'input') {
            return {
                inputs: `x${index + 1} = ${formatNumber(INPUT_VALUES[index])}`,
                weights: 'input feature',
                products: 'routed to hidden layer',
                bias: '—',
                z: '—',
                activation: formatNumber(INPUT_VALUES[index]),
                gradient: formatNumber(backward.inputGradients[index]),
                delta: '—',
                weightGradients: '—',
                biasGradient: '—',
                updates: '—'
            };
        }
        if (layer === 'hidden') {
            const weights = state.parameters.hiddenWeights[index];
            const products = weights.map((weight, inputIndex) => INPUT_VALUES[inputIndex] * weight);
            const updates = state.lastUpdate
                ? state.lastUpdate.hiddenWeights[index]
                : backward.hiddenWeightGradients[index].map((gradient) => -LEARNING_RATE * gradient);
            return {
                inputs: formatVector(INPUT_VALUES),
                weights: formatVector(weights),
                products: products.map((product, inputIndex) => (
                    `x${inputIndex + 1} · w${inputIndex + 1}: ${formatNumber(INPUT_VALUES[inputIndex])} × ${formatNumber(weights[inputIndex])} = ${formatNumber(product)}`
                )).join('\n'),
                bias: formatNumber(state.parameters.hiddenBiases[index]),
                z: formatNumber(forward.hiddenZ[index]),
                activation: `ReLU(z) = ${formatNumber(forward.hiddenA[index])}`,
                gradient: formatNumber(backward.hiddenActivationGradients[index]),
                delta: formatNumber(backward.hiddenDeltas[index]),
                weightGradients: formatSignedVector(backward.hiddenWeightGradients[index]),
                biasGradient: formatSigned(backward.hiddenBiasGradients[index]),
                updates: `${formatSignedVector(updates)}\nΔb ${formatSigned(-LEARNING_RATE * backward.hiddenBiasGradients[index])}`
            };
        }
        if (layer === 'output') {
            const products = forward.hiddenA.map((activation, hiddenIndex) => (
                activation * state.parameters.outputWeights[hiddenIndex]
            ));
            const updates = state.lastUpdate
                ? state.lastUpdate.outputWeights
                : backward.outputWeightGradients.map((gradient) => -LEARNING_RATE * gradient);
            return {
                inputs: formatVector(forward.hiddenA),
                weights: formatVector(state.parameters.outputWeights),
                products: products.map((product, hiddenIndex) => (
                    `h${hiddenIndex + 1} · w${hiddenIndex + 1}: ${formatNumber(forward.hiddenA[hiddenIndex])} × ${formatNumber(state.parameters.outputWeights[hiddenIndex])} = ${formatNumber(product)}`
                )).join('\n'),
                bias: formatNumber(state.parameters.outputBias),
                z: formatNumber(forward.outputZ),
                activation: `σ(z) = ${formatNumber(forward.outputA)}`,
                gradient: formatNumber(backward.outputActivationGradient),
                delta: formatNumber(backward.outputDelta),
                weightGradients: formatSignedVector(backward.outputWeightGradients),
                biasGradient: formatSigned(backward.outputBiasGradient),
                updates: `${formatSignedVector(updates)}\nΔb ${formatSigned(-LEARNING_RATE * backward.outputBiasGradient)}`
            };
        }

        return {
            inputs: `ŷ = ${formatNumber(forward.outputA)}\ntarget = ${formatNumber(TARGET_VALUE)}`,
            weights: 'loss has no weights',
            products: '—',
            bias: '—',
            z: '—',
            activation: `L = ${formatNumber(forward.loss)}`,
            gradient: formatNumber(backward.outputActivationGradient),
            delta: 'dL / dŷ',
            weightGradients: '—',
            biasGradient: '—',
            updates: '—'
        };
    };

    const updateReadouts = () => {
        const forward = getForward();
        const selected = selectedForwardAndBackward();
        const phase = PHASES[state.phaseIndex];
        selectedOutput.textContent = selectedName();
        phaseOutput.textContent = `Step ${state.phaseIndex + 1} / ${PHASES.length} · ${phase.label}`;
        outputs.inputs.textContent = selected.inputs;
        outputs.weights.textContent = selected.weights;
        outputs.products.textContent = selected.products;
        outputs.bias.textContent = selected.bias;
        outputs.z.textContent = selected.z;
        outputs.activation.textContent = selected.activation;
        outputs.gradient.textContent = selected.gradient;
        outputs.delta.textContent = selected.delta;
        outputs.weightGradients.textContent = selected.weightGradients;
        outputs.biasGradient.textContent = selected.biasGradient;
        outputs.updates.textContent = selected.updates;
        networkSummary.textContent = [
            `ŷ  ${formatNumber(forward.outputA)}       target  ${formatNumber(TARGET_VALUE)}`,
            `L  ${formatNumber(forward.loss)}       ||∇x||  ${formatNumber(Math.hypot(...getBackward(forward).inputGradients))}`,
            `h  ${formatVector(forward.hiddenA)}`,
            `phase  ${phase.direction.toUpperCase()} / ${state.playing ? 'PLAYING' : 'READY'}`
        ].join('\n');
    };

    const showFallback = (reason) => {
        canvas.dataset.fallback = 'true';
        canvas.setAttribute('aria-hidden', 'true');
        fallback.hidden = false;
        if (reason && fallbackCopy) {
            fallbackCopy.textContent = `WebGL could not be initialized (${reason}). The live forward and backward calculation panel is still available.`;
        }
        setStatus('WEBGL UNAVAILABLE', 'fallback');
    };

    try {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            canvas,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(windowRef && windowRef.devicePixelRatio ? windowRef.devicePixelRatio : 1, 2));
        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
    } catch (error) {
        const reason = error && error.message ? error.message : 'the graphics context is unavailable';
        showFallback(reason);
    }

    const createNode = (id, position, color, shape = 'sphere') => {
        const group = new THREE.Group();
        group.position.copy(position);
        group.userData.neuronId = id;
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.28,
            metalness: 0.28,
            roughness: 0.32
        });
        const geometry = shape === 'octahedron'
            ? new THREE.OctahedronGeometry(0.22, 1)
            : new THREE.SphereGeometry(0.2, 20, 16);
        const core = new THREE.Mesh(geometry, material);
        core.castShadow = true;
        const ringMaterial = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.48,
            depthWrite: false
        });
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.018, 8, 30), ringMaterial);
        ring.rotation.x = Math.PI / 2;
        const hitArea = new THREE.Mesh(
            new THREE.SphereGeometry(0.34, 14, 10),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        hitArea.userData.neuronId = id;
        group.add(core, ring, hitArea);
        stage.add(group);
        hitAreas.push(hitArea);
        nodeVisuals.set(id, { group, core, ring, material, ringMaterial });
    };

    const createEdge = (id, fromId, toId, weight, kind) => {
        const from = nodeVisuals.get(fromId).group.position;
        const to = nodeVisuals.get(toId).group.position;
        const positive = weight >= 0;
        const color = positive ? 0x4fdec6 : 0xf17d9f;
        const material = new THREE.MeshStandardMaterial({
            color,
            emissive: color,
            emissiveIntensity: 0.28,
            transparent: true,
            opacity: 0.3,
            roughness: 0.5,
            metalness: 0.1,
            depthWrite: false
        });
        const radius = 0.014 + Math.min(Math.abs(weight), 1) * 0.018;
        const link = createCylinderBetween(from, to, radius, material);
        link.renderOrder = 1;
        stage.add(link);
        const pulseMaterial = new THREE.MeshBasicMaterial({
            color: positive ? 0xb6fff1 : 0xffc5d6,
            transparent: true,
            opacity: 0.7,
            depthWrite: false
        });
        const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), pulseMaterial);
        pulse.renderOrder = 3;
        stage.add(pulse);
        edgeVisuals.push({
            id,
            fromId,
            toId,
            kind,
            weight,
            from,
            to,
            link,
            material,
            pulse,
            pulseMaterial,
            offset: edgeVisuals.length * 0.071
        });
    };

    if (renderer) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x091222);
        scene.fog = new THREE.Fog(0x091222, 7, 14);
        camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
        camera.position.set(0.2, 0.35, 8.5);
        camera.lookAt(0, 0, 0);

        const hemisphere = new THREE.HemisphereLight(0xa4caff, 0x12223c, 1.8);
        scene.add(hemisphere);
        const keyLight = new THREE.DirectionalLight(0xd6e6ff, 3.1);
        keyLight.position.set(-2.5, 4.5, 5);
        keyLight.castShadow = true;
        scene.add(keyLight);
        const accentLight = new THREE.PointLight(0x4bdaca, 3, 8, 2);
        accentLight.position.set(0, 1.2, 2.5);
        scene.add(accentLight);

        stage = new THREE.Group();
        stage.rotation.y = -0.08;
        scene.add(stage);

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(8.6, 5.2),
            new THREE.MeshStandardMaterial({ color: 0x0d1a31, metalness: 0.12, roughness: 0.82 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2.08;
        floor.position.z = -0.32;
        floor.receiveShadow = true;
        stage.add(floor);
        const grid = new THREE.GridHelper(8.4, 24, 0x2a4d70, 0x172d4a);
        grid.position.y = -2.06;
        grid.position.z = -0.3;
        grid.material.transparent = true;
        grid.material.opacity = 0.32;
        stage.add(grid);

        const layerPositions = { input: -3.05, hidden: -0.95, output: 1.15, loss: 3.05 };
        const layerColors = { input: 0x6fa8ff, hidden: 0x55dbc5, output: 0xffbd68, loss: 0xff809c };
        Object.entries(layerPositions).forEach(([layer, x]) => {
            const layerMaterial = new THREE.MeshBasicMaterial({
                color: layerColors[layer],
                transparent: true,
                opacity: 0.035,
                depthWrite: false
            });
            const layerPanel = new THREE.Mesh(new THREE.BoxGeometry(0.09, 4.05, 0.7), layerMaterial);
            layerPanel.position.set(x, 0, -0.24);
            stage.add(layerPanel);
        });

        [-1.02, 0, 1.02].forEach((y, index) => {
            createNode(`input-${index}`, new THREE.Vector3(layerPositions.input, y, 0), layerColors.input);
        });
        [-1.53, -0.51, 0.51, 1.53].forEach((y, index) => {
            createNode(`hidden-${index}`, new THREE.Vector3(layerPositions.hidden, y, 0.04), layerColors.hidden);
        });
        createNode('output-0', new THREE.Vector3(layerPositions.output, 0, 0.04), layerColors.output);
        createNode('loss-0', new THREE.Vector3(layerPositions.loss, 0, 0.04), layerColors.loss, 'octahedron');

        INITIAL_PARAMETERS.hiddenWeights.forEach((weights, hiddenIndex) => {
            weights.forEach((weight, inputIndex) => {
                createEdge(
                    `input-${inputIndex}-hidden-${hiddenIndex}`,
                    `input-${inputIndex}`,
                    `hidden-${hiddenIndex}`,
                    weight,
                    'input-hidden'
                );
            });
        });
        INITIAL_PARAMETERS.outputWeights.forEach((weight, hiddenIndex) => {
            createEdge(
                `hidden-${hiddenIndex}-output-0`,
                `hidden-${hiddenIndex}`,
                'output-0',
                weight,
                'hidden-output'
            );
        });
        createEdge('output-0-loss-0', 'output-0', 'loss-0', 1, 'output-loss');

        raycaster = new THREE.Raycaster();
        pointer = new THREE.Vector2();
    }

    const resize = () => {
        if (!renderer || !camera) {
            return;
        }
        const parent = canvas.parentElement;
        const width = Math.max(parent ? parent.clientWidth : 0, 320);
        const height = Math.max(canvas.clientHeight || width * 0.62, 320);
        renderer.setPixelRatio(Math.min(windowRef && windowRef.devicePixelRatio ? windowRef.devicePixelRatio : 1, 2));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderScene(0);
    };

    const updateVisuals = (time) => {
        if (!renderer || !stage) {
            return;
        }
        const forward = getForward();
        nodeVisuals.forEach((visual, id) => {
            const isSelected = id === state.selectedId;
            const { layer, index } = id.split('-');
            const amplitude = layer === 'input'
                ? Math.abs(INPUT_VALUES[Number(index)])
                : layer === 'hidden'
                    ? forward.hiddenA[Number(index)]
                    : layer === 'output'
                        ? forward.outputA
                        : forward.loss;
            const pulse = state.reducedMotion ? 1 : 1 + Math.sin(time * 0.003 + Number(index || 0)) * 0.025;
            visual.group.scale.setScalar((isSelected ? 1.22 : 1) * pulse);
            visual.material.emissiveIntensity = isSelected ? 1.35 : 0.25 + clamp(amplitude, 0, 1) * 0.5;
            visual.ringMaterial.opacity = isSelected ? 0.98 : 0.28 + clamp(amplitude, 0, 1) * 0.24;
            visual.ring.scale.setScalar(isSelected ? 1.08 : 1);
        });

        edgeVisuals.forEach((edge) => {
            if (edge.kind === 'input-hidden') {
                const inputIndex = Number(edge.fromId.split('-')[1]);
                const hiddenIndex = Number(edge.toId.split('-')[1]);
                edge.weight = state.parameters.hiddenWeights[hiddenIndex][inputIndex];
            } else if (edge.kind === 'hidden-output') {
                const hiddenIndex = Number(edge.fromId.split('-')[1]);
                edge.weight = state.parameters.outputWeights[hiddenIndex];
            }
            const edgeColor = edge.weight >= 0 ? 0x4fdec6 : 0xf17d9f;
            edge.material.color.setHex(edgeColor);
            edge.material.emissive.setHex(edgeColor);
            edge.pulseMaterial.color.setHex(edge.weight >= 0 ? 0xb6fff1 : 0xffc5d6);
            const selectedPath = edge.fromId === state.selectedId || edge.toId === state.selectedId;
            const activePhase = edge.kind === 'input-hidden'
                ? state.phaseIndex === 0 || state.phaseIndex === 1 || state.phaseIndex >= 6
                : edge.kind === 'hidden-output'
                    ? state.phaseIndex === 2 || state.phaseIndex === 5 || state.phaseIndex >= 6
                    : state.phaseIndex === 3 || state.phaseIndex === 4;
            const strength = selectedPath ? 1 : activePhase ? 0.78 : 0.28;
            edge.material.opacity = 0.14 + strength * 0.72;
            edge.material.emissiveIntensity = 0.2 + strength * 1.25;
            edge.link.userData.radius = 0.014 + Math.min(Math.abs(edge.weight), 1) * 0.018 * (selectedPath ? 1.35 : 1);
            updateCylinderBetween(edge.link, edge.from, edge.to);
            const progress = state.reducedMotion ? 0.5 : ((time * 0.00032 + edge.offset) % 1);
            edge.pulse.position.lerpVectors(edge.from, edge.to, progress);
            edge.pulseMaterial.opacity = state.reducedMotion ? 0 : selectedPath || activePhase ? 0.98 : 0.32;
            edge.pulse.scale.setScalar(selectedPath ? 1.24 : 1);
        });
    };

    const renderScene = (time = 0) => {
        if (!renderer || !scene || !camera) {
            return;
        }
        updateVisuals(time);
        renderer.render(scene, camera);
    };

    const setPointer = (event) => {
        const bounds = canvas.getBoundingClientRect();
        pointer.set(
            ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
            -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1
        );
    };

    const selectNeuron = (id) => {
        if (!NODE_ORDER.includes(id)) {
            return;
        }
        state.selectedId = id;
        updateSelector();
        updateReadouts();
        canvas.setAttribute('aria-label', `Three-dimensional multilayer perceptron. Selected ${selectedName()}. Click a neuron to inspect it.`);
        renderScene(lastFrameTime);
    };

    const onPointerDown = (event) => {
        if (!renderer || !raycaster || !pointer) {
            return;
        }
        pointerDown = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        if (canvas.setPointerCapture) {
            canvas.setPointerCapture(event.pointerId);
        }
    };

    const onPointerUp = (event) => {
        if (!pointerDown || pointerDown.pointerId !== event.pointerId) {
            return;
        }
        const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y) > 8;
        pointerDown = null;
        if (canvas.releasePointerCapture && canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
        if (moved || !renderer || !raycaster || !pointer) {
            return;
        }
        setPointer(event);
        raycaster.setFromCamera(pointer, camera);
        const intersections = raycaster.intersectObjects(hitAreas, false);
        if (intersections.length && intersections[0].object.userData.neuronId) {
            selectNeuron(intersections[0].object.userData.neuronId);
        }
    };

    const applyParameterUpdate = () => {
        const forward = getForward();
        const backward = getBackward(forward);
        const update = {
            hiddenWeights: backward.hiddenWeightGradients.map((row) => row.map((gradient) => -LEARNING_RATE * gradient)),
            hiddenBiases: backward.hiddenBiasGradients.map((gradient) => -LEARNING_RATE * gradient),
            outputWeights: backward.outputWeightGradients.map((gradient) => -LEARNING_RATE * gradient),
            outputBias: -LEARNING_RATE * backward.outputBiasGradient
        };
        state.lastUpdate = update;
        state.parameters.hiddenWeights = state.parameters.hiddenWeights.map((row, rowIndex) => (
            row.map((weight, columnIndex) => weight + update.hiddenWeights[rowIndex][columnIndex])
        ));
        state.parameters.hiddenBiases = state.parameters.hiddenBiases.map((bias, index) => bias + update.hiddenBiases[index]);
        state.parameters.outputWeights = state.parameters.outputWeights.map((weight, index) => weight + update.outputWeights[index]);
        state.parameters.outputBias += update.outputBias;
    };

    const setPhase = (phaseIndex) => {
        state.phaseIndex = clamp(phaseIndex, 0, PHASES.length - 1);
        updateReadouts();
        renderScene(lastFrameTime);
    };

    const forwardStep = () => {
        state.playDirection = 'forward';
        state.hasStarted = true;
        state.playing = false;
        setPhase(state.phaseIndex >= 3 ? 0 : state.phaseIndex + 1);
        setReadyStatus();
    };

    const backwardStep = () => {
        state.playDirection = 'backward';
        state.hasStarted = true;
        state.playing = false;
        if (state.phaseIndex < 4 || state.phaseIndex >= 7) {
            setPhase(4);
        } else {
            setPhase(state.phaseIndex + 1);
            if (state.phaseIndex === 7) {
                applyParameterUpdate();
                updateReadouts();
                renderScene(lastFrameTime);
            }
        }
        setReadyStatus();
    };

    const advancePlayback = () => {
        if (state.playDirection === 'forward') {
            if (state.phaseIndex >= 3) {
                state.playing = false;
                setStatus('FORWARD COMPLETE', 'complete');
                return;
            }
            setPhase(state.phaseIndex + 1);
        } else {
            if (state.phaseIndex < 4) {
                setPhase(4);
            } else if (state.phaseIndex >= 7) {
                state.playing = false;
                setStatus('BACKWARD COMPLETE', 'complete');
                return;
            } else {
                setPhase(state.phaseIndex + 1);
                if (state.phaseIndex === 7) {
                    applyParameterUpdate();
                    updateReadouts();
                    renderScene(lastFrameTime);
                }
            }
        }
    };

    const requestFrame = windowRef && windowRef.requestAnimationFrame
        ? windowRef.requestAnimationFrame.bind(windowRef)
        : (callback) => setTimeout(() => callback(Date.now()), 16);
    const cancelFrame = windowRef && windowRef.cancelAnimationFrame
        ? windowRef.cancelAnimationFrame.bind(windowRef)
        : clearTimeout;

    const frame = (time) => {
        animationFrame = 0;
        if (state.disposed) {
            return;
        }
        lastFrameTime = time;
        if (state.playing && time - lastStepTime > (state.reducedMotion ? 980 : 760)) {
            lastStepTime = time;
            advancePlayback();
        }
        renderScene(time);
        if (state.playing || (renderer && !state.reducedMotion)) {
            animationFrame = requestFrame(frame);
        }
    };

    const startLoop = () => {
        if ((renderer || state.playing) && !animationFrame) {
            animationFrame = requestFrame(frame);
        }
    };

    const play = (direction) => {
        state.playDirection = direction;
        state.hasStarted = true;
        if (direction === 'forward' && state.phaseIndex >= 3) {
            state.phaseIndex = 0;
        }
        if (direction === 'backward' && (state.phaseIndex < 4 || state.phaseIndex >= 7)) {
            state.phaseIndex = 4;
        }
        state.playing = true;
        lastStepTime = lastFrameTime;
        updateReadouts();
        setStatus(direction === 'forward' ? 'PLAYING FORWARD' : 'PLAYING BACKWARD', 'playing');
        startLoop();
    };

    const pause = () => {
        state.playing = false;
        setStatus('PAUSED', 'paused');
        renderScene(lastFrameTime);
    };

    const reset = () => {
        state.parameters = cloneParameters();
        state.selectedId = 'hidden-1';
        state.phaseIndex = 0;
        state.playDirection = 'forward';
        state.playing = false;
        state.hasStarted = false;
        state.lastUpdate = null;
        updateSelector();
        updateReadouts();
        setReadyStatus();
        renderScene(lastFrameTime);
    };

    const onKeyDown = (event) => {
        if (event.key === ' ') {
            event.preventDefault();
            if (state.playing) {
                pause();
            } else {
                play(state.playDirection);
            }
        } else if (event.key.toLowerCase() === 'r') {
            event.preventDefault();
            reset();
        }
    };

    addListener(canvas, 'pointerdown', onPointerDown, { passive: true }, cleanupTasks);
    addListener(canvas, 'pointerup', onPointerUp, { passive: true }, cleanupTasks);
    addListener(canvas, 'pointercancel', onPointerUp, { passive: true }, cleanupTasks);
    addListener(canvas, 'keydown', onKeyDown, undefined, cleanupTasks);
    addListener(wrapper.querySelector('[data-action="forward-play"]'), 'click', () => play('forward'), undefined, cleanupTasks);
    addListener(wrapper.querySelector('[data-action="backward-play"]'), 'click', () => play('backward'), undefined, cleanupTasks);
    addListener(wrapper.querySelector('[data-action="forward-step"]'), 'click', forwardStep, undefined, cleanupTasks);
    addListener(wrapper.querySelector('[data-action="backward-step"]'), 'click', backwardStep, undefined, cleanupTasks);
    addListener(pauseButton, 'click', () => {
        if (state.playing) {
            pause();
        } else {
            play(state.playDirection);
        }
    }, undefined, cleanupTasks);
    addListener(wrapper.querySelector('[data-action="reset"]'), 'click', reset, undefined, cleanupTasks);
    selectorButtons.forEach((button) => {
        addListener(button, 'click', () => selectNeuron(button.dataset.neuron), undefined, cleanupTasks);
    });

    if (renderer) {
        if (windowRef && windowRef.ResizeObserver) {
            resizeObserver = new windowRef.ResizeObserver(resize);
            resizeObserver.observe(canvas.parentElement);
            cleanupTasks.push(() => resizeObserver.disconnect());
        } else if (windowRef) {
            addListener(windowRef, 'resize', resize, undefined, cleanupTasks);
        }
        resize();
        renderScene(0);
        if (!state.reducedMotion) {
            startLoop();
        }
    }

    if (windowRef && windowRef.matchMedia) {
        const motionQuery = windowRef.matchMedia('(prefers-reduced-motion: reduce)');
        const onMotionChange = (event) => {
            state.reducedMotion = event.matches;
            motionNote.textContent = state.reducedMotion
                ? 'Reduced motion enabled · pulses are paused · click nodes or use the selector above'
                : 'Pulses are live · click nodes or use the selector above';
            if (state.reducedMotion && animationFrame && !state.playing) {
                cancelFrame(animationFrame);
                animationFrame = 0;
            } else {
                startLoop();
            }
            renderScene(lastFrameTime);
        };
        if (motionQuery.addEventListener) {
            motionQuery.addEventListener('change', onMotionChange);
            cleanupTasks.push(() => motionQuery.removeEventListener('change', onMotionChange));
        } else if (motionQuery.addListener) {
            motionQuery.addListener(onMotionChange);
            cleanupTasks.push(() => motionQuery.removeListener(onMotionChange));
        }
    }

    updateSelector();
    updateReadouts();
    setReadyStatus();

    return () => {
        if (state.disposed) {
            return;
        }
        state.disposed = true;
        if (animationFrame) {
            cancelFrame(animationFrame);
        }
        cleanupTasks.forEach((cleanup) => cleanup());
        if (renderer) {
            renderer.dispose();
        }
        if (scene) {
            disposeObject(scene);
        }
        wrapper.remove();
    };
}
