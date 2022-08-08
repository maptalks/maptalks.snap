/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
const map = new maptalks.Map('map', {
    center: [116.476284, 40.000917],
    zoom: 17.5,
    baseLayer: new maptalks.TileLayer('base', {
        offset: function (z) {
            const map = this.getMap();
            const center = map.getCenter();
            const c = gcoord.transform(center.toArray(), gcoord.WGS84, gcoord.AMap);
            const offset = map.coordToPoint(center, z).sub(map.coordToPoint(new maptalks.Coordinate(c), z));
            return offset._round().toArray();
        },
        urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        attribution: '&copy; <a href="http://osm.org">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/">CARTO</a>'
    })
});

map.on('click', e => {
    console.log(e.coordinate.toArray());
});

const markerSymbol = {
    'markerType': 'ellipse',
    'markerFill': '#fff',
    'markerLineColor': 'red',
    'markerLineWidth': 2,
    'markerWidth': 14,
    'markerHeight': 14,
    'opacity': 1
};

const lineSymbol = {
    lineColor: '#2EA2F0',
    lineWidth: 4
};

const fillSymbol = Object.assign({}, lineSymbol, {
    polygonFill: '#1791FC',
    polygonOpacity: 0.3,
    lineWidth: 3
});

const drawSymbol = Object.assign({}, fillSymbol, { lineColor: 'red' });

const layer = new maptalks.VectorLayer('layer').addTo(map);
const adsorption = new maptalks.Adsorption(map);

function toGeoJSON() {
    const geometries = layer.getGeometries();
    const geojson = {
        type: 'FeatureCollection',
        features: geometries.map(geo => {
            return geo.toGeoJSON();
        })
    };
    geojson.features.forEach(f => {
        f.properties = f.properties || {};
    });
    console.log(JSON.stringify(geojson));
}
