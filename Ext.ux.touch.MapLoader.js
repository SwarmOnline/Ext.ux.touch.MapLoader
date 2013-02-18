/**
 * Ext.ux.touch.MapLoader.js
 *
 * @author    		SwarmOnline.com (Stuart Ashworth & Andrew Duncan)
 * @copyright 		(c) 2011, by SwarmOnline.com
 * @date      		9th May 2011
 * @version   		1.1
 * @documentation	http://www.swarmonline.com/2011/01/ext-ux-touch-maploader-dynamically-load-map-points-as-you-pan-around-a-map
 * @website	  		http://www.swarmonline.com
 *
 * @license Ext.ux.touch.MapLoader.js is licensed under the terms of the Open Source
 * LGPL 3.0 license. Commercial use is permitted to the extent that the
 * code/component(s) do NOT become part of another Open Source or Commercially
 * licensed development library or toolkit without explicit permission.
 *
 * License details: http://www.gnu.org/licenses/lgpl.html
 */


Ext.define('Ext.ux.touch.MapLoader', {

	extend: 'Ext.util.Observable',

    /**
     * Decides which units (Miles or Kilometers) are used for radiuses and other distances
     * Possible values are 'miles' and 'km'
     */
    units: 'miles', // 'miles' or 'km',
    
    /**
     * A buffer is used to load markers just outside the visible area so markers are visible
     * straight after panning to make the loading appear seamless
     * Possible Values:
     * fixed: a fixed value of miles or kilometres (see 'units' config)
     * ratio: a ratio (between 0 and 1) of the maps bounding circle's radius so that it is proportional to the
     * 		  zoom level
     */
    bufferType: 'ratio', // ratio or fixed
    
    /**
     * The value relating to the 'bufferType' config
     * Either a decimal between 0 and 1 for ratio types or any number for fixed bufferType
     */
    buffer: 0.05,

	config: {
	    /**
	     * Set this to a Store object and the plugin will automatically reload it passing up
	     * the necessary coordinates and distances
	     */
	    store: null
	},
	
	/**
	 * If set to true stops the plugin from doing loads or firing the 'mapload' event
	 */
	disabled: false,
	
	/**
	 * Time in milliseconds between extra loads WHILE the user is dragging the map.
	 * Useful for larger screened devices (tablets) where the distance the user can
	 * pan is greater so points might be available before the user stops dragging
	 * 0 = no interval loads
	 */
	loadInterval: 0,
	
	lastIntervalLoadDate: new Date(),
    
    init: function(parent){
        // cache the reference to parent for later
        this.parent = parent;
        
        // Add the 'mapload' event for consumer to use to load the new data
        this.parent.addEvents('mapload');
        
        // Setup the listeners
        this.parent.on({
            maprender: this.onMapRender,
            destroy: this.onDestroy,
            scope: this
        });
        
        // If the store is configured then add our own handler to the 'mapload' event
        if (!Ext.isEmpty(this.getStore())) {
            this.parent.on({
                mapload: this.onMapLoad,
                scope: this
            });
        }
    },
    
    /**
     * Clean up listeners etc after destroy
     */
    onDestroy: function(){
        this.parent.removeListener('maprender', this.onMapRender);
        
        if (!Ext.isEmpty(this.getStore())) {
            this.parent.removeListener('mapload', this.onMapLoad);
        }
    },
    
    /**
     * Executed after the map has rendered
     * This sets up the listeners that can't be added until the map has been rendered
     */
    onMapRender: function(){
        google.maps.event.addListener(this.parent.getMap(), 'dragend', Ext.bind(this.onMoveEnd, this));
        
        google.maps.event.addListener(this.parent.getMap(), 'bounds_changed', Ext.bind(this.onBoundsChanged, this));
    },
    
    onMapLoad: function(centre, bounds, boundingRadius, bufferRadius, zoom){
    
        this.getStore().load({
            params: {
                centre: Ext.encode(centre),
                bounds: Ext.encode(bounds),
                boundingRadius: boundingRadius,
                bufferRadius: bufferRadius,
                zoom: zoom
            }
        });
        
    },
    
    /**
     * Executed when the bounds have changed, which includes panning and zooming
     * Starts the simulating of the 'moveend' event
     * @param {Object} e
     */
    onBoundsChanged: function(e){
		if (!this.disabled) {
			var currentTime = new Date();
			
			// if time between Current Time and Last Interval Load Time is greater than
			// 'loadInterval' option, only if 'loadInterval' is greater than 0
			if ((currentTime.getTime() - this.lastIntervalLoadDate.getTime()) >= this.loadInterval && this.loadInterval > 0) {
				this.onMoveEnd(this.parent.getMap().getCenter()); // do the load
				this.lastIntervalLoadDate = new Date(); // update the lastIntervalLoadDate property
			}
			
			this.createMoveEndEvent(this.parent.getMap().getCenter());
		}
    },
    
    /**
     * Simulates a 'MoveEnd' event which is fired when the map has stopped being panned or zoomed
     * Starts a timer which will execute once the bounds_changed events have stopped
     * If they continue the previously created timer is destroyed and a new one started.
     * @param {Object} centre the new Centre of the map after the bounds have changed
     */
    createMoveEndEvent: function(centre){
        clearTimeout(this.timeout);
        this.timeout = setTimeout(Ext.bind (this.raiseMoveEndEvent, this, [centre]), 100);
    },
    raiseMoveEndEvent: function(centre){
        google.maps.event.trigger(this.parent.getMap() , 'dragend', centre);
    },
    
    /**
     * Handler to process the MoveEnd event and raise the plugins own 'mapload' event
     * which is used to load the new locations
     */
    onMoveEnd: function(){

        var centre = this.parent.getMap().getCenter(),
	        bounds = this.parent.getMap().getBounds(); // the Map's Bounding Box
        
        // Make the positions a little more user friendly!
        var centreNorm = {
            lat: centre.lat(),
            lng: centre.lng()
        };
        var boundsNorm = {
            northeast: {
                lat: bounds.getNorthEast().lat(),
                lng: bounds.getNorthEast().lng()
            },
            southwest: {
                lat: bounds.getSouthWest().lat(),
                lng: bounds.getSouthWest().lng()
            }
        };
        
        var boundingRadius = this.getBoundingRadius(centreNorm, boundsNorm); // the radius of the map's bounding circle
        var bufferRadius = this.getBufferRadius(boundingRadius); // the amount of extra distance to add to help smoother loading
        var zoom = this.parent.getMap() .getZoom(); // the current zoom setting of the map
        
		// Fire the 'mapload' event so the consuming code can load the new data
		this.parent.fireEvent('mapload', centreNorm, boundsNorm, boundingRadius, bufferRadius, zoom);
    },
    
    /**
     * Returns radius (in miles or KM depending on the value or the 'units' config) of the
     * maps visible bounding circle
     * Sent to server to aid with calculating how much to bring back
     * @param {Object} centre
     * @param {Object} bounds
     */
    getBoundingRadius: function(centre, bounds){
        
        // return the radius (distance between the maps centre and one of its corners
        // this will provide the radius of a bounding circle that encompasses the entire visible map  
        return this.getDistanceBetweenPoints(centre, bounds.northeast, this.units);
    },
    
    /**
     * Gets the number of miles or km extra that should be loaded
     * on top of the visible radius so loading appears smoother
     * @param {Object} boundingRadius
     */
    getBufferRadius: function(boundingRadius){
        var bufferRadius = this.buffer;
        
        if (this.bufferType === 'ratio') {
            bufferRadius = boundingRadius * this.buffer;
        }
        
        return bufferRadius;
    },
    
    /**
     * Uses the Haversine Formula to calculate the distance between two lat/lng coordinates
     * Pass values in the format {lat xx, lng yy}
     * @param {Object} pos1
     * @param {Object} pos2
     */
    getDistanceBetweenPoints: function(pos1, pos2, units){
        var earthRadius = {
            miles: 3958.8,
            km: 6371
        };
        
        var R = earthRadius[units || 'miles'];
        var lat1 = pos1.lat;
        var lon1 = pos1.lng;
        var lat2 = pos2.lat;
        var lon2 = pos2.lng;
        
        var dLat = this.toRad((lat2 - lat1));
        var dLon = this.toRad((lon2 - lon1));
        var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c;
        
        return d;
    },
    
    /**
     * Helper function to convert Degrees to Radians
     * @param {Object} x
     */
    toRad: function(x){
        return x * Math.PI / 180;
    },
	
	enable: function(){
		this.disabled = false;
	},
	disable: function(){
		this.disabled = true;
	},
	setDisabled: function(disabled){
		this.disabled = disabled;
	},

	applyStore: function(store){
		if(Ext.isString(store)){
			store = Ext.getStore(store);
		}

		return store;
	}
    
});


