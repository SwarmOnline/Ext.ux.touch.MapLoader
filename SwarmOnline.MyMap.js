Ext.ns('SwarmOnline');

Ext.define('Location', {
	extend: 'Ext.data.Model',
    fields: [{
        name: 'lat',
        type: 'float'
    }, {
        name: 'lng',
        type: 'float'
    }, {
        name: 'distance',
        type: 'float'
    }]
});

Ext.define('SwarmOnline.MyMap', {
	extend: 'Ext.Map',

	config: {
		plugins: [{
			xclass: 'Ext.ux.touch.MapLoader',
			store: 'Locations'
		}],
		geo: {
			autoUpdate: false
		},

		store: null
	},

    markerCache: new Ext.util.MixedCollection(),
    
    loadCount: 1,
    initialize: function(){
	    this.getGeo().setAutoUpdate(false);

	    this.getStore().on({
		    load: function(store, records, successful){
			    if (successful) {
				    this.loadCount = this.loadCount + 1;

				    for (var i = 0; i < records.length; i++) {

					    var record = records[i];

					    // only add markers that haven't already been added
					    if (!this.markerExists(record.data.lat, record.data.lng)) {

						    // cache the latest position so it isn't re-added later
						    this.markerCache.add({
							    lat: record.data.lat,
							    lng: record.data.lng
						    });

						    var markerPos = new google.maps.LatLng(record.data.lat, record.data.lng);

						    // add the marker
						    var marker = new google.maps.Marker({
							    map: this.map,
							    position: markerPos,
							    icon: 'http://www.swarmonline.com/wp-content/uploads/TutorialFiles/Demos/Ext.ux.touch.MapLoader/icons/black' + ((this.loadCount < 10) ? '0' + this.loadCount : this.loadCount) + '.png'
						    });
					    }
				    }
			    }
		    },
		    scope: this
	    });


	    //this.setPlugins();
        
        this.callParent(arguments);
    },
    
    doLoadPoints: function(centre, bounds, boundingRadius, bufferRadius, zoom){
        this.loadCount = this.loadCount + 1;
        
        Ext.Ajax.request({
            url: 'server/search.php',
			method: 'get',
            params: {
                centre: Ext.encode(centre),
                bounds: Ext.encode(bounds),
                boundingRadius: boundingRadius,
                bufferRadius: bufferRadius,
                zoom: zoom
            },
            success: function(response){
                var jsonResponse = Ext.decode(response.responseText);
                
                if (jsonResponse.result) {
                    for (var i = 0; i < jsonResponse.result.length; i++) {
                        var resultPos = jsonResponse.result[i];
                        
                        if (!this.markerExists(resultPos.lat, resultPos.lng)) {
                        
                            this.markerCache.add({
                                lat: resultPos.lat,
                                lng: resultPos.lng
                            });
                            var pos = new google.maps.LatLng(resultPos.lat, resultPos.lng);
                            
                            var marker = new google.maps.Marker({
                                map: this.map,
                                position: pos,
                                icon: 'http://www.stuartashworth.com/SenchaTouch/Plugins%20&%20Extensions/Ext.ux.touch.MapLoader/icons/black' + ((this.loadCount < 10) ? '0' + this.loadCount : this.loadCount) + '.png'
                            });
                        }
                    }
                }
            },
            scope: this
        });
    },
    
	/**
	 * Check if the passed in position has already been added
	 * @param {Object} lat
	 * @param {Object} lng
	 */
    markerExists: function(lat, lng){
        var exists = false;
        this.markerCache.each(function(item){
            if (item.lat === lat && item.lng === lng) {
                exists = true;
            }
        }, this);
        
        return exists;
    }
    
    
});
