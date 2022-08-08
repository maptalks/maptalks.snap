import * as maptalks from 'maptalks';

const options = {
    // adsorb threshold
    tolerance: 15,
    // filter geometries for get Adsorption reference object
    fiterGeometries: null
};

const TEMP_POINT = new maptalks.Point(0, 0),
    TEMP_POINT1 = new maptalks.Point(0, 0);

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
        return p1;
    }
    const d2 = dx * dx + dy * dy;
    if (cross >= d2) {
        return p2;
    }
    // 垂足
    const u = cross / d2;
    TEMP_POINT.x = (p1[0] + u * dx);
    TEMP_POINT.y = (p1[1] + u * dy);
    return TEMP_POINT;
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

        const adsorb = (handleConatainerPoint) => {
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
                geometries = layer.getGeometries().filter(geo => {
                    return geo !== this.geometry;
                });
            }
            return this._nearest(geometries, handleConatainerPoint);
        };
        // bind adsort function
        this.geometry.adsorb = adsorb;
        return this;
    }

    removeGeometry() {
        if (this.geometry) {
            delete this.geometry.adsorb;
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
        geometries = this._sortGeometries(geometries, handleConatainerPoint);
        for (let i = 0, len = geometries.length; i < len; i++) {
            if (geometries[i] === this.geometry) {
                continue;
            }
            const point = this._nearestGeometry(geometries[i], handleConatainerPoint);
            if (point) {
                return point;
            }
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
        }
        const tolerance = Math.max(this.options.tolerance, 1);
        const coordinates = geometry.getCoordinates();
        const isNearest = (point) => {
            return handleConatainerPoint.distanceTo(point) <= tolerance && this._validateMousePosition(point);
        };
        if (geometry instanceof maptalks.Marker) {
            const point = coordinateToContainerPoint(coordinates, this.map, TEMP_POINT);
            if (isNearest(point)) {
                return point.copy();
            }
        }

        const nearestRing = (ring) => {
            const len = ring.length;
            let i = 0;
            for (; i < len - 1; i++) {
                const coordinate = ring[i];
                const point = coordinateToContainerPoint(coordinate, this.map, TEMP_POINT);
                if (isNearest(point)) {
                    return point.copy();
                }
                const coordinate1 = ring[i + 1];
                const point1 = coordinateToContainerPoint(coordinate1, this.map, TEMP_POINT1);
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
            }
        };
        if (geometry instanceof maptalks.LineString) {
            const point = nearestRing(coordinates);
            if (point) {
                return point.copy();
            }
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
