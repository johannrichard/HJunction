/**
 * TrimPath Base Utilities. Release 1.0.0.
 * Copyright (C) 2005 - 2007 TrimPath.
 */
if (typeof(TrimPath) == 'undefined')
    TrimPath = {};

(function(safeEval) { // Using a closure to keep global namespace clean.
    var theMath       = Math;
    var theIsNaN      = isNaN;
    var theParseInt   = parseInt;
    var theParseFloat = parseFloat;

    var logStart = new Date().getTime();

    var MANY_ZEROS = '00000000000000000';

    var baseUtil = TrimPath.baseUtil = {
        noop      : function() {},
        noopThis  : function() { return this; },
        noopNull  : function() { return null; },
        noopFalse : function() { return false; },
        safeEval : safeEval,
        safeParseInt : function(str, defaultValue) {
            var result = theParseInt(str);
            if (theIsNaN(result) == true)
                return defaultValue || 0;
            return result;
        },
        safeParseFloat : function(str, defaultValue) {
            var result = theParseFloat(str);
            if (theIsNaN(result) == true)
                return defaultValue || 0.0;
            return result;
        },
        log : function(msg) {
            if (document != null) {
                var log = document.getElementById("TrimPath_log");
                if (log) {
                    log.insertBefore(document.createElement("BR"), log.firstChild);
                    log.insertBefore(document.createTextNode((new Date().getTime() - logStart) + ": " + msg), log.firstChild);
                }
            }
        },
        logJson : function(obj) {
            baseUtil.log(TrimPath.json.toJsonString(obj));
        },
        leftZeroPad : function(val, minLength) {
            if (typeof(val) != "string")
                val = String(val);
            return (MANY_ZEROS.substring(0, minLength - val.length)) + val;
        },
        eventually : function(callback, delay) {
            setTimeout(callback, delay || 10);
        },
        browser : {
            isIE : (typeof(navigator) != 'undefined' &&
                    navigator.userAgent.toLowerCase().indexOf("msie") != -1)
        },
        appendEventHandler : function(obj, handlerName, handler) {
            var prevHandler = obj[handlerName];
            if (prevHandler != null &&
                typeof(prevHandler) == 'function') {
                obj[handlerName] = function(evt) {
                    prevHandler(evt);
                    handler(evt);
                }
                obj = null;
            } else 
                obj[handlerName] = handler;
        },
        makeEventHandler : function(handler, handlerInfo) {
            return function(evt) {
                evt = (evt) ? evt : ((window.event) ? window.event : null);
                if (evt)
                    return handler(evt, baseUtil.getEventTarget(evt), handlerInfo);
            }
        },
        stopEvent : function(evt) {
            evt.returnValue  = false;
            evt.cancelBubble = true;
            if (evt.preventDefault != null)
                evt.preventDefault();
            if (evt.stopPropagation != null)
                evt.stopPropagation();
            return false; // For easy calling like: return stopEvent(evt);
    	},
        getEventTarget : function(evt) {
            return (evt.target) ? evt.target : evt.srcElement;
        },
        findEventPageXY : function(evt, scrollOffsetXY) { 
            if (evt.offsetX || evt.offsetY) {
                var targetPageXY = baseUtil.findElementPageXY((evt.target) ? evt.target : evt.srcElement);
                return [ evt.offsetX + targetPageXY[0], evt.offsetY + targetPageXY[1] ];
            }
            if (scrollOffsetXY == null) // The scrollOffsetXY hack is because Mozilla's pageXY doesn't handle scrolled divs.
                scrollOffsetXY = [0, 0];
            if (evt.pageX || evt.pageY)
                return [ evt.pageX + scrollOffsetXY[0], evt.pageY + scrollOffsetXY[1]];
            return [ evt.clientX + document.body.scrollLeft, evt.clientY + document.body.scrollTop ];
        },
        findElementPageXY : function(obj) { 
            return baseUtil.sumOverAncestors(obj, 'offsetLeft', 'offsetTop', 'offsetParent');
        },
        findElementScrollXY : function(obj) { 
            return baseUtil.sumOverAncestors(obj, 'scrollLeft', 'scrollTop', 'parentNode');
        },
        sumOverAncestors : function(obj, xName, yName, parentName) {
            xName = xName || 'offsetLeft';
            yName = yName || 'offsetTop';
            parentName = parentName || 'offsetParent';
            var point = [0, 0];
            if (obj[parentName]) {
                while (obj[parentName]) {
                    point[0] += (obj[xName] || 0);
                    point[1] += (obj[yName] || 0);
                    obj = obj[parentName];
                }
            }
            return point;
        },
        getElementRect : function(el) {
            if (el != null &&
                el.offsetTop != null &&
                el.offsetLeft != null)
                return [ el.offsetTop,
                         el.offsetLeft,
                         el.offsetWidth,
                         el.offsetHeight ];
            return null;
        },
        hasValue : function(str, value) {
        	return (str != null) &&
                   (str.search != null) && 
                   (str.search('(^|\\s)' + value + '(\\s|$)') >= 0);
        },
        removeValue : function(str, value) {
        	if (str != null) 
                return str.replace(new RegExp('(^|\\s)' + value + '(\\s|$)'), '$1$2');
            return null;
        },
        hasClass : function(el, className) {
            return el != null &&
                   baseUtil.hasValue(el.className, className);
        },
        addClass : function(object, className) {
        	if (object != null &&
                baseUtil.hasClass(object, className) == false) {
            	if (object.className) {
            		object.className += ' '+className;
            	} else {
            		object.className = className;
            	}
            }
        },
        removeClass : function(object, className) {
    	    if (object != null)
            	object.className = baseUtil.removeValue(object.className, className);
        },
        toggleClass : function(object, className) {
            var curr = baseUtil.hasClass(object, className);
            if (curr == true) 
                baseUtil.removeClass(object, className);
            else
                baseUtil.addClass(object, className);
            return !curr;
        },
        getElementsWithClassName : function(parent, className, tagName) {
            if (parent == null)
                parent = document.body;
            var result = [];
            var els = parent.getElementsByTagName(tagName || "DIV");
            for (var i = 0; i < els.length; i++)
                if (baseUtil.hasClass(els[i], className))
                    result.push(els[i]);
            return result;
        },
        getChildrenWithClassName : function(parent, className) {
            var result = [];
            if (parent != null) {
                for (var el = parent.firstChild; el != null; el = el.nextSibling) { // NOTE: Only return direct descendants.
                    if (el.nodeType == 1) { // ELEMENT_NODE
                        if (baseUtil.hasClass(el, className))
                            result.push(el);
                    }
                }
            }
            return result;
        },
        getChildElementIndex : function(el, ignoreElementsWithClassName) {
            var i = -1;
            while (el != null) {
                if (el.nodeType == 1 && // ELEMENT_NODE
                    (ignoreElementsWithClassName == null ||
                     baseUtil.hasClass(el, ignoreElementsWithClassName) == false))
                    i += 1;
                el = el.previousSibling;
            }
            return i >= 0 ? i : null; // Returns 0-based index.
        },
        getChildElementByIndex : function(parent, childIndex, ignoreElementsWithClassName) {
            if (parent != null &&
                childIndex != null) {
                for (var el = parent.firstChild; el != null; el = el.nextSibling) { // NOTE: Only return direct descendants.
                    if (el.nodeType == 1 && // ELEMENT_NODE
                        (ignoreElementsWithClassName == null ||
                         baseUtil.hasClass(el, ignoreElementsWithClassName) == false)) {
                        if (childIndex <= 0)
                            return el;
                        childIndex -= 1;
                    }
                }
            }
            return null;
        },
        getChildElements : function(parent) {
            var result = [];
            if (parent != null) {
                for (var el = parent.firstChild; el != null; el = el.nextSibling) { // NOTE: Only return direct descendants.
                    if (el.nodeType == 1) // ELEMENT_NODE
                        result.push(el);
                }
            }
            return result;
        },
        getParent : function(node, tagName, className) { // Walk upwards from node until matching tagName and className.
            while (node != null) {
                if ((tagName == null ||                  // The tagName matches, where null means any match.
                     tagName == node.tagName) &&
                    (className == null ||                // The className matches, where null means any match.
                     baseUtil.hasClass(node, className)))
                    return node;
                node = node.parentNode;
            }
            return node;
        },
        visitElementHierarchy : function(el, visitorFunc) {
            if (el != null) {
                visitorFunc(el);
                for (var c = el.firstChild; c != null; c = c.nextSibling)
                    if (c.nodeType == 1) // ELEMENT_NODE
                        baseUtil.visitElementHierarchy(c, visitorFunc);
            }
        },
        getComputedStyle : function(el, styleProp) {
            if (el != null) {
                if (el.currentStyle != null)
                    return el.currentStyle[styleProp];
                if (window.getComputedStyle != null)
                    return document.defaultView.getComputedStyle(el, null).getPropertyValue(styleProp);
            }
            return null;
        },
        getRand : function(from, to) {
        	return theMath.random() * (to - from) + from;
        },
        genId : function(prefix) {
            if (prefix == null)
                prefix = "id";
            return prefix + "-" + ((new Date().getTime()) - baseUtil.genId_BASE) + "-" + theMath.floor(theMath.random() * 100000);
        },
        genId_BASE : (new Date("2006/08/01")).getTime(),
        genKey : function(prefix) {      // Transient keys which are unique during the document's lifespan.
            baseUtil.genKeyCounter += 1; // Useful for map lookup keys.
            return prefix + ':' + baseUtil.genKeyCounter;
        },
        genKeyCounter : 0,
        getMapKeys : function(map, optTestProperty) {
            var result = [];
            for (var k in map) 
                if ((map[k] != null) && 
                    (optTestProperty == null ||
                     map[k][optTestProperty] != null))
                    result.push(k);
            return result;
        },
        keyValueArrayToMap : function(flatKeyValueArray) { // Ex: [ 'key1', 'value1', 'key2', 'value2' ].
            var result = {};
            for (var i = 0; i < flatKeyValueArray.length; i += 2)
                result[flatKeyValueArray[i]] = flatKeyValueArray[i+1];
            return result;
        },
        shallowCopyMap : function(map) {
            if (map == null)
                return null;
            var result = {};
            for (var k in map)
                result[k] = map[k];
            return result;
        },
        cleanWhitespaceDeep : function(element) { // Removes all whitespace nodes from a DOM element tree.
            for (var el = element.firstChild, next = null; el != null; el = next) {
                next = el.nextSibling;
                if (el.nodeType == 3 && /^\s*$/.test(el.nodeValue))
                    element.removeChild(el);
                else if (el.nodeType == 1)
                    baseUtil.cleanWhitespaceDeep(el);
            }
            return element;
        },
        timeMethod : function(obj, methName) {
            var orig = obj[methName];
            obj[methName] = function() {
                baseUtil.log(methName + "...");
                var result = orig.apply(obj, arguments);
                baseUtil.log(methName + "...done");
                return result;
            }
            obj = null;
        },
        ratioPtPx : null,
        requireRatioPtPx : function() {
            if (this.ratioPtPx == null) {
                var r = document.getElementById("TrimPath_baseUtil_ratioPtPx");
                if (r == null) {
                    r = document.createElement("DIV");
                    r.id = "TrimPath_baseUtil_ratioPtPx";
                    r.style.position = "absolute";
                    r.style.top = "-100pt";
                    r.style.left = "-100pt";
                    r.style.width = "100pt";
                    r.style.height = "100pt";
                    document.body.appendChild(r);
                }
            }
        },
        getRatioPtPx : function() {
            if (this.ratioPtPx == null) {
                var r = document.getElementById("TrimPath_baseUtil_ratioPtPx");
                if (r != null) {
                    this.ratioPtPx = [ 100.0 / r.offsetWidth, 100.0 / r.offsetHeight ];
                    r.parentNode.removeChild(r);
                }
            }
            return this.ratioPtPx;
        },
        getHiddenContainer : function() {
            if (typeof(document) == 'undefined' ||
                document == null)
                return null;

            var c = document.getElementById("TrimPath_baseUtil_hiddenContainer");
            if (c == null) {
                c = document.createElement("DIV");
                c.id = "TrimPath_baseUtil_hiddenContainer";
                c.style.display = "none";
                document.body.appendChild(c);
            }
            return c;
        },
        scrollIntoView : function(el) { // Assume some ancestor element has a scrolling overflow style.
            if (el != null &&
                el.offsetWidth > 0 && 
                el.offsetHeight > 0 && 
                el.style.display != "none") {
                for (var parentEl = el.parentNode; parentEl != null; parentEl = parentEl.parentNode)
                    if (parentEl.scrollHeight > parentEl.offsetHeight)
                        break;

                if (parentEl != null) {
                    var elX     = el.offsetLeft;
                    var elY     = el.offsetTop;
                    var sTop    = parentEl.scrollTop;
                    var sLeft   = parentEl.scrollLeft;
                    var sHeight = parentEl.clientHeight;
                    var sWidth  = parentEl.clientWidth;
    
                    if (elY < sTop)
                        parentEl.scrollTop = elY;
                    else if ((elY + el.offsetHeight) > (sTop + sHeight))
                        parentEl.scrollTop = elY + el.offsetHeight - sHeight;
                    
                    if (elX < sLeft)
                        parentEl.scrollLeft = elX;
                    else if ((elX + el.offsetWidth) > (sLeft + sWidth))
                        parentEl.scrollLeft = elX + el.offsetWidth - sWidth;
                }
            }
        },
        trim : function(str) {
            return str.replace(/^\s*(.*?)\s*$/, '$1'); // Trim whitespace.
        },
        toHTML : function(node, optimized) {
            if (optimized) {
                var result = node.outerHTML;
                if (result != null) {
                    result = result.replace(/<IMG (.*?)>/g, "<IMG $1\/>");
                    result = result.replace(/(class|width|height)=([a-zA-Z0-9_\-\:]+)/g, '$1="$2"');
                    result = result.replace(/<(\/?):/g, "<$1");
                    result = result.replace(/^\s*(.*?)/, '$1');
                    return result;
                }
            }

            var out = [];
            baseUtil.toHTMLArray(node, out);
            return out.join('').replace(/<\/BR>/g, '');
        },
        toHTMLArray : function(node, out) {
            if (node != null) {
                if (node.nodeType == 1) { // ELEMENT_NODE
                    if (baseUtil.toHTMLStartTagArray(node, out)) {
                        var child = node.firstChild;
                        if (child != null) {
                            if (child.nodeType == 1 && // ELEMENT_NODE
                                child.tagName == "SVG" &&
                                child.nextSibling != null &&
                                child.nextSibling.nodeType == 1) {
                                // SVG nodes (non-XHTML) in IE are presented strangely as a flatten tag list.
                                // Here we assume any SVG tags normally have zero siblings.  So, any
                                // siblings means we must be in IE, needing this hack.
                                //
                                baseUtil.toHTMLStartTagArray(child, out);
                                child = child.nextSibling;
                                while (child != null) {
                                    baseUtil.toHTMLArray(child, out);
                                    child = child.nextSibling;
                                }
                                out.push("</SVG>");
                            } else {
                                while (child != null) {
                                    baseUtil.toHTMLArray(child, out);
                                    child = child.nextSibling;
                                }
                            }
                        }
                        out.push("</" + node.tagName + ">");
                    }
                } else if (node.nodeType == 3) { // TEXT_NODE
                    out.push(node.data.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
                }
            }
        },
        toHTMLStartTagArray : function(node, out) {
            if (node.tagName.charAt(0) == '/') // IE hack, where <IMG></IMG> becomes <IMG><//IMG>.
                return false;

            out.push("<");
            out.push(node.tagName);

            var classDone = false;

            for (var i = 0; i < node.attributes.length; i++) {
                var key = node.attributes[i].name;
                var val = node.getAttribute(key);
                if (val != null && 
                    val != "") {
                    if (key[0] == '-') // FF hack for "-moz-XXX" attributes.
                        continue;
                    if ((key == "contentEditable" && val == "inherit") ||
                        (key == "start" && node.tagName == "IMG") ||
                        (key == "class") || 
                        (key == "rowspan") || 
                        (key == "colspan"))
                        continue; // IE hack.
                    if (typeof(val) == "string") {
                        out.push(' ' + key + '="' + val.replace(/"/g, "'") + '"');
                    } else if (key == "style" && val.cssText != "") {
                        out.push(' style="' + val.cssText + '"');
                    }
                    if (key == "class")
                        classDone = true;
                }
            }

            if (classDone == false &&
                node.className != null &&             // IE hack, where class doesn't appear in attributes.
                node.className.length > 0)
                out.push(' class="' + node.className.replace("spreadsheetCellActive", "") + '"');

            if (node.colSpan > 1)                     // IE hack, where colspan doesn't appear in attributes.
                out.push(' colspan="' + node.colSpan + '"');
            if (node.rowSpan > 1)                     // IE hack, where rowspan doesn't appear in attributes.
                out.push(' rowspan="' + node.rowSpan + '"');
            if (node.tagName == "COL") {              // IE hack, which doesn't like <COL..></COL>.
                out.push('/>');
                return false;
            }

            out.push(">");
            return true;
        },
        parseHTML : function(htmlStr) {
            if (htmlStr != null) {
                if (window.ActiveXObject &&
                    htmlStr.match(/<SVG/i)) {
                    // IE doesn't parse SVG tags well, so resort to backflips...
                    var el = baseUtil.parseXML(htmlStr);
                    if (el != null)
                        return baseUtil.copyNode(el);
                } else {
                    var containerEl = document.getElementById("TrimPath_parseHTML");
                    if (containerEl == null) {
                        containerEl = document.createElement("DIV");
                        containerEl.id = "TrimPath_parseHTML";
                        containerEl.style.display = "none";
                        document.body.appendChild(containerEl);
                    }
                    containerEl.innerHTML = htmlStr;
                    var el = baseUtil.getChildElementByIndex(containerEl, 0);
                    if (el != null) {
                        containerEl.removeChild(el);
                        containerEl.innerHTML = "";
                        return el;
                    }
                }
            }
            return null;
        },
        parseXML : function(xmlStr) {
            if (window.DOMParser) {
                var dom = (new DOMParser()).parseFromString(xmlStr, "text/xml");
                if (dom != null &&
                    dom.documentElement != null &&
                    dom.documentElement.nodeName != "parsererror")
                    return dom.documentElement;
            } else if (window.ActiveXObject) {
                var xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                if (xmlDoc != null) {
                    xmlDoc.async = false;
                    xmlDoc.loadXML(xmlStr);
                    return xmlDoc.documentElement;
                }
            }
        },
        copyNode : function(src, doc) {
            if (src != null) {
                if (src.nodeType == 1) { // ELEMENT_NODE
                    var nodeName = src.nodeName;
                    var dst = (doc || document).createElement(nodeName);
                    if (dst != null) {
                        var classDone = false;
                        for (var attrs = src.attributes,
                                 i = 0; i < attrs.length; i++) {
                            var name = attrs[i].name;
                            if (name == "class") {
                                dst.className = attrs[i].value;
                                classDone = true;
                            } else if (name == "style") {
                                for (var rules = attrs[i].value.split(';'),
                                         j = 0; j < rules.length; j++) {
                                    var rule    = rules[j];
                                    var eqIndex = rule.indexOf(':');
                                    var ruleKey = baseUtil.trim(rule.substring(0, eqIndex));
                                    var ruleVal = baseUtil.trim(rule.substring(eqIndex + 1));
                                    dst.style[ruleKey.toLowerCase()] = ruleVal;
                                }
                            } else {
                                dst.setAttribute(name, attrs[i].value);
                            }
                        }
                        if (classDone == false &&
                            src.className != null &&
                            src.className.length > 0)
                            dst.className = src.className;                            

                        for (var srcChild = src.firstChild; srcChild != null; srcChild = srcChild.nextSibling) {
                            var dstChild = baseUtil.copyNode(srcChild, doc);
                            if (dstChild != null)
                                dst.appendChild(dstChild);                        
                        }
                        return dst;
                    }
                } else if (src.nodeType == 3) { // TEXT_NODE
                    return (doc || document).createTextNode(src.nodeValue);     
                }
            }
            return null;
        },
        vecLength : function(vec) {
            return Math.sqrt(baseUtil.vecDotProduct(vec, vec));
        },
        vecNormalize : function(vec, vecDest) {
            vecDest = vecDest || vec;
            var len = baseUtil.vecLength(vec);
            for (var i = 0; i < vec.length; i++)
                vecDest[i] = vec[i] / len;
            return vecDest;
        },
        vecDotProduct : function(vec1, vec2) {
            var sum = 0.0;
            for (var i = 0; i < vec1.length; i++)
                sum += (vec1[i] * vec2[i]);
            return sum;
        },
        vecRotate : function(vec, rad, vecDest) { // Only x,y vectors currently.
            var c = Math.cos(rad);
            var s = Math.sin(rad);
            vecDest = vecDest || vec;
            var x = vec[0];
            var y = vec[1];
            vecDest[0] = x * c - y * s;
            vecDest[1] = y * c + x * s;
            return vecDest;
        },
        vecRotateAt : function(vec, atXY, rad, vecDest) { // Ex: [ top, left, width, height ], Math.PI/2.0.
            vecDest = vecDest || vec;
            if (atXY != null) {
                vecDest[0] = vec[0] - atXY[0];
                vecDest[1] = vec[1] - atXY[1];
                baseUtil.vecRotate(vecDest, rad, vecDest);
            } else 
                baseUtil.vecRotate(vec, rad, vecDest);
            if (atXY != null) {
                vecDest[0] = vecDest[0] + atXY[0];
                vecDest[1] = vecDest[1] + atXY[1];
            }
            return vecDest;
        },
        ratioDegRad : 180.0 / Math.PI, 
        ratioRadDeg : Math.PI / 180.0,
        vecBBox : function(vecs, bbox) { // Only x,y vectors currently.
            var big = 0x40000000;        // NOTE: Math.MAX/MIN_VALUE compares wrongly sometimes.
            bbox = bbox || [ [big, -big], [-big, big] ];
            for (var i = 0; vecs != null && i < vecs.length; i++) {
                bbox[0][0] = Math.min(bbox[0][0], vecs[i][0]); // Vector space X,Y grows to the right-and-up.
                bbox[0][1] = Math.max(bbox[0][1], vecs[i][1]);
                bbox[1][0] = Math.max(bbox[1][0], vecs[i][0]);
                bbox[1][1] = Math.min(bbox[1][1], vecs[i][1]);
            }
            return bbox;
        },
        scaleVecs : function(vecs, scaleVec) {
            if (vecs != null &&
                scaleVec != null) {
                for (var i = 0; i < vecs.length; i++) {
                    for (var j = 0; j < scaleVec.length; j++) 
                        vecs[i][j] = vecs[i][j] * scaleVec[j];
                }
            }
            return vecs;
        },
        eventuallyOnceMap : {},
        eventuallyOnce : function(id, delayHandler, delayMillis) {
            var setupTime = (new Date()).getTime();
            if (baseUtil.eventuallyOnceMap[id] == null) {
                baseUtil.eventually(function() {
                    var info = baseUtil.eventuallyOnceMap[id];
                    baseUtil.eventuallyOnceMap[id] = null;
                    if (info != null) {
                        if (info.setupTime == setupTime) 
                            info.delayHandler();
                        else
                            baseUtil.eventuallyOnce(info.id, info.delayHandler, info.delayMillis);
                    }
                }, delayMillis);
            }
            var info = baseUtil.eventuallyOnceMap[id] = baseUtil.eventuallyOnceMap[id] || {}
            info.delayHandler = delayHandler,
            info.delayMillis  = delayMillis,
            info.setupTime    = setupTime;
        },
        eventuallyOnceClear : function(id) {
            baseUtil.eventuallyOnceMap[id] = null;            
        },
        makeDelayedEventHandler : function(callback, delayMillis, defaultReturnValue) {
            var lastEventTime = null;
            var lastEvent     = null;

            var delayHandler = function() {   
                var evt = lastEvent;
                var now = (new Date()).getTime();
                if (lastEventTime != null &&
                    lastEventTime + delayMillis <= now + 1) {
                    lastEventTime = null;
                    lastEvent     = null;
                    callback(evt);
                } else {
                    lastEventTime = now;
                    baseUtil.eventually(delayHandler, delayMillis);
                }
            }

            return function(event) {
                if (lastEventTime == null)
                    baseUtil.eventually(delayHandler, delayMillis);
                lastEvent     = event;
                lastEventTime = (new Date()).getTime();
                return defaultReturnValue;
            }
        }
    }

    /////////////////////////////////////////////////////////

    var json = TrimPath.json = { 
        jsonEval : function(json) {
            return baseUtil.safeEval('(' + json + ')');
        },
        toJsonString : function(arg, prefix) { // Put into TrimPath namespace to avoid version conflicts.
            return json.toJsonStringArray(arg, [], prefix).join('');
        },
        toJsonStringArray : function(arg, out, prefix) {
            out = out || [];
            var u; // undefined
        
            switch (typeof arg) {
            case 'object':
                if (arg) {
                    if (arg.constructor == Array) {
                        out.push('[');
                        for (var i = 0; i < arg.length; ++i) {
                            if (i <= 0) {
                                if (prefix != null && arg.length > 1)
                                    out.push(' ');
                            } else {
                                out.push(',\n');
                                if (prefix != null)
                                    out.push(prefix);
                            }
                            json.toJsonStringArray(arg[i], out, prefix != null ? prefix + "  " : null);
                        }
                        out.push(']');
                        return out;
                    } else if (typeof(arg.toString) != 'undefined') {
                        out.push('{');
                        var first = true;
                        var nextPrefix = (prefix != null) ? (prefix + "    ") : null;
                        for (var i in arg) {
                            if (String(i).charAt(0) != '_') { // Ignore private attributes.
                                var curr = out.length;        // Record position to allow undo when arg[i] is undefined.
                                if (first) {
                                    if (prefix != null)
                                        out.push(' ');
                                } else {
                                    out.push(',\n');
                                    if (prefix != null)
                                        out.push(prefix);
                                }
                                json.toJsonStringArray(i, out, nextPrefix);
                                if (prefix == null)
                                    out.push(':');
                                else
                                    out.push(': ');
                                json.toJsonStringArray(arg[i], out, nextPrefix);
                                if (out[out.length - 1] == u)
                                    out.splice(curr, out.length - curr);
                                else
                                    first = false;
                            }
                        }
                        out.push('}');
                        return out;
                    }
                    return out;
                }
                out.push('null');
                return out;
            case 'unknown':
            case 'undefined':
            case 'function':
                out.push(u);
                return out;
            case 'string':
                out.push('"')
                out.push(arg.replace(/(["\\])/g, '\\$1').replace(/\r/g, '').replace(/\n/g, '\\n'));
                out.push('"');
                return out;
            default:
                out.push(String(arg));
                return out;
            }
        }
    }

    /////////////////////////////////////////////////////////

    var hierType = baseUtil.hierType = function(el) {
        return (el == null || (el.appendChild != null)) ? 'dom' : 'json';
    }
    var hierDispatch = function(funcName) {
        return function(el) { // First arg (el) must be an hier storage element.
            return hier.types[hierType(el)][funcName].apply(this, arguments);
        }
    }
    var hier = baseUtil.hier = { // Uniform accessors for DOM and JSON element storage hierarchies.
        types : {
            dom : { // Functions that work on DOM element storage hierarchies.
                createElement : function(tagName) { return document.createElement(tagName); },
                appendChild   : function(parent, child) { parent.appendChild(child); },
                removeChild   : function(parent, child) { parent.removeChild(child); },
                insertBefore  : function(parent, child, before) { return parent.insertBefore(child, before); },
                getParent     : function(el) { return el.parentNode; },
                getFirstChild : function(parent) { return parent.firstChild; },
                getChildElementIndex : function(parent, child) { 
                    return baseUtil.getChildElementIndex(child);
                },
                getChildrenWithClassName : baseUtil.getChildrenWithClassName,
                getAttribute    : function(el, k)    { return el.getAttribute(k); },
                setAttribute    : function(el, k, v) { el.setAttribute(k, v); },
                removeAttribute : function(el, k)    { el.removeAttribute(k); },
                cloneHier       : function(el)       { return el.cloneNode(true); } // Clones the entire hierarchy.
            },
            json : { // Functions that work on JSON element storage hierarchies.
                createElement : function(tagName) {
                    var result = { style: {} };
                    if (tagName != null)
                        result.tagName = tagName;
                    return result;
                },
                appendChild : function(parent, child) {
                    if (child != null) {
                        hier.types.json.removeChild(child._parent, child);

                        if (parent != null) {
                            var children = parent.children;
                            if (children == null)
                                children = parent.children = [];
                            children.push(child);
                            child._parent = parent;
                        }
                    }
                },
                removeChild : function(parent, child) {
                    if (parent != null &&
                        parent.children != null) {
                        var i = hier.types.json.getChildElementIndex(parent, child);
                        if (i != null && i >= 0)
                            parent.children.splice(i, 1);
                    }
                    if (child != null &&
                        child._parent != null)
                        delete child._parent;
                },
                insertBefore : function(parent, child, before) { 
                    if (before == null)
                        return hier.types.json.appendChild(parent, child);

                    if (child != null) {
                        hier.types.json.removeChild(child._parent, child);

                        if (parent != null) {
                            var i = hier.types.json.getChildElementIndex(parent, before);
                            if (i != null && i >= 0) {
                                var children = parent.children;
                                if (children == null)
                                    children = parent.children = [];
                                children.splice(i, 0, child);
                                child._parent = parent;
                            }
                        }
                    }
                },
                getParent : function(el) { 
                    return el._parent;
                },
                getFirstChild : function(parent) { 
                    if (parent && 
                        parent.children) {
                        return parent.children[0];
                    }
                    return null;
                },
                getChildElementIndex : function(parent, child) {
                    if (child != null &&
                        parent != null &&
                        parent.children != null) {
                        var siblings = parent.children;
                        for (var i = siblings.length - 1; i >= 0; i--) {
                            if (siblings[i] == child)
                                return i;
                        }
                    }
                    return null;
                },
                getChildrenWithClassName : function(parent, className) {
                    var result = [];
                    if (parent != null &&
                        parent.children != null) {
                        for (var i = 0; i < parent.children.length; i++) {
                            if (baseUtil.hasClass(parent.children[i], className))
                                result.push(parent.children[i]);
                        }
                    }
                    return result;
                },
                getAttribute    : function(el, k)    { return el[k]; },
                setAttribute    : function(el, k, v) { el[k] = v; },
                removeAttribute : function(el, k)    { delete el[k]; },
                cloneHier : function(el) { 
                    if (el != null) 
                        return safeEval('(' + TrimPath.json.toJsonString(el) + ')');
                    return null;
                }
            }
        },
        appendChild   : hierDispatch('appendChild'),
        removeChild   : hierDispatch('removeChild'),
        insertBefore  : hierDispatch('insertBefore'),
        getParent     : hierDispatch('getParent'),
        getFirstChild : hierDispatch('getFirstChild'),
        getChildElementIndex : hierDispatch('getChildElementIndex'),
        getChildrenWithClassName : hierDispatch('getChildrenWithClassName'),
        getAttribute    : hierDispatch('getAttribute'),
        setAttribute    : hierDispatch('setAttribute'),
        removeAttribute : hierDispatch('removeAttribute'),
        cloneHier       : hierDispatch('cloneHier')
    }
}) (function(s) { return eval(s); });
