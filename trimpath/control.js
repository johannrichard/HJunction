/**
 * TrimPath Control Library. Release 1.0.0.
 * Copyright (C) 2005 - 2007 TrimPath.
 */
if (typeof(TrimPath) == 'undefined')
    TrimPath = {};

if (typeof(dojo) != 'undefined')
    dojo.require("dojo.widget.RichText");

(function() { // Using a closure to keep global namespace clean.
    var baseUtil = TrimPath.baseUtil;

    var log = baseUtil.log;

    var makeEventHandler = baseUtil.makeEventHandler;
    var getEventTarget   = baseUtil.getEventTarget;

    var findEventPageXY   = baseUtil.findEventPageXY;
    var findElementPageXY = baseUtil.findElementPageXY ;
    var getElementRect    = baseUtil.getElementRect;

    var hasValue    = baseUtil.hasValue;    
    var removeValue = baseUtil.removeValue;

    var hasClass    = baseUtil.hasClass;
    var addClass    = baseUtil.addClass;
    var removeClass = baseUtil.removeClass;

    var getParent = baseUtil.getParent;

    var safeParseInt = baseUtil.safeParseInt;

    //////////////////////////////////////////////////////////////////////

    TrimPath.richTextEditor = {
        create : function(key, content) {
            TrimPath.richTextEditor.destroy(key, false);

            if (typeof(dojo) != 'undefined') {
                var editor = dojo.widget.createWidget("RichText", { inheritWidth: true }, content);
                if (editor != null) {
                    TrimPath.richTextEditor.editorInfoMap[key] = {
                        key     : key,
                        editor  : editor,
                        content : content
                    }
                    return editor;
                }
            }
            return null;
        },
        destroy : function(key, updateContent) {
            var changed = false;

            if (typeof(dojo) != 'undefined') {
                var info = TrimPath.richTextEditor.editorInfoMap[key];
                if (info != null) {
                    if (info.editor != null) {
                        changed = info.editor.close(updateContent);
                        info.editor.destroy();
                    }
    
                    if (info.content != null) {
                        // Firefox dojo richtext implementation leaves an empty iframe around.
                        for (var els = info.content.getElementsByTagName('IFRAME'),
                                 i = 0; i < els.length; i++)
                            els[i].parentNode.removeChild(els[i]);
                    }
                }
            }

            delete TrimPath.richTextEditor.editorInfoMap[key];
            return changed;
        },
        execCommand : function(key, cmd, cmdValue) {
            var info = TrimPath.richTextEditor.editorInfoMap[key];
            if (info != null &&
                info.editor != null) 
                info.editor.execCommand(cmd, cmdValue);
        },
        editorInfoMap : {}
    }

    //////////////////////////////////////////////////////////////////////

    var toHexColor = function(color) {
        return [ '#', toHex(color[0]), toHex(color[1]), toHex(color[2]) ].join('');
    }
    var toHex = function(v) { // The v must be 0..255.
        var s = new Number(v).toString(16);
        if (s.length < 2)
            s = toHexZeroes.substring(0, 2 - s.length) + s;
        return s;
    }
    var toHexZeroes = '000000000000';

    //////////////////////////////////////////////////////////////////////

    var popupManager = TrimPath.popupManager = {
        getPopup : function(actuator) {
            if (actuator != null)
                var key = actuator.id;
                if (actuator.href != null)
                    key = actuator.href.split("#")[1];
                if (key == null || 
                    key.length <= 0)
                    key = actuator.name;
                return document.getElementById(key + "_popup");
            return null;
        },
        actuatorMouseOver : makeEventHandler(function(evt, target) {
            var actuator = getParent(target, "A") || 
                           getParent(target, "INPUT");
            if (actuator != null) {
                var popup = popupManager.getPopup(actuator);
                if (popup != null) {
                    if (popupManager.popupStack.length > 0 &&
                        popupManager.popupStack[0][0] != popup)
                        popupManager.hidePopup();
                    if (popupManager.popupStack.length <= 0 ||
                        popupManager.popupStack[0][0] != popup)
                        popupManager.showPopup(popup, actuator);
                }
            }
        }),
        actuatorMouseClick : makeEventHandler(function(evt, target) {
            if (popupManager.popupStack.length <= 0) {
                var actuator = getParent(target, "A") || 
                               getParent(target, "INPUT");
                if (actuator != null) {
                    var popup = popupManager.getPopup(actuator);
                    if (popup != null)
                        popupManager.showPopup(popup, actuator);
                }
            } else
                popupManager.hidePopup();
        }),
        popupMouseClick : makeEventHandler(function(evt, target) {
            if (target == getParent(target, "DIV")) 
                popupManager.hidePopup();
        }),
        popupKeyPress : makeEventHandler(function(evt, target) {
            var keyCode = (evt.keyCode) ? evt.keyCode : evt.which;
            if (keyCode == 27) // ESC key.
                popupManager.hidePopup();
        }),
        popupStack : [],
        showPopup : function(popup, actuator, modal) {
            if (popup != null) {
                if (actuator != null &&
                    hasClass(popup, 'popupFixed') == false) {
                    popup.style.top  = "-1000px"; // Firefox hack so we get a decent document.body.offsetWidth.
                    popup.style.left = "0px";
                    var w = document.body.offsetWidth;
                    var p = findElementPageXY(actuator);
                    popup.style.top  = p[1] + actuator.offsetHeight + 1 + "px";
                    if (hasClass(popup, 'popupScroll'))
                        popup.style.left = Math.max(0, Math.min(p[0], w - popup.offsetWidth - 21)) + "px";
                    else
                        popup.style.left = Math.max(0, Math.min(p[0], w - popup.offsetWidth - 1)) + "px";
                    if (hasClass(popup, 'popupAbove')) 
                        popup.style.top = p[1] - popup.offsetHeight + "px";
                }
                if (hasClass(popup, 'popupNoGlass') == false)
                    popupManager.showPopupGlass(modal);
                popup.style.display = "block";
                popup.style.zIndex  = 20001;
                popupManager.popupStack.unshift([ popup ]);
                document.onkeypress = popupManager.popupKeyPress;
            }
        },
        hidePopup : function() {
            if (popupManager.popupStack.length > 0) {
                if (popupManager.popupStack[0][1] != null)
                    popupManager.popupStack[0][1](popupManager.popupStack[0][0]); // Callback a hider function, if provided.
                else
                    popupManager.popupStack[0][0].style.display = "none";
                popupManager.popupStack.shift();
            }
            if (popupManager.popupStack.length <= 0)
                popupManager.hidePopupGlass();
            document.onkeypress = null;

            return false; // So can be used as event (onclick) handler.
        },
        initPopup : function(actuatorId) {
            var actuator = document.getElementById(actuatorId);
            if (actuator != null) {
                var popup = popupManager.getPopup(actuator);
                if (popup != null) {
                    actuator.onmouseover = popupManager.actuatorMouseOver;
                    actuator.onclick     = popupManager.actuatorMouseClick;
                }
            }
        },
        textPrompt : function(id, header, text, footer, callback) {
            if (document.getElementById(id) != null) {
                if (document.getElementById(id + 'Header') != null)
                    document.getElementById(id + 'Header').innerHTML = header || 'Enter text:';
                if (document.getElementById(id + 'Text') != null)
                    document.getElementById(id + 'Text').value = text || '';
                if (document.getElementById(id + 'Footer') != null)
                    document.getElementById(id + 'Footer').innerHTML = footer || '';
                document.getElementById(id + 'Cancel').onclick = TrimPath.popupManager.hidePopup;
                document.getElementById(id +     'OK').onclick = function() {
                    if (callback != null &&
                        document.getElementById(id + 'Text') != null)
                        callback(document.getElementById(id + 'Text').value);
                    return TrimPath.popupManager.hidePopup();
                };
                TrimPath.popupManager.showPopup(document.getElementById(id), null, true);
                if (document.getElementById(id + 'Text') != null) {
                    document.getElementById(id + 'Text').focus();
                }
            }
        },
        showPopupGlass : function(noHandlers, popupGlass) {
            var popupGlass = popupGlass || document.getElementById("popupGlass");
            if (popupGlass == null) {
                popupGlass = document.createElement("DIV");
                popupGlass.id             = "popupGlass";
                popupGlass.style.position = "absolute";
                popupGlass.style.top      = "0px";
                popupGlass.style.left     = "0px";
                document.body.appendChild(popupGlass);
            }
            popupGlass.className     = "popupGlass"; // Caller may can add more classNames.
            popupGlass.style.width   = (Math.max(Math.max(document.body.clientWidth,  document.body.offsetWidth),  document.body.scrollWidth)  - 1) + "px";
            popupGlass.style.height  = (Math.max(Math.max(document.body.clientHeight, document.body.offsetHeight), document.body.scrollHeight) - 1) + "px";
            popupGlass.style.zIndex  = 20000;
            popupGlass.style.display = "";
            if (noHandlers != true) { // Treats null as false.
                popupGlass.onmousedown = popupManager.hidePopup;
                popupGlass.onmouseup   = popupManager.hidePopup;
            } else {
                popupGlass.onmousedown = null;
                popupGlass.onmouseup   = null;
            }
            return popupGlass;
        },
        hidePopupGlass : function() {
            var popupGlass = document.getElementById("popupGlass");
            if (popupGlass != null)
                popupGlass.style.display = "none";
        },
        colorPopupMouseOver : function() { 
            if (this.id != null && 
                this.id.length > 0)
                this.style.border = '1px dotted gray'; 
        },
        colorPopupMouseOut : function() { this.style.border = '1px solid white'; },
        colorPopupClick : function() {
            popupManager.colorPopupType = null;
            popupManager.hidePopup();
        },
        colorPopupInit : function(colorPopup, onClickHandler) {
            var colorPopupTable = colorPopup.getElementsByTagName('TABLE')[0];
            if (colorPopupTable != null &&
                colorPopupTable.rows.length < 5) {
                var tdBorderWidth = '1px';
                var max = 0x0F0;
                var mainColors = [];
                var mainRow = colorPopupTable.rows[0];
                for (var j = 0; j < 14; j++) {
                    var color = mainRow.cells[j].id.split('#')[1];
                    mainColors[j] = [ safeParseInt('0x' + color.substring(0, 2)),
                                      safeParseInt('0x' + color.substring(2, 4)),
                                      safeParseInt('0x' + color.substring(4, 6)) ];
                }
                mainColors[0] = mainColors[1] = [ 128, 128, 128 ];

                var steps = 6.0;
                for (var i = 2; i <= steps; i++) { // From black to mainColor.
                    var pc = i / steps;
                    var tr = document.createElement("TR");
                    for (var j = 1; j < 14; j++) {
                        var color = [ Math.min(max, Math.floor(mainColors[j][0] * pc)), 
                                      Math.min(max, Math.floor(mainColors[j][1] * pc)), 
                                      Math.min(max, Math.floor(mainColors[j][2] * pc)) ];
                        var td = document.createElement("TD");
                        if (td != null) {
                            td.id = toHexColor(color);
                            td.style.borderWidth = tdBorderWidth;
                            if (j <= 1)
                                td.colSpan = 2;
                            tr.appendChild(td);
                        }
                    }
                    mainRow.parentNode.insertBefore(tr, mainRow.nextSibling);
                }
                for (var i = 2; i < steps; i++) { // From mainColor to white.
                    var pc = i / steps;
                    var tr = document.createElement("TR");
                    for (var j = 1; j < 14; j++) {
                        var color = [ Math.min(max, mainColors[j][0] + Math.floor((0xFF - mainColors[j][0]) * pc)), 
                                      Math.min(max, mainColors[j][1] + Math.floor((0xFF - mainColors[j][1]) * pc)), 
                                      Math.min(max, mainColors[j][2] + Math.floor((0xFF - mainColors[j][2]) * pc)) ];
                        var td = document.createElement("TD");
                        if (td != null) {
                            td.id = toHexColor(color);
                            td.style.borderWidth = tdBorderWidth;
                            if (j <= 1)
                                td.colSpan = 2;
                            tr.appendChild(td);
                        }
                    }
                    mainRow.parentNode.insertBefore(tr, mainRow.nextSibling);
                }
            }
            var tds = colorPopup.getElementsByTagName('TD');
            for (var i = 0; i < tds.length; i++) {
                if (tds[i].id.length > 0) {
                    var csplit = tds[i].id.split('#');
                    if (csplit != null &&
                        csplit[1] != null && 
                        csplit[1].length > 0)
                        tds[i].style.background = '#' + csplit[1];
                    tds[i].style.borderWidth = tdBorderWidth;
                    tds[i].onmouseover = popupManager.colorPopupMouseOver;
                    tds[i].onmouseout  = popupManager.colorPopupMouseOut;
                    tds[i].onclick     = onClickHandler;
                }
            }
        },
        colorPopupActuatorMouseClick : makeEventHandler(function(evt, target) {
            var actuator = getParent(target, "A");
            popupManager.colorPopupShow(actuator, actuator.href.split('#')[1], null);
            return false;
        }),
        colorPopupType : null,
        colorPopupShow : function(actuator, colorPopupType, colorPopupClickHandler) {
            colorPopupClickHandler = colorPopupClickHandler || popupManager.colorPopupClick
            if (actuator != null &&
                colorPopupType != null) {
                var colorPopup = document.getElementById('colorPopup');
                if (colorPopup != null) {
                    var colorPopupTitle = document.getElementById('colorPopupTitle');
                    if (colorPopupTitle != null) {
                        if (actuator.title != null &&
                            actuator.title.length > 0) {
                            colorPopupTitle.innerHTML = actuator.title;
                            colorPopupTitle.style.display = 'block';
                        } else
                            colorPopupTitle.style.display = 'none';                            
                    }

                    popupManager.hidePopup();
                    popupManager.colorPopupType = colorPopupType;
                    popupManager.colorPopupInit(colorPopup, colorPopupClickHandler);
                    popupManager.showPopup(colorPopup, actuator);
                }
            }
            return false;
        },
        pushRecentColor : function(color) {
            if (color != null &&
                color.length > 0) {
                var tr = document.getElementById('recentColors');
                if (tr != null) {
                    for (var i = 1; i < tr.cells.length; i++)
                        if (tr.cells[i].id.split('#')[1] == color)
                            break;
                    if (i > 1) {
                        if (i >= tr.cells.length)
                            i = tr.cells.length - 1;
                        var td = tr.cells[i];
                        tr.removeChild(td);
                        tr.insertBefore(td, tr.cells[1]);
                        td.id = "recentColor#" + color;
                        td.style.background = '#' + color;
                    }
                }
            }
        }
    }

    //////////////////////////////////////////////////////////////////////

    TrimPath.tabPanelManager = {
        initAll : function(containerEl, listTagName, listClassName, activeClassName, activeIndex, behaveAsPopup) {
            listTagName     = listTagName     || "UL";           // Ex: "UL" or "TABLE".
            listClassName   = listClassName   || "tabPanelList";
            activeClassName = activeClassName || "tabPanelActive";

            var clickHandler = TrimPath.tabPanelManager.makeClickHandler(listTagName, listClassName, activeClassName);
            for (var lists = baseUtil.getElementsWithClassName(containerEl, listClassName, listTagName),
                     i = 0; i < lists.length; i++) {
                // Note: a null value for behaveAsPopup param means no change.
                //
                if (behaveAsPopup == true)
                    baseUtil.addClass(lists[i], "tabPanelPopup");
                if (behaveAsPopup == false)
                    baseUtil.removeClass(lists[i], "tabPanelPopup"); 

                TrimPath.tabPanelManager.init(lists[i], activeClassName, clickHandler, activeIndex);
            }
        },
        init : function(tabPanelList, activeClassName, clickHandler, activeIndex) {
            if (tabPanelList != null &&
                clickHandler != null) {
                for (var links = tabPanelList.getElementsByTagName("A"),
                         i = 0; i < links.length; i++) {
                    if (links[i].onclick == null)
                        links[i].onclick = clickHandler;
                }
                TrimPath.tabPanelManager.sync(tabPanelList, activeClassName, activeIndex);
            }
        },
        sync : function(tabPanelList, activeClassName, activeIndex) {
            if (tabPanelList != null) {
                activeClassName = activeClassName || "tabPanelActive";

                var tabPanelPopup = baseUtil.hasClass(tabPanelList, "tabPanelPopup");

                for (var links = tabPanelList.getElementsByTagName("A"),
                         i = 0; i < links.length; i++) {
                    if (activeIndex != null) {
                        if (i == activeIndex) 
                            baseUtil.addClass(links[i].parentNode, activeClassName);
                        else
                            baseUtil.removeClass(links[i].parentNode, activeClassName);
                    }

                    var content = document.getElementById(links[i].href.split('#')[1]);
                    if (content != null) {
                        if (baseUtil.hasClass(links[i].parentNode, activeClassName))
                            content.style.display = "";
                        else
                            content.style.display = "none";

                        if (tabPanelPopup)
                            content.style.position = "absolute";
                        else
                            content.style.position = "";
                    }
                }
            }
        },
        makeClickHandler : function(listTagName, listClassName, activeClassName) {
            var itemTagName = (listTagName == "TABLE" ? "TD" : "LI");

            var handler = function(target) {
                var tabPanelList = baseUtil.getParent(target, listTagName, listClassName);
                if (tabPanelList != null) {
                    for (var els = tabPanelList.getElementsByTagName(itemTagName),
                             i = 0; i < els.length; i++) {
                        if ((els[i] == target.parentNode) &&
                            (baseUtil.hasClass(els[i], activeClassName) == false ||
                             baseUtil.hasClass(tabPanelList, "tabPanelPopup") == false))
                            baseUtil.addClass(els[i], activeClassName);
                        else
                            baseUtil.removeClass(els[i], activeClassName);
                    }

                    TrimPath.tabPanelManager.sync(tabPanelList, activeClassName, null);

                    for (var link = baseUtil.getParent(target, "A"),
                             i = 0; i < TrimPath.tabPanelManager.callbacks.length; i++)
                        TrimPath.tabPanelManager.callbacks[i](link);
                }
                return false;
            }

            var clickHandler = baseUtil.makeEventHandler(function(evt, target) {
                return handler(target);
            });

            return clickHandler;
        },
        callbacks : []
    }

    //////////////////////////////////////////////////////////////////////

    TrimPath.rubberBandBoxManager = {
        create : function(callbackFunc, startPageXY) {
            if (TrimPath.rubberBandBoxManager.dragInfo == null) {
                var boxEl = document.createElement("DIV");
                if (boxEl != null) {
                    boxEl.className = "rubberBandBox";
                    boxEl.style.top  = startPageXY[1] + "px";
                    boxEl.style.left = startPageXY[0] + "px";
                    document.body.appendChild(boxEl);
                }

                var dragInfo = TrimPath.rubberBandBoxManager.dragInfo = {
                    callbackFunc : callbackFunc,
                    startPageXY  : startPageXY,
                    boxEl        : boxEl,
                    popupGlass   : TrimPath.popupManager.showPopupGlass(true)
                };

                baseUtil.addClass(dragInfo.popupGlass, 'popupGlassForRubberBandBox');

                dragInfo.popupGlass.onmousemove = TrimPath.rubberBandBoxManager.onMouseMove;
                dragInfo.popupGlass.onmouseup   = TrimPath.rubberBandBoxManager.onMouseUp;

                document.body.onselectstart = baseUtil.noopFalse; // IE hack to avoid selecting any underlying text during drag.
            }
        },
        dragInfo : null,
        onMouseMove : makeEventHandler(function(event, target) {
            var dragInfo = TrimPath.rubberBandBoxManager.dragInfo;
            if (dragInfo != null &&
                dragInfo.boxEl != null) {
                var xy = findEventPageXY(event);
                if (xy != null) {
                    var width  = xy[0] - dragInfo.startPageXY[0];
                    var height = xy[1] - dragInfo.startPageXY[1];
                    dragInfo.boxEl.style.top  = Math.min(dragInfo.startPageXY[1], dragInfo.startPageXY[1] + height) + "px";
                    dragInfo.boxEl.style.left = Math.min(dragInfo.startPageXY[0], dragInfo.startPageXY[0] + width)  + "px";
                    dragInfo.boxEl.style.width  = Math.abs(width)  + "px";
                    dragInfo.boxEl.style.height = Math.abs(height) + "px";
                }
            }
            return baseUtil.stopEvent(event);
        }),
        onMouseUp : makeEventHandler(function(event, target) {
            TrimPath.popupManager.hidePopupGlass();
            var dragInfo = TrimPath.rubberBandBoxManager.dragInfo;
            if (dragInfo != null) {
                dragInfo.popupGlass.onmousemove = null;
                dragInfo.popupGlass.onmouseup   = null;
                if (dragInfo.boxEl != null) {
                    if (dragInfo.callbackFunc != null)
                        dragInfo.callbackFunc(getElementRect(dragInfo.boxEl), event.ctrlKey || event.shiftKey);
                    dragInfo.boxEl.parentNode.removeChild(dragInfo.boxEl);
                }
            }
            TrimPath.rubberBandBoxManager.dragInfo = null;
            document.body.onselectstart = null; // IE hack to allow selecting any underlying text back to normal.
            return baseUtil.stopEvent(event);
        })
    }

    //////////////////////////////////////////////////////////////////////

    var layoutManager = TrimPath.layoutManager = {
        layoutIds : [],
        addLayoutElementId : function(id) {
            layoutManager.layoutIds.push(id);
        },
        addLayoutElement : function(el) {
            if (el != null) {
                var id = el.id;
                if (id == null ||
                    id.length <= 0)
                    id = el.id = baseUtil.genId("layout"); // Note: tracking id's instead of nodes to prevent IE mem-leak.
                layoutManager.addLayoutElementId(id);
            }
        },
        onWindowResize : function() {
            for (var i = 0; i < layoutManager.onWindowResizeBefore.length; i++)
                layoutManager.onWindowResizeBefore[i]();

            var layoutClassNames = baseUtil.getMapKeys(layoutManager.layoutHandlers);
            for (var i = 0; i < layoutManager.layoutIds.length; i++) {
                var layoutId = layoutManager.layoutIds[i];
                if (layoutId != null) {
                    var layoutEl = document.getElementById(layoutId);
                    if (layoutEl != null &&
                        layoutEl.style.display != "none") {
                        for (var j = 0; j < layoutClassNames.length; j++) {
                            if (baseUtil.hasClass(layoutEl, layoutClassNames[j])) 
                                layoutManager.layoutHandlers[layoutClassNames[j]].relayout(layoutEl);
                        }
                    }
                }
            }

            for (var i = 0; i < layoutManager.onWindowResizeAfter.length; i++)
                layoutManager.onWindowResizeAfter[i]();
        },
        onWindowResizeBefore : [],
        onWindowResizeAfter  : [],
        layoutHandlers : {},
        makeLayoutExpandHandler : function(expandIndex, restIndex1, restIndex2, dimKey) {
            return {
                relayout : function(layoutEl) {
                    var fml = TrimPath.layoutManager.getFirstMiddleLastWithValues(layoutEl, dimKey);
                    var expandEl = fml[expandIndex][0];
                    if (expandEl != null) {
                        var space = TrimPath.layoutManager.getDimensionValue(layoutEl, dimKey);
                        if (space != null) {
                            var val = Math.max(0, (space - fml[restIndex1][1] - fml[restIndex2][1]));

                            if (layoutEl.tagName == "TBODY" &&
                                layoutEl.parentNode.border != "")
                                val = val - baseUtil.safeParseInt(layoutEl.parentNode.border) * 2;

                            if (false)
                                log('expand ' + dimKey + ' (' + layoutEl.tagName + ' ' + layoutEl.id + ') ' + 
                                     expandEl.tagName + ' ' + expandEl.id + ' ' + space + ' ' + val + ' ' +
                                     restIndex1 + ':' + fml[restIndex1][1] + ' ' + 
                                     restIndex2 + ':' + fml[restIndex2][1]);

                            expandEl.style[dimKey] = val + "px";
                            if (expandEl.tagName == "TD")
                                expandEl[dimKey] = val;
                        }
                    }
                }
            }
        },
        makeLayoutChildrenSameDim : function(dimKey) {
            return {
                relayout : function(layoutEl) {
                    var space = TrimPath.layoutManager.getDimensionValue(layoutEl, dimKey);
                    for (var child = layoutEl.firstChild; child != null; child = child.nextSibling) {
                        if (child.nodeType == 1) {
                            if (false)
                                log('same ' + dimKey + 
                                    ' (' + layoutEl.tagName + ' ' + layoutEl.id + ') ' + space + ' {' + 
                                    child.tagName + ' ' + child.id + '} ' + 
                                    child[TrimPath.layoutManager.dimKeyToOffsetKey[dimKey]]);

                            child.style[dimKey] = space + "px";
                        }
                    }
                }
            }
        },
        dimKeyToOffsetKey : {
            height : "offsetHeight",
            width  : "offsetWidth"
        },
        dimKeyToClientKey : {
            height : "clientHeight",
            width  : "clientWidth"
        },
        getDimensionValue : function(el, dimKey, clientDimOnly) {
            dimKey = dimKey || "height";
            while ((el != null) &&
                   (el != document.body) &&
                   (el.style[dimKey].length <= 0 ||
                    el.style[dimKey].match(/%$/))) // Walk up the tree if necessary.
                el = el.parentNode;
            if (el == document.body || 
                clientDimOnly == true)
                return el[layoutManager.dimKeyToClientKey[dimKey]];
            if (el != null)
                return baseUtil.safeParseInt(el.style[dimKey]);
            return null;
        },
        getFirstMiddleLastWithValues : function(parentEl, dimKey) {
            var els = baseUtil.getChildElements(parentEl);
            var header = null;
            var footer = null;
            var center = els[0];
        
            if (els.length > 1) {
                header = els[0];
                center = els[1];
            }
            if (els.length > 2)
                footer = els[2];
    
            dimKey = dimKey || "height";
        
            var offsetKey = layoutManager.dimKeyToOffsetKey[dimKey];
    
            return [ [ header, (header != null) ? (baseUtil.safeParseInt(header.style[dimKey]) || header[offsetKey]) : 0 ],
                     [ center, (center != null) ? (baseUtil.safeParseInt(center.style[dimKey]) || center[offsetKey]) : 0 ],
                     [ footer, (footer != null) ? (baseUtil.safeParseInt(footer.style[dimKey]) || footer[offsetKey]) : 0 ] ];
        },
        initSplitterBar : function(splitterBarEl, orientation, endFunc) { 
            // The orientation is "horizontal" or "vertical".
            if (splitterBarEl != null) {
                var splitterBarId = splitterBarEl.id;
                if (splitterBarId == null ||
                    splitterBarId.length <= 0)
                    splitterBarId = splitterBarEl.id = baseUtil.genId("layoutSplitterBar");
                new Draggable(splitterBarId, {
                    ghosting : true,
                    constraint : orientation,
                    starteffect : baseUtil.noop,
                    endeffect : endFunc
                });
            }
        },
        makeInitSplitterBar : function(moveIndex, dimKey) {
            var handleSplitterDone = function(el) {
                var originKey = (dimKey == "width" ? "left" : "top");
                var val = baseUtil.safeParseInt(el.style[originKey]) * (1 - moveIndex);
                el.style[originKey] = "";
            
                var moveEl = baseUtil.getChildElementByIndex(el.parentNode, moveIndex);
                if (moveEl != null) {
                    moveEl.style[dimKey] = Math.max(0, moveEl[TrimPath.layoutManager.dimKeyToOffsetKey[dimKey]] + val) + "px";
                    TrimPath.layoutManager.onWindowResize();
                }
            }

            return function(splitterBarEl) {
                TrimPath.layoutManager.initSplitterBar(splitterBarEl, 
                    (dimKey == "width" ? "horizontal" : "vertical"), 
                    handleSplitterDone);
            }
        }
    }
    
    TrimPath.layoutManager.layoutHandlers.layoutExpandFirstWidth = 
        TrimPath.layoutManager.makeLayoutExpandHandler(0, 1, 2, "width");
    TrimPath.layoutManager.layoutHandlers.layoutExpandFirstHeight = 
        TrimPath.layoutManager.makeLayoutExpandHandler(0, 1, 2, "height");
    TrimPath.layoutManager.layoutHandlers.layoutExpandMiddleWidth = 
        TrimPath.layoutManager.makeLayoutExpandHandler(1, 0, 2, "width");
    TrimPath.layoutManager.layoutHandlers.layoutExpandMiddleHeight = 
        TrimPath.layoutManager.makeLayoutExpandHandler(1, 0, 2, "height");
    TrimPath.layoutManager.layoutHandlers.layoutExpandLastWidth = 
        TrimPath.layoutManager.makeLayoutExpandHandler(2, 0, 1, "width");
    TrimPath.layoutManager.layoutHandlers.layoutExpandLastHeight = 
        TrimPath.layoutManager.makeLayoutExpandHandler(2, 0, 1, "height");
    
    TrimPath.layoutManager.layoutHandlers.layoutChildrenSameWidth = 
        TrimPath.layoutManager.makeLayoutChildrenSameDim("width");
    TrimPath.layoutManager.layoutHandlers.layoutChildrenSameHeight = 
        TrimPath.layoutManager.makeLayoutChildrenSameDim("height");
    
    TrimPath.layoutManager.initSplitterBarLeft = 
        TrimPath.layoutManager.makeInitSplitterBar(0, "width");
    TrimPath.layoutManager.initSplitterBarRight = 
        TrimPath.layoutManager.makeInitSplitterBar(2, "width");
    TrimPath.layoutManager.initSplitterBarTop = 
        TrimPath.layoutManager.makeInitSplitterBar(0, "height");
    TrimPath.layoutManager.initSplitterBarBottom = 
        TrimPath.layoutManager.makeInitSplitterBar(2, "height");
}) ();
