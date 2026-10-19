import * as THREE from 'three';

import './robotics.css';

const ARM = Object.freeze({
    baseHeight: 0.62,
    links: Object.freeze([0.96, 0.86, 0.58]),
    jointLimits: Object.freeze([
        [-Math.PI, Math.PI],
        [-1.42, 1.42],
        [-2.35, 2.35],
        [-2.2, 2.2],
        [-Math.PI, Math.PI]
    ]),
    workspace: Object.freeze({
        minRadius: 0.32,
        maxRadius: 2.34,
        minHeight: 0.58,
        maxHeight: 2.78
    })
});

const INITIAL_JOINTS = Object.freeze([0.18, 0.48, -0.86, 0.54, -0.2]);
const INITIAL_TARGET = Object.freeze({ x: 0.98, y: 1.58, z: 1.1 });
const IDENTITY_SCALE = new THREE.Vector3(1, 1, 1);

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

function finiteOr(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
}

function formatNumber(value, digits = 3) {
    const safeValue = finiteOr(value, 0);
    const normalized = Math.abs(safeValue) < 0.0005 ? 0 : safeValue;
    return normalized.toFixed(digits).padStart(digits + 3, ' ');
}

function formatVector(vector) {
    return `[ ${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)} ]`;
}

function formatJointVector(joints) {
    return `[ ${joints.map((joint) => formatNumber(joint)).join(', ')} ] rad`;
}

function formatJacobian(jacobian) {
    return jacobian
        .map((row) => `[ ${row.map((value) => formatNumber(value, 4)).join(', ')} ]`)
        .join('\n');
}

function formatMatrix(matrix) {
    const values = matrix.elements;
    return [0, 1, 2, 3]
        .map((row) => {
            const cells = [0, 1, 2, 3].map((column) => values[column * 4 + row]);
            return `[ ${cells.map((value) => formatNumber(value, 4)).join(', ')} ]`;
        })
        .join('\n');
}

function setOutput(element, value) {
    if (element) {
        element.textContent = value;
    }
}

function addListener(target, type, handler, options, cleanupTasks) {
    target.addEventListener(type, handler, options);
    cleanupTasks.push(() => target.removeEventListener(type, handler, options));
}

function positionFromRadial(radial, height, yaw, target = new THREE.Vector3()) {
    target.set(Math.sin(yaw) * radial, height, Math.cos(yaw) * radial);
    return target;
}

function forwardKinematics(joints) {
    const yaw = joints[0];
    const shoulderAngle = joints[1];
    const elbowAngle = shoulderAngle + joints[2];
    const wristAngle = elbowAngle + joints[3];
    const [upperArm, forearm, wrist] = ARM.links;
    const shoulder = new THREE.Vector3(0, ARM.baseHeight, 0);
    const elbowRadial = upperArm * Math.cos(shoulderAngle);
    const elbow = positionFromRadial(
        elbowRadial,
        ARM.baseHeight + upperArm * Math.sin(shoulderAngle),
        yaw
    );
    const wristRadial = elbowRadial + forearm * Math.cos(elbowAngle);
    const wristPoint = positionFromRadial(
        wristRadial,
        elbow.y + forearm * Math.sin(elbowAngle),
        yaw
    );
    const endRadial = wristRadial + wrist * Math.cos(wristAngle);
    const end = positionFromRadial(
        endRadial,
        wristPoint.y + wrist * Math.sin(wristAngle),
        yaw
    );

    return {
        points: [shoulder, elbow, wristPoint, end],
        position: end,
        pitch: wristAngle,
        yaw
    };
}

function calculateJacobian(joints) {
    const basePosition = forwardKinematics(joints).position;
    const jacobian = [[], [], []];
    const delta = 0.0005;

    for (let column = 0; column < joints.length; column += 1) {
        const offsetJoints = joints.slice();
        offsetJoints[column] += delta;
        const offsetPosition = forwardKinematics(offsetJoints).position;
        jacobian[0][column] = (offsetPosition.x - basePosition.x) / delta;
        jacobian[1][column] = (offsetPosition.y - basePosition.y) / delta;
        jacobian[2][column] = (offsetPosition.z - basePosition.z) / delta;
    }

    return jacobian;
}

function inverseThreeByThree(matrix) {
    const a = matrix[0][0];
    const b = matrix[0][1];
    const c = matrix[0][2];
    const d = matrix[1][0];
    const e = matrix[1][1];
    const f = matrix[1][2];
    const g = matrix[2][0];
    const h = matrix[2][1];
    const i = matrix[2][2];
    const determinant = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);

    if (Math.abs(determinant) < 1e-9) {
        return null;
    }

    const inverseDeterminant = 1 / determinant;
    return [
        [(e * i - f * h) * inverseDeterminant, (c * h - b * i) * inverseDeterminant, (b * f - c * e) * inverseDeterminant],
        [(f * g - d * i) * inverseDeterminant, (a * i - c * g) * inverseDeterminant, (c * d - a * f) * inverseDeterminant],
        [(d * h - e * g) * inverseDeterminant, (b * g - a * h) * inverseDeterminant, (a * e - b * d) * inverseDeterminant]
    ];
}

function createCylinderBetween(start, end, radius, material) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 20), material);
    mesh.castShadow = true;
    mesh.userData.axis = new THREE.Vector3(0, 1, 0);
    mesh.userData.direction = new THREE.Vector3();
    mesh.userData.midpoint = new THREE.Vector3();
    updateCylinderBetween(mesh, start, end);
    return mesh;
}

function updateCylinderBetween(mesh, start, end) {
    const { direction, midpoint, axis } = mesh.userData;
    direction.subVectors(end, start);
    const length = Math.max(direction.length(), 0.0001);
    midpoint.addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(midpoint);
    mesh.scale.set(1, length, 1);
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
            materials.forEach((material) => material.dispose());
        }
    });
}

function createMarkup(documentRef) {
    const wrapper = documentRef.createElement('section');
    wrapper.className = 'robotics-lab';
    wrapper.setAttribute('aria-label', 'Interactive 5DOF robotics lab');
    wrapper.innerHTML = `
        <header class="robotics-lab__header">
            <div>
                <p class="robotics-lab__eyebrow">Interactive kinematics study</p>
                <h2 class="robotics-lab__title">5DOF Robotics Lab</h2>
                <p class="robotics-lab__intro">
                    Drag the hollow target and watch a five-joint arm solve its next pose with a damped least-squares Jacobian controller.
                </p>
            </div>
            <span class="robotics-lab__status" data-role="status" data-state="tracking">TRACKING</span>
        </header>
        <div class="robotics-lab__toolbar" role="toolbar" aria-label="Robotics controls">
            <button class="robotics-lab__button" type="button" data-action="pause">Pause</button>
            <button class="robotics-lab__button" type="button" data-action="reset">Reset pose</button>
            <span class="robotics-lab__hint">Drag the cyan ring · Arrow keys move it · Space pauses</span>
        </div>
        <div class="robotics-lab__content">
            <div class="robotics-lab__viewport">
                <canvas class="robotics-lab__canvas" tabindex="0" aria-label="Three-dimensional 5DOF robot arm. Drag the glowing target to move it." data-role="canvas"></canvas>
                <div class="robotics-lab__fallback" data-role="fallback" hidden>
                    <div class="robotics-lab__fallback-card">
                        <h3 class="robotics-lab__fallback-title">3D preview unavailable</h3>
                        <p class="robotics-lab__fallback-copy" data-role="fallback-copy">WebGL could not be initialized in this browser or device. The live calculation readout is still available below.</p>
                    </div>
                </div>
                <div class="robotics-lab__legend" aria-hidden="true">
                    <span class="robotics-lab__legend-item"><i class="robotics-lab__legend-dot robotics-lab__legend-dot--target"></i> target</span>
                    <span class="robotics-lab__legend-item"><i class="robotics-lab__legend-dot robotics-lab__legend-dot--joint"></i> joints</span>
                    <span class="robotics-lab__legend-item"><i class="robotics-lab__legend-dot"></i> links</span>
                </div>
            </div>
            <aside class="robotics-lab__readout" aria-label="Live robotics calculations">
                <div class="robotics-lab__readout-header">
                    <h3 class="robotics-lab__readout-title">Live calculations</h3>
                    <span class="robotics-lab__read-only">read-only</span>
                </div>
                <div class="robotics-lab__readout-scroll">
                    <div class="robotics-lab__readout-grid">
                        <section class="robotics-lab__readout-card robotics-lab__readout-card--wide">
                            <h4 class="robotics-lab__readout-label">Joint vector q</h4>
                            <pre class="robotics-lab__readout-value robotics-lab__readout-value--accent" data-readout="joints"></pre>
                        </section>
                        <section class="robotics-lab__readout-card">
                            <h4 class="robotics-lab__readout-label">Target position</h4>
                            <pre class="robotics-lab__readout-value" data-readout="target"></pre>
                        </section>
                        <section class="robotics-lab__readout-card">
                            <h4 class="robotics-lab__readout-label">Current position</h4>
                            <pre class="robotics-lab__readout-value" data-readout="current"></pre>
                        </section>
                        <section class="robotics-lab__readout-card robotics-lab__readout-card--wide">
                            <h4 class="robotics-lab__readout-label">Position error ‖e‖</h4>
                            <pre class="robotics-lab__readout-value robotics-lab__readout-value--accent" data-readout="error"></pre>
                        </section>
                        <section class="robotics-lab__readout-card robotics-lab__readout-card--wide">
                            <h4 class="robotics-lab__readout-label">Jacobian J (m / rad)</h4>
                            <pre class="robotics-lab__readout-value" data-readout="jacobian"></pre>
                        </section>
                        <section class="robotics-lab__readout-card robotics-lab__readout-card--wide">
                            <h4 class="robotics-lab__readout-label">End-effector transform T</h4>
                            <pre class="robotics-lab__readout-value" data-readout="transform"></pre>
                        </section>
                    </div>
                    <p class="robotics-lab__readout-note" data-role="motion-note">DLS λ = 0.18 · positions are in metres · joint angles are in radians</p>
                </div>
            </aside>
        </div>
    `;
    return wrapper;
}

export function createRoboticsLab(root) {
    if (!root || root.nodeType !== 1 || typeof root.appendChild !== 'function') {
        throw new TypeError('createRoboticsLab(root) requires a DOM element as root.');
    }

    const documentRef = root.ownerDocument || document;
    const windowRef = documentRef.defaultView || (typeof window !== 'undefined' ? window : null);
    const wrapper = createMarkup(documentRef);
    root.appendChild(wrapper);

    const canvas = wrapper.querySelector('[data-role="canvas"]');
    const fallback = wrapper.querySelector('[data-role="fallback"]');
    const fallbackCopy = wrapper.querySelector('[data-role="fallback-copy"]');
    const status = wrapper.querySelector('[data-role="status"]');
    const pauseButton = wrapper.querySelector('[data-action="pause"]');
    const resetButton = wrapper.querySelector('[data-action="reset"]');
    const motionNote = wrapper.querySelector('[data-role="motion-note"]');
    const outputs = {
        joints: wrapper.querySelector('[data-readout="joints"]'),
        target: wrapper.querySelector('[data-readout="target"]'),
        current: wrapper.querySelector('[data-readout="current"]'),
        error: wrapper.querySelector('[data-readout="error"]'),
        jacobian: wrapper.querySelector('[data-readout="jacobian"]'),
        transform: wrapper.querySelector('[data-readout="transform"]')
    };
    const cleanupTasks = [];
    const state = {
        joints: INITIAL_JOINTS.slice(),
        target: new THREE.Vector3(INITIAL_TARGET.x, INITIAL_TARGET.y, INITIAL_TARGET.z),
        currentPosition: new THREE.Vector3(),
        error: new THREE.Vector3(),
        paused: false,
        dragging: false,
        pointerId: null,
        reducedMotion: Boolean(windowRef && windowRef.matchMedia && windowRef.matchMedia('(prefers-reduced-motion: reduce)').matches),
        disposed: false
    };

    let renderer = null;
    let scene = null;
    let camera = null;
    let animationFrame = 0;
    let resizeObserver = null;
    let lastTime = 0;
    let lastReadoutTime = -Infinity;

    const setStatus = (label, stateName) => {
        status.textContent = label;
        status.dataset.state = stateName;
        pauseButton.disabled = stateName === 'fallback';
        pauseButton.textContent = state.paused ? 'Resume' : 'Pause';
    };

    const setTargetPosition = (position) => {
        position.x = finiteOr(position.x, state.target.x);
        position.y = finiteOr(position.y, state.target.y);
        position.z = finiteOr(position.z, state.target.z);
        const radius = Math.hypot(position.x, position.z);
        if (radius > ARM.workspace.maxRadius) {
            const scale = ARM.workspace.maxRadius / radius;
            position.x *= scale;
            position.z *= scale;
        } else if (radius < ARM.workspace.minRadius) {
            const angle = Math.atan2(position.x, position.z);
            position.x = Math.sin(angle) * ARM.workspace.minRadius;
            position.z = Math.cos(angle) * ARM.workspace.minRadius;
        }
        position.y = clamp(position.y, ARM.workspace.minHeight, ARM.workspace.maxHeight);
        state.target.copy(position);
    };

    const updateReadouts = () => {
        const kinematics = forwardKinematics(state.joints);
        const jacobian = calculateJacobian(state.joints);
        state.currentPosition.copy(kinematics.position);
        state.error.subVectors(state.target, state.currentPosition);
        const transform = new THREE.Matrix4();
        const orientation = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(kinematics.pitch, kinematics.yaw, state.joints[4], 'YXZ')
        );
        transform.compose(state.currentPosition, orientation, IDENTITY_SCALE);

        setOutput(outputs.joints, formatJointVector(state.joints));
        setOutput(outputs.target, formatVector(state.target));
        setOutput(outputs.current, formatVector(state.currentPosition));
        setOutput(
            outputs.error,
            `${formatVector(state.error)}\n‖e‖ = ${formatNumber(state.error.length(), 4)} m`
        );
        setOutput(outputs.jacobian, formatJacobian(jacobian));
        setOutput(outputs.transform, formatMatrix(transform));
    };

    const showFallback = (reason) => {
        canvas.dataset.fallback = 'true';
        canvas.setAttribute('aria-hidden', 'true');
        fallback.hidden = false;
        if (reason && fallbackCopy) {
            fallbackCopy.textContent = `WebGL could not be initialized (${reason}). The live calculation readout is still available below.`;
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
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
    } catch (error) {
        const reason = error && error.message ? error.message : 'the graphics context is unavailable';
        showFallback(reason);
    }

    let targetGroup = null;
    let targetRing = null;
    let targetHitArea = null;
    let armLinks = [];
    let armJoints = [];
    let toolGroup = null;
    let dragPlane = null;
    let dragOffset = null;
    let raycaster = null;
    let pointer = null;

    if (renderer) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x091223);
        scene.fog = new THREE.Fog(0x091223, 5.8, 9.5);
        camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(4.3, 3.05, 5.2);
        camera.lookAt(0, 1.22, 0);

        const hemisphere = new THREE.HemisphereLight(0xa9cfff, 0x15223b, 1.9);
        scene.add(hemisphere);
        const keyLight = new THREE.DirectionalLight(0xc6ddff, 3.5);
        keyLight.position.set(3.5, 5.5, 3.2);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.set(1024, 1024);
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = 12;
        keyLight.shadow.camera.left = -4;
        keyLight.shadow.camera.right = 4;
        keyLight.shadow.camera.top = 4;
        keyLight.shadow.camera.bottom = -2;
        scene.add(keyLight);
        const rimLight = new THREE.PointLight(0x55ddda, 2.7, 6, 2);
        rimLight.position.set(-2.4, 2.9, -1.8);
        scene.add(rimLight);

        const stage = new THREE.Group();
        scene.add(stage);
        const floor = new THREE.Mesh(
            new THREE.CircleGeometry(3.7, 64),
            new THREE.MeshStandardMaterial({ color: 0x0d1b32, metalness: 0.3, roughness: 0.78 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        stage.add(floor);
        const grid = new THREE.GridHelper(7.2, 18, 0x28466a, 0x182c4b);
        grid.position.y = 0.008;
        grid.material.transparent = true;
        grid.material.opacity = 0.38;
        stage.add(grid);

        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x243b66, metalness: 0.74, roughness: 0.29 });
        const accentMaterial = new THREE.MeshStandardMaterial({ color: 0x4d9ee8, emissive: 0x102c5d, emissiveIntensity: 0.72, metalness: 0.58, roughness: 0.28 });
        const warmMaterial = new THREE.MeshStandardMaterial({ color: 0xf0aa5c, emissive: 0x4a210c, emissiveIntensity: 0.42, metalness: 0.5, roughness: 0.34 });
        const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x18233d, metalness: 0.72, roughness: 0.26 });

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.74, 0.34, 48), baseMaterial);
        base.position.y = 0.17;
        base.castShadow = true;
        base.receiveShadow = true;
        stage.add(base);
        const baseTop = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.025, 10, 48), accentMaterial);
        baseTop.rotation.x = Math.PI / 2;
        baseTop.position.y = 0.35;
        baseTop.castShadow = true;
        stage.add(baseTop);
        const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.34, 24), darkMaterial);
        pedestal.position.y = 0.48;
        pedestal.castShadow = true;
        stage.add(pedestal);

        const linkMaterials = [accentMaterial, baseMaterial, warmMaterial];
        armLinks = linkMaterials.map((material, index) => {
            const radius = index === 2 ? 0.095 : 0.12;
            const link = createCylinderBetween(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), radius, material);
            stage.add(link);
            return link;
        });
        armJoints = [0, 1, 2, 3].map((index) => {
            const joint = new THREE.Mesh(
                new THREE.SphereGeometry(index === 0 ? 0.17 : 0.135, 24, 16),
                index === 3 ? warmMaterial : darkMaterial
            );
            joint.castShadow = true;
            stage.add(joint);
            return joint;
        });

        const shoulderBand = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 10, 32), warmMaterial);
        shoulderBand.rotation.x = Math.PI / 2;
        shoulderBand.position.y = ARM.baseHeight;
        shoulderBand.castShadow = true;
        stage.add(shoulderBand);

        toolGroup = new THREE.Group();
        const toolMaterial = new THREE.MeshStandardMaterial({ color: 0xa9c7ed, metalness: 0.78, roughness: 0.2 });
        const toolCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.16, 20), toolMaterial);
        toolCollar.castShadow = true;
        toolGroup.add(toolCollar);
        const clawLeft = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.22, 0.18), toolMaterial);
        clawLeft.position.set(-0.11, 0.07, 0);
        clawLeft.rotation.z = -0.28;
        clawLeft.castShadow = true;
        const clawRight = clawLeft.clone();
        clawRight.position.x = 0.11;
        clawRight.rotation.z = 0.28;
        toolGroup.add(clawLeft, clawRight);
        stage.add(toolGroup);

        targetGroup = new THREE.Group();
        targetRing = new THREE.Mesh(
            new THREE.TorusGeometry(0.19, 0.035, 14, 40),
            new THREE.MeshStandardMaterial({ color: 0x5de0db, emissive: 0x1a9b9a, emissiveIntensity: 1.2, metalness: 0.28, roughness: 0.2 })
        );
        targetRing.castShadow = true;
        targetGroup.add(targetRing);
        const targetCore = new THREE.Mesh(
            new THREE.SphereGeometry(0.035, 16, 12),
            new THREE.MeshBasicMaterial({ color: 0xc2fffb })
        );
        targetGroup.add(targetCore);
        targetHitArea = new THREE.Mesh(
            new THREE.SphereGeometry(0.28, 16, 12),
            new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
        );
        targetGroup.add(targetHitArea);
        targetGroup.position.copy(state.target);
        targetRing.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            camera.position.clone().sub(targetGroup.position).normalize()
        );
        scene.add(targetGroup);

        dragPlane = new THREE.Plane();
        dragOffset = new THREE.Vector3();
        raycaster = new THREE.Raycaster();
        pointer = new THREE.Vector2();
    }

    const resize = () => {
        if (!renderer || !camera) {
            return;
        }
        const parent = canvas.parentElement;
        const width = Math.max(parent ? parent.clientWidth : 0, 320);
        const height = Math.max(canvas.clientHeight || (width * 0.62), 280);
        renderer.setPixelRatio(Math.min(windowRef && windowRef.devicePixelRatio ? windowRef.devicePixelRatio : 1, 2));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    const setPointer = (event) => {
        const bounds = canvas.getBoundingClientRect();
        pointer.set(
            ((event.clientX - bounds.left) / Math.max(bounds.width, 1)) * 2 - 1,
            -((event.clientY - bounds.top) / Math.max(bounds.height, 1)) * 2 + 1
        );
    };

    const updateTargetFromPointer = (event) => {
        if (!renderer || !camera || !dragPlane || event.pointerId !== state.pointerId) {
            return;
        }
        setPointer(event);
        raycaster.setFromCamera(pointer, camera);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, hit)) {
            hit.add(dragOffset);
            setTargetPosition(hit);
            targetGroup.position.copy(state.target);
        }
    };

    const onPointerDown = (event) => {
        if (!renderer || !camera || !targetHitArea) {
            return;
        }
        setPointer(event);
        raycaster.setFromCamera(pointer, camera);
        const intersections = raycaster.intersectObject(targetHitArea, false);
        if (!intersections.length) {
            return;
        }
        event.preventDefault();
        state.dragging = true;
        state.pointerId = event.pointerId;
        const cameraNormal = camera.getWorldDirection(new THREE.Vector3()).normalize();
        dragPlane.setFromNormalAndCoplanarPoint(cameraNormal, targetGroup.position);
        dragOffset.copy(targetGroup.position).sub(intersections[0].point);
        canvas.dataset.dragging = 'true';
        if (canvas.setPointerCapture) {
            canvas.setPointerCapture(event.pointerId);
        }
    };

    const onPointerUp = (event) => {
        if (event.pointerId !== state.pointerId) {
            return;
        }
        state.dragging = false;
        state.pointerId = null;
        canvas.dataset.dragging = 'false';
        if (canvas.releasePointerCapture && canvas.hasPointerCapture && canvas.hasPointerCapture(event.pointerId)) {
            canvas.releasePointerCapture(event.pointerId);
        }
    };

    const nudgeTarget = (axis, amount) => {
        const next = state.target.clone();
        next[axis] += amount;
        setTargetPosition(next);
        if (targetGroup) {
            targetGroup.position.copy(state.target);
        }
    };

    const onKeyDown = (event) => {
        const amount = event.shiftKey ? 0.16 : 0.08;
        let handled = true;
        if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
            nudgeTarget('x', -amount);
        } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
            nudgeTarget('x', amount);
        } else if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
            nudgeTarget('y', amount);
        } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
            nudgeTarget('y', -amount);
        } else if (event.key.toLowerCase() === 'q') {
            nudgeTarget('z', -amount);
        } else if (event.key.toLowerCase() === 'e') {
            nudgeTarget('z', amount);
        } else if (event.key === ' ') {
            state.paused = !state.paused;
            setStatus(state.paused ? 'PAUSED' : 'TRACKING', state.paused ? 'paused' : 'tracking');
        } else if (event.key.toLowerCase() === 'r') {
            reset();
        } else {
            handled = false;
        }
        if (handled) {
            event.preventDefault();
        }
    };

    const reset = () => {
        state.joints = INITIAL_JOINTS.slice();
        setTargetPosition(new THREE.Vector3(INITIAL_TARGET.x, INITIAL_TARGET.y, INITIAL_TARGET.z));
        state.paused = false;
        state.dragging = false;
        if (targetGroup) {
            targetGroup.position.copy(state.target);
        }
        setStatus('TRACKING', 'tracking');
        updateReadouts();
    };

    const solveIK = (deltaTime) => {
        const kinematics = forwardKinematics(state.joints);
        const error = state.target.clone().sub(kinematics.position);
        const errorSize = error.length();
        if (errorSize < 0.00005) {
            return;
        }

        const jacobian = calculateJacobian(state.joints);
        const damping = 0.18;
        const jjt = [
            [damping * damping, 0, 0],
            [0, damping * damping, 0],
            [0, 0, damping * damping]
        ];
        for (let row = 0; row < 3; row += 1) {
            for (let column = 0; column < 3; column += 1) {
                for (let joint = 0; joint < state.joints.length; joint += 1) {
                    jjt[row][column] += jacobian[row][joint] * jacobian[column][joint];
                }
            }
        }
        const inverse = inverseThreeByThree(jjt);
        if (!inverse) {
            return;
        }

        const dampedResponse = [0, 0, 0];
        for (let row = 0; row < 3; row += 1) {
            dampedResponse[row] = inverse[row][0] * error.x + inverse[row][1] * error.y + inverse[row][2] * error.z;
        }
        const step = state.reducedMotion ? 1 - Math.exp(-deltaTime * 2.1) : 1 - Math.exp(-deltaTime * 7.5);
        const maxStep = state.reducedMotion ? 0.045 : 0.12;
        for (let joint = 0; joint < state.joints.length; joint += 1) {
            let correction = 0;
            for (let row = 0; row < 3; row += 1) {
                correction += jacobian[row][joint] * dampedResponse[row];
            }
            state.joints[joint] += clamp(correction * step, -maxStep, maxStep);
            state.joints[joint] = clamp(
                state.joints[joint],
                ARM.jointLimits[joint][0],
                ARM.jointLimits[joint][1]
            );
        }
    };

    const updateVisuals = (time) => {
        if (!renderer || !scene) {
            return;
        }
        const kinematics = forwardKinematics(state.joints);
        state.currentPosition.copy(kinematics.position);
        const [shoulder, elbow, wristPoint, end] = kinematics.points;
        updateCylinderBetween(armLinks[0], shoulder, elbow);
        updateCylinderBetween(armLinks[1], elbow, wristPoint);
        updateCylinderBetween(armLinks[2], wristPoint, end);
        armJoints[0].position.copy(shoulder);
        armJoints[1].position.copy(elbow);
        armJoints[2].position.copy(wristPoint);
        armJoints[3].position.copy(end);
        toolGroup.position.copy(end);
        toolGroup.quaternion.setFromEuler(new THREE.Euler(kinematics.pitch, kinematics.yaw, state.joints[4], 'YXZ'));
        targetGroup.position.copy(state.target);
        const pulse = state.reducedMotion ? 1 : 1 + Math.sin(time * 0.0034) * 0.055;
        targetGroup.scale.setScalar(pulse);
        if (targetRing.material && 'emissiveIntensity' in targetRing.material) {
            targetRing.material.emissiveIntensity = state.reducedMotion ? 1.2 : 1.2 + Math.sin(time * 0.0034) * 0.24;
        }
    };

    const requestFrame = windowRef && windowRef.requestAnimationFrame
        ? windowRef.requestAnimationFrame.bind(windowRef)
        : (callback) => setTimeout(() => callback(Date.now()), 16);
    const cancelFrame = windowRef && windowRef.cancelAnimationFrame
        ? windowRef.cancelAnimationFrame.bind(windowRef)
        : clearTimeout;

    const frame = (time) => {
        if (state.disposed) {
            return;
        }
        const elapsed = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
        lastTime = time;
        if (!state.paused && renderer) {
            solveIK(elapsed);
        }
        updateVisuals(time);
        if (renderer) {
            renderer.render(scene, camera);
        }
        if (time - lastReadoutTime > 80) {
            lastReadoutTime = time;
            updateReadouts();
        }
        animationFrame = requestFrame(frame);
    };

    addListener(canvas, 'pointerdown', onPointerDown, { passive: false }, cleanupTasks);
    addListener(canvas, 'pointermove', updateTargetFromPointer, { passive: false }, cleanupTasks);
    addListener(canvas, 'pointerup', onPointerUp, undefined, cleanupTasks);
    addListener(canvas, 'pointercancel', onPointerUp, undefined, cleanupTasks);
    addListener(canvas, 'keydown', onKeyDown, undefined, cleanupTasks);
    addListener(pauseButton, 'click', () => {
        state.paused = !state.paused;
        setStatus(state.paused ? 'PAUSED' : 'TRACKING', state.paused ? 'paused' : 'tracking');
    }, undefined, cleanupTasks);
    addListener(resetButton, 'click', reset, undefined, cleanupTasks);

    if (renderer) {
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(canvas.parentElement);
            cleanupTasks.push(() => resizeObserver.disconnect());
        } else if (windowRef) {
            addListener(windowRef, 'resize', resize, undefined, cleanupTasks);
        }
        resize();
        animationFrame = requestFrame(frame);
    }

    if (windowRef && windowRef.matchMedia) {
        const motionQuery = windowRef.matchMedia('(prefers-reduced-motion: reduce)');
        const onMotionChange = (event) => {
            state.reducedMotion = event.matches;
            motionNote.textContent = state.reducedMotion
                ? 'Reduced motion enabled · DLS λ = 0.18 · positions are in metres · joint angles are in radians'
                : 'DLS λ = 0.18 · positions are in metres · joint angles are in radians';
        };
        if (motionQuery.addEventListener) {
            motionQuery.addEventListener('change', onMotionChange);
            cleanupTasks.push(() => motionQuery.removeEventListener('change', onMotionChange));
        } else if (motionQuery.addListener) {
            motionQuery.addListener(onMotionChange);
            cleanupTasks.push(() => motionQuery.removeListener(onMotionChange));
        }
    }

    updateReadouts();

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
