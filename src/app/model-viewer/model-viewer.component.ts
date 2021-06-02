import { Component, OnInit, AfterViewInit, ViewChild, ChangeDetectionStrategy } from '@angular/core';
import { MathUtils, Mesh, MeshPhongMaterial, BoxGeometry, Vector3, Group, Box3, Object3D, MeshNormalMaterial, MeshBasicMaterial, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineLoop, SphereGeometry, Color } from "three";
import { Measurement, DistanceMeasurement, AngleMeasurement, MeasurementPoint } from "./measurements/index";
import { ThreeClickEvent, ThreeDragEvent, MouseButton, ThreeUtils, ZoomDirection, ThreeComponent } from "../three/index";

@Component({
    selector: 'app-model-viewer',
    templateUrl: './model-viewer.component.html',
    styleUrls: ['./model-viewer.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModelViewerComponent implements OnInit, AfterViewInit {

    @ViewChild("threeComponent", { static: true }) threeComponent: ThreeComponent | null = null;

    public measurement: Measurement | null = null;
    
    private modelMesh: Mesh;
    private rotationControl: Object3D;
    private crossSectionMesh: Mesh | null = null;

    constructor() { 
        this.modelMesh = new Mesh();
        this.rotationControl = new Group();
    }

    ngOnInit(): void {
    }

    // Need to implement this function/do initialization here because Three isn't fully ready until this life cycle hook (or something like that, don't remember exactly why)
    ngAfterViewInit(): void {
        if (this.threeComponent == null) {
            throw new Error("A ModelViewerComponent must have a ThreeComponent nested within it.");
        }
        else {
            this.loadExampleCube();
            this.threeComponent.attachToRoot(this.modelMesh);

            this.createRotationControl();
            this.threeComponent.addToScene(this.rotationControl);
        }
    }

    private createRotationControl(): void {
        let circleGeometry: BufferGeometry = this.createCircleGeometry();

        let sphereGeometry = new SphereGeometry(0.05, 10, 10);
        let positionBuffer = circleGeometry.getAttribute("position");
        let sphereLocation: Vector3 = new Vector3(positionBuffer.getX(12), 0, positionBuffer.getZ(12));

        let xColor: Color = new Color(0xFF0000); // R
        let yColor: Color = new Color(0x00FF00); // G
        let zColor: Color = new Color(0x0000FF); // B

        let xCircle = new LineLoop(circleGeometry, new LineBasicMaterial({color: xColor, linewidth: 0.01}));
        xCircle.layers.set(1);
        let yCircle = new LineLoop(circleGeometry, new LineBasicMaterial({color: yColor, linewidth: 0.01}));
        yCircle.layers.set(1);
        let zCircle = new LineLoop(circleGeometry, new LineBasicMaterial({color: zColor, linewidth: 0.01}));
        zCircle.layers.set(1);

        let xSphere = new Mesh(sphereGeometry, new MeshBasicMaterial({color: xColor}));
        xSphere.position.set(sphereLocation.x, 0, sphereLocation.z);
        xSphere.name = "xRotationSphere";
        let ySphere = new Mesh(sphereGeometry, new MeshBasicMaterial({color: yColor}));
        ySphere.position.set(sphereLocation.x, 0, sphereLocation.z);
        ySphere.name = "yRotationSphere";
        let zSphere = new Mesh(sphereGeometry, new MeshBasicMaterial({color: zColor}));
        zSphere.position.set(sphereLocation.x, 0, sphereLocation.z);
        zSphere.name = "zRotationSphere";

        let xOrbit = new Group().add(xCircle, xSphere);
        let yOrbit = new Group().add(yCircle, ySphere);
        let zOrbit = new Group().add(zCircle, zSphere);

        // Orient to rotate *around* the specified axis
        xOrbit.rotateZ(MathUtils.degToRad(90));
        zOrbit.rotateX(MathUtils.degToRad(90));

        this.rotationControl.add(xOrbit);
        this.rotationControl.add(yOrbit);
        this.rotationControl.add(zOrbit);
    }

    // Pretty much an exact copy of what is currently in CRSApp
    private createCircleGeometry(divisions: number = 100, radius: number = 1): BufferGeometry {
        let positionBuffer: number[] = [];
        
        let angleStep = (2 * Math.PI) / divisions;
        let angle: number = 0;
        
        for (let i = 0; i < divisions; i++) {
            angle = i * angleStep;
            let x = Math.cos(angle) * radius;
            let z = Math.sin(angle) * radius;

            positionBuffer.push(x, 0, z);
        }

        let circleGeometry: BufferGeometry = new BufferGeometry();
        circleGeometry.setAttribute("position", new Float32BufferAttribute(positionBuffer, 3));

        return circleGeometry;
    }

    // This was the super initial test to select a local OBJ file
    // "Select OBJ" Button
    public parseObjFile(fileEvent: Event): void {
        const element = fileEvent.currentTarget as HTMLInputElement;
        let files: FileList | null = element?.files;

        if (files != null && files[0] != null && this.threeComponent != null) {
            let objFile = files[0];
            let objFilePath = URL.createObjectURL(objFile);

            ThreeUtils.loadObj(objFilePath, (group: Group) => {
                    this.setModelMesh(group);
                }
            );
        }
    }

    public loadExampleCube(): void {
        let geometry = new BoxGeometry(1, 1, 1);
        let material = new MeshPhongMaterial();
        let mesh = new Mesh(geometry, material);

        this.resetView();
        this.setModelMesh(mesh);
    }

    // Was running a local Python http server for testing loading from an "external server"
    // "Load Server Model" Button
    public loadFromServer(): void {
        let chrisObjPath: string = "http://localhost:8000/Model.obj";
        let chrisMtlPath: string = "http://localhost:8000/model.mtl";

        ThreeUtils.loadTexturedObj(chrisObjPath, chrisMtlPath,
                                    (group: Group) => {
                                        group.rotateY(MathUtils.degToRad(180));
                                        group.rotateZ(MathUtils.degToRad(-90));
                                        group.position.set(0, 0, 1.5);
                                        
                                        this.setModelMesh(group);
                                    }
                                );
    }

    public loadFromZip(fileEvent: Event): void {
        const element = fileEvent.currentTarget as HTMLInputElement;
        let files: FileList | null = element?.files;

        if (files != null && files[0] != null) {
            let zipFile = files[0];
            ThreeUtils.loadObjFromZip(zipFile, (obj: Object3D) => {
                this.resetView();
                this.setModelMesh(obj);
            });
        }
    }

    public resetView(): void {
        this.clearMeasurement();
        this.threeComponent?.clearRoot();
        this.threeComponent?.resetRootTransform();
        this.threeComponent?.attachToRoot(this.modelMesh);
    }

    public takeDistanceMeasurement(): void {
        this.clearMeasurement();
        this.measurement = new DistanceMeasurement();
    }

    public takeAngleMeasurement(): void {
        this.clearMeasurement();
        this.measurement = new AngleMeasurement();
    }

    public addCrossSectionMesh(): void {
        if (this.threeComponent != null) {
            let displayedMesh = ThreeUtils.getChildMesh(this.threeComponent.rootObj);

            if (displayedMesh != null) {
                let extents = new Box3().setFromObject(displayedMesh);

                let width = extents.max.x - extents.min.x;
                let height = extents.max.y - extents.min.y;
                let depth = extents.max.z - extents.min.z;
    
                let cubeGeometry = new BoxGeometry(width, height, 0.001);
                cubeGeometry.scale(1.2, 1.2, 1);
    
                let crossSectionMesh = new Mesh(cubeGeometry, new MeshNormalMaterial());
                this.crossSectionMesh = crossSectionMesh;
    
                this.threeComponent.attachToRoot(this.crossSectionMesh);
            }
        }
    }

    public takeCrossSectionMeasurement(): void {
        if (this.threeComponent != null) {
            let modelMesh = ThreeUtils.getChildMesh(this.threeComponent.rootObj);

            if (modelMesh != null && this.crossSectionMesh != null) {
                this.threeComponent.clearRoot();
                this.clearMeasurement();
    
                let intersectionResult: Mesh = ThreeUtils.getIntersectionMesh(modelMesh, this.crossSectionMesh);

                this.threeComponent.attachToRoot(intersectionResult);
            }
            else {
                console.log("No model mesh found.");
            }
        }
    }

    private clearMeasurement(): void {
        if (this.measurement != null && this.threeComponent != null) {
            this.measurement.clear(this.threeComponent);
            this.measurement = null;

            if (this.crossSectionMesh != null) {
                this.threeComponent.removeFromScene(this.crossSectionMesh);
                this.crossSectionMesh = null;
            }
        }
    }

    public moveModel(direction: string): void {
        let delta: Vector3 = new Vector3();

        switch (direction) {
            case "up":
                delta.set(0, 0.2, 0);
                break;
            case "down":
                delta.set(0, -0.2, 0);
                break;
            case "left":
                delta.set(-0.2, 0, 0);
                break;
            case "right":
                delta.set(0.2, 0, 0);
                break;
            default:
                break;
        }

        this.threeComponent?.moveObject(delta);
    }

    public zoom(direction: string): void {
        switch (direction) {
            case "in":
                this.threeComponent?.zoom(ZoomDirection.In);
                break;
            case "out":
                this.threeComponent?.zoom(ZoomDirection.Out);
                break;
            default:
                break;
        }
    }

    private setNextMeasurementPoint(point: Vector3) {
        if (this.measurement != null && this.threeComponent != null) {
            this.measurement.setNextPoint(point, this.threeComponent);
        }
    }

    private setModelMesh(object: Object3D): void {
        let mesh = ThreeUtils.getChildMesh(object);
        if (mesh != null) {
            this.modelMesh.geometry = mesh.geometry;
            this.modelMesh.material = mesh.material;
        }
    }

    //#region Three Event Listeners

    public onUpdate(dt: number): void {
        this.rotationControl.rotation.setFromVector3(new Vector3(0, 0, 0));
    }

    public handleClick(clickEvent: ThreeClickEvent): void {
        if (clickEvent.worldIntersectionPoint != null) {
            this.setNextMeasurementPoint(clickEvent.worldIntersectionPoint);
            clickEvent.handled = true;
        }
    }

    public handleDrag(dragEvent: ThreeDragEvent): void {
        if (this.threeComponent != null && dragEvent.selectedObject != null && dragEvent.mouseButtonPressed == MouseButton.Left) {
            if (dragEvent.selectedObject instanceof MeasurementPoint && ThreeUtils.isNDC(dragEvent.currentMousePosition)) {
                // Adjust measurement point
                let objectWorldPosition = ThreeUtils.getObjectWorldPosition(dragEvent.selectedObject);
                let pointerWorldPosition = ThreeUtils.toWorldSpace(new Vector3(dragEvent.currentMousePosition.x, dragEvent.currentMousePosition.y, 0), this.threeComponent.camera);
                pointerWorldPosition.setZ(objectWorldPosition.z); // We don't want to adjust the depth of the object, just it's vertical/horizontal position relative to the camera.

                let movementDelta: Vector3 = pointerWorldPosition.sub(objectWorldPosition);

                this.threeComponent.moveObject(movementDelta, dragEvent.selectedObject);
                dragEvent.handled = true;
            }
            else if (ThreeUtils.findChild(this.rotationControl, (obj) => obj.name != "" && dragEvent.selectedObject?.name == obj.name) != null) {
                // Rotate on specific axis
                let axis: Vector3 = new Vector3();
                let theta: number = 0;
                
                switch (dragEvent.selectedObject.name) {
                    case "xRotationSphere":
                        axis.set(1, 0, 0);
                        theta = MathUtils.degToRad(dragEvent.screenDelta.y) * this.threeComponent.sensitivity;
                        break;

                    case "yRotationSphere":
                        axis.set(0, 1, 0);
                        theta = MathUtils.degToRad(dragEvent.screenDelta.x) * this.threeComponent.sensitivity;
                        break;

                    case "zRotationSphere":
                        let currentX = dragEvent.currentMousePosition.x;
                        let currentY = dragEvent.currentMousePosition.y;

                        let rotationPos = ThreeUtils.getObjectWorldPosition(this.rotationControl).project(this.threeComponent.camera);

                        let mouseDelta = new Vector3(dragEvent.screenDelta.x, -dragEvent.screenDelta.y, 0);
                        let toOrigin = new Vector3(rotationPos.x - currentX, rotationPos.y - currentY, 0);
                        let cross = mouseDelta.cross(toOrigin);

                        axis.set(0, 0, 1);
                        theta = MathUtils.degToRad(cross.z * 0.5) * this.threeComponent.sensitivity;
                        break;
                        
                        default:
                            break;
                }

                this.threeComponent.rotateObject(axis, theta);
                dragEvent.handled = true;
            }
        }
    }

    //#endregion Three Event Listeners
}
