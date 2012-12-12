/*jslint browser: true */
/*global jQuery: false, google: false */
/*!
 * jQuery Address Picker v1.4.4
 *
 * Copyright 2012, Francesco Levorato
 * Licensed under the MIT license.
 *
 */
(function ($) {
    "use strict";
    var methods, geocoderTimeoutId;

    function indexOf(array, obj) {
        var i;
        for (i = 0; i < array.length; i += 1) {
            if (array[i] === obj) {
                return i;
            }
        }
        return -1;
    }

    function findInfo(result, type) {
        var i, component;
        if (type === 'lat' || type === 'lng') {
            return result.geometry.location[type]();
        }
        if (result.address_components) {
            for (i = 0; i < result.address_components.length; i += 1) {
                component = result.address_components[i];
                if (indexOf(component.types, type) !== -1) {
                    return component.long_name;
                }
            }
        }
        return false;
    }

    methods = {
        init: function ($element, options) {
            this.$element = $element;
            this.settings = $.extend(true, {
                map: false,
                mapOptions: {
                    zoom: 5,
                    center: [0, 0],
                    scrollwheel: false,
                    mapTypeId: "roadmap"
                },
                geocoderOptions: {
                    appendAddressString: '',
                    regionBias: ''
                },
                typeaheadOptions: {
                    source: $.proxy(methods.geocode, this),
                    updater: $.proxy(methods.updater, this),
                    matcher: $.proxy(methods.matcher, this)
                },
                boundElements: {}
            }, options);
            
            // hash to store geocoder results keyed by address
            this.addressMapping = {};
            this.currentItem = '';
            this.geocoder = new google.maps.Geocoder();

            if (this.settings.map) {
                methods.initMap.apply(this, undefined);
            }

            this.$element
                .typeahead(this.settings.typeaheadOptions);
        },
        initMap: function () {
            var mapOptions = $.extend({}, this.settings.mapOptions);
            mapOptions.center = new google.maps.LatLng(mapOptions.center[0], mapOptions.center[1]);
            this.gmap = new google.maps.Map($(this.settings.map)[0], mapOptions);
            this.gmarker = new google.maps.Marker({
                position: mapOptions.center,
                map: this.gmap,
                draggable: this.settings.draggableMarker
            });
            this.gmarker.setVisible(false);
        },
        geocode: function (query, process) {
            var labels, self = this;

            if (geocoderTimeoutId) {
                clearTimeout(geocoderTimeoutId);
                geocoderTimeoutId = false;
            }
            geocoderTimeoutId = setTimeout(
                function geocodeString() {
                    self.geocoder.geocode({
                        'address': query + self.settings.geocoderOptions.appendAddressString,
                        'region': self.settings.geocoderOptions.regionBias
                    }, function (geocoderResults, status) {
                        if (status === google.maps.GeocoderStatus.OK) {
                            self.addressMapping = {};
                            labels = [];
                            $.each(geocoderResults, function (index, element) {
                                self.addressMapping[element.formatted_address] = element;
                                labels.push(element.formatted_address);
                            });
                            return process(labels);
                        }
                    });
                },
                250
            );
        },
        updater: function (item) {
            var self = this;

            if (!this.addressMapping[item]) {
                return;
            }
            this.currentItem = this.addressMapping[item];

            if (this.gmarker) {
                this.gmarker.setPosition(this.currentItem.geometry.location);
                this.gmarker.setVisible(true);

                this.gmap.fitBounds(this.currentItem.geometry.viewport);
            }

            $.each(this.settings.boundElements, function (selector, geocodeProperty) {
                var newValue = $.isFunction(geocodeProperty)
                    ? ($.proxy(geocodeProperty, self)(self.currentItem))
                    : findInfo(self.currentItem, geocodeProperty);
                newValue = newValue || '';
                $(selector).val(newValue);
            });

            return item;
        },
        matcher: function (item) {
            return true; // match is handled by the geocoder service
        },
        currentItemData: function () {
            return this.currentItem;
        }
    };

    $.fn.addressPicker = function (method) {
        var $this = this, addressPicker = this.data('addressPicker');
        if (addressPicker) {
            if (typeof method === 'string' && addressPicker[method]) {
                return addressPicker[method].apply(addressPicker, Array.prototype.slice.call(arguments, 1));
            }
            return $.error('Method ' +  method + ' does not exist on jQuery.addressPicker');
        } else {
            if (!method || typeof method === 'object') {
                return this.each(function () {
                    var addressPicker;
                    addressPicker = $.extend({}, methods);
                    addressPicker.init($this, method);
                    $this.data('addressPicker', addressPicker);
                });
            }
            return $.error('jQuery.addressPicker is not instantiated. Please call $("selector").addressPicker({options})');
        }
    };

}(jQuery));