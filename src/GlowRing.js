import { Class, Eventable, Handlerable } from 'maptalks';

const options = {
    scale : 1.0
};

const vertices = [-1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0];
const indiecs = [0, 1, 2, 0, 2, 3];

export default class GlowRing extends Eventable(Handlerable(Class)) {
    constructor(coordinates,  options) {
        //options增加shader字段
        super(options);
        this.options.uniforms = this.options.uniforms || {};
        this._coordinates = coordinates;
        this._vertices = vertices;
        this._indices = indiecs;
    }

    addTo(layer) {
        layer.addRings(this);
        this._layer = layer;
        return this;
    }

    remove() {
        if (this._layer) {
            this._layer.removeRings(this);
        }
    }

    getCoordinates() {
        return this._coordinates;
    }

    setCoordinates(coordinates) {
        this._coordinates = coordinates;
        return this;
    }

    getShader() {
        return this.options.shader;
    }

    setShader(name) {
        this.options.shader = name;
        return this;
    }

    setColor(color) {
        this.options.uniforms.iColor = color;
        return this;
    }

    setSpeed(speed) {
        this.options.uniforms.iSpeed = speed;
        return this;
    }

    setRadius(radius) {
        this.options.uniforms.iRadius = radius;
        return this;
    }

    getRadius() {
        return this.options.uniforms.iRadius || 1.0;
    }

    setUniforms(uniforms) {
        this.options.uniforms = uniforms;
        return this;
    }

    getUniforms() {
        return this.options.uniforms;
    }
}

GlowRing.mergeOptions(options);
