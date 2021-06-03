import { Vector2, Vector3, Raycaster, Object3D, Mesh, Camera, Intersection, LoadingManager } from "three";
import { CSG } from "three-csg-ts";
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import * as JSZip from "jszip";
import { conditionallyCreateMapObjectLiteral } from "@angular/compiler/src/render3/view/util";

// Some of this may be useless/overkill, but I have been doing a ton of playing around, so it is just a little messy from various stages of tinkering ':D
export class ThreeUtils {

    public static toScreenSpace(vector: Vector3, camera: Camera): Vector3 {
        return vector.project(camera);
    }

    public static toWorldSpace(vector: Vector3, camera: Camera): Vector3 {
        return vector.unproject(camera);
    }

    /**
     * @returns True if (X, Y) are both between -1 and 1, otherwise false.
     */
    public static isNDC(mousePosition: Vector2): boolean {
        return mousePosition.x <= 1 && mousePosition.x >= -1 && mousePosition.y <= 1 && mousePosition.y >= -1;
    }

    public static getObjectWorldPosition(targetObj: Object3D) {
        let worldPosition: Vector3 = new Vector3();
        targetObj.getWorldPosition(worldPosition);
        return worldPosition;
    }

    public static getPointerFocusedObject(NDCMousePosition: Vector2, camera: Camera, rootObj: Object3D): THREE.Object3D | null {
        let focusedObject: Object3D | null = null;

        let intersections = ThreeUtils.getPointerIntersections(NDCMousePosition, camera, rootObj);
        
        if (intersections.length > 0) {
          focusedObject = intersections[0].object;
        }
    
        return focusedObject;
    }

    public static getPointerIntersections(NDCMousePosition: Vector2, camera: Camera, rootObj: Object3D): Intersection[] {
        let raycaster: Raycaster = new Raycaster();
        raycaster.layers.set(0);

        let worldPositionVector: Vector3 = new Vector3(NDCMousePosition.x, NDCMousePosition.y, -100).unproject(camera);
        raycaster.set(worldPositionVector, new Vector3(0, 0, -1));

        return raycaster.intersectObject(rootObj, true);
    }

    public static getIntersectionMesh(meshA: Mesh, meshB: Mesh): Mesh {
        return CSG.intersect(meshA, meshB);
    }

    public static loadObj(objFilePath: string, successCallback: Function) : void {
        let objLoader: OBJLoader = new OBJLoader();

        objLoader.load(objFilePath,
                        (group) => successCallback(group),
                        (progressEvent) => console.log(`Object Loading: ${(progressEvent.loaded / progressEvent.total) * 100}%`),
                        (error) => console.log(`Error Loading OBJ: ${error.message}`)
                    );
    }
    
    public static loadTexturedObj(objFilePath: string, mtlFilePath: string, successCallback: Function, loadingManager?: LoadingManager): void {
        let mtlLoader: MTLLoader = new MTLLoader(loadingManager);
        let objLoader: OBJLoader = new OBJLoader(loadingManager);

        mtlLoader.load(mtlFilePath,
                        (mtlCreator) => {
                            mtlCreator.preload();
                            objLoader.setMaterials(mtlCreator);
                            objLoader.load(objFilePath,
                                            (group) => successCallback(group),
                                            (progressEvent) => console.log(`Object Loading: ${(progressEvent.loaded / progressEvent.total) * 100}%`),
                                            (error) => console.log(`Error Loading OBJ: ${error.message}`)
                                        );
                        },
                        (progressEvent) => console.log(`Material Loading: ${(progressEvent.loaded / progressEvent.total) * 100}%`),
                        (error) => console.log(`Error Loading MTL: ${error.message}`));
    }

    public static async loadObjFromZip(zipFile: File): Promise<Object3D | null> {
        if (zipFile.type != "application/x-zip-compressed") return null;

        let unzippedData: JSZip = new JSZip();
        await unzippedData.loadAsync(zipFile);
        
        let mtlFileName: string | null = null;
        let objFileName: string | null = null;

        let fileMap: Map<string, Uint8Array> = new Map<string, Uint8Array>();
        for (let url in unzippedData.files) {
            if (url.endsWith(".mtl")) mtlFileName = url;
            if (url.endsWith(".obj")) objFileName = url;

            let buffer = await unzippedData.files[url].async("uint8array");
            fileMap.set(url, buffer);
        }

        const loadingManager = new LoadingManager();
        loadingManager.setURLModifier( url => {
            let buffer = fileMap.get(url);
            if (buffer != null) {
                let blob = new Blob( [ buffer ] );
                let newUrl = URL.createObjectURL( blob );
                return newUrl;
            }

            return url;
        });

        let materials: MTLLoader.MaterialCreator | null = null;
        if (mtlFileName != null) {
            let mtlText = await unzippedData.file(mtlFileName)?.async("text");
            let mtlLoader = new MTLLoader(loadingManager);
            let basePath: string = mtlFileName.substr(0, mtlFileName.lastIndexOf("/") + 1);

            materials = mtlLoader.parse(mtlText ?? "", basePath);
            materials.preload();
        }

        let obj: Object3D | null = null;
        if (objFileName != null) {
            let objText = await unzippedData.file(objFileName)?.async("text");
            let objLoader = await new OBJLoader(loadingManager);

            if (materials != null) {
                objLoader.setMaterials(materials);
            }

            obj = await objLoader.parse(objText ?? "");
        }

        return obj;
    }

    /**
     * Recursively searches children (deep search) for the first mesh instance.
     * This isn't exactly perfect since it won't get *all* child meshes if there are multiple, but it works for current testing
     */
    public static getChildMesh(rootObj: Object3D): Mesh | null {
        let mesh: Mesh | null = null;

        if (rootObj instanceof Mesh) return rootObj as Mesh;
        else {
            for (let i = 0; i < rootObj.children.length; i++) {
                mesh = ThreeUtils.getChildMesh(rootObj.children[i]);
                if (mesh != null) break;
            }
        }

        return mesh;
    }

    /**
     * Recursively searches for a child (deep search) matching the predicate.
     * @returns The first child that matches the predicate, or null if no children are found to match.
     */
    public static findChild(rootObj: Object3D, searchPredicate: (obj: Object3D) => boolean): Object3D | null {
        let childObject: Object3D | null = null;

        if (searchPredicate(rootObj)) return rootObj
        else {
            for (let i = 0; i < rootObj.children.length; i++) {
                childObject = ThreeUtils.findChild(rootObj.children[i], searchPredicate);
                if (childObject != null) break;
            }
        }

        return childObject;
    }
}
