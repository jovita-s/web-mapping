const bounds = [
  [20.3416, 53.8299], // PV koordinate
  [27.0981, 56.6621] // SR koordinate
];

var map = new maplibregl.Map({
    container: "map",
    style: "map_styles/topo.openmap.style.json",
    center: [23.8, 55.145],
    zoom: 7,
    maxZoom: 18,
    minZoom: 7,
    hash:true,
    attributionControl: false,
    maxBounds: bounds

});

map.addControl(new maplibregl.AttributionControl(), 'top-right');

map.addControl(new maplibregl.NavigationControl(), 'top-left');

map.addControl(
  new maplibregl.GeolocateControl({
      positionOptions: {
          enableHighAccuracy: true
      },
      trackUserLocation: true
  }), 'top-left'
);

let scale = new maplibregl.ScaleControl({
  maxWidth: 100,
  unit: 'metric'
});
map.addControl(scale, 
  'bottom-right');

scale.setUnit('metric');

map.addControl(new maplibregl.FullscreenControl({container: document.querySelector('map')}),'top-left');


function changeMapStyle(styleType) {
  removeLayer();
  map.setStyle("map_styles/" + styleType + ".openmap.style.json");
  setTimeout(() => {
    loadLayers();
  }, "1000");
}


let sidebarStatus = "visible";
function toggleSidebar() {
  if (sidebarStatus == "none") {
    document.getElementById("mapapp-sidebar").style.display = "block";
    sidebarStatus = "visible";
  } else {
    document.getElementById("mapapp-sidebar").style.display = "none";
    sidebarStatus = "none";
  }
}

map.on("load", () => {
  loadLayers();
});

function loadLayers() {
  console.log ("Loading layers")
  map.addSource("vus-source", {
    type: "raster",
    tiles: [
      "http://127.0.0.1:8010/ogc/vus_service?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=vus_2022_grid_500m",
    ],
    tileSize: 256,
  });
  map.addLayer({
    id: "vus-layer",
    type: "raster",
    source: "vus-source",
    layout: {
      visibility: "none",
    },
    paint: {},
  });
  map.addSource("vmpei-source", {
    type: "raster",
    tiles: [
      "http://127.0.0.1:8010/ogc/vmpei_service?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=vmpei_2022_regioniai",
    ],
    tileSize: 256,
  });
  map.addLayer({
    id: "vmpei-layer",
    type: "raster",
    source: "vmpei-source",
    layout: {
      visibility: "none",
    },
    paint: {},
  });
  map.addSource("ib-source", {
    type: "raster",
    tiles: [
      "http://127.0.0.1:8010/ogc/ib_service?bbox={bbox-epsg-3857}&format=image/png&service=WMS&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=256&height=256&layers=ib_2022",
    ],
    tileSize: 256,
  });
  map.addLayer({
    id: "ib-layer",
    type: "raster",
    source: "ib-source",
    layout: {
      visibility: "none",
    },
    paint: {},
  });
}

function toggleLayer(layerName) {
  const layerNameHtml = "layer-btn-" + layerName;

  if (map.getLayoutProperty(layerName, "visibility") == "none") {
    map.setLayoutProperty(layerName, "visibility", "visible");
    document.getElementById(layerNameHtml).style.filter = "none";
  } else {
    map.setLayoutProperty(layerName, "visibility", "none");
    document.getElementById(layerNameHtml).style.filter = "grayscale()";
  }
}

function removeLayer() {
  console.log("Removing layers");
  map.removeLayer("vus-layer");
  map.removeLayer("vmpei-layer");
  map.removeLayer("ib-layer");
  document.getElementById("layer-btn-vus-layer").style.filter = "grayscale()";
  document.getElementById("layer-btn-ib-layer").style.filter = "grayscale()";
  document.getElementById("layer-btn-vmpei-layer").style.filter = "grayscale()";

  map.removeSource("vus-source");
  map.removeSource("vmpei-source");
  map.removeSource("ib-source");
}

const geocoderApi = {
  forwardGeocode: async (config) => {
      const features = [];
      try {
          const request =
      `https://nominatim.openstreetmap.org/search?q=${
          config.query
      }&format=geojson&polygon_geojson=1&addressdetails=1`;
          const response = await fetch(request);
          const geojson = await response.json();
          for (const feature of geojson.features) {
              const center = [
                  feature.bbox[0] +
              (feature.bbox[2] - feature.bbox[0]) / 2,
                  feature.bbox[1] +
              (feature.bbox[3] - feature.bbox[1]) / 2
              ];
              const point = {
                  type: 'Feature',
                  geometry: {
                      type: 'Point',
                      coordinates: center
                  },
                  place_name: feature.properties.display_name,
                  properties: feature.properties,
                  text: feature.properties.display_name,
                  place_type: ['place'],
                  center
              };
              features.push(point);
          }
      } catch (e) {
          console.error(`Failed to forwardGeocode with error: ${e}`);
      }

      return {
          features
      };
  }
};

map.addControl(
  new MaplibreGeocoder(geocoderApi, {
      maplibregl
  }), 'bottom-left'
);

MapboxDraw.constants.classes.CONTROL_BASE  = 'maplibregl-ctrl';
MapboxDraw.constants.classes.CONTROL_PREFIX = 'maplibregl-ctrl-';
MapboxDraw.constants.classes.CONTROL_GROUP = 'maplibregl-ctrl-group';

const draw = new MapboxDraw({
  displayControlsDefault: false,
  controls: {
      polygon: true,
      trash: true
  }
});
map.addControl(draw, 'top-left');

map.on('draw.create', updateArea);
map.on('draw.delete', updateArea);
map.on('draw.update', updateArea);

function updateArea(e) {
  const data = draw.getAll();
  const answer = document.getElementById('calculated-area');
  if (data.features.length > 0) {
      const area = turf.area(data);
      // restrict to area to 2 decimal points
      const roundedArea = Math.round(area * 100) / 100;
      answer.innerHTML =
          `<p><strong>${
              roundedArea
          }</strong></p><p> kv. metrai </p>`;
  } else {
      answer.innerHTML = '<span class="placeholder w-100 placeholder-lg"></span>';
      if (e.type !== 'draw.delete')
          alert('Use the draw tools to draw a polygon!');
  }
}


