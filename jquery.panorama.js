(function(factory) {
    if (typeof define === 'function' && define.amd && define.amd.jQuery) {
        // AMD. Register as anonymous module.
        define(['jquery'], factory);
    } else if (typeof module !== 'undefined' && module.exports) {
        // CommonJS Module
        factory(require("jquery"));
    } else {
        // Browser globals.
        factory(jQuery);
    }
}(function ($, undefined) {
    $.fn.panorama = function (options) {

        var defaults = {
            imageUrl: '',
            imageWidth: 3000,
            imageHeight: 1000,
            verticalResizeRatio: 1.2,
            ratio: 1
        };

        var panoramaElements = [];

        var minResizeHeight;

        var camera;

        var originCamera;

        var helper = {
            degToRad: function (value) {
                return value * Math.PI / 180;
            },
            radToDeg: function (value) {
                return value * 180 / Math.PI;
            },
            rotateEuler: function (euler) {
                var heading, bank, attitude,
                    ch = Math.cos(euler.yaw),
                    sh = Math.sin(euler.yaw),
                    ca = Math.cos(euler.pitch),
                    sa = Math.sin(euler.pitch),
                    cb = Math.cos(euler.roll),
                    sb = Math.sin(euler.roll),

                    matrix = [
                        sh * sb - ch * sa * cb, -ch * ca, ch * sa * sb + sh * cb,
                        ca * cb, -sa, -ca * sb,
                        sh * sa * cb + ch * sb, sh * ca, -sh * sa * sb + ch * cb
                    ]; // Note: Includes 90 degree rotation around z axis

                /* [m00 m01 m02] 0 1 2
                 * [m10 m11 m12] 3 4 5
                 * [m20 m21 m22] 6 7 8 */

                if (matrix[3] > 0.9999) {
                    // Deal with singularity at north pole
                    heading = Math.atan2(matrix[2], matrix[8]);
                    attitude = Math.PI / 2;
                    bank = 0;
                } else if (matrix[3] < -0.9999) {
                    // Deal with singularity at south pole
                    heading = Math.atan2(matrix[2], matrix[8]);
                    attitude = -Math.PI / 2;
                    bank = 0;
                } else {
                    heading = Math.atan2(-matrix[6], matrix[0]);
                    bank = Math.atan2(-matrix[5], matrix[4]);
                    attitude = Math.asin(matrix[3]);
                }

                return {
                    yaw: heading,
                    pitch: attitude,
                    roll: bank
                };
            }
        };

        var deviceOrientationHandler = function (o) {
            panoramaHandler.apply(this, [o]);
        };

        var setMinResizeHeight = function (resizeHeight) {
            if (!minResizeHeight || resizeHeight < minResizeHeight) {
                minResizeHeight = resizeHeight;
            }
        };

        var bindEvents = function () {
            window.addEventListener('deviceorientation', deviceOrientationHandler, false);
        };

        var initPanorama = function (o) {
            originCamera = helper.rotateEuler({
                yaw: helper.degToRad(o.alpha),
                pitch: helper.degToRad(o.beta),
                roll: helper.degToRad(o.gamma)
            });
        };

        var elementMoving = function (movedX, movedY) {

            panoramaElements.forEach(function (elm) {
                var posX = Math.round($(elm).data('resizeWidth') * movedX);
                var posY = Math.round($(elm).data('resizeHeight') / $(elm).data('ratio') * movedY);

                posY = posY > 0 ? 0 : posY;
                posY = posY < (window.innerHeight - minResizeHeight) / 2 ? (window.innerHeight - minResizeHeight) / 2 : posY;

                if( !$(elm).data('panorama-status') || $(elm).data('panorama-status') !== 'pause') {
                    $(elm)
                        .css({
                            'backgroundPositionX': posX + 'px',
                            'backgroundPositionY': posY + 'px'
                        });
                }
            });
        };

        var panoramaHandler = function (o) {
            if ('undefined' === typeof originCamera) {
                initPanorama(o);
                return;
            }

            camera = helper.rotateEuler({
                yaw: helper.degToRad(o.alpha),
                pitch: helper.degToRad(o.beta),
                roll: helper.degToRad(o.gamma)
            });

            var movedX = 0,
                movedY = 0;

            if (originCamera.yaw > 0) {
                if (camera.yaw > 0) {
                    movedX = (camera.yaw - originCamera.yaw) / Math.PI / 2;
                } else {
                    movedX = 2 + (camera.yaw - originCamera.yaw) / Math.PI / 2;
                }
            } else {
                if (camera.yaw > 0) {
                    movedX = (camera.yaw - originCamera.yaw) / Math.PI / 2 - 2;
                } else {
                    movedX = (camera.yaw - originCamera.yaw) / Math.PI / 2;
                }
            }

            if (camera.pitch < 0) {
                movedY = Math.abs(camera.pitch / Math.PI);
            } else {
                movedY = 0 - Math.abs(camera.pitch / Math.PI);
            }

            elementMoving.apply(null, [movedX, movedY]);
        };

        var init = function (elm) {
            var $elm = $(elm);

            var config = {
                imageUrl: $elm.data('image-url'),
                imageWidth: $elm.data('image-width'),
                imageHeight: $elm.data('image-height'),
                verticalResizeRatio: $elm.data('vertical-resize-ratio'),
                ratio: $elm.data('ratio')
            };

            var settings = $.extend(true, {}, defaults, options, config);

            var resizeHeight = window.innerHeight * settings.verticalResizeRatio * settings.ratio;
            var resizeWidth = settings.imageWidth * resizeHeight / settings.imageHeight * settings.ratio;

            setMinResizeHeight(resizeHeight);

            $elm
                .data('resize-width', resizeWidth)
                .data('resize-height', resizeHeight)
                .data('ratio', settings.ratio)
                .css({
                    "position": "absolute",
                    "top": 0,
                    "bottom": 0,
                    "left": 0,
                    "right": 0,
                    "z-index": -1,
                    "background": 'url("' + settings.imageUrl + '") scroll repeat 0 0 transparent',
                    "background-size": resizeWidth + 'px ' + resizeHeight / settings.ratio + 'px'
                });
        };

        bindEvents();

        return this.each(function (idx, elm) {

            panoramaElements.push(elm);

            init(elm);
        });
    };
}));
