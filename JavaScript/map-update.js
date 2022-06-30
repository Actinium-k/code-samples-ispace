import Service, { inject as service } from '@ember/service';
import "leaflet-draw";
import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import chroma from "chroma-js";

export default Service.extend({
    inference_service: service('inference-service'),
    session: service('session'),
    notifications: service(),
    featureGroup: new L.FeatureGroup(),
    drawControl: null,
    fgGeoTiff: new L.LayerGroup(),
    resultAOI: new L.GeoJSON(),
    layer: null,
    basemap: null,
    
    resultLayers: [],
    init() {
        this._super();
        // assign reference to LL feature group for accessing AOI in inference service
        this.inference_service.set('querySettings.aoi', this.featureGroup);
    },
    setMap(map){
        this.set('map', map);
        if (this.get("basemap") !== null){
            this.get("basemap").addTo(map);
        }
    },
    zoomToDataCube(dcData){
        if(!this.map){
            this.notifications.error("ERROR 2104: map is undefined!");
            return;
        }
        this.map.flyToBounds(dcData.get('bboxCoords'));
    },
    hasAOIlayers(){
        if(this.featureGroup == null)
            return false;
        if(this.featureGroup.getLayers().length > 0)
            return true;
        return false;
    },
    clearAOIlayers(){
        if(this.featureGroup == null)
            return;
        this.featureGroup.clearLayers();
    },
    updateListeners(){
        this.featureGroup.bringToFront();
    },
    initLLdraw(showPendingAOI=true){
        let m = this.map;
        // register event for feature creation -> add to layer group
        // the counter attribute will be used to set the id of the area-of-interest
        let fg = this.featureGroup;
        fg.counter = 0;

        /*
         * add featureGroup for current inference AOI drawing
         *
         * Bind tooltop showing the name property
         * Bind popup to allow changes of the name property         
         */
        if(showPendingAOI){
            fg
            .bindTooltip(function (layer) {
                    return layer.feature.properties.name; //setting the tooltip text
                }, {opacity: 0.5}  //styling options
            )
            .bindPopup(function(layer){
                let content = '<div class="popup-title"><h1>Edit properties</h1></div>'
                content += '<div class="feature-edit"><span class="feature-edit-label">Name:</span><input id="feature-edit" class="input-field feature-edit-input" type="text" value="' + layer.feature.properties.name + '"></input></div>';
                content += '<button class="feature-edit-save action-button" type=button>Save and close</button>';
                return content;
            },{
                className: 'map-popup'
            }).on("popupopen", e => {
                let save = function(e) {
                    return function(){
                        e.layer.feature.properties.name = $("#feature-edit")[0].value;
                        m.closePopup();
                    }
                }
                $(".feature-edit-save").on("click", save(e));
            });
            fg.addTo(m);
        }

        m.on(L.Draw.Event.CREATED, function(e){
            /*
             * Either take existing feature properties
             * or create new one.
             * Noe that this function is also called if
             * users upload a geojosn
             */
            let layer = e.layer;
            let feature = layer.feature = layer.feature || {};
            feature.type = "Feature";
            let properties = feature.properties = feature.properties || {};
            properties.name = "Area-of-interest " + fg.counter.toString().padStart(2, '0'); //add name as property, padStart adds leading 0 for counter < 10
            fg.counter = fg.counter + 1;
            fg.addLayer(layer);
        });

        // add geoTiff layer group
        this.fgGeoTiff.addTo(m);
        // add result AOI layer
        this.resultAOI
            .bindTooltip(function (layer) {
                return layer.feature.properties.name; //setting the tooltip text
             }, {opacity: 0.5}  //styling options
            )
            .addTo(m)
        // zoom to result extent
        let b = this.resultAOI.getBounds();
        if(b && b.isValid() && m) m.fitBounds(b); //map.flyToBounds(b);
    },
    setAOItype(type){
        let m = this.map;
        if(!m){
            this.notifications.error("ERROR 2104: setting AOI feature creation - map is not defined!");
            return;
        }
        m.addLayer(this.featureGroup);
        // remove old draw control if present
        if(this.drawControl){
            m.removeControl(this.drawControl);
            this.drawControl = null;
        }
        let drawControl = new L.Control.Draw({
            position: "topleft",
            draw:{
                polyline: (type == "line") ? {repeatMode: true} : null,
                polygon: (type == "polygon") ? {repeatMode: true} : null,
                rectangle: (type == "polygon") ? {repeatMode: true} : null,
                circle: (type == "polygon") ? {repeatMode: true} : null,
                marker: (type == "point") ? {repeatMode: true} : null,
                circlemarker: false
            },
             edit: {
                 featureGroup: this.featureGroup
             }
        });
        m.addControl(drawControl);
        // activate default draw function for current type
        /*
        switch(type){
            case "line":
                new L.Draw.Polyline(m, drawControl.options.draw.polyline).enable();
                break;
            case "point":
                new L.Draw.Marker(m, drawControl.options.draw.marker).enable();
                break;
            case "polygon":
                new L.Draw.Rectangle(m, drawControl.options.draw.rectangle).enable();
                break;
        }*/
        this.drawControl = drawControl;
    },
    addAOI(geoJSON, deleteExisting = false){         
        // Take advantage of the onEachFeature callback to initialize drawnItems
        function addCallback(mapenvironment){
            return function onEachFeature(feature, layer) {
                mapenvironment.featureGroup.addLayer(layer);
            }
        }
        // Create a GeoJson layer without adding it to the map
        try{
            /* 
             * Try some checks whether this is a EPSG 4326 geojson
             *
             * At first check whether there is a crs object in the
             * geoJSON, then do some probing using random coordinate
             * tuple. We need different access methods, depending
             * whether it is a Feature or a FeatureCollection.
             */
            if ("crs" in geoJSON){
                /*
                 * Note: Usually, we would support the lon/lat notation, which is specified
                 * in OGC:1.3:CRS84, while EPSG:4326 is lat/lon. It seems that most implementations
                 * of EPSG:4326 use lon/lat as well. So, we'll keep it like this and hope the best.
                 */
                if (geoJSON.crs.properties.name != "urn:ogc:def:crs:EPSG::4326" && geoJSON.crs.properties.name != "urn:ogc:def:crs:OGC:1.3:CRS84"){
                    throw "ERROR 2306: We currently support external geometries with EPSG:4326 / OGC:1.3:CRS84." 
                }
            }
            /*
             * This is for checking some coordinates of the first (or only) feature.
             * We need to treat points a bit different since they don't have a list of
             * coordinates, but the cooridates directly
             */
            let feature_geometry = null;
            let coordinates = null;
            if (geoJSON.type == "FeatureCollection"){
                feature_geometry = geoJSON.features[0];       
            } else if (geoJSON.type == "Feature") {
                feature_geometry = geoJSON;                    
            } else {
                throw "ERROR 2307: Does not seem to be a Feature or FeatureCollection."
            }
            if (feature_geometry.geometry.type == "Point"){
                coordinates = feature_geometry.geometry.coordinates;
            }else{
                coordinates = feature_geometry.geometry.coordinates[0];
            }
            var rand_tuple = coordinates[Math.floor(Math.random() * coordinates.length)];

            if (rand_tuple[0] > 180 || rand_tuple[0] < -180 || rand_tuple[1] > 90 || rand_tuple < -90){
                throw "ERROR 2308: Does not seem to have a valid coordinate range of (-180, 180) and (-90,90)."
            }
            
            if (deleteExisting){
                this.clearAOIlayers();
            }
            L.geoJson(geoJSON, {
                onEachFeature: addCallback(this)
            });

        } catch (ex){
            this.notifications.error(ex);
        }
    },
    zoomToBoundingBox(boundingbox){
        var m = this.map;
        if(!m){
            this.notifications.error("ERROR 2104: map is undefined!");
            return;
        }
        m.flyToBounds(boundingbox);
    },
    addGeoTiffLayer(factbaseURI, layerData){
        const url = factbaseURI + layerData.data + "?access_token=" + this.get('session.data.authenticated.access_token');
        
        const minVal = layerData.value_range[0];
        const maxVal = layerData.value_range[1];
        let pixelValuesToColorFn;
        
        if (layerData.vis_type === 'map') {

            const colourScale = chroma.scale('YlGnBu').domain([maxVal, minVal]);

            pixelValuesToColorFn = function (values) {
                const value = values[0];
                if (value === -9999) return '#ffffff00'; // return null works too
                if (value >= minVal && value <= maxVal) return colourScale(value).hex();
            }

        } else { // expecting RGB multiband

            const scaleRGB = function scaleRGB(val, bandMin, bandMax){
                const scaleMin = bandMin > 0 ? bandMin : 255;
                const scaleMax = bandMax > 0 ? bandMax : 255;
                return(Math.round((val - scaleMin) / (scaleMax - scaleMin) * 255));
            }

            pixelValuesToColorFn = function (values) {
                if (values[0] === -9999) {
                    return '#ffffff00';
                } else if (values[0] >= minVal && values[0] <= maxVal) {
                    const bvr = layerData.band_value_ranges;
                    let r = scaleRGB(values[0], bvr[0][0], bvr[0][1]);
                    let g = scaleRGB(values[1], bvr[1][0], bvr[1][1]);
                    let b = scaleRGB(values[2], bvr[2][0], bvr[2][1]);
                    return `rgb(${r},${g},${b})`;
                }
            }
            
        }
        
        fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
            parseGeoraster(arrayBuffer).then(georaster => {
                this.layer = new GeoRasterLayer({
                    georaster: georaster,
                    opacity: 1,
                    pixelValuesToColorFn: pixelValuesToColorFn,
                    resolution: 128,
                    zIndex: 800, // Forces the layer to be displayed on top of the basemaps
                    noWrap: true
                    // !this.option.noWrap is null in _tileCoordsToBounds line 579 create LatLngBounds that's not needed in bundle.js
                    // as such, this workaround is required until we understand what went wrong
                });
                let layer = this.layer;
                this.fgGeoTiff.addLayer(layer);
                this.resultLayers.push({url:url, layer:layer});
            })
        });

    },
    removeGeoTiffLayers(){
        this.fgGeoTiff.clearLayers();
    },
    addResultExtent(geoJSON){
        this.resultAOI.addData(geoJSON);
        // set map view to result extent is done in "initLLDraw" due to timing issues
    },
    hideResultExtents(){
        this.resultAOI.setStyle({
            "color": "#ff0000",
            "weight": 5,
            "opacity": 0.0,
            "fillOpacity": 0.0
        })
    },
    removeResultExtents(){
        this.resultAOI.clearLayers();
    },
    setResultVisibility(url, state){
        let lyr = this.resultLayers.find(function(el) {
            return el.url.substring(el.url.lastIndexOf("/") + 1, el.url.lastIndexOf("?")) === url.substring(url.lastIndexOf("/") + 1,url.length) 
          });
        if(!lyr){
            this.notifications.error("ERROR 2504: did not find any result layer with url:", url);
            return;
        }
        lyr.layer.setOpacity(state?1:0);
    },
    setResultOpacity(url, opacity){
        let lyr = this.resultLayers.find(function(el) {
            return el.url.substring(el.url.lastIndexOf("/") + 1, el.url.lastIndexOf("?")) === url.substring(url.lastIndexOf("/") + 1,url.length) 
          });

        if(!lyr){
            this.notifications.error("ERROR 2504: did not find any result layer with url:", url);
            return;
        }
        lyr.layer.setOpacity(opacity);
    },
    setBasemap(basemap){
        if (this.get("basemap") !== null){
            this.basemap.remove();
        }
        this.set("basemap",basemap);
        this.basemap.addTo(this.map);
    },
});
