import * as maptalks from 'maptalks';
import { reshader, mat4, vec4, createREGL } from '@maptalks/gl';
import { intersectsBox } from 'frustum-intersects';
import vert from './glsl/ring.vert';
import frag from './glsl/ring.frag';

class GlowRingRenderer extends maptalks.renderer.CanvasRenderer {

    draw() {
        //time = timestamp;
        this.prepareCanvas();
        this._renderScene();
    }

    needToRedraw() {
        return true;
    }

    drawOnInteracting() {
        //time = timestamp;
        this._renderScene();
    }

    hitDetect() {
        return false;
    }

    createContext() {
        if (this.canvas.gl && this.canvas.gl.wrap) {
            this.gl = this.canvas.gl.wrap();
        } else {
            const layer = this.layer;
            const attributes = layer.options.glOptions || {
                alpha: true,
                depth: true,
                antialias: true,
                stencil : true
            };
            this.glOptions = attributes;
            this.gl = this.gl || this._createGLContext(this.canvas, attributes);
        }
        this.regl = createREGL({
            gl : this.gl,
            extensions : [
                // 'ANGLE_instanced_arrays',
                // 'OES_texture_float',
                // 'OES_texture_float_linear',
                // 'OES_element_index_uint',
                'OES_standard_derivatives'
            ],
            optionalExtensions : this.layer.options['glExtensions'] || []
        });
        this._initRenderer();
        this._createAllScene();
    }

    _initRenderer() {
        const map = this.layer.getMap();
        const renderer = new reshader.Renderer(this.regl);
        //this.scenes = [];
        //this._shaderList = this._shaderList || {};
        this.renderer = renderer;
        this._uniforms = {
            'projViewMatrix' : map.projViewMatrix
        };
        this._initDefaultShader();
    }

    _createAllScene() {
        if (this.layer._ringList) {
            for (const name in this.layer._ringList) {
                const ring = this.layer._ringList[name];
                if (!ring.isCreatedScene) {
                    this._createMesh(ring);
                }
            }
        }
    }

    _createMesh(ring) {
        const geometry = new reshader.Geometry(
            //geometry的attributes数据
            //1. 保留的属性： aPosition, aNormal, aTexCoord, aColor, aTangent
            //2. 支持添加自定义attribute数据, attribute变量名字和glsl中的变量名必须一致，以让regl自动传值
            //3. 值可以是类型数组，也可以是 regl.buffer(...) 方法创建的 buffer 对象
            {
                aPosition : ring._vertices
            },
            //索引数据
            //1. elements，可以是类型数组，也可以是 regl.elements(..) 方法创建的 elements 对象
            //2. count， 数字，如果geometry不是索引类型(drawElements)，这里直接指定绘制的图元数量(同drawArrays中的count参数)
            ring._indices,
            0,
            {
                //绘制类型，例如 triangle strip, line等，具体类型请查阅regl
                primitive : 'triangles',
                positionAttribute : 'aPosition'
            }
        );
        //传入数据为类型数组时，可以调用 generateBuffers 将attributes 和 elements 转化为 regl的 buffer对象
        //方便实际绘制时，不再重复拷贝数据 (bufferData)
        geometry.generateBuffers(this.regl);
        const ringMesh = new reshader.Mesh(geometry);
        const position = coordinateToWorld(this.layer.getMap(), ring.getCoordinates());
        const transformMat = mat4.identity([]);
        mat4.translate(transformMat, transformMat, position);
        //默认scale为3.0
        mat4.scale(transformMat, transformMat, [3.0, 3.0, 3.0]);
        ringMesh.setLocalTransform(transformMat);
        const scene = new reshader.Scene(ringMesh);
        ring._scene = scene;
        ring.isCreatedScene = true;
        this.setToRedraw();
    }

    _initDefaultShader() {
        const defaultShader = this._getDefaultShader();
        this._registerShader('default', 'MeshShader', defaultShader.shader, defaultShader.uniforms);
    }

    _registerShader(name, type, config, uniforms) {
        this._shaderList = this._shaderList || {};
        this._shaderList[name] = {
            shader : new reshader[type](config),
            uniforms : uniforms
        };
    }

    clearCanvas() {
        if (!this.canvas) {
            return;
        }
        this.regl.clear({
            color: [0, 0, 0, 0],
            depth: 1,
            stencil : 0
        });
        super.clearCanvas();
    }

    _renderScene() {
        for (const uid in this.layer._ringList) {
            const ring = this.layer._ringList[uid];
            if (!ring.isVisible()) {
                continue;
            }
            this._updateSceneMatrix(ring);
            const toRenderScene = this._createSceneInFrustum(ring._scene);
            if (!toRenderScene) {
                continue;
            }
            const shaderName = ring.getShader() || 'default';
            //如果在初始化的时候没有设置options，则用默认的shader
            if (!ring.getShader()) {
                ring.setShader(shaderName);
            }
            const shaderItem = this._shaderList[shaderName];
            //如果marker没有uniforms，则使用注册shader时对应的uniforms, this._uniforms是诸如viewprojMatrix
            const markerUniforms = maptalks.Util.extend({}, shaderItem.uniforms, ring.getUniforms());
            markerUniforms.iTime += 0.01;
            const uniforms = maptalks.Util.extend({}, markerUniforms, this._uniforms);
            ring.setUniforms(uniforms);
            // console.log(marker._modelMatrix);
            this.renderer.render(shaderItem.shader, uniforms, toRenderScene, null);
        }
        this.completeRender();
    }

    //创建新的用于渲染的mesh，与Frustum相交的mesh才绘制
    _createSceneInFrustum(scene) {
        const meshes = scene.getMeshes();
        const len = meshes.length;
        const map = this.layer.getMap();
        const visibles = [];
        const v0 = [], v1 = [];
        for (let i = 0; i < len; i++) {
            const mesh = meshes[i];
            const box = mesh.geometry.boundingBox;
            const min = box.min;
            const max = box.max;
            vec4.set(v0, min[0], min[1], min[2], 1);
            vec4.set(v1, max[0], max[1], max[2], 1);
            const boxMin = vec4.transformMat4(v0, v0, mesh.localTransform);
            const boxMax = vec4.transformMat4(v1, v1, mesh.localTransform);
            if (intersectsBox(map.projViewMatrix, [boxMin, boxMax])) {
                visibles.push(mesh);
            }
        }
        return visibles.length ? new reshader.Scene(visibles) : null;
    }

    _updateSceneMatrix(ring) {
        const meshes = ring._scene.getMeshes();
        const position = coordinateToWorld(this.layer.getMap(), ring.getCoordinates());
        const transformMat = mat4.identity([]);
        mat4.translate(transformMat, transformMat, position);
        mat4.scale(transformMat, transformMat, [3.0, 3.0, 3.0]);
        meshes.forEach(mesh => {
            mesh.setLocalTransform(transformMat);
        });
    }

    _deleteScene(ring) {
        if (defined(ring)) {
            this._disposeMesh(ring);
            this.setToRedraw();
        }
    }

    _deleteAll() {
        for (const uid in this.layer._ringList) {
            this._disposeMesh(this.layer._ringList[uid]);
        }
        this.layer._ringList = {};
        this.setToRedraw();
    }

    _disposeMesh(ring) {
        const meshes = ring._scene.getMeshes();
        meshes.forEach(mesh => {
            mesh.geometry.dispose();
            if (mesh.material) {
                mesh.material.dispose();
            }
            mesh.dispose();
        });
    }

    _createGLContext(canvas, options) {
        const names = ['webgl', 'experimental-webgl'];
        let context = null;
        /* eslint-disable no-empty */
        for (let i = 0; i < names.length; ++i) {
            try {
                context = canvas.getContext(names[i], options);
            } catch (e) {}
            if (context) {
                break;
            }
        }
        return context;
        /* eslint-enable no-empty */
    }

    _getDefaultShader() {
        const map = this.layer.getMap();
        const shader = {
            vert,
            frag,
            // 着色器程序中的uniform变量
            uniforms : [
                'iResolution',
                'iTime',
                'center',
                'iRadius',
                'iColor',
                'iSpeed',
                {
                    name : 'projViewModelMatrix',
                    type : 'function',
                    fn : function (context, props) {
                        return mat4.multiply([], props['projViewMatrix'], props['modelMatrix']);
                    }
                }
            ],
            defines : {
            },
            extraCommandProps : {
                //transparent:true,
                depth:{
                    enable:false
                },
                blend:{
                    enable:true,
                    func: {
                        srcRGB: 'src alpha',
                        srcAlpha: 1,
                        dstRGB:'one',
                        dstAlpha: 1
                    },
                    equation: {
                        rgb: 'add',
                        alpha: 'add'
                    },
                    color: [0, 0, 0, 0]
                }
            }
        };
        const uniforms = {
            'iResolution':[map.width, map.height],
            'iTime':0.0,
            'center' : [0, 0, 0],
            'iRadius' : 1.0,
            'iColor' : [1.0, 0.0, 0.0],
            'iSpeed' : 3.0
        };
        return { shader, uniforms };
    }
}

export default GlowRingRenderer;

function isNil(obj) {
    return obj === null || obj === undefined;
}


function defined(obj) {
    return !isNil(obj);
}

function coordinateToWorld(map, coordinate, z = 0.1) {
    if (!map) {
        return null;
    }
    const p = map.coordinateToPoint(coordinate, getTargetZoom(map));
    return [p.x, p.y, z];
}

function getTargetZoom(map) {
    return map.getGLZoom();
}
