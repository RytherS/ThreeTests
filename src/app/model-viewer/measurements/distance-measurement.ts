import { Measurement } from "./measurement";

export class DistanceMeasurement extends Measurement {

    public get value(): number {
        if (this.points.length < 2) return 0;

        let totalDistance = 0;

        for (let i = 0; i < this.points.length - 1; i++) {
            totalDistance += this.points[i].position.distanceTo(this.points[i + 1].position);
        }

        return totalDistance;
    }

    constructor() {
        super();
    }
}
