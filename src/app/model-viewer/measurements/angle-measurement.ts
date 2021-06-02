import { Measurement } from "./measurement";

export class AngleMeasurement extends Measurement {
    
    public get value(): number {
        if (this.points.length != 3) return 0;
        
        let v1 = this.points[0].position.sub(this.points[1].position);
        let v2 = this.points[2].position.sub(this.points[1].position);
        
        let angle = 0;
        angle = v1.angleTo(v2);
        angle = angle * (180/Math.PI);

        return angle;
    }

    constructor() {
        super();
        this.pointLimit = 3;
    }
}
