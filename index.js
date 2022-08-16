import * as maptalks from 'maptalks';

const options = {
    // snapTo threshold
    tolerance: 15,
    // filter geometries for get Adsorption reference object
    fiterGeometries: null
};

const TEMP_POINT = new maptalks.Point(0, 0);

function coordinateToContainerPoint(coordinate, map, out) {
    return map.coordToContainerPoint(coordinate, null, out);
}

const TEMP_LINE = [[0, 0], [0, 0]], TEMP_MOUSEPOINT = [0, 0];
// code from https://zhuanlan.zhihu.com/p/408786267
function getShortestPointInLine(line, p) {
    const p1 = line[0];
    const p2 = line[1];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const cross = dx * (p[0] - p1[0]) + dy * (p[1] - p1[1]);
    if (cross <= 0) {
        TEMP_POINT.x = p1[0];
        TEMP_POINT.y = p1[1];
        return TEMP_POINT;
    }
    const d2 = dx * dx + dy * dy;
    if (cross >= d2) {
        TEMP_POINT.x = p2[0];
        TEMP_POINT.y = p2[1];
        return TEMP_POINT;
    }
    // 垂足
    const u = cross / d2;
    TEMP_POINT.x = (p1[0] + u * dx);
    TEMP_POINT.y = (p1[1] + u * dy);
    return TEMP_POINT;
}

const TEMP_POINT1 = new maptalks.Point(0, 0),
    TEMP_POINT2 = new maptalks.Point(0, 0),
    TEMP_POINT3 = new maptalks.Point(0, 0),
    TEMP_POINT4 = new maptalks.Point(0, 0),
    TEMP_EXTENT = new maptalks.Extent(0, 0, 0, 0),
    TEMP_COORDINATE = new maptalks.Coordinate(0, 0);

function ringBBOX(ring, map, tolerance) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (let i = 0, len = ring.length; i < len; i++) {
        const { x, y } = ring[i];
        minx = Math.min(x, minx);
        miny = Math.min(y, miny);
        maxx = Math.max(x, maxx);
        maxy = Math.max(y, maxy);
    }
    TEMP_COORDINATE.x = minx;
    TEMP_COORDINATE.y = miny;
    const p1 = coordinateToContainerPoint(TEMP_COORDINATE, map, TEMP_POINT1);
    TEMP_COORDINATE.x = minx;
    TEMP_COORDINATE.y = maxy;
    const p2 = coordinateToContainerPoint(TEMP_COORDINATE, map, TEMP_POINT2);
    TEMP_COORDINATE.x = maxx;
    TEMP_COORDINATE.y = maxy;
    const p3 = coordinateToContainerPoint(TEMP_COORDINATE, map, TEMP_POINT3);
    TEMP_COORDINATE.x = maxx;
    TEMP_COORDINATE.y = miny;
    const p4 = coordinateToContainerPoint(TEMP_COORDINATE, map, TEMP_POINT4);
    TEMP_EXTENT.xmin = Math.min(p1.x, p2.x, p3.x, p4.x) - tolerance;
    TEMP_EXTENT.ymin = Math.min(p1.y, p2.y, p3.y, p4.y) - tolerance;
    TEMP_EXTENT.xmax = Math.max(p1.x, p2.x, p3.x, p4.x) + tolerance;
    TEMP_EXTENT.ymax = Math.max(p1.y, p2.y, p3.y, p4.y) + tolerance;
    return TEMP_EXTENT;
}

export class Adsorption extends maptalks.Class {
    constructor(map, options) {
        super(options);
        this.map = map;
        this._mousePoint = null;
        this.map.on('mousemove', this._mouseMove, this);
    }

    _mouseMove(e) {
        this._mousePoint = e.containerPoint;
        return this;
    }

    _validateMousePosition(point) {
        return (this._mousePoint && this._mousePoint.distanceTo(point) <= this.options.tolerance + 5);
    }

    setGeometry(geometry) {
        this.removeGeometry();
        this.geometry = geometry;

        const snapTo = (handleConatainerPoint) => {
            if (!handleConatainerPoint) {
                return;
            }
            let geometries;
            const fiterGeometries = this.options.fiterGeometries;
            if (fiterGeometries && maptalks.Util.isFunction(fiterGeometries)) {
                geometries = fiterGeometries();
            }
            if (!geometries || geometries.length === 0) {
                const layer = this.geometry.getLayer();
                geometries = layer.getGeometries();
            }
            return this._nearest(geometries, handleConatainerPoint);
        };
        // bind adsort function
        this.geometry.snapTo = snapTo;
        return this;
    }

    removeGeometry() {
        if (this.geometry) {
            delete this.geometry.snapTo;
        }
        delete this.geometry;
        return this;
    }

    dispose() {
        this.removeGeometry();
        this.map.off('mousemove', this._mouseMove, this);
        delete this.map;
        delete this._mousePoint;
    }

    _nearest(geometries, handleConatainerPoint) {
        // geometries = this._sortGeometries(geometries, handleConatainerPoint);
        let point;
        for (let i = 0, len = geometries.length; i < len; i++) {
            if (geometries[i] === this.geometry) {
                continue;
            }
            point = this._nearestGeometry(geometries[i], handleConatainerPoint);
            if (point) {
                break;
            }
        }
        if (point) {
            return point;
        }
        return this._mousePoint && this._mousePoint.copy();
    }

    _nearestGeometry(geometry, handleConatainerPoint) {
        // multi geometry
        if (geometry.getGeometries) {
            const geometries = geometry.getGeometries();
            for (let i = 0, len = geometries.length; i < len; i++) {
                const point = this._nearestGeometry(geometries[i], handleConatainerPoint);
                if (point) {
                    return point;
                }
            }
            return;
        }
        const tolerance = Math.max(this.options.tolerance, 1);
        const coordinates = geometry.getCoordinates();
        const map = this.map;
        const isNearest = (point) => {
            return handleConatainerPoint.distanceTo(point) <= tolerance && this._validateMousePosition(point);
        };
        if (geometry instanceof maptalks.Marker) {
            const point = coordinateToContainerPoint(coordinates, this.map, TEMP_POINT);
            if (isNearest(point)) {
                return point.copy();
            }
            return;
        }

        const nearestRing = (ring) => {
            if (!ring || ring.length < 2) {
                return;
            }
            const bbox = ringBBOX(ring, map, tolerance);
            const x = handleConatainerPoint.x, y = handleConatainerPoint.y;
            if (x < bbox.xmin || y < bbox.ymin || x > bbox.xmax || y > bbox.ymax) {
                return;
            }
            const len = ring.length;
            let i = 0;
            let POINT;
            for (; i < len - 1; i++) {
                const coordinate = ring[i];
                const point = POINT || coordinateToContainerPoint(coordinate, map, TEMP_POINT);
                if (!POINT && isNearest(point)) {
                    return point.copy();
                }
                const coordinate1 = ring[i + 1];
                const point1 = coordinateToContainerPoint(coordinate1, map, TEMP_POINT1);
                if (isNearest(point1)) {
                    return point1.copy();
                }
                TEMP_LINE[0][0] = point.x;
                TEMP_LINE[0][1] = point.y;
                TEMP_LINE[1][0] = point1.x;
                TEMP_LINE[1][1] = point1.y;
                TEMP_MOUSEPOINT[0] = handleConatainerPoint.x;
                TEMP_MOUSEPOINT[1] = handleConatainerPoint.y;

                const linePoint = getShortestPointInLine(TEMP_LINE, TEMP_MOUSEPOINT);
                if (isNearest(linePoint)) {
                    return linePoint.copy();
                }
                POINT = TEMP_POINT2;
                POINT.x = point1.x;
                POINT.y = point1.y;
            }
        };
        if (geometry instanceof maptalks.LineString) {
            const point = nearestRing(coordinates);
            if (point) {
                return point.copy();
            }
            return;
        }
        if (geometry instanceof maptalks.Polygon) {
            for (let i = 0, len = coordinates.length; i < len; i++) {
                const point = nearestRing(coordinates[i]);
                if (point) {
                    return point.copy();
                }
            }
        }
    }

    _sortGeometries(geometries, handleConatainerPoint) {
        const map = this.map;
        geometries.forEach(geo => {
            const center = geo.getCenter();
            if (!center) {
                return;
            }
            const containerPoint = coordinateToContainerPoint(center, map);
            geo._distance = handleConatainerPoint.distanceTo(containerPoint);
        });
        return geometries.sort((geo1, geo2) => {
            return geo1._distance - geo2._distance;
        });
    }

}
Adsorption.mergeOptions(options);
