import { Vector3 } from "three";
import { MeasurementPoint } from "./measurement-point";
import { ThreeComponent } from "../../three/index";

export abstract class Measurement {

    protected points: MeasurementPoint[];
    protected pointLimit: number;
    
    public get hasPointLimit(): boolean {
        return this.pointLimit > 0;
    }
    
    abstract get value(): number;

    constructor() {
        this.points = [];
        this.pointLimit = -1;
    }

    public setNextPoint(point: Vector3, threeContext?: ThreeComponent): boolean {
        if (this.hasPointLimit && this.points.length == this.pointLimit) return false;

        let newPoint = new MeasurementPoint(point);
        this.points.push(newPoint);

        if (threeContext != null) {
            threeContext.attachToRoot(newPoint);
        }

        return true;
    }

    public clear(threeContext?: ThreeComponent) {
        if (threeContext != null) {
            for (let i = 0; i < this.points.length; i++) {
                threeContext.removeFromScene(this.points[i]);
            }
        }

        this.points = [];
    }
}
