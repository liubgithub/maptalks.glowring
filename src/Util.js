import * as maptalks from 'maptalks';

const types = ['Unknown', 'Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'];

export function toFilterFeature(feature) {
    const f = maptalks.Util.extend({}, feature);
    f.type = types.indexOf(feature.geometry.type);
    return f;
}

export function getIndexArrayType(max) {
    if (max < 256) return Uint8Array;
    if (max < 65536) return Uint16Array;
    return Uint32Array;
}
