/**
 * TrimPath Include Utilities. Release 1.0.0.
 * Copyright (C) 2005 - 2006 TrimPath.
 */
if (typeof(TrimPath) == 'undefined')
    TrimPath = {};

(function() {
    TrimPath.include = {
        getBasePath : function(doc) {
            doc = doc || document;
        	for (var els = doc.getElementsByTagName("script"),
                     i = 0; i < els.length; i++) {
                var path = els[i].src;
                if (path != null &&
                    path.indexOf("/include.js") >= 0) { 
                    return els[i].src.replace("/include.js", ""); // Note: include.js cannot use query param versioning.
                    break;
                }
            }
            return null;
        },
        getEffectivePath : function(path, basePath) {
            if (path.charAt(0) != '/' &&      // Not an absolute path.
                path.indexOf(':') < 0) // Not a full URL.
                return basePath + '/' + path;
            return path;
        },
        scripts : function(paths, basePath) {
            // Examples:
            //   TrimPath.include.scripts(['foo', 'bar', 'baz'], '/scripts/lib1');
            //   TrimPath.include.scripts(['foo', 'bar', 'baz'], 'http://svr1.com/scripts/lib1');
            //   TrimPath.include.scripts(['foo', 'foo.js', '/scripts/lib1/foo', '/scripts/lib1/']);
            //   TrimPath.include.scripts(['http://svr1.com/scripts/lib2/foo', 'bar']);
            //   TrimPath.include.scripts(['foo.js?vers=123']);
            //   TrimPath.include.scripts(['../libX/foo.js']);
            //
            basePath = basePath || this.getBasePath() || "";
        
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                if (path.indexOf('.js') < 0)
                    path = path + '.js';

            	document.write('<' + 'script language="javascript" src="' + this.getEffectivePath(path, basePath) + '"></' + 'script>');
            }
        },
        styles : function(paths, basePath) {
            basePath = basePath || this.getBasePath() || "";
        
            for (var i = 0; i < paths.length; i++) {
                var path = paths[i];
                if (path.indexOf('.css') < 0)
                    path = path + '.css';

            	document.write('<' + 'link rel="stylesheet" '
                                   + 'href="' + this.getEffectivePath(path, basePath) + '"/>');
            }
        },
        content : function (elementOrId, contentURL, callback) {
            var req = null;
            if (window.XMLHttpRequest) {
                try {
                    req = new XMLHttpRequest();
                } catch(e) {
                    req = null;
                }
            } else if (window.ActiveXObject) {
                try {
                    req = new ActiveXObject("Microsoft.XMLHTTP");
                } catch(e) {
                    req = null;
                }
            }
            if (req != null) {
                req.onreadystatechange = function() { receiveContent(elementOrId, req, callback); };
                try {
                    req.open("GET", contentURL, true);
                    req.send("");
                } catch (e) {
                }
            }
        }
    }

    var receiveContent = function(elementOrId, req, callback) {
        if (req != null &&
            req.readyState == 4) {
            var el = getContentDestination(elementOrId);
            if (el != null) {
                if (req.status == 200 ||
                    req.status == 304)
                    el.innerHTML = req.responseText;
                el.className = ((el.className != null && el.className.length > 0) ? el.className + ' ' : '') + 
                               "includeDone include_" + req.status;
                if (callback != null)
                    callback(el);              
            }
        }
    }

    var getContentDestination = function(elementOrId) { // The elementOrId may also be null.
        var el = elementOrId;
        if (typeof(elementOrId) == "string")
            el = document.getElementById(elementOrId);

        // Create receiving destination if necessary.
        //
        if (el == null) {
            el = document.createElement("DIV");
            if (el != null) {
                document.body.appendChild(el);
                if (typeof(elementOrId) == "string")
                    el.id = elementOrId;
            }
        }
        return el;
    }
}) ();
