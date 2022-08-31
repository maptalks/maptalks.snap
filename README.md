# maptalks.snap

maptalks snap plugin

## Features

* Support Geometry Edit/Draw
* Impressive performance  [perf test](https://maptalks.github.io/maptalks.snap/test/perf.html)

## Install

* NPM

```sh
  npm i maptalks.snap
#   or
  yarn add maptalks.snap
```

* CDN

```html

```

## Examples

 [edit](https://maptalks.github.io/maptalks.snap/test/index.html)<br>
 [draw](https://maptalks.github.io/maptalks.snap/test/draw.html)<br>
 [custom filtergeometries](https://maptalks.github.io/maptalks.snap/test/filtergeometries.html)<br>
 [filtergeometries from multi layers](https://maptalks.github.io/maptalks.snap/test/multilayerfilter.html)<br>
 [perf test](https://maptalks.github.io/maptalks.snap/test/perf.html)

 ## API

#### constructor(map, options)

   

```js
import {
    Snap
} from 'maptalks.snap';
const snap = new Snap(map, {
    //snapTo threshold
    tolerance: 15,
    // filter geometries for snap reference object
    fiterGeometries: function() {
        //you can return geometries for snap collision
        return layer.geometries().filter(geo => {
            return geo instanceof maptalks.Polygon;
        })
    }
});

//if you use cdn,Snap Hanging under maptalks namespace
const snap = new maptalks.Snap(map, {
    //snapTo threshold
    tolerance: 15,
    // filter geometries for get Adsorption reference object
    fiterGeometries: function() {
        //you can return geometries for snap collision
        return layer.geometries().filter(geo => {
            return geo instanceof maptalks.Polygon;
        })
    }
});

//update options
snap.config({
    tolerance: 18,
    //other opiton params
    ...
})
```

  

#### method

  + setGeometry(geometry) ` set geometry for snap`  
  

```js
snap.setGeometry(polygon);
//will remove polygon snap,and snap to linestring
snap.setGeometry(lineString);
```

  + removeGeometry() `remove geometry snap behavior`
  

```js
snap.removeGeometry();
```

  + dispose() `dispose Snap`

```js
snap.dispose();
```
