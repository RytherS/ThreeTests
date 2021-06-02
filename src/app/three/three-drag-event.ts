import { Object3D, Vector2 } from "three";
import { MouseButton } from "./three-enums";

export class ThreeDragEvent extends Event{

    public screenDelta: Vector2;
    public originalClickPosition: Vector2;
    public currentMousePosition: Vector2;
    public mouseButtonPressed: MouseButton;
    public selectedObject: Object3D | null;
    public handled: boolean = false;

    constructor(screenDelta: Vector2, originalClickPosition: Vector2, currentMousePosition: Vector2, mouseButtonPressed: MouseButton, selectedObject?: Object3D) {
        super("three-drag-event");

        this.screenDelta = screenDelta;
        this.originalClickPosition = originalClickPosition;
        this.currentMousePosition = currentMousePosition;
        this.mouseButtonPressed = mouseButtonPressed;
        this.selectedObject = selectedObject ?? null;
    }
}
