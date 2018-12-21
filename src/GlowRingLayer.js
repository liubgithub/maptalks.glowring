import * as maptalks from 'maptalks';
import GlowRingRenderer from './GlowRingRenderer';

const options = {
    renderer : 'gl',
    forceRenderOnZooming : true,
    forceRenderOnMoving : true,
    forceRenderOnRotating : true
};

let uid = 0;

class GlowRingLayer extends maptalks.Layer {
    constructor(id, options) {
        super(id, options);
        this._ringList = {};
    }

    addRings(rings) {
        if (Array.isArray(rings)) {
            rings.forEach(ring => {
                this.addRings(ring);
            });
        } else {
            //this.ringList.push(rings);
            this._ringList[uid] = rings;
            rings._uid = uid;
            rings.options.iTime = 0.0;
            uid++;
            const renderer = this._getRenderer();
            if (renderer) {
                //如果createContext执行过，则直接创建scene
                if (renderer.regl) {
                    renderer._createMesh(rings);
                }
            }
        }
    }

    removeRings(rings) {
        if (Array.isArray(rings)) {
            rings.forEach(ring => {
                this.removeRings(ring);
            });
        } else {
            delete this._ringList[rings._uid];
            const renderer = this._getRenderer();
            if (renderer) {
                renderer._deleteScene(rings);
            }
        }
    }

    clear() {
        const renderer = this._getRenderer();
        if (renderer) {
            renderer._deleteAll();
        }
    }

    registerSahder(name, type, config, uniforms) {
        const renderer = this._getRenderer();
        if (renderer) {
            renderer._registerShader(name, type, config, uniforms);
        }
    }
}

GlowRingLayer.mergeOptions(options);

GlowRingLayer.registerRenderer('gl', GlowRingRenderer);

export default GlowRingLayer;
