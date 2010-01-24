/**
 * TrimPath Drag Drop. Release 1.0.0.
 * Copyright (C) 2005 - 2007 TrimPath.
 */
if (typeof(TrimPath) == 'undefined')
    TrimPath = {};

(function() { // Using a closure to keep global namespace clean.
    var baseUtil = TrimPath.baseUtil;

    var dragDrop = TrimPath.dragDrop = {
        makeDraggable : function(el, options) {
            var handler = baseUtil.makeEventHandler(dragDrop.onmousedown, options);
            if (el instanceof Array ||
                el.length != null) {
                for (var i = 0; i < el.length; i++)
                    el[i].onmousedown = handler;
            } else
                el.onmousedown = handler;
        },
        current : null,
        onmousedown: function(event, target, options) {
            options = options || {};
            if (options.dragSourceId != null)
                target = document.getElementById(options.dragSourceId);
            if (target != null &&
                dragDrop.current == null) {
                var current = dragDrop.current = {
                    dragObject   : options.dragSourceClone == true ? target.cloneNode(true) : target,
                    dragSource   : target,
                    options      : options,
                    offsetXY     : [0, 0]
                }

                // TODO: Firefox does not support event.offsetX/Y.
                //
                current.offsetXY[0] = options.offsetX || event.offsetX || 0;
                current.offsetXY[1] = options.offsetY || event.offsetY || 0;

                if (options.originId != null) {
                    var originEl = document.getElementById(options.originId);
                    if (originEl != null) {
                        var xy = baseUtil.findElementPageXY(originEl);
                        if (xy != null) {
                            current.offsetXY[0] = xy[0];
                            current.offsetXY[1] = xy[1];
                        }
                    }
                }

                current.dragObject.style.position = "absolute";
                current.dragObject.style.top      = event.clientY - current.offsetXY[1] + document.body.scrollTop;
                current.dragObject.style.left     = event.clientX - current.offsetXY[0] + document.body.scrollLeft;
                current.dragObject.style.width    = current.dragSource.offsetWidth + 'px';
                current.dragObject.style.zIndex   = current.options.zIndex || 1000;

                if (current.options.opacity) {
                    current.dragObject.style.opacity = current.options.opacity;
                    current.dragObject.style.filter  = 'alpha(opacity=' + (current.options.opacity * 100) +')'
                }

                if (options.dragSourceClone == true)
                    document.body.appendChild(current.dragObject);

                if (current.options.dragSourceVisible == false)
                    current.options.dragSource.style.visibility = "hidden";

                document.onmousemove = TrimPath.dragDrop.onmousemove;
                document.onmouseup   = TrimPath.dragDrop.onmouseup;
                document.onkeypress  = TrimPath.dragDrop.onkeypress;
    
                if (current.options.onStart != null)
                    current.options.onStart(current, event, target);

                return baseUtil.stopEvent(event);
            }
        },
        onmousemove: baseUtil.makeEventHandler(function(event, target) {
            var current = dragDrop.current;
            if (current != null &&
                current.dragObject != null) {
                current.dragObject.style.top  = event.clientY - current.offsetXY[1] + document.body.scrollTop;
                current.dragObject.style.left = event.clientX - current.offsetXY[0] + document.body.scrollLeft;
            }

            return baseUtil.stopEvent(event);
        }),
        onmouseup: baseUtil.makeEventHandler(function(event, target) {
            var dropped = true;

            var current = dragDrop.current;
            if (current != null &&
                current.dragObject != null &&
                current.options != null &&
                current.options.droppableIds != null) {
                dropped = false;
                var dragObjectXY = baseUtil.findElementPageXY(current.dragObject);

                for (var i = 0; dropped == false && i < current.options.droppableIds.length; i++) {
                    var droppable = document.getElementById(current.options.droppableIds[i]);
                    if (droppable != null) {
                        var droppableXY = baseUtil.findElementPageXY(droppable);

                        var droppableWidth  = droppable.offsetWidth  || 0;
                        var droppableHeight = droppable.offsetHeight || 0;

                        // Sometimes offsetWidth/Height is mysteriously 0, so climb to the parent hierarchy.
                        //
                        while (droppable != null &&
                               droppable != document.body &&
                               (droppableWidth  == 0 ||
                                droppableHeight == 0)) {
                            droppableWidth  = droppableWidth  || droppable.offsetWidth;
                            droppableHeight = droppableHeight || droppable.offsetHeight;
                            droppable = droppable.parentNode;
                        }

                        if (dragObjectXY[0] >= droppableXY[0] - current.dragObject.offsetWidth &&
                            dragObjectXY[1] >= droppableXY[1] - current.dragObject.offsetHeight &&
                            dragObjectXY[0] <= droppableXY[0] + droppableWidth &&
                            dragObjectXY[1] <= droppableXY[1] + droppableHeight)
                            dropped = droppable.id;
                    }
                }
            }

            dragDrop.endDrag(event, target, dropped);
            return baseUtil.stopEvent(event);
        }),
        onkeypress: baseUtil.makeEventHandler(function(event, target) {
            var keyCode = (event.keyCode) ? event.keyCode : event.which;
            if (keyCode == 27) // ESC key.
                dragDrop.endDrag(event, target, false);
            return baseUtil.stopEvent(event);
        }),
        endDrag : function(event, target, dropped) {
            document.onmousemove = null;
            document.onmouseup   = null;
            document.onkeypress  = null;

            var current = dragDrop.current;
            if (current != null) {
                if (current.options != null) {
                    if (dropped != false) {
                        if (current.options.onDrop != null)
                            current.options.onDrop(current, event, target, dropped);
                    } else {
                        if (current.options.onAbort != null)
                            current.options.onAbort(current, event, target);
                    }
                    if (current.options.onEnd != null)
                        current.options.onEnd(current, event, target);
                }
            }

            dragDrop.current = null;
        }
    }
}) ();
