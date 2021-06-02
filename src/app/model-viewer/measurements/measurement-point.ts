import { Color, Vector3, SphereGeometry, MeshBasicMaterial, Mesh } from "three";

export class MeasurementPoint extends Mesh {
    public color: Color;

    constructor(position: Vector3, name: string = "measurementPoint", color: Color = new Color("red")) {
        super();

        this.position.set(position.x, position.y, position.z);
        this.name = name;
        this.color = color;

        let sphereGeometry = new SphereGeometry(0.025, 8, 8);
        let material = new MeshBasicMaterial();
        material.color.set(color);

        this.geometry = sphereGeometry;
        this.material = material;
    }
}
