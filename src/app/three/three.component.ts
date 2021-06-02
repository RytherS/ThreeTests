import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import * as THREE from 'three';
import { MouseButton, ZoomDirection } from "./three-enums";
import { ThreeDragEvent } from "./three-drag-event";
import { ThreeClickEvent } from './three-click-event';
import { ThreeUtils } from './three-utils';
// This is a built-in option for panning, but (imo) would just add more complexity for panning since we are just using a fixed camera angle
// import { DragControls } from "three/examples/jsm/controls/DragControls";
import { Vector3 } from 'three';

// Three.js uses a right-handed coordinate system.
//    +Y
//     |
//     . _ +X 
//    /
//   +Z

@Component({
    selector: 'app-three',
    templateUrl: './three.component.html',
    styleUrls: ['./three.component.scss']
})
export class ThreeComponent implements OnInit {

    //#region Properties

    private scene: THREE.Scene;
    private renderer: THREE.WebGLRenderer;
    private clock: THREE.Clock;
    public rootObj: THREE.Object3D;

    public camera: THREE.OrthographicCamera;
    private get aspect(): number { return this.width / this.height; }
    private viewSize: number = 3;

    public sensitivity: number = 1;
    private mousePosition: THREE.Vector2;
    private clickPosition: THREE.Vector2;
    private mouseButtonPressed: MouseButton | null = null;

    private selectedObj: THREE.Object3D | null = null;

    private get isDragging(): boolean {
        if (this.mouseButtonPressed == null) return false;

        let dx = Math.abs(this.mousePosition.x - this.clickPosition.x);
        let dy = Math.abs(this.mousePosition.y - this.clickPosition.y);

        if (dx > Number.EPSILON || dy > Number.EPSILON) {
            return true;
        }
        else return false;
    }

    private container: HTMLElement | null = null;
    private get width(): number { return this.container?.clientWidth ?? 0; }
    private get height(): number { return this.container?.clientHeight ?? 0; }

    //#endregion Properties

    //#region Events

    // These emitters to syncronous to use a sort of "polling" to determine if they should be handled internally or not
    @Output() onUpdate: EventEmitter<number> = new EventEmitter(false);
    @Output() clickEvent: EventEmitter<ThreeClickEvent> = new EventEmitter(false);
    @Output() dragEvent: EventEmitter<ThreeDragEvent> = new EventEmitter(false);

    //#endregion Events

    //#region Initialization

    constructor() {
        this.scene = new THREE.Scene();
        this.renderer = new THREE.WebGLRenderer();
        this.clock = new THREE.Clock();
        this.camera = new THREE.OrthographicCamera(0, 0, 0, 0);
        this.rootObj = new THREE.Object3D();
        this.mousePosition = new THREE.Vector2();
        this.clickPosition = new THREE.Vector2();
    }

    ngOnInit(): void {
        let container = document.getElementById("three-container");
        if (container != null) {
            this.container = container;
        }
        else {
            console.error("ThreeComponent must have a container element with id 'three-container'.");
        }

        this.createScene();
        this.addListeners();
        requestAnimationFrame(() => this.update());
    }

    private addListeners(): void {
        if (this.container != null) {
            this.container.addEventListener("wheel", (event) => this.onScroll(event));
            this.container.addEventListener("pointerdown", (event) => this.onPointerDown(event));
            window.addEventListener("pointermove", (event) => this.onPointerMove(event)); // Should be able to continue rotating if off canvas
            window.addEventListener("pointerup", (event) => this.onPointerUp(event)); // If rotating off canvas, we still want to stop if user releases while off canvas
            window.addEventListener("resize", () => this.onWindowResize());
            window.addEventListener("contextmenu", (event) => this.preventContextMenu(event)); // Prevent context menu when right-clicking to pan
        }
    }

    private createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color("black");
        this.scene.add(this.rootObj);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.width, this.height);

        this.camera = new THREE.OrthographicCamera(-(this.viewSize * this.aspect / 2), this.viewSize * this.aspect / 2, this.viewSize / 2, -(this.viewSize / 2));
        this.camera.layers.enable(0);
        this.camera.layers.enable(1);
        this.camera.position.set(0, 0, 3);

        let highLight: THREE.DirectionalLight = new THREE.DirectionalLight(0xFFFFFF);
        highLight.position.set(5, 5, 5);
        highLight.target = this.rootObj;
        this.scene.add(highLight);

        let lowLight: THREE.DirectionalLight = new THREE.DirectionalLight(0x0000FF, 0.5);
        lowLight.position.set(-5, -5, -5);
        lowLight.target = this.rootObj;
        this.scene.add(lowLight);

        let hemiLight: THREE.HemisphereLight = new THREE.HemisphereLight(0x0000AA, 0x441105, 0.3);
        this.scene.add(hemiLight);

        this.renderer.domElement.id = "three-canvas";
        this.container?.appendChild(this.renderer.domElement);
    }

    //#endregion Initialization

    //#region Scene Manipulation

    public resetRootTransform(): void {
        this.rootObj.position.set(0, 0, 0);
        this.rootObj.rotation.set(0, 0, 0);
    }

    public rotateObject(axis: THREE.Vector3, angle: number, target: THREE.Object3D = this.rootObj): void {
        target.rotateOnWorldAxis(axis, angle);
        target.updateMatrix();
        target.updateWorldMatrix(true, true);
    }

    public moveObject(delta: THREE.Vector3, target: THREE.Object3D = this.rootObj): void {
        let currentPosition = ThreeUtils.getObjectWorldPosition(target);
        let worldTargetPosition = new Vector3(currentPosition.x + delta.x, currentPosition.y + delta.y, currentPosition.z + delta.z);
        let newLocalPosition = target.parent?.worldToLocal(worldTargetPosition) ?? worldTargetPosition;

        target.position.set(newLocalPosition.x, newLocalPosition.y, newLocalPosition.z);
        target.updateMatrix();
        target.updateWorldMatrix(true, true);
    }

    public zoom(direction: ZoomDirection) {
        switch (direction) {
            case ZoomDirection.In:
                if (this.camera.zoom < 3) {
                    this.camera.zoom += 0.1;
                }
                break;
            case ZoomDirection.Out:
                if (this.camera.zoom > 0.2) {
                    this.camera.zoom -= 0.1;
                }
                break;
            default:
                break;
        }
        this.camera.updateProjectionMatrix();
    }

    public addToScene(object: THREE.Object3D): void {
        this.scene.add(object);
    }

    public attachToRoot(object: THREE.Object3D): void {
        this.rootObj.attach(object);
    }

    public removeFromScene(object: THREE.Object3D): void {
        this.rootObj.remove(object);

        // Free resources (not sure if this is *required*, but I read that it was recommended somewhere)
        let mesh: THREE.Mesh = object as THREE.Mesh ?? ThreeUtils.getChildMesh(object);
        if (mesh != null) {
            mesh.geometry.dispose();

            if (mesh.material instanceof Array) {
                let materials: THREE.Material[] = mesh.material as Array<THREE.Material>;
                for (let i = 0; i < materials.length; i++) {
                    materials[i].dispose();
                }
            }
            else if (mesh.material instanceof THREE.Material) {
                (mesh.material as THREE.Material).dispose();
            }
        }
    }

    public clearRoot(): void {
        this.rootObj.clear();
        this.resetRootTransform();
    }

    private update(): void {
        this.onUpdate.emit(this.clock.getDelta());

        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame(() => this.update());
    }

    //#endregion Scene Manipulation

    //#region Event Listeners

    private onWindowResize(): void {
        if (this.camera != null && this.renderer != null) {

            this.camera.left = -(this.viewSize * this.aspect / 2);
            this.camera.right = this.viewSize * this.aspect / 2;
            this.camera.top = this.viewSize / 2;
            this.camera.bottom = -(this.viewSize / 2);

            this.camera.updateProjectionMatrix();
            this.renderer.setSize(this.width, this.height);
        }
    }

    private onScroll(scrollEvent: WheelEvent): void {
        scrollEvent.preventDefault();
        let zoomDirection: ZoomDirection = Math.sign(scrollEvent.deltaY) == -1 ? ZoomDirection.In : ZoomDirection.Out;
        this.zoom(zoomDirection);
    }

    private preventContextMenu(event: MouseEvent): void {
        if (ThreeUtils.isNDC(this.clickPosition)) {
            event.preventDefault();
        }
    }

    private onPointerDown(event: MouseEvent): void {
        event.preventDefault(); // Prevents highlighting of text while dragging
        this.mouseButtonPressed = event.button;
        this.selectedObj = ThreeUtils.getPointerFocusedObject(this.mousePosition, this.camera, this.scene);
        this.clickPosition = this.mousePosition.clone();
    }

    private onPointerMove(event: MouseEvent): void {
        // calculate mouse position in normalized device coordinates (-1 to +1 for both components)
        if (this.container != null) {
            this.mousePosition.x = ((event.clientX - this.container.offsetLeft) / this.container.clientWidth) * 2 - 1;
            this.mousePosition.y = -((event.clientY - this.container.offsetTop) / this.container.clientHeight) * 2 + 1;
        }

        if (this.mouseButtonPressed != null) {
            let dx = Math.abs(this.mousePosition.x - this.clickPosition.x);
            let dy = Math.abs(this.mousePosition.y - this.clickPosition.y);

            if (dx > Number.EPSILON || dy > Number.EPSILON) {
                let screenDelta = new THREE.Vector2(event.movementX, event.movementY);
                let dragEvent = new ThreeDragEvent(screenDelta, this.clickPosition, this.mousePosition, this.mouseButtonPressed, this.selectedObj ?? undefined);
                this.dragEvent.emit(dragEvent);

                if (!dragEvent.handled) { // If nothing else has marked the event as handled, rotate root object
                    this.handleDrag(dragEvent);
                }
            }
        }
        else {
            this.clickPosition = this.mousePosition.clone();
        }
    }

    private onPointerUp(event: MouseEvent): void {
        if (this.mouseButtonPressed != null && !this.isDragging) {

            let intersections = ThreeUtils.getPointerIntersections(this.mousePosition, this.camera, this.rootObj);

            if (intersections.length > 0) {
                let point = intersections[0].point;
                let clickEvent = new ThreeClickEvent(this.mouseButtonPressed, this.selectedObj ?? undefined, point);
                this.clickEvent.emit(clickEvent);

                if (!clickEvent.handled) {
                    this.handleClick(clickEvent);
                }
            }
        }

        this.mouseButtonPressed = null;
    }

    private handleClick(clickEvent: ThreeClickEvent): void {
        console.log("Unhandled Click Event");
        console.log(clickEvent);
    }

    private handleDrag(dragEvent: ThreeDragEvent): void {
        let dx = dragEvent.screenDelta.x;
        let dy = dragEvent.screenDelta.y;
        
        if (dragEvent.mouseButtonPressed == MouseButton.Left) { // Rotate
            
            let horizontalAngle: number = THREE.MathUtils.degToRad(dx) * this.sensitivity;
            let verticalAngle: number = THREE.MathUtils.degToRad(dy) * this.sensitivity;

            this.rotateObject(new THREE.Vector3(0, 1, 0), horizontalAngle);
            this.rotateObject(new THREE.Vector3(1, 0, 0), verticalAngle);
        }
        else if (dragEvent.mouseButtonPressed == MouseButton.Right) { // Pan
            let dampening: number = 0.005 * this.sensitivity;
            let movementDelta: THREE.Vector3 = new THREE.Vector3(dx, -dy, 0).multiplyScalar(dampening);
            this.moveObject(movementDelta, this.rootObj);
        }
    }

    //#endregion Event Listeners
}
