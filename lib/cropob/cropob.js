/*
 * croima Widget for jQuery UI
 *
 * Copyright (c) 2017 Hau Le
 * Dual licensed under the MIT and GPL licenses.
 *  - http://www.opensource.org/licenses/mit-license.php
 *  - http://www.gnu.org/copyleft/gpl.html
 *
 * Author: Hau le
 * Version: 0.0.1
 */
(function ($, undefined) {
	function Rect(x, y, width, height) {
		this.x = x;
		this.y = y;
		this.width = width;
		this.height = height;
		this.origin_width = width;
		this.origin_height = height;
		this.angle = 0; 
	}

	function Mask(x, y, width, height, zoom, angle, type, image_width, image_height, image_x, image_y) {
	    this.x = x;
	    this.y = y;
	    this.width = width;
	    this.height = height;
	    this.zoom = zoom;
	    this.angle = angle;
	    this.type = type;
	    this.image_x = image_x;
	    this.image_y = image_y;
	    this.image_width = image_width;
	    this.image_height = image_height;
	}

 	$.widget("ui.croima", $.ui.mouse, {
 		// default options
 		options: {
	        image_url: null,
			origin_image_url: null,
	        width: 400,
	        height: 400,
	        zoom: 100,
	        zoom_delta: 1.5,
	 		disable: false,
	 		zoom_max: 800,
            zoom_min: 10,
            current_action: 'move',
            background_color: '#edfbf3',
            index_current_mask: 0,
            count_max_mask: 5,
			enable_export_image_mark: false,
			type_feature: 1,
			enable_type_from_element: false,
			enable_draw_when_delete_mark: false,
			element_mark: '.mask-item',
			element_data_mark: '.mask_data',
            arr_mark: {},
            colorArr : ["#3366CC", "#669933", "#669933", "#FFCC00", "#FF6633"],

            //icon
            icon_zoom_origin: '<i class="fa fa-plus-square-o"></i>',
            icon_zoom_fit: '<i class="fa fa-compress"></i>',
            icon_zoom_plus: '<i class="fa fa-plus"></i>',
            icon_zoom_minus: '<i class="fa fa-minus"></i>',
            icon_rotate: '<i class="fa fa-refresh"></i>',
            icon_crop: '<i class="fa fa-crop"></i>',
            icon_reset_rotate: '<i class="fa fa-reply-all"></i>',
            icon_rotate_left: '<i class="fa fa-undo"></i>',
            icon_rotate_right: '<i class="fa fa-repeat"></i>',
            icon_reset_crop: '<i class="fa fa-reply-all"></i>',
            icon_apply_crop: '<i class="fa fa-check"></i>',
            icon_reset_rotate: '<i class="fa fa-reply-all"></i>',
            icon_mark: '<i class="fa fa-pencil-square-o"></i>',
            icon_group_mark: '<i class="fa fa-object-ungroup"></i>',

	        // Callbacks
	        onAfterZoom: jQuery.noop,
	        onStartLoad: null,
            onFinishLoad: null,
            onErrorLoad: null,
            onStartDrag: jQuery.noop,
            onDrag: jQuery.noop,
            onStopDrag: jQuery.noop,
            onFinishReplaceImage: null,
			onFinishMark: jQuery.noop,
			onEdit: jQuery.noop,
	    },
	    deleteMask: function(index){
	    	var temp = -1;
		    for (var i in this.options.arr_mark)
		        if (i == index)
		            temp = i;

		    if (temp > -1) {
		        delete this.options.arr_mark[temp];
				$(this.options.element_mark).eq(index - 1).removeClass('have_img');
		    }
		    //lastMaskItem = this.options.index_current_mask;
		    if (index > 0 && index <= this.options.count_max_mask)
		        this.options.index_current_mask = index;
		    this.activeDrawMask();
			//console.log(this.options.enable_draw_when_delete_mark);
			if(this.options.enable_draw_when_delete_mark)
				this._enableMark();
		    this.refresh();
			this._trigger("onEdit", 0);
	    },
	    onChangeMaskType: function(index, _color){
		 	if (index != this.options.index_current_mask) {
		        if (!$( this.options.element_mark ).eq(index - 1).hasClass('disable') && !$( this.options.element_mark ).eq(index - 1).hasClass('have_img')) {
		            this.options.index_current_mask = parseInt(index);
		            this.activeDrawMask();
		        }
		    }
	    },
		getArrMark: function(){
			return this.options.arr_mark;
		},
		setArrMark: function(_arr_mark){
			this.options.arr_mark = _arr_mark;
			this.refresh();
		},
		setMaxMark: function (_max_mark) {
			if(_max_mark < this.options.count_max_mask){
				this.options.count_max_mask = _max_mark;
				this.resetDataDefault();
				this.onChangeMaskType(1);
			}else{
				this.options.count_max_mask = _max_mark;
			}

		},
		removeMarkItem: function (_index){
			this.options.count_max_mask --;
			//delete this.options.arr_mark[_index + 1];
			for( var i in this.options.arr_mark){
				if(i > _index + 1){
					this.options.arr_mark[i - 1] = this.options.arr_mark[i];
				}
			}
			delete this.options.arr_mark[this.options.count_max_mask + 1];
			this.refresh();
			//this.onChangeMaskType(_index);
		},
		setColorArr: function (_colorArr) {
			this.options.colorArr = _colorArr;
		},
		setEnableImageMark: function (_enable) {
			this.options.enable_export_image_mark = _enable;
		},


	    // The constructor
		_create: function() {
			var me = this;
			this.container = this.element;
			// add a class for theming
			this.element.addClass("ob-crop-image");
			this.current_zoom = this.options.zoom;
			if (this.options.image_url === null) return;
			if (this.options.origin_image_url == null) this.options.origin_image_url = this.options.image_url;

			this.canvas_object = {};
			this.context = null;
			// Start load image
			this._trigger("onStartLoad", 0, this.options.image_url);
			this.image = new Image();
			this.image.src = this.options.image_url;

			//properties action
			this.do_anim = false;
			this.do_move = false;
			this.flag_can_mark = true;
			this.start_mark_x = 0;
			this.start_mark_y = 0;
			this.do_mark = false;
			this.crop_corner = {};
			this.mark_group = {};
			this.enable_show_mark = true;

			this.image.onload = function(){
				me.image_value = new Rect((me.options.width - this.width) / 2 , (me.options.height - this.height) / 2 , this.width, this.height);
				//me.set_zoom(me.options.zoom);
				me.fit();
				me.container.css('width',me.options.width).css('height',me.options.height + 45);
				me._trigger("onFinishLoad", 0, me.options.image_url);
			};
			this.container.bind("mousewheel.ob-canvas", function(ev, delta) {
	            var zoom = delta > 0 ? 1 : -1,
	                container_offset = me.container.offset(),
	                mouse_pos = {
	                    x: (ev.pageX || ev.originalEvent.pageX) - container_offset.left,
	                    y: (ev.pageY || ev.originalEvent.pageX) - container_offset.top
	                };
	            me.zoom_by(zoom, mouse_pos);
	            return false;
	        });
			this.container.bind("mousemove", function(e) {
                me._handleMouseMove(e)
            }).bind("dblclick", function(e){
            	me._handleDoubleClick(e);
            });

			this._createUI();

			this._mouseInit();
		},
		resetDataDefault: function(){
			this.do_anim = false;
			this.do_move = false;
			this.flag_can_mark = true;
			this.start_mark_x = 0;
			this.start_mark_y = 0;
			this.do_mark = false;
			this.crop_corner = {};
			this.mark_group = {};
			this.options.arr_mark = {};
			this.options.current_action = 'move';
			$(this.options.element_mark).removeClass('have_img');//.find('img').attr('src', '');
			this.refresh();
		},
		replaceImage: function(_image_url){
			if (!_image_url) return;
			var me = this;
			this.options.image_url = _image_url;
			this.image = new Image();
			this.image.src = this.options.image_url;
			this.image.onload = function(){
				me.image_value = new Rect((me.options.width - this.width) / 2 , (me.options.height - this.height) / 2 , this.width, this.height);
				me.fit();
				me._trigger("onFinishReplaceImage", 0, me.options.image_url);
				//me._resetMark();
				
				me._resetFearture();
				me.loadPartImage();
			};
			//this._fit();
		},
		getImageData: function(){
			return this.options.image_url;
		},
		loadPartImage:function(){
			for( var prop in this.options.arr_mark)
				this.cropPartImage(this.options.arr_mark[prop],false);
		},

		_destroy: function() {
	    	// remove generated elements
	    },

		_setOptions: function(arguments) {
			// _super and _superApply handle keeping the right this-context
			this._super( arguments );
			//this._refresh();
		},

		_setOption: function( key, value ) {
			// prevent invalid color values
			// if ( /red|green|blue/.test(key) && (value < 0 || value > 255) ) {
			//   return;
			// }
			this._super( key, value );
		},

		_drawCanvas: function(){
			//console.log('draw image');
			if(this.context){
				this.context.clearRect(0, 0, this.options.width, this.options.height);
				this.context.fillStyle = this.options.background_color;
				this.context.fillRect(0, 0, this.options.width, this.options.height);
				this._drawImage();
				switch(this.options.current_action){
					case 'rotate':
						this._showLineHorizontal();
						this._drawPointCorner(); break;
					case 'mark':
						this._drawMark();
						this._drawLineMark();
						break;
					case 'crop':
						this._showLineHorizontal();
						this._drawLineCorner(); break;
					case 'group-mark':
						this._drawMark();
						this._drawGroupCorner(); 
						break;
					default: 
						this._drawMark(); break;
				}
				
			}
		},
		_drawImage: function(){
			this.context.save(); 
			var center_image = this._getImageCenter();
			this.context.translate(center_image.x, center_image.y);
			this.context.rotate(this.image_value.angle);
			this.context.drawImage(this.image, -this.image_value.width/2, - this.image_value.height/2 , this.image_value.width, this.image_value.height);
			this.context.restore();
		},
		_showLineHorizontal: function(){
			var context = this.context;
			var delta_hor = 30;
			var total_hor = this.options.height / delta_hor;
			context.lineWidth = 0.4;
			context.strokeStyle = 'black';
			var pos_y = this.options.height / 2 - (delta_hor * total_hor/2);
			for (var i = 0; i < total_hor; i++) {
			    context.beginPath();
			    context.moveTo(0, pos_y);
			    context.lineTo(this.options.width, pos_y);
			    context.stroke();
			    pos_y += delta_hor;
        	}
        	context.lineWidth = 1;
		},
		_drawPointCorner: function(){
			//if(this.options.current_action != 'rotate') return;
			var corner = this.image_value.corner;
			var context = this.context;
			var radius = 10;
			for (var prop in corner) {
        		context.beginPath();
				context.arc(corner[prop].x, corner[prop].y, radius, 0, 2 * Math.PI, false);
				context.fillStyle = 'green';
				context.fill();
				context.lineWidth = 3;
				context.strokeStyle = '#003300';
				context.stroke();
        	}
		},
		_drawMark: function(){
			//console.log(this.options.arr_mark);
			if(!this.enable_show_mark)
				return;
			for (var i in this.options.arr_mark) {
		        this._drawRectOnCanvas(this.options.arr_mark[i]);
		    }
		},
		_drawRectOnCanvas: function(item) {
			var context = this.context;

			var transfer_pos = this._transferPosition(item.x, this.image_value.x, item.y, this.image_value.y,
				item.width, item.height, 
				item.zoom, this.current_zoom, item.angle, this.image_value.angle);
			context.globalAlpha = 0.6;
			context.save();
			context.beginPath();
			context.translate(transfer_pos.x, transfer_pos.y);
			context.rotate(transfer_pos.angle);
			context.lineWidth = 3;
			context.strokeStyle = this._getColorLine(item.type);
			context.strokeRect(-transfer_pos.w / 2, -transfer_pos.h / 2, transfer_pos.w, transfer_pos.h);
			context.restore();
			context.lineWidth = 1;
			context.globalAlpha = 1;
		},
		_getColorLine: function(type) {
		    return (typeof this.options.colorArr[type - 1] === 'undefined') ? '#000000' : this.options.colorArr[type - 1];
		},
		_transferPosition: function(_x, _image_x , _y, _image_y, _w, _h, _zoom, _new_zoom, _angle, _new_angle){
			var x = _x * _new_zoom / _zoom + _image_x;
		    var y = _y * _new_zoom / _zoom + _image_y;
		    var w = _w * _new_zoom / _zoom;
		    var h = _h * _new_zoom / _zoom;
		    var temp_angle = _new_angle - _angle;
			var temp = this._findPointRotate(this._getImageCenter(),{'x': x + w / 2, 'y': y + h / 2}, - temp_angle);
			return {'x' : temp.x, 'y': temp.y, 'w' : w, 'h' : h, 'angle' : temp_angle};
		},
		_drawLineMark: function(){
			if(!this.flag_can_mark) return;
			var context = this.context;
			context.lineWidth = 1;
		    context.shadowOffsetX = 0;
		    context.shadowOffsetY = 0;
		    context.shadowBlur = 10;
		    context.shadowColor = "white";
		    context.beginPath();
		    context.moveTo(this.posMouseX, 0);
		    context.lineTo(this.posMouseX, this.options.height);
		    context.stroke();
		    context.moveTo(0, this.posMouseY);
		    context.lineTo(this.options.width, this.posMouseY);
		    context.stroke();
		    context.shadowBlur = 0;
		},
		_drawLineCorner: function(){
			if(this.options.current_action != 'crop') return;
			var long_line = this.options.width / 6;
			var corner = this.crop_corner;
			this.context.beginPath();
			this.context.lineWidth = 3;
			// corner 1
			this.context.moveTo(corner.top_left.x, corner.top_left.y);
			this.context.lineTo(corner.top_left.x + long_line, corner.top_left.y);
			this.context.moveTo(corner.top_left.x, corner.top_left.y);
			this.context.lineTo(corner.top_left.x, corner.top_left.y + long_line);
			// corner 2
			this.context.moveTo(corner.top_right.x, corner.top_right.y);
			this.context.lineTo(corner.top_right.x - long_line, corner.top_right.y);
			this.context.moveTo(corner.top_right.x, corner.top_right.y);
			this.context.lineTo(corner.top_right.x, corner.top_right.y+ long_line);
			//corner 3
			this.context.moveTo(corner.bot_left.x, corner.bot_left.y);
			this.context.lineTo(corner.bot_left.x + long_line, corner.bot_left.y);
			this.context.moveTo(corner.bot_left.x, corner.bot_left.y);
			this.context.lineTo(corner.bot_left.x, corner.bot_left.y - long_line);
			//corner 4
			this.context.moveTo(corner.bot_right.x, corner.bot_right.y);
			this.context.lineTo(corner.bot_right.x - long_line, corner.bot_right.y);
			this.context.moveTo(corner.bot_right.x, corner.bot_right.y);
			this.context.lineTo(corner.bot_right.x, corner.bot_right.y - long_line);

			this.context.stroke();
			this.context.lineWidth = 1;
		},
		_drawGroupCorner: function(){
			var context = this.context;
			var radius = 10;

			var corners = this._getMarkCornerCurrent();
			if(!corners) return;
			for (var prop in corners) {
				var temp = this._findPointRotate(this._getImageCenter(),{'x': corners[prop].x , 'y': corners[prop].y }, 0);
				context.beginPath();
				context.arc(temp.x, temp.y, radius, 0, 2 * Math.PI, false);
				context.fillStyle = 'blue';
				context.fill();
				context.strokeStyle = '#003300';
				context.stroke();
        	}
		},
		cropPartImageNoImageWithType: function(obj){
			if(!this.options.enable_export_image_mark){
				var currentDivMask = $(".bg-" + obj.type).parent();
				currentDivMask.addClass('have_img');
			}
		},
		_cropPartNoImage: function(obj, isNextMask) {
			var currentDivMask = $(this.options.element_mark).eq( this.options.index_current_mask - 1 );
			//var currentDivMask = $("#mask_" + obj.type);
			currentDivMask.addClass('have_img');

			if (isNextMask)
				this.changeIndexCurrentMask();
		},
		cropPartImage: function(obj, isNextMask) {
			if(!this.options.enable_export_image_mark){
				this._cropPartNoImage(obj, isNextMask);
				return;
			}

	        var me = this;
	        var temp_canvas = document.createElement('canvas');
	        var des_width = Math.abs(obj.width);
	        var des_height = Math.abs(obj.height);
	        temp_canvas.width = des_width;
	        temp_canvas.height = des_height;
	        var ctx = temp_canvas.getContext('2d');
	        var image_obj = new Image();
	        if (obj.width < 0) {
	            obj.width = Math.abs(obj.width);
	            obj.x -= obj.width;
	        }
	        if (obj.height < 0) {
	            obj.height = Math.abs(obj.height);
	            obj.y -= obj.height;
	        }
	        
	        image_obj.onload = function() {
	            var center_image_x = me.image_value.width / 2, center_image_y = me.image_value.height / 2;
	            var center_x = (obj.x + obj.width) / 2, center_y = (obj.y + obj.height) / 2;
	            
	            var ew = me.image_value.width, eh = me.image_value.height;
				var ex = (obj.x + obj.width/2), 
					ey = (obj.y + obj.height/2);

	            //var eangle = obj.angle;
				ctx.translate(obj.width/2, obj.height/2);

				ctx.drawImage(image_obj, -ex, -ey, ew, eh);
	            var dataURL = me._cropImageFromCanvas(ctx, temp_canvas);
	            if (dataURL != null) {
	                var currentDivMask = $("#mask_" + obj.type);
	                currentDivMask.addClass('have_img');
	                currentDivMask.find('img').attr('src', dataURL);
	                if (isNextMask)
	                	me.changeIndexCurrentMask();
	            }
	        };
	        image_obj.src = this.options.image_url;
		},
		_cropImageFromCanvas: function(ctx, canvas) {
		    var w = canvas.width,
		        h = canvas.height,
		        pix = { x: [], y: [] },
		        imageData = ctx.getImageData(0, 0, canvas.width, canvas.height),
		        x, y, index;
		    for (y = 0; y < h; y++) {
		        for (x = 0; x < w; x++) {
		            index = (y * w + x) * 4;
		            if (imageData.data[index + 3] > 0) {
		                pix.x.push(x);
		                pix.y.push(y);
		            }
		        }
		    }
		    pix.x.sort(function(a, b) { return a - b; });
		    pix.y.sort(function(a, b) { return a - b; });
		    var n = pix.x.length - 1;
		    w = pix.x[n] - pix.x[0];
		    h = pix.y[n] - pix.y[0];
		    if (w > 0 && h > 0) {
		        var cut = ctx.getImageData(pix.x[0], pix.y[0], w, h);
		        canvas.width = w;
		        canvas.height = h;
		        ctx.putImageData(cut, 0, 0);
		        return canvas.toDataURL();
		    } else {
		        return null;
		    }
		},
		changeIndexCurrentMask: function(){
			//lastMaskItem = this.options.index_current_mask;
		    if (this.options.index_current_mask < this.options.count_max_mask)
		        this.options.index_current_mask++;
		    this.activeDrawMask();
		},
		activeDrawMask : function() {
		    $(this.options.element_mark).removeClass('item_active');
			var itemCurrent = $( this.options.element_mark ).eq( this.options.index_current_mask - 1 );
		    //var itemCurrent = $('#mask_' + this.options.index_current_mask);
		    itemCurrent.addClass('item_active');
		},
		refresh: function(){
			this._drawCanvas();
			var temp = JSON.stringify(this.options.arr_mark);
			$(this.options.element_data_mark).val(temp);
			var degree_temp = parseInt(this.image_value.angle / Math.PI * 180);
			$('.ob-croima-label-angle').html(degree_temp + '°');
		},
		set_zoom: function(new_zoom, zoom_center) {
			var me = this;
            //if (this._trigger("onZoom", 0, new_zoom) == false) return;
            if (!this.image_value || this.do_anim) return;
            this.do_anim = true;
            zoom_center = zoom_center || {
                    x: Math.round(this.options.width / 2),
                    y: Math.round(this.options.height / 2)
                };
            if (new_zoom < this.options.zoom_min) new_zoom = this.options.zoom_min;
            else if (new_zoom > this.options.zoom_max) new_zoom = this.options.zoom_max;
    
            var delta_zoom = (new_zoom - this.current_zoom)/10;
            var timerId = setInterval(function () {
		      	// interval function body
		      	var _new_zoom = me.current_zoom + delta_zoom;
	      		if((delta_zoom > 0 && _new_zoom >= new_zoom) || (delta_zoom < 0 &&_new_zoom <= new_zoom)) 
	      			_new_zoom = new_zoom;

				var old_x = -me.image_value.x + zoom_center.x;
                var old_y = -me.image_value.y + zoom_center.y

		    	var new_width = util.scaleValue(me.image_value.origin_width, _new_zoom);
	            var new_height = util.scaleValue(me.image_value.origin_height, _new_zoom);
	            var new_x = util.scaleValue(util.descaleValue(old_x, me.current_zoom), _new_zoom);
	            var new_y = util.scaleValue(util.descaleValue(old_y, me.current_zoom), _new_zoom);
	            new_x = zoom_center.x - new_x;
	            new_y = zoom_center.y - new_y;
	            var coords = me._correctCoords(new_x, new_y, new_width, new_height);
	            me._updateImageValue(coords.x, coords.y, coords.width, coords.height);
 				me.current_zoom = _new_zoom;
 				me._updateMarkCorner();
            	me.refresh();

            	if(_new_zoom == new_zoom){
            		me.do_anim = false;
            		clearInterval(timerId);
            	}
		    }, 20);
			  
        },
        _correctCoords: function(x, y, width, height) {
            if (width <= this.options.width) x = (this.options.width - width) / 2;
            if (height  <= this.options.height) y = (this.options.height - height) / 2;
            return { x: x, y: y, width: width, height: height }
        },
        zoom_by: function(delta, zoom_center) {
            var closest_rate = this.find_closest_zoom_rate(this.current_zoom);
            var next_rate = closest_rate + delta;
            var next_zoom = this.options.zoom * Math.pow(this.options.zoom_delta, next_rate);
            if (delta > 0 && next_zoom < this.current_zoom) next_zoom *= this.options.zoom_delta;
            if (delta < 0 && next_zoom > this.current_zoom) next_zoom /= this.options.zoom_delta;
            this.set_zoom(next_zoom, zoom_center);
        },
        find_closest_zoom_rate: function(value) {
            if (value == this.options.zoom) return 0;

            function div(val1, val2) {
                return val1 / val2
            }

            function mul(val1, val2) {
                return val1 * val2
            }
            var func = value > this.options.zoom ? mul : div;
            var sgn = value > this.options.zoom ? 1 : -1;
            var mltplr = this.options.zoom_delta;
            var rate = 1;
            while (Math.abs(func(this.options.zoom, Math.pow(mltplr, rate)) - value) > Math.abs(func(this.options.zoom, Math.pow(mltplr, rate + 1)) - value)) rate++;
            return sgn * rate;
        },
		fit: function() {
            var new_zoom = this._fit();
            this.set_zoom(new_zoom)
        },
        _fit:function(){
			var aspect_ratio = this.image_value.origin_width / this.image_value.origin_height;
            var window_ratio = this.options.width / this.options.height;
            var choose_left = aspect_ratio > window_ratio;
            var new_zoom = 0;
            if (choose_left) new_zoom = this.options.width / this.image_value.origin_width * 100;
            else new_zoom = this.options.height / this.image_value.origin_height * 100;
            return new_zoom;
        },
        enableRotate: function(){
        	if(this.options.current_action != 'rotate'){
	        	var new_zoom = this._fit();
	        	new_zoom -= new_zoom*2/10;
	        	this.set_zoom(new_zoom);
	        	this.options.current_action = 'rotate';
	        	this.container.css({cursor:'nesw-resize'});
	        	this._hideGroupButton();
	        	$('.button-group-rotate').show();
	        }else{
		        this._resetFearture();
		    }
        },
        enableCrop: function(){
        	if(this.options.current_action != 'crop'){
	        	var new_zoom = this._fit();
	        	new_zoom -= new_zoom*2/10;
	        	this.set_zoom(new_zoom);
	        	this.options.current_action = 'crop';
	        	this.container.css({cursor:'default'});
	        	var corner = {
	        		'top_left': {'x':this.options.width/10, 'y': this.options.height/10},
	        		'top_right': {'x':this.options.width*9/10, 'y': this.options.height/10},
	        		'bot_left': {'x':this.options.width/10, 'y': this.options.height*9/10},
	        		'bot_right': {'x':this.options.width*9/10, 'y': this.options.height*9/10},
	        		//'zoom':this.current_zoom,
	        	};
	        	this.crop_corner = corner;
	        	this._hideGroupButton();
	        	$('.button-group-crop').show();
	        }else{
		        this._resetFearture();
		    }
        },
        enableMark: function () {
 			if(this.options.current_action != 'mark'){
 				this._enableMark();
	        	this.refresh();
	        }else{
		        this._resetFearture();
		    }
        },
		_enableMark: function (){
			this._setAngle(0);
			this.options.current_action = 'mark';
			this.container.css({cursor:'cell'});
			this.flag_can_mark = true;
		},
        enableGroupMark: function(){
        	if(this.options.current_action != 'group-mark'){
        		this._setAngle(0);
	        	this.options.current_action = 'group-mark';
	        	this.container.css({cursor:'default'});
	        	this.refresh();
	        }else{
		        this._resetFearture();
		    }
        },
        _resetFearture: function(){
        	//this._setAngle(0);
        	this._hideGroupButton();
        	this.corner_active = false;
        	this.options.current_action = 'move';
        	this.container.css({cursor:'default'});
        	this.fit();
        },
        _hideGroupButton: function(){
        	$('.button-group-rotate').hide();
        	$('.button-group-crop').hide();
        },
        _resetMark:  function(){
        	this.options.arr_mark = {};
        },
		showHideMark: function (){
			if (this.enable_show_mark) {
				this.enable_show_mark = false;
			}else {
				this.enable_show_mark = true;
			}
			this.refresh();
		},
        saveAction: function(){
        	var me = this;
        	// Save Rotate
        	var temp_canvas_1 = document.createElement('canvas');
	        var ctx_1 = temp_canvas_1.getContext('2d');
        	if(this.options.current_action == 'rotate'){
        		var min_max_corner = this._getMinMaxCorner();
				var current_center = {'x': (min_max_corner.max_x - min_max_corner.min_x) / 2, 'y': (min_max_corner.max_y - min_max_corner.min_y)/2};
				var new_width_1 = current_center.x*2/this.current_zoom*100;
	        	var new_height_1 = current_center.y*2/this.current_zoom*100;
	        	temp_canvas_1.width = new_width_1;
	        	temp_canvas_1.height = new_height_1;
	        	var image_obj = new Image();
				image_obj.src = this.options.image_url;
				image_obj.onload = function() {
					ctx_1.clearRect(0,0,new_width_1, new_height_1);
					ctx_1.fillStyle = 'white';
					ctx_1.fillRect(0,0,new_width_1, new_height_1);
					ctx_1.save();
					ctx_1.translate(new_width_1/2, new_height_1/2);
					ctx_1.rotate(me.image_value.angle);
					ctx_1.drawImage(image_obj, -me.image_value.origin_width/2, -me.image_value.origin_height/2);
					ctx_1.restore();

		            var dataURL = me._cropImageFromCanvas(ctx_1, temp_canvas_1);
		            //var dataURL = temp_canvas.toDataURL();
		            if (dataURL != null) {
		                me.replaceImage(dataURL);
		            }else{
		            	console.log('have error');
		            }
				};
				this._trigger("onEdit", 0);
        		return 0;
        	}


        	// Save Crop
        	if(this.options.current_action != 'crop') return;
        	
			var min_max_corner = this._getMinMaxCorner();
			var current_center = {'x': (min_max_corner.max_x - min_max_corner.min_x) / 2, 'y': (min_max_corner.max_y - min_max_corner.min_y)/2};
	        var newCorner = util.convertCornerAfterZoom2(this.crop_corner, this.current_zoom, 100);
			var new_width = newCorner.top_right.x - newCorner.top_left.x;
			var new_height = newCorner.bot_left.y - newCorner.top_left.y;
			
			var delta_center = {'x': (min_max_corner.min_x - this.crop_corner.top_left.x)/this.current_zoom*100,
								'y': (min_max_corner.min_y - this.crop_corner.top_left.y)/this.current_zoom*100};
			
	        var new_width_1 = current_center.x*2/this.current_zoom*100;
	        var new_height_1 = current_center.y*2/this.current_zoom*100;

	        temp_canvas_1.width = new_width_1;
	        temp_canvas_1.height = new_height_1;
			
			var image_obj = new Image();
			image_obj.src = this.options.image_url;
			image_obj.onload = function() {
				ctx_1.clearRect(0,0,new_width_1, new_height_1);
				ctx_1.fillStyle = 'white';
				ctx_1.fillRect(0,0,new_width_1, new_height_1);
				ctx_1.save();
				ctx_1.translate(new_width_1/2, new_height_1/2);
				ctx_1.rotate(me.image_value.angle);
				ctx_1.drawImage(image_obj, -me.image_value.origin_width/2, -me.image_value.origin_height/2);
				ctx_1.restore();
				var temp_canvas = document.createElement('canvas');
		        var ctx = temp_canvas.getContext('2d');
				temp_canvas.width = new_width;
		        temp_canvas.height = new_height;
 				var cut = ctx_1.getImageData(0, 0, new_width_1, new_height_1);
		        ctx.putImageData(cut, delta_center.x, delta_center.y);

	            var dataURL = me._cropImageFromCanvas(ctx, temp_canvas);
	            //var dataURL = temp_canvas.toDataURL();
	            if (dataURL != null) {
	                me.replaceImage(dataURL);
	            }else{
	            	console.log('have error');
	            }
				me._trigger("onEdit", 0);
			};
        },
		resetAction: function(){
			this.replaceImage(this.options.origin_image_url);
		},
		_createUI: function() {
            var me = this;
            //canvas
            this.canvas_object = $("<canvas>", {
            	"class": "ob-canvas"
            }).appendTo(this.container)[0];
            this.canvas_object.width = me.options.width;
            this.canvas_object.height = me.options.height;
            this.context = this.canvas_object.getContext('2d');

			
				// button zoom origin
				$("<button>", {
					"html": this.options.icon_zoom_origin,
					"class": "ob-croima-button ob-croima-zoom-origin",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.set_zoom(100);
				}).appendTo(this.container);

				// button zoom fit
				$("<button>", {
					"html": this.options.icon_zoom_fit,
					"class": "ob-croima-button ob-croima-zoom-fit",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.fit();
				}).appendTo(this.container);

				// button zoom plus
				$("<button>", {
					"html": this.options.icon_zoom_plus,
					"class": "ob-croima-button ob-croima-zoom-plus",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.zoom_by(1);
					//return false;
				}).appendTo(this.container);

				// button zoom minus
				$("<button>", {
					"html": this.options.icon_zoom_minus,
					"class": "ob-croima-button ob-croima-zoom-minus",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.zoom_by(-1);
				}).appendTo(this.container);
			
			//$("<br>").appendTo(this.container);
			if(this.options.type_feature % 2 == 0) {
				// button rotate
				$("<button>", {
					"html": this.options.icon_rotate,
					"class": "ob-croima-button ob-croima-rotate",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.enableRotate();
				}).appendTo(this.container);

				// button crop
				$("<button>", {
					"html": this.options.icon_crop,
					"class": "ob-croima-button ob-croima-crop",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.enableCrop();
				}).appendTo(this.container);


				var div_rotate = $("<div>",{
				"class" : "ob-area-button-group button-group-rotate",
				}).appendTo(this.container);
				// reset
				$("<button>", {
					"html": this.options.icon_reset_rotate,
					"class": "ob-croima-button ob-croima-reset-rotate",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me._setAngle(0);
				}).appendTo(div_rotate);

				var div_crop = $("<div>",{
					"class" : "ob-area-button-group button-group-crop",
				}).appendTo(this.container);

				// button save
				$("<button>", {
					"html": this.options.icon_apply_crop,
					"class": "ob-croima-button ob-croima-save-action",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.saveAction();
				}).appendTo(div_crop);

				// button refresh
				$("<button>", {
					"html": this.options.icon_reset_crop,
					"class": "ob-croima-button ob-croima-reset",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.resetAction();
				}).appendTo(div_crop);
			}
			if(this.options.type_feature > 2){
				// button mark
				$("<button>", {
					"html": this.options.icon_mark,
					"class": "ob-croima-button ob-croima-mark ob-croima-pos-5",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.enableMark();
				}).appendTo(this.container);


				// button group mark
				$("<button>", {
					"html": this.options.icon_group_mark,
					"class": "ob-croima-button ob-croima-group-mark ob-croima-pos-6",
					'type': 'button',
				}).bind("mousedown touchstart", function () {
					me.enableGroupMark();
				}).appendTo(this.container);
			}

        },
        _updateImageValue: function(_x, _y, _width, _height){
        	this.image_value.x = _x;
        	this.image_value.y = _y;
        	this.image_value.width = _width;
        	this.image_value.height = _height;
        	this._updateCorner();
        },
        _updateCorner : function(){
        	var info = this.image_value;
        	var image_center = this._getImageCenter();
			var corner = {
        		'top_left': this._findPointRotate(image_center,{'x':info.x, 'y': info.y}, -info.angle),
        		'top_right': this._findPointRotate(image_center,{'x':info.x + info.width, 'y':info.y}, -info.angle),
        		'bot_left': this._findPointRotate(image_center,{'x':info.x, 'y': info.y + info.height}, -info.angle),
        		'bot_right': this._findPointRotate(image_center,{'x':info.x + info.width, 'y':info.y + info.height}, -info.angle),
        		//'zoom':this.current_zoom,
        	};
        	this.image_value.corner = corner;
        },
        _updateMarkCorner: function(){
        	for(var prop in this.mark_group){
        		var item = this.options.arr_mark[prop];
        		if(!item) continue;

				var tran_pos = this._transferPosition(item.x, this.image_value.x, item.y, this.image_value.y,
						item.width, item.height, 
						item.zoom, this.current_zoom, item.angle, this.image_value.angle);
        		var temp_tran_pos = {
        			'x' : tran_pos.x - tran_pos.w/2,
        			'y' : tran_pos.y - tran_pos.h/2,
        			'w' : tran_pos.w,
        			'h' : tran_pos.h,
        		};
				var corner = {
		        		'top_left': {'x' : temp_tran_pos.x, 'y': temp_tran_pos.y },
		        		'top_right': {'x' : temp_tran_pos.x + temp_tran_pos.w, 'y': temp_tran_pos.y},
		        		'bot_left': {'x' : temp_tran_pos.x, 'y': temp_tran_pos.y + temp_tran_pos.h},
		        		'bot_right': {'x' : temp_tran_pos.x + temp_tran_pos.w, 'y': temp_tran_pos.y + temp_tran_pos.h},
		        		'zoom': this.current_zoom, 
		        		'image_x': this.image_value.x, 
		        		'image_y': this.image_value.y,
		        		'angle': this.image_value.angle,
		        	};
		        this.mark_group[prop] = corner;
        	}
        },
        _getMarkCornerCurrent: function(){
        	//Get min max
			var mark_group = this.mark_group;

			var first = Object.keys(mark_group)[0];
			if(!first) return false;
			//for (first in mark_group) break;
				//console.log(first);
			var temp = {};
			temp.min_x = mark_group[first]['top_left'].x;
			temp.min_y = mark_group[first]['top_left'].y;
			temp.max_x = mark_group[first]['bot_right'].x;
			temp.max_y = mark_group[first]['bot_right'].y;

        	for(var prop in mark_group){
        		//console.log(prop);
        		for(var i in mark_group[prop]){
        			//console.log(mark_group[prop][i]);
        			if(['top_left', 'top_right', 'bot_left', 'bot_right'].indexOf(i) < 0) continue;
        			
        			if(mark_group[prop][i].x < temp.min_x) temp.min_x = mark_group[prop][i].x;
	        		if(mark_group[prop][i].y < temp.min_y) temp.min_y = mark_group[prop][i].y;
	        		if(mark_group[prop][i].x > temp.max_x) temp.max_x = mark_group[prop][i].x;
	        		if(mark_group[prop][i].y > temp.max_y) temp.max_y = mark_group[prop][i].y;
        		}
        	}
        	return {'top_left': {'x':temp.min_x,'y': temp.min_y}, 
        			'top_right': {'x':temp.max_x,'y': temp.min_y}, 
        			'bot_left': {'x':temp.min_x,'y': temp.max_y},
        			'bot_right': {'x':temp.max_x,'y': temp.max_y},
        		};
        },
        _cropMove: function(x, y){
        	if(!this.corner_active) return false;

        	var corner = this.crop_corner;
			
			corner[this.corner_active].x = x;
			corner[this.corner_active].y = y;
			
			switch(this.corner_active){
				case 'top_left':
					corner['top_right'].y = y;
					corner['bot_left'].x = x;
					break;
				case 'top_right':
					corner['top_left'].y = y;
					corner['bot_right'].x = x;
					break;
				case 'bot_left':
					corner['bot_right'].y = y;
					corner['top_left'].x = x;
					break;
				case 'bot_right':
					corner['bot_left'].y = y;
					corner['top_right'].x = x;
					break;
			}
			this.crop_corner = corner;
			this.refresh();
			return true;
        },
        _finishCrop: function(){
        	console.log('_finishCrop');

        },
        _mark: function(cur_x,cur_y){
		    if (this.do_mark) {
		        //flagMove = true;
		        var context = this.context;
		        context.clearRect(0, 0, this.options.width, this.options.height);
		        this._drawImage();
		        context.lineWidth = 3;
				var temp_type = $(this.options.element_mark + '.item_active').data('mark_type')
					|| this.options.index_current_mask;

				if(this.options.enable_type_from_element)
					temp_type = $(this.options.element_mark + '.item_active').parent().find('.sel-filter').val();
				if(!temp_type)
					return;

		        context.strokeStyle = this._getColorLine(temp_type);
		        //context.strokeStyle = this._getColorLine(this.options.index_current_mask);
		        context.strokeRect(this.start_mark_x, this.start_mark_y, cur_x - this.start_mark_x, cur_y - this.start_mark_y);
		        context.strokeStyle = '#000000';
		        this._drawLineMark();
		        
		    }
        },
        _finishMark: function(cur_x,cur_y){
			if(this.do_mark){
		        if (Math.abs(cur_x - this.start_mark_x) > 10 && Math.abs(cur_y - this.start_mark_y) > 10) {
		            var temp = -1;
		            for (var i in this.options.arr_mark) {
		                if (i == this.options.index_current_mask)
		                    temp = i;
		            }
		            if (temp > -1)
		                delete this.options.arr_mark[temp];

					//this.options.index_current_mask
					var temp_type = $(this.options.element_mark + '.item_active').data('mark_type')
						|| this.options.index_current_mask;

					if(this.options.enable_type_from_element)
						temp_type = $(this.options.element_mark + '.item_active').parent().find('.sel-filter').val();
					if(!temp_type)
						return;

					//console.log('temp_type',temp_type);
		            var obj = new Mask(this.start_mark_x - this.image_value.x, this.start_mark_y - this.image_value.y, 
		            	cur_x - this.start_mark_x, cur_y - this.start_mark_y, 
		            	this.current_zoom, 0, parseInt(temp_type),
						this.image_value.width, this.image_value.height,
		            	this.image_value.x, this.image_value.y);
		            this.options.arr_mark[this.options.index_current_mask] = (obj);
		            this.refresh();
		            this.cropPartImage(obj, true);
					this._trigger("onFinishMark", 0, obj);
					this._trigger("onEdit", 0);
		        }
        	}
        	this.do_mark = false;

        },
        _zoomGroupMark: function(cur_x,cur_y){
        	if(!this.corner_active) return;

        	var arr_corner_active_check = ['top_left','top_right','bot_left','bot_right'];
        	var arr_corner_opposite = ['bot_right','bot_left','top_right','top_left'];
        	var corner_active = this.corner_active;
        	var corner_opposite = arr_corner_opposite[arr_corner_active_check.indexOf(corner_active)];

        	var corner = this._getMarkCornerCurrent();
        	var ratio_x = (cur_x - corner[corner_opposite].x)/(corner[corner_active].x - corner[corner_opposite].x);
        	var ratio_y = (cur_y - corner[corner_opposite].y)/(corner[corner_active].y - corner[corner_opposite].y);
        	
        	var obj_corner_opposite = corner[corner_opposite];

        	for( var prop in this.mark_group){
				var obj_mark = this.options.arr_mark[prop];
        		if(!obj_mark) continue;

        		var obj = this.mark_group[prop];

        		var min_x = (obj['top_left'].x - obj_corner_opposite.x) * ratio_x + obj_corner_opposite.x;
        		var min_y = (obj['top_left'].y - obj_corner_opposite.y) * ratio_y + obj_corner_opposite.y;
        		var max_x = (obj['bot_right'].x - obj_corner_opposite.x) * ratio_x + obj_corner_opposite.x;
        		var max_y = (obj['bot_right'].y - obj_corner_opposite.y) * ratio_y + obj_corner_opposite.y;

				var corner = {
	        		'top_left': {'x' : min_x, 'y': min_y },
	        		'top_right': {'x' : max_x, 'y': min_y},
	        		'bot_left': {'x' : min_x, 'y': max_y},
	        		'bot_right': {'x' : max_x, 'y': max_y}
	        	};

        		this.mark_group[prop] = corner;

        		obj_mark.x = (min_x - this.image_value.x)/this.current_zoom * obj_mark.zoom;
        		obj_mark.y = (min_y - this.image_value.y)/this.current_zoom * obj_mark.zoom;
        		obj_mark.width = (max_x - min_x)/this.current_zoom * obj_mark.zoom;
        		obj_mark.height = (max_y - min_y)/this.current_zoom * obj_mark.zoom;

        	}
			this.refresh();
        },
        _finishZoomGroupMark: function(){
        	for( var prop in this.mark_group){
				var obj_mark = this.options.arr_mark[prop];
				if(obj_mark) this.cropPartImage(obj_mark, false);
			}
        },
        _moveGroupMark: function(delta_x,delta_y){
        	for( var prop in this.mark_group){
				var obj_mark = this.options.arr_mark[prop];
        		if(!obj_mark) continue;

        		var obj = this.mark_group[prop];

        		var min_x = (obj['top_left'].x + delta_x);
        		var min_y = (obj['top_left'].y + delta_y);
        		var max_x = (obj['bot_right'].x + delta_x);
        		var max_y = (obj['bot_right'].y + delta_y);

				var corner = {
	        		'top_left': {'x' : min_x, 'y': min_y },
	        		'top_right': {'x' : max_x, 'y': min_y},
	        		'bot_left': {'x' : min_x, 'y': max_y},
	        		'bot_right': {'x' : max_x, 'y': max_y}
	        	};

        		this.mark_group[prop] = corner;

        		obj_mark.x = (min_x - this.image_value.x)/this.current_zoom * obj_mark.zoom;
        		obj_mark.y = (min_y - this.image_value.y)/this.current_zoom * obj_mark.zoom;
        		obj_mark.width = (max_x - min_x)/this.current_zoom * obj_mark.zoom;
        		obj_mark.height = (max_y - min_y)/this.current_zoom * obj_mark.zoom;
        	}
        	this.refresh();

        },
        _mouseCapture: function(e) { 
        	if(this.options.current_action == 'group-mark' && !this.corner_active){
        		var dx = e.pageX - this.container.offset().left;
            	var dy = e.pageY - this.container.offset().top;
            	var arr_mark = this.options.arr_mark;
            	var flag_inside_group = false;
            	for (var prop in arr_mark) {
            		var item = arr_mark[prop];
            		var tran_pos = this._transferPosition(item.x, this.image_value.x, item.y, this.image_value.y,
							item.width, item.height, 
							item.zoom, this.current_zoom, item.angle, this.image_value.angle);
            		var temp_tran_pos = {
            			'x' : tran_pos.x - tran_pos.w/2,
            			'y' : tran_pos.y - tran_pos.h/2,
            			'w' : tran_pos.w,
            			'h' : tran_pos.h,
            		};

            		if (temp_tran_pos.x < dx && dx < temp_tran_pos.x + temp_tran_pos.w && temp_tran_pos.y < dy && dy < temp_tran_pos.y + temp_tran_pos.h){
            			flag_inside_group = true;
            			if(this.mark_group[prop]){
            				delete this.mark_group[prop];
            				this.refresh();
            				break;
            			}
            			var corner = {
			        		'top_left': {'x' : temp_tran_pos.x, 'y': temp_tran_pos.y },
			        		'top_right': {'x' : temp_tran_pos.x + temp_tran_pos.w, 'y': temp_tran_pos.y},
			        		'bot_left': {'x' : temp_tran_pos.x, 'y': temp_tran_pos.y + temp_tran_pos.h},
			        		'bot_right': {'x' : temp_tran_pos.x + temp_tran_pos.w, 'y': temp_tran_pos.y + temp_tran_pos.h},
			        	};
			        	this.mark_group[prop] = corner;
			        	this.refresh();
			        	break;
            		}
            	}
            	if(!flag_inside_group){
            		this.mark_group = {};
            		this.refresh();
            	}
        	}
        	return true; 
        },
        _mouseStart: function(e) {
            this.dx = e.pageX - this.container.offset().left;
            this.dy = e.pageY - this.container.offset().top;
            //console.log('action: ' + this.options.current_action);
            if(this.options.current_action == 'mark'){
				var current = $(this.options.element_mark).eq(this.options.index_current_mask - 1);
            	//var current = $("#mask_" + this.options.index_current_mask);
			    if (!current.hasClass('have_img') && this.flag_can_mark && this.options.index_current_mask > 0 && this.options.index_current_mask <= this.options.count_max_mask) {
		            this.start_mark_x = this.dx;
		            this.start_mark_y = this.dy;
		            this.do_mark = true;
			    }
            }
            return true;
        },
        _mouseDrag: function(e) {
        	//console.log("mouse move");
			if(!this.do_anim && !this.do_move)
				this.do_move = true;
			var temp_x = e.pageX - this.container.offset().left;
			var temp_y = e.pageY - this.container.offset().top;
			if(this.do_move){
				var delta_x = temp_x - this.dx;
                var delta_y = temp_y - this.dy;
                //console.log(this.dx, this.dy);
                switch(this.options.current_action){
                	case 'rotate':
                		this.setRotate(temp_x, temp_y); break;
                	case 'mark':
                		if(this.flag_can_mark)
                			this._mark(temp_x, temp_y);
                		else
							this.setCoords(this.image_value.x + delta_x, this.image_value.y + delta_y);
						break;
                	case 'group-mark':
                		if(this.corner_active != 'move')
                			this._zoomGroupMark(temp_x, temp_y); 
                		else
                			this._moveGroupMark(delta_x, delta_y);
						this._trigger("onEdit", 0);
                		break;
                	case 'crop':
                		if(this._cropMove(temp_x, temp_y)) break;
                	default:
                		this.setCoords(this.image_value.x + delta_x, this.image_value.y + delta_y);
                }
				this.dx = temp_x;
            	this.dy = temp_y;
			}
			return false;
        },
		_mouseStop: function(e) { 
			var temp_x = e.pageX - this.container.offset().left;
			var temp_y = e.pageY - this.container.offset().top;
			switch(this.options.current_action) {
            	case 'mark':
            		if(this.flag_can_mark)
            			this._finishMark(temp_x, temp_y);
            		break;
            	case 'group-mark':
            		this._finishZoomGroupMark();break;
            	// case 'crop':
            	// 	if(this.corner_active)
            	// 		this._finishCrop();
            		// break;
            }
			this.do_move = false;
			this._trigger("onStopDrag", 0, e);
		},
		_handleMouseMove: function(e) {
            //this._trigger("onMouseMove", e, this._getMouseCoords(e));

            this.posMouseX = e.offsetX;
            this.posMouseY = e.offsetY;
            switch(this.options.current_action){
            	case 'mark': this.refresh(); break;
            	case 'crop': this._changeStatusCursor(e); break;
            	case 'group-mark': this._changeStatusCursor(e); break;
            }
	        
        },
        _handleDoubleClick: function(e){
        	//console.log("_handleDoubleClick");
        	if(this.options.current_action == 'mark'){
        		if(this.flag_can_mark)
        			this.flag_can_mark = false;
        		else
        			this.flag_can_mark = true;
        		this.refresh();
        	}
        },
        _changeStatusCursor: function(e){
			if(!this.do_move){
				this.container.css({cursor:'default'});
				this.corner_active = false;
				switch(this.options.current_action){
					case 'crop':
						var temp = this._getCornerActive(e);
						this.corner_active = temp;
						if(temp)
		        			this.container.css({cursor:'nesw-resize'});
						break;
					case 'group-mark':
						if(!this._getMarkCornerActive(e))	
		        			this._checkMarkCornerMove(e);
						break;
				}
			}
        	
        },
        _getCornerActive: function(e){
			var corner = this.crop_corner;
        	var delta = 25;
        	for (var prop in corner) {
        		//console.log(corner[prop]);
        		if((corner[prop].x - delta) < e.offsetX && (corner[prop].x + delta) > e.offsetX
        			&& (corner[prop].y - delta) < e.offsetY && (corner[prop].y + delta) > e.offsetY){
        			return prop;
        			break;
        		}
        	}
        	return false;
        },
        _getMarkCornerActive: function(e){
        	//var mark_group = this.mark_group;
        	var delta = 10;
        	var corners = this._getMarkCornerCurrent();
        	for (var prop in corners) {
    			if((corners[prop].x - delta) < e.offsetX && (corners[prop].x + delta) > e.offsetX
    			&& (corners[prop].y - delta) < e.offsetY && (corners[prop].y + delta) > e.offsetY){
    				this.container.css({cursor:'nesw-resize'});
    				this.corner_active = prop;
        			return prop;
        			break;
    			}
        	}
        	return false;
        },
        _checkMarkCornerMove: function(e){
        	var corners = this._getMarkCornerCurrent();
        	if(!corners) return;
        	if ( corners['top_left'].x < e.offsetX && corners['top_right'].x > e.offsetX
        		&& corners['top_left'].y < e.offsetY && corners['bot_left'].y > e.offsetY){
        		this.container.css({cursor:'move'});
        		this.corner_active = 'move';
        	}
        	return false;
        },
		setCoords: function(x, y){
			if(this.image_value.width <= this.options.width && this.image_value.height <= this.options.height) return;
			this._updateImageValue(x, y, this.image_value.width, this.image_value.height);
			this._updateMarkCorner();
			this.refresh();
		},
		_getMinMaxCorner: function (){
			var corner = this.image_value.corner;
			var temp = {};
			temp.min_x = corner['top_left'].x;
			temp.min_y = corner['top_left'].y;
			temp.max_x = corner['top_left'].x;
			temp.max_y = corner['top_left'].y;
			for (var prop in corner) {
        		if(corner[prop].x < temp.min_x) temp.min_x = corner[prop].x;
        		if(corner[prop].y < temp.min_y) temp.min_y= corner[prop].y;
        		if(corner[prop].x > temp.max_x) temp.max_x = corner[prop].x;
        		if(corner[prop].y > temp.max_y) temp.max_y = corner[prop].y;
        	}
        	return temp;
		},
		setRotate: function(x, y){
			var point_a = this._getImageCenter();
			var point_b = {'x': this.dx, 'y' : this.dy};
			var point_c = {'x': x, 'y' : y};
			var angle = this._findAngle(point_a, point_b, point_c);
			var direction = this._findDirectionAngle(point_a, point_b, point_c);
			//console.log('angle', angle);
			this.image_value.angle += direction*angle;
			this._updateCorner();
			this.refresh();
		},
		_setAngle: function(_angle){
			this.image_value.angle = _angle;
			this._updateCorner();
			this.refresh();
		},
		resetRotate: function(){this._setAngle(0)},
		rotateRight: function(){
			this._setAngle(this.image_value.angle + 1/180 * Math.PI);
		},
		rotateLeft: function(){
			this._setAngle(this.image_value.angle - 1/180 * Math.PI);
		},
		rotateRight5: function(){
			this._setAngle(this.image_value.angle + 5/180 * Math.PI);
		},
		rotateLeft5: function(){
			this._setAngle(this.image_value.angle - 5/180 * Math.PI);
		},
		_getImageCenter: function(){
			return {'x': (this.image_value.width)/2 + this.image_value.x, 'y' :(this.image_value.height)/2 + this.image_value.y};
		},
		 /*
		 * Calculates the angle ABC (in radians) 
		 *
		 * A first point, ex: {x: 0, y: 0}
		 * C second point
		 * B center point
		 */
		_findAngle: function(A, B, C) {
		    var AB = Math.sqrt(Math.pow(B.x-A.x,2)+ Math.pow(B.y-A.y,2));    
		    var BC = Math.sqrt(Math.pow(B.x-C.x,2)+ Math.pow(B.y-C.y,2)); 
		    var AC = Math.sqrt(Math.pow(C.x-A.x,2)+ Math.pow(C.y-A.y,2));
		    //console.log('line',AB, AC, BC);
		    return Math.acos((AC*AC+AB*AB-BC*BC)/(2*AC*AB));
		},
		_findDirectionAngle: function(A, B, C){
			var angleRadians = Math.atan2(C.y - A.y, C.x - A.x) - Math.atan2(B.y - A.y, B.x - A.x);
		    //console.log('angleRadians', angleRadians);
		    return (angleRadians > 0) ? 1 :-1;
		},
		_findPointRotate: function(A, B, radians) {
		    var cos = Math.cos(radians),
		        sin = Math.sin(radians),
		        nx = (cos * (B.x - A.x)) + (sin * (B.y - A.y)) + A.x,
		        ny = (cos * (B.y - A.y)) - (sin * (B.x - A.x)) + A.y;
		    return {'x': nx, 'y' : ny};
		}
 	});

	var util = {
        scaleValue: function(value, toZoom) {
            return value * toZoom / 100
        },
        descaleValue: function(value, fromZoom) {
            return value * 100 / fromZoom
        },
        convertCornerFromCenter: function(corner, center){
        	//console.log(center);
        	var result = {};
        	for(var prop in corner){
        		var temp = {};
        		temp.x = center.x - corner[prop].x;
        		temp.y = center.y - corner[prop].y;
        		result[prop] = temp;
        	}
        	return result;
        },
        convertCornerAfterZoom: function(corner, center, old_zoom, new_zoom){
        	//console.log(center);
			//console.log(old_zoom, new_zoom);
        	var result = {};
        	for(var prop in corner){
        		var temp = {};
        		temp.x = (center.x - corner[prop].x)/old_zoom * new_zoom ;
        		temp.y = (center.y - corner[prop].y)/old_zoom * new_zoom;
        		result[prop] = temp;
        	}
        	return result;
        },
        convertCornerAfterZoom2: function(corner, old_zoom, new_zoom){
			//console.log(old_zoom, new_zoom);
        	var result = {};
        	for(var prop in corner){
        		var temp = {};
        		temp.x = corner[prop].x/old_zoom * new_zoom ;
        		temp.y = corner[prop].y/old_zoom * new_zoom;
        		result[prop] = temp;
        	}
        	return result;
        },
        convertPointAfterZoom: function(point, old_zoom, new_zoom){
        	//console.log(point);
			//console.log(old_zoom, new_zoom);
        	var result = {};
        	
    		result.x = point.x/old_zoom * new_zoom ;
    		result.y = point.y/old_zoom * new_zoom;
        	
        	return result;
        }

    }
 }(jQuery));