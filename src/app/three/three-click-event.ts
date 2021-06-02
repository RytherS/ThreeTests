import { Object3D, Vector3 } from "three";
import { MouseButton } from "./three-enums";

export class ThreeClickEvent extends Event {

    public selectedObject: Object3D | null;
    public worldIntersectionPoint: Vector3 | null;
    public mouseButtonPressed: MouseButton;
    public handled: boolean = false;

    constructor(mouseButtonPressed: MouseButton, selectedObject?: Object3D, worldIntersectionPoint?: Vector3, type: string = "three-click-event") {
        super(type);

        this.selectedObject = selectedObject ?? null;
        this.worldIntersectionPoint = worldIntersectionPoint ?? null;
        this.mouseButtonPressed = mouseButtonPressed;
    }
}
