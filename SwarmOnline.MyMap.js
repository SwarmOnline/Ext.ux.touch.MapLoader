Ext.ns('SwarmOnline');

Ext.regModel('Location', {
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

SwarmOnline.MyMap = Ext.extend(Ext.Map, {
    markerCache: new Ext.util.MixedCollection(),
    
    loadCount: 1,
    initComponent: function(){
    
        this.store = new Ext.data.Store({
            model: 'Location',
            proxy: {
                type: 'ajax',
                url: 'server/search.php',
                reader: {
                    type: 'json',
                    root: 'result'
                }
            }
        });
        
        this.store.on({
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
        
        Ext.apply(this, {
            plugins: [new Ext.ux.touch.MapLoader({
                store: this.store
            })],
            centered: true,
            mapOptions: {
                center: new google.maps.LatLng(55.857809, -4.242511),
                zoom: 17
            },
            listeners: {
                //mapload: this.doLoadPoints,
                scope: this
            }
        });
        
        SwarmOnline.MyMap.superclass.initComponent.call(this);
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
