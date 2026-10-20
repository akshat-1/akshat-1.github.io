import * as THREE from 'three';

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
        <div class="robotics-lab__viewport">
            <canvas class="robotics-lab__canvas" tabindex="0" aria-label="Three-dimensional 5DOF robot arm. Move the cursor over the canvas to guide the end effector." data-role="canvas"></canvas>
            <div class="robotics-lab__fallback" data-role="fallback" hidden>
                <span class="robotics-lab__fallback-copy" data-role="fallback-copy">WebGL unavailable.</span>
            </div>
            <div class="robotics-lab__calculation" data-role="calculation" aria-live="polite" aria-atomic="true"></div>
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
    const calculationOverlay = wrapper.querySelector('[data-role="calculation"]');
    const cleanupTasks = [];
    const state = {
        joints: INITIAL_JOINTS.slice(),
        target: new THREE.Vector3(INITIAL_TARGET.x, INITIAL_TARGET.y, INITIAL_TARGET.z),
        currentPosition: new THREE.Vector3(),
        error: new THREE.Vector3(),
        paused: false,
        calculationPending: false,
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
    let calculationTimer = 0;

    const setTimer = windowRef && windowRef.setTimeout
        ? windowRef.setTimeout.bind(windowRef)
        : setTimeout;
    const clearTimer = windowRef && windowRef.clearTimeout
        ? windowRef.clearTimeout.bind(windowRef)
        : clearTimeout;

    const showCalculation = (lines, reveal = false) => {
        if (!calculationOverlay) {
            return;
        }
        calculationOverlay.textContent = lines.filter(Boolean).join('\n');
        if (!reveal) {
            return;
        }
        calculationOverlay.classList.add('is-visible');
        if (calculationTimer) {
            clearTimer(calculationTimer);
        }
        calculationTimer = setTimer(() => {
            calculationOverlay.classList.remove('is-visible');
            calculationTimer = 0;
        }, state.reducedMotion ? 1200 : 2400);
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

    const updateReadouts = (notify = false) => {
        const kinematics = forwardKinematics(state.joints);
        const jacobian = calculateJacobian(state.joints);
        state.currentPosition.copy(kinematics.position);
        state.error.subVectors(state.target, state.currentPosition);
        const transform = new THREE.Matrix4();
        const orientation = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(kinematics.pitch, kinematics.yaw, state.joints[4], 'YXZ')
        );
        transform.compose(state.currentPosition, orientation, IDENTITY_SCALE);

        showCalculation([
            `target  = ${formatVector(state.target)} m`,
            `current = ${formatVector(state.currentPosition)} m`,
            `error   = ${formatVector(state.error)} m  ‖e‖ = ${formatNumber(state.error.length(), 4)} m`,
            `q       = ${formatJointVector(state.joints)}`,
            `J =\n${formatJacobian(jacobian)}`,
            `T =\n${formatMatrix(transform)}`
        ], notify || state.calculationPending);
        if (notify || state.calculationPending) {
            state.calculationPending = false;
        }
    };

    const showFallback = (reason) => {
        canvas.dataset.fallback = 'true';
        canvas.setAttribute('aria-hidden', 'true');
        fallback.hidden = false;
        if (fallbackCopy) {
            fallbackCopy.textContent = 'WebGL unavailable.';
        }
    };

    try {
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            canvas,
            powerPreference: 'default'
        });
        canvas.dataset.webglReady = 'true';
        renderer.setClearColor(0x000000, 0);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        }
    } catch (error) {
        const reason = error && error.message ? error.message : 'the graphics context is unavailable';
        canvas.dataset.webglReady = 'false';
        showFallback(reason);
    }

    let armLinks = [];
    let armJoints = [];
    let toolGroup = null;
    let goalPlane = null;
    let raycaster = null;
    let pointer = null;

    if (renderer) {
        scene = new THREE.Scene();
        scene.background = null;
        scene.fog = null;
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

        const cameraNormal = new THREE.Vector3();
        camera.getWorldDirection(cameraNormal);
        goalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(cameraNormal, state.target);
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
        if (!renderer || !camera || !goalPlane) {
            return;
        }
        const bounds = canvas.getBoundingClientRect();
        if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
        ) {
            return;
        }
        setPointer(event);
        raycaster.setFromCamera(pointer, camera);
        const hit = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(goalPlane, hit)) {
            setTargetPosition(hit);
            state.calculationPending = true;
        }
    };

    const nudgeTarget = (axis, amount) => {
        const next = state.target.clone();
        next[axis] += amount;
        setTargetPosition(next);
        state.calculationPending = true;
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
        state.calculationPending = true;
        updateReadouts(true);
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

    if (windowRef) {
        addListener(windowRef, 'pointermove', updateTargetFromPointer, undefined, cleanupTasks);
    } else {
        addListener(canvas, 'pointermove', updateTargetFromPointer, undefined, cleanupTasks);
    }
    addListener(canvas, 'keydown', onKeyDown, undefined, cleanupTasks);

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
        };
        if (motionQuery.addEventListener) {
            motionQuery.addEventListener('change', onMotionChange);
            cleanupTasks.push(() => motionQuery.removeEventListener('change', onMotionChange));
        } else if (motionQuery.addListener) {
            motionQuery.addListener(onMotionChange);
            cleanupTasks.push(() => motionQuery.removeListener(onMotionChange));
        }
    }

    updateReadouts(true);

    return () => {
        if (state.disposed) {
            return;
        }
        state.disposed = true;
        if (animationFrame) {
            cancelFrame(animationFrame);
        }
        if (calculationTimer) {
            clearTimer(calculationTimer);
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
