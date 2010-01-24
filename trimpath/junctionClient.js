/*
Namespace: TrimPath.junctionClient
  Provides a client-side, web-browser runtime environment for Junction.

Source: 
  trimpath/junctionClient.js

Release:
  See trimpath/junction.js

Copyright:
  copyright (c) 2005, 2006, 2007 Steve Yen, TrimPath.

License:
  dual licensed GNU General Public License 2.0 and 
                Apache Public License 2.0
*/
if (typeof(TrimPath) == 'undefined')
    TrimPath = {};

(function(safeEval) {
    // A web browser based environment for the default junction is defined here.
    // Other environments, like for Rhino, would supply their own env.
    //
    if (typeof(document) != 'undefined') {
        var junctionUtil = TrimPath.junctionUtil;
        var gears        = null;        

        var hashCurr   = null;
        var hashUpdate = function(controllerName, actionName, objId) {
            if (objId == null ||
                objId > 0) {
                // Only change the hash/history for objects that have 
                // been sync'ed to server, so no negative id's.
                //
                var hash = [ controllerName, actionName ];
                if (objId != null)
                    hash.push(objId);
                
                hashCurr = '#' + hash.join('/');

                if (window.location.hash != hashCurr)
                    window.location.hash = hashCurr;
            }
        }

        var scriptRegExpAll = /(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/img;
        var scriptRegExpOne = /(?:<script.*?>)((\n|\r|.)*?)(?:<\/script>)/im;

        var stripScripts = function(str) {
            return str.replace(scriptRegExpAll, '');
        }
        var extractScripts = function(str) {
            var result = [];
            var scripts = str.match(scriptRegExpAll);
            if (scripts != null) {
                for (var i = 0; i < scripts.length; i++) {
                    var s = scripts[i].match(scriptRegExpOne);
                    if (s != null)
                        result.push(s[1]);
                }
            }
            return result;
        }

	    var ua = navigator.userAgent.toLowerCase();
        var browser = {
            webkit  : ua.match(/webkit/),
            opera   : ua.match(/opera/),
            msie    : ua.match(/msie/) && !ua.match(/opera/),
            mozilla : ua.match(/mozilla/) && !ua.match(/(compatible|webkit)/)
	    };

        /* From: http://blog.stevenlevithan.com/archives/faster-than-innerhtml
           This is much faster than using (el.innerHTML = value) when there are many
           existing descendants, because in some browsers, innerHTML spends much longer
           removing existing elements than it does creating new ones. 
         */
        var replaceHtml = function(el, html) {
        	var oldEl = (typeof(el) === "string" ? document.getElementById(el) : el);
        	/*@cc_on // Pure innerHTML is slightly faster in IE
        	oldEl.innerHTML = html;
        	return oldEl;
        	@*/
        	var newEl = oldEl.cloneNode(false);
        	newEl.innerHTML = html;
        	oldEl.parentNode.replaceChild(newEl, oldEl);
        	/* Since we just removed the old element from the DOM, return a reference
        	to the new element, which can be used to restore variable references. */
        	return newEl;
        }
	
        TrimPath.junction = TrimPath.junctionCreate((function() {
            var envInfo = null;
            var envId   = (new Date().getTime() - new Date('2007/06/10').getTime()) +
                            '-' + Math.floor(Math.random() * 100000);

            var isOnline = null;

            // Repeatedly ping server with backoff delay to see if online.
            //
            var pingImg   = null;
            var pingDelay = 10000;
            var pingLoop  = function() {
                pingImg = new Image();
                pingImg.onload  = function() { pingResult(true); };
                pingImg.onerror = function() { pingResult(false); };
                pingImg.src = "/images/ping.gif?r=" + new Date().getTime();
            }
            var pingResult = function(isOnlineNow) {
                if (isOnlineNow != isOnline)
                    pingDelay = 10000; // Reset pingDelay if online status changes.
                isOnline  = isOnlineNow;
                pingImg   = null;
                pingDelay = Math.min(pingDelay * 1.5, 1000 * 60 * 10 /* 10 minutes */);
                window.setTimeout(pingLoop, pingDelay);
            }
            pingResult(true);

            var showMsg = function(m) {
                var msg = document.getElementById('msg');
                if (msg != null) {
                    msg.innerHTML     = m || '';
                    msg.style.display = m != null ? 'block' : 'none';
                }
            }

            var env = {
                // The envInfo.appVersion changes whenever code or db schema changes, or 
                // when the server merely wants to signal clients to reload.  Note
                // that the db schema version might change without any
                // corresponding code changes, and vice versa.  In either 
                // case, the appVersion changes.
                //
                appInit : function(envInfoIn, reqStart) {
                    env.appUrl = '/engines/' + envInfoIn.spaceKey +
                                 '/apps/'    + envInfoIn.appKey;

                    env.db = env.createGearsDb(envInfoIn.spaceKey, envInfoIn.userKey, envInfoIn.appKey);
                    if (env.db == null)
                        env.db = env.createMemoryDb();

                    env.ls = env.createGearsLs(envInfoIn.spaceKey, envInfoIn.userKey, envInfoIn.appKey);

                    env.appInitSync(envInfoIn);

                    var hashTimer = setInterval(function() {
            			if (hashCurr != null &&
                            hashCurr != location.hash) {
            				hashCurr = location.hash;
            				junctionClient.get.apply(junctionClient,
                                                     hashCurr.substring(1).split('/'));
            			}
            		}, 100);

                    env.syncUp(true, function() {
                        if (reqStart != null)
                            TrimPath.junction.env.redirect(reqStart)
                    });
                },
                appInitSync : function(envInfoIn) {
                    // Also called directly during sync in the case where the 
                    // server wants to update the client's app and db schema.
                    //
                    envInfo = envInfoIn;

                    TrimPath.junction.dbMigrate(env.db, TrimPath.junctionDbMigrate);

                    if (env.ls != null &&
                        env.ls.ms != null) {
                        env.ls.ms.manifestUrl = "/engines/" + envInfo.spaceKey + 
                                                "/apps/"    + envInfo.appKey + ";manifest";
                        env.ls.ms.checkForUpdate();
                    }
                },
                session : {},
                type: 'client',
                getInfo : function(key) {
                    return envInfo[key];
                },
                getSession : function() {
                    if (env.session == null)
                        env.session = {};
                    return env.session;
                },
                templateCache  : {},
                templateRender : function(templatePath, context, locale) {
                    try {
                        locale = locale || '';

                        var template = env.templateCache[templatePath + locale];
                        if (template == null) {
                            var templateId = env.templateResolve(templatePath, locale);
                            if (templateId == null)
                                return "[ERROR: could not find template: " + templatePath + "]";

                            var templateText = env.textRead(templateId);
                            if (templateText == null)
                                return "[ERROR: could not read template: " + templatePath + "]";

                            var fileSuffix;
                            fileSuffix = templateId.split('.');
                            fileSuffix = fileSuffix[fileSuffix.length - 1];
                            if (fileSuffix == null ||
                                env.templateEngines[fileSuffix] == null)
                                return "[ERROR: unknown template type: " + fileSuffix + ";\n " +
                                       "supported types are: " + junctionUtil.getMapKeys(env.templateEngines) + "]";

                            template = env.templateCache[templatePath + locale] = env.templateEngines[fileSuffix](templateText);
                        }
        
                        return template.process(context);
                    } catch (e) {
                        return "<pre>[ERROR: template parsing: " + templatePath + ":\n " + 
                                     junctionUtil.exceptionDetails(e) + "]</pre>";
                    }
                },
                templateResolve : function(templatePath, locale) {
                    locale = locale || '';

                    var templateId = templatePath;

                    if (document.getElementById(templateId) == null)
                        templateId = templatePath + '.' + locale + '.jst';
                    if (document.getElementById(templateId) == null)
                        templateId = templatePath + '.' + locale + '.est';
                    if (document.getElementById(templateId) == null)
                        templateId = templatePath + '.jst';
                    if (document.getElementById(templateId) == null)
                        templateId = templatePath + '.est';
                    if (document.getElementById(templateId) == null)
                        templateId = null;

                    return templateId;
                },
                templateEngines : {
                    'jst' : function(templateText) { 
                        return TrimPath.parseTemplate(templateText); 
                    },
                    'est' : function(templateText) { 
                        var te = new TemplateEngine(templateText); 
                        te.process = function(context) { return te.evaluate(null, context); };
                        return te;
                    }
                },
                textCache : {},
                textRead  : function(path) { // Can only read text 'files' that have been already 'downloaded' in a yard area.
                    var text = env.textCache[path];
                    if (text == null &&
                        path != null) {
                        var textEl = document.getElementById(path);
                        if (textEl != null)
                            text = env.textCache[path] = junctionUtil.decodeAngles(env.innerText(textEl));
                    }
    
                    return text;
                },
                layoutRender : function(req, res, contentForLayout) {
                    // Firefox optimization to use innerHTML on the current page 
                    // when we have the same layout, since it's so much faster than 
                    // writing the iframe document contents in sendResult().
                    //
                    var layoutOpt = browser.mozilla &&
                                    res.layoutFull != true &&
                                    res.layoutName != null &&
                                    res.layoutName == env.layoutRenderPrev;

                    env.layoutRenderPrev = res.layoutName;

                    if (layoutOpt) {
                        var view = document.getElementById('view');
                        if (view != null) {
                            var viewDoc = view.contentDocument || view.contentWindow.document;
                            if (viewDoc != null) {
                                var main = viewDoc.getElementById(res.layoutContainerId || 'main');
                                if (main != null) {
                                    main = replaceHtml(main, contentForLayout);

                                    var mainFlashNotice = viewDoc.getElementById(res.layoutContainerFlashNoticeId || 'main.flash_notice');
                                    if (mainFlashNotice != null)
                                        mainFlashNotice.innerHTML = res.flash['notice'] || '';

                                    // Many event firing and script eval workarounds here
                                    // because innerHTML does not evaluate script tags.
                                    //
                                    if (view.contentWindow != null) { 
                                        // TODO: Safari might not support iframe.contentWindow.
                                        // 
                                        // Dark, twisty passages to get an eval that works in 
                                        // the iframe's scope only, and doesn't leak into our
                                        // current scope or the parent window scope.
                                        //
                                        if (view.contentWindow.evalFrameScope == null)
                                            view.contentWindow.evalFrameScope = 
                                                view.contentWindow.eval("new Function('return eval(arguments[0]);')");

                                        var scripts = extractScripts(contentForLayout);
                                        if (scripts != null) {
                                            for (var i = 0; i < scripts.length; i++) {
                                                try {
                                                    view.contentWindow.evalFrameScope(scripts[i]);
                                                } catch (e) {
                                                    if (typeof(console) != 'undefined' &&
                                                        console != null &&
                                                        console.debug != null)
                                                        console.debug(e);
                                                    break;
                                                }
                                            }
                                        }

                                        if (view.contentWindow.onload != null &&
                                            typeof(view.contentWindow.onload) == 'function') {
                                            view.contentWindow.onload();
                                        }
                                    }

                                    if (viewDoc.body != null &&
                                        typeof(viewDoc.body.onload) == 'function') 
                                        viewDoc.body.onload(); 

                                    hashUpdate(req.controllerName, req.actionName, req.objId);

                                    return null; // The null return value short circuits normal sendResult() processing.
                                }
                            }
                        }
                    }

                    if (res.layoutName != null &&
                        res.layoutName.length > 0) {
                        res.contentForLayout = contentForLayout;
                        return res.renderTemplate("/app/views/layouts/" + res.layoutName);
                    }

                    return contentForLayout;
                },
                layoutRenderPrev : null,
                sendResult : function(result) {
                    if (result == null ||
                        typeof(result) != 'string') // Might be null during a redirect result.
                        return;

                    if (document.getElementById('loading') != null)
                        document.getElementById('loading').style.display = 'none';

                    var view = document.getElementById('view');
                    if (view == null) {
                        view = document.createElement("IFRAME");
                        view.id          = 'view';
                        view.className   = 'view';
                        view.scrolling   = 'yes';
                        view.frameBorder = "0";

                        document.body.appendChild(view);
                    }

                    var viewDoc = view.contentDocument || view.contentWindow.document;
                    if (viewDoc != null) {
                        viewDoc.open();
                        viewDoc.write(result);

                        // Expose as little of the 'client-only' junction system as needed.
                        // Using copies for a little more security.
                        //
                        if (view.contentWindow.TrimPath == null)
                            view.contentWindow.TrimPath = {};

                        // Overwrite any TrimPath.junctionClient with our
                        // own embedded-mini-app-server implementation.
                        //
                        view.contentWindow.TrimPath.junctionClient = {};
                        for (var k in junctionClient)
                            view.contentWindow.TrimPath.junctionClient[k] = junctionClient[k];

                        viewDoc.close();

                        for (var links = viewDoc.getElementsByTagName('A'),
                                 i = 0; i < links.length; i++) {
                            links[i].target = '_parent';
                    	}
                        
                        document.title = viewDoc.title;
                    }

                    return result;
                },
                javascriptIncludeTag : function(scriptName) {
                    var path = '/public/javascripts/' + scriptName + '.js';
                    return [ '<script type="text/javascript">',
                             '//<![CDATA[',
                             ((env.textRead(path)) || 
                              ('// [ERROR: unknown script file: ' + path + ']')),
                             '//]]>',
                             '</script>' ].join('\n');

                    // For a server-side env, we might return something like...
                    //
                    // <script type="text/javascript" src="/javascripts/[scriptName].js"></script>
                },
                stylesheetIncludeTag : function(stylesheetName) {
                    var path = '/public/stylesheets/' + stylesheetName + '.css';
                    return [ '<style>',
                             ((env.textRead(path)) || 
                              ('// [ERROR: unknown stylesheet file: ' + path + ']')),
                             '</style>' ].join('\n');
                },
                redirect : function(args, method) {
                    // Assumption/convention on REST principles, that layout might change
                    // radically on a POST and redirect, so ensure next request is
                    // rendered fully without any layout/innerHTML optimizations.
                    //
                    if (method == 'post')
                        env.layoutRenderPrev = null;

                    // TODO: Need new api here that also handles full 
                    // URL's and external URL's, matching RoR api more closely.
                    //
                    junctionClient.get(args.controllerName, 
                                       args.actionName, 
                                       args.objId, 
                                       args);
                },
                setLocale : function(localeStr) {
                    // No-op.
                },
                errorUnknownController : function(controllerName, controllerFuncName) {
                    var msg = 'Error: unknown controller function: ' + controllerFuncName;
                    alert(msg);
                    return msg;
                },
                syncUpLast : null, // Used to throttle requests to env.syncUp().
                syncUp : function(force, callback) { 
                    // Don't bother sync'ing a db delta if we just did it.
                    //
                    // TODO: Need better way of tracking our in-flight syncUp requests.
                    //
                    // TODO: REVISIT: In the gearsDb case, need to handle more than one 
                    // browser window/tab doing concurrent syncUp()'s, as they all share 
                    // the same gearsDb.  Perhaps keep a tracking table in the gearsDb?
                    //
                    var now = new Date();
                    if ((force != true) &&
                        (env.syncUpLast != null) && 
                        (now.getTime() - env.syncUpLast.getTime() < 1000))
                        return;
                    env.syncUpLast = now; // Note: this is different that db.getSyncedAt().

                    // Async level of indirection needed probably due to the
                    // generated view iframe mysteriously messing up the Ajax request.
                    //
                    window.setTimeout(function() {
                        env.syncUpNow(force, callback);
                    }, 1001);
                },
                syncUpNow : function(force, callback) { 
                    // Fire off asynchronous server update request with our local db changes, 
                    // checking along the way that local app code and schema versions match 
                    // up with the server's.
                    //
                    // The server's reply will either be an application code/schema update,
                    // or a delta of record changes that we need to apply to our local db.
                    //
                    var start = new Date();

                    var schemaIn = env.db.getSchema(); 
                    var schemaGo = false;
                    var schema   = {}
                    for (var tableName in schemaIn) {
                        var tableSync = true;
                        var modelFunc = null;
                        try {
                            modelFunc = safeEval(tableName);
                        } catch (e) {
                        }
                        if (modelFunc != null &&
                            modelFunc.onBeforeSync != null &&
                            typeof(modelFunc.onBeforeSync) == 'function') {
                            tableSync = modelFunc.onBeforeSync();
                        }                                
                        if (tableSync != false) {
                            schema[tableName] = schemaIn[tableName];
                            schemaGo = true;
                        }
                    }
                    if (schemaGo == false) // The sync schema is empty.
                        return;

                    var delta = {};
                    var dirty = env.syncUpFillDelta(delta, schema);
                    if (dirty || force) {
                        env.syncDOMDb();
    
                        if (env.isOnline() || force) {
                            showMsg('syncing...');

                            new Ajax.Request("/engines/" + envInfo.spaceKey + 
                                             "/apps/"    + envInfo.appKey + ";sync", {
                                method : "post",
                                parameters : {
                                    protocol       : 'simpleSync-0.1',
                                    appVersion     : envInfo.appVersion,
                                    dbIdent        : env.db.getIdent(),
                                    dbVersion      : env.db.getVersion(),
                                    dbSyncedAt     : env.db.getSyncedAt(),
                                    dbDelta        : junctionUtil.toJsonString(delta), 
                                    conversationId : envInfo.conversationId
                                },
                                onException : function(r, e) {
                                    console.debug('syncUp msg exception ', r, e);
                                    showMsg(null);

                                    // One reason we get here is that we are offline.
                                    //
                                    // TODO: But that might not be the only reason we get here,
                                    // in that we have an exception although we are online.
                                    //
                                    pingResult(false);
                                },
                                onFailure : function(transport) {
                                    console.debug('syncUp msg failure ', transport);
                                    showMsg(null);

                                    // TODO: Handle failure.
                                },
                                onSuccess : function(transport) {
                                    console.debug('syncUp msg success ', transport);
                                    showMsg(null);

                                    pingResult(true);

                                    // TODO: Handle other failure cases.
                                    //
                                    // TODO: Consider async worker pool to process large reply messages.
                                    //
                                    if (transport.status == 200) {
                                        if (env.syncUpProcessApp(transport.responseText) == true) {
                                            // We received and applied an app code/schema update, 
                                            // so schedule another attempt at updating the server 
                                            // with our local db record changes.
                                            //
                                            env.syncUp(force, callback);
    
                                            return;
                                        }
    
                                        // We received a reply delta of records from the server.
                                        //
                                        var result = safeEval('(' + transport.responseText +')');
                                        if (result != null) {
                                            // The app and db versions should match at this point,
                                            // unless the reply was severely delayed or out-of-order
                                            // or some interesting concurrent scenario occurred.
                                            //
                                            if (result.appVersion == envInfo.appVersion &&
                                                result.dbIdent    == env.db.getIdent() &&
                                                result.dbVersion  == env.db.getVersion()) {
                                                if (env.syncUpProcessDelta(result.dbDelta) == true)
                                                    env.layoutRenderPrev = null;

                                                env.db.setSyncedAt(junctionUtil.toSQLDateString(start));

                                                env.syncDOMDb();
    
                                                if (callback != null)
                                                    callback(transport);
                                            } else {
                                                // TODO: Reconsider what we should do in this
                                                // mismatched version error case.  The server
                                                // might have already inserted the records, and
                                                // we still have our temporary negative-id records
                                                // in our local db.
                                                //
                                                env.syncUp(true, callback);
                                            }
                                        }
                                    }
                                }
                            });
                        }
                    }
                },
                syncUpFillDelta : function(delta, schema, changesFor) {
                    var dirty = false;
                    schema     = schema     || env.db.getSchema();
                    changesFor = changesFor || env.db.changesFor;
                    for (var tableName in schema) {
                        if (junctionUtil.syncAllowedForTable(tableName, schema) == true) {
                            var changes = changesFor(tableName);
                            if (changes != null) {
                                delta[tableName] = {};
                                for (var id in changes) {
                                    var op = changes[id];
                                    if (op != null) {
                                        dirty = true;

                                        if (op == 's')
                                            delta[tableName][id] = [ op, env.db.findById(tableName, id) ];
                                        if (op == 'd')
                                            delta[tableName][id] = [ op ];
                                    }
                                }
                            }
                        }
                    }
                    return dirty;
                },
                syncUpProcessDelta : function(delta, schema, finishRecord) {
                    var schema       = schema       || env.db.getSchema(); 
                    var finishRecord = finishRecord || env.db.clearChangesFor;
                    var changed      = false;

                    env.db.transact(function() {
                        for (var tableName in delta) {
                            if (junctionUtil.syncAllowedForTable(tableName, schema) == true) {
                                var changes = delta[tableName];
                                for (var id in changes) {
                                    var opRec = changes[id]; // Ex: ['s', record]
                                    if (opRec != null) {
                                        var op = opRec[0];
                                        if (op == 'd') {
                                            env.db.destroyRecord(tableName, id);
                                            finishRecord(tableName, id);
                                            changed = true;
                                        }
                                        if (op == 's') {
                                            var record = opRec[1];
                                            if (record.id == null ||
                                                record.id != id)
                                                throw new Error("syncUpProcessDelta: wrong record id: " + record.id + " vs " + id);
    
                                            record.id = parseInt(record.id, 10);
                                            if (isNaN(record.id))
                                                throw new Error("syncUpProcessDelta: unexpected record id: " + record.id + " vs " + id);
    
                                            env.db.saveRecord(tableName, record);
                                            changed = true;
    
                                            if (record.id > 0 &&
                                                record.id_start_db == env.db.getIdent()) {
                                                env.db.destroyRecord(tableName, record.id_start);
                                                finishRecord(tableName, id, record.id_start);
    
                                                // TODO: Consider putting the mapObjId_map into the local db
                                                // so that multiple browser windows/tabs can share it in
                                                // the gearsDb environment.
                                                //
                                                env.mapObjId_map[record.id_start] = id;
                                            } else {
                                                finishRecord(tableName, id);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });

                    return changed;
                },
                syncUpProcessApp : function(msg) {
                    if (msg.substring(0, 6) == '<html>') {
                        // Must have been some server side exception.
                        //
                        // TODO: Revisit error handling.
                        //
                        throw new Error("sync error: " + msg.match(/(?:<body>)(.*?)(?:<\/body>)/img));
                    }

                    if (msg.charAt(0) == '<') {
                        // We received an update to our application code and/or 
                        // application schema (there might be new migration steps).
                        //
                        env.resetCaches();

                        $('sync_app').innerHTML = stripScripts(msg);

                        var scripts = extractScripts(msg);
                        if (scripts != null) {
                            for (var i = 0; i < scripts.length; i++) 
                                safeEval(scripts[i]);
                        }

                        env.syncDOMDb();
                        return true;
                    }
                    return false;
                },
                resetCaches : function() {
                    env.layoutRenderPrev = null;
                    env.templateCache    = {};
                    env.textCache        = {};
                },
                mapObjId_map : {},
                mapObjId : function(objId) { // Map to handle when old pages are refering to outdated negative id's.
                    if (env.mapObjId_map != null &&
                        env.mapObjId_map[objId] != null)
                        return env.mapObjId_map[objId];
                    return objId;
                },
                syncDOMDb : function() { 
                    return; // NOTE: No longer using File->Save Page as we now have gears.

                    // Optionally update locally persistable DOM nodes from our in-memory record hashes.
                    // After this function returns, File->Save Page should work (at least in firefox).
                    //
                    if (env.db != null) {
                        var map = env.db.getDataAsMap();
                        if (map != null)
                            env.elementJsonDataUpdate('__system/db', map);
                    }
                },
                isOnline : function() {
                    return isOnline;
                },
                innerTextArray : function(el, out) { // An innerText implementation that fills and returns a String array.
                    out = out || [];
                    for (var i = 0; i < el.childNodes.length; i++) {
                        var childEl = el.childNodes[i];
                        if (childEl.nodeType == 1)
                            env.innerTextArray(childEl, out);
                        if (childEl.nodeType == 3)
                            out.push(childEl.data);
                    }
                    return out;
                },
                innerText : function(el) {
                    return env.innerTextArray(el).join('');
                },
                elementJsonData : function(elementId, doc) { // The element should be a pre or div.
                    doc = doc || document;
                    var el = doc.getElementById(elementId);
                    if (el != null)
                        return eval(env.innerText(el).replace(/[\r\n]/g, ''));
                    return null;
                },
                elementJsonDataUpdate : function(elementId, data, doc) {
                    var arr = ['('];
                    junctionUtil.toJsonStringArray(data, arr);
                    arr.push(')');
                    env.elementTextUpdate(elementId, arr.join(''), doc);
                },
                elementTextUpdate : function(elementId, elementText, doc) {
                    doc = doc || document;
                    var el = document.getElementById(elementId);
                    if (el != null) {
                        while (el.hasChildNodes())
                            el.removeChild(el.firstChild);
                        el.appendChild(doc.createTextNode(elementText));
                    }
                },
                hasGears : function() {
                    return (window.google != null && 
                            google.gears != null &&
                            google.gears.factory != null);
                },
                hasGearsDb : function() {
                    // Might return false if the user has gears but does 
                    // not authorize us to use gears for this domain.
                    //
                    if (env.hasGears() == true) {
                        try {
                            var db = google.gears.factory.create('beta.database', '1.0');
                            if (db != null) {
                                db.open();
                
                                var rs = db.execute('select 1');
                                if (rs != null) {
                                    rs.close();
                                    return true;
                                } 
                            }
                        } catch (e) {
                        }
                    }
                    return false;
                },
                createGearsLs : function(spaceKey, userKey, appKey) { // LocalServer
                    if (env.hasGears() == false)
                        return null;

                    try { 
                        var gearsLs = {
                            ls : google.gears.factory.create('beta.localserver', '1.0'),
                            ms : null,
                            isCaptured   : function() { 
                                return gearsLs.ls != null &&
                                       gearsLs.ms != null &&
                                       gearsLs.ms.currentVersion != null &&
                                       gearsLs.ms.currentVersion.length > 0; 
                            },
                            canRunOffline : function() {
                                return env.hasGearsDb && gearsLs.isCaptured();
                            }
                        }

                        if (gearsLs.ls != null) {
                            gearsLs.ms = gearsLs.ls.createManagedStore([ 
                                    (spaceKey || 'space'), 
                                    (userKey  || 'user'), 
                                    (appKey   || 'app') 
                                ].join('-'));
                            if (gearsLs.ms != null)
                                return gearsLs;
                        }
                    } catch (e) {
                    }
                    return null;
                },
                createGearsDb : function(spaceKey, userKey, appKey) {
                    if (env.hasGearsDb() == false)
                        return null;

                    try { 
                        var db     = google.gears.factory.create('beta.database', '1.0');
                        var dbName = [ (spaceKey || 'space'), (userKey || 'user'), (appKey || 'app') ].join('-');

                        db.open(dbName);

                        var executeSql = function(sql, args) {
                            console.debug('SQL: ' + sql + '; ' + (args || ''));

                            try {
                                if (args != null)
                                    return db.execute(sql, args);
                                else
                                    return db.execute(sql);
                            } catch (e) {
                                // e is not a real error, so we can't just let it bubble up -- it won't 
                                // display in error uis correctly. So we basically convert it to a real 
                                // error.
                                throw new Error("Error executing SQL: " + sql + ". Error was: " + e.message);
                            }
                        }

                        var conn = {
                            execute : function(sql, args) {
                                var rs = executeSql(sql, args);
                                if (rs != null)
                                    rs.close();
                            },                       
                            executeToRecords : function(sql, args) {
                                var rv = [];
                                var rs = executeSql(sql, args);
                                try {
                                    if (rs != null && 
                                        rs.isValidRow()) {
                                        var cols = rs.fieldCount();
                                        var colNames = [];
                                        for (var i = 0; i < cols; i++)
                                            colNames.push(rs.fieldName(i));
    
                                        while (rs.isValidRow()) {
                                            var r = {};
                                            for (var i = 0; i < cols; i++)
                                                r[colNames[i]] = rs.field(i);
    
                                            rv.push(r);
                                            rs.next();
                                        }
                                    }
                                } catch (e) {
                                    throw e;
                                } finally {
                                    if (rs != null)
                                        rs.close();
                                }
                                return rv;
                            },
                            recordChanged : function(tableName, id, op) {
                                executeSql('INSERT OR REPLACE INTO changes_' + tableName + 
                                             ' (id, op) VALUES (?, ?)', [ id, op ]);
                            }
                        }

                        return junctionUtil.createDbObj(conn, 
                            { name     : 'gears', 
                              type     : 'sqlite3', 
                              persists : true }, 
                            true);
                    } catch (e) {
                    }
                    return null;
                },
                createMemoryDb : function() {
                    var db       = {};
                    var dbSchema = {};
                    var syncedAt = null;
                    var version  = null;

                    var recordChanged = function(tableName, id, op) {
                        var changes = memoryDb.changesFor(tableName);
                        changes[id] = op;
                    }

                    // TODO: Revisit prepared sql mem-leak here.
                    //
                    var prepareCache = {};
                    var prepare = function(sql, sqlParams) {
                        if (preparer == null)
                            preparer = TrimPath.makeQueryLang(dbSchema);

                        var key = sql + " -- " + sqlParams;
                        if (prepareCache[key] == null)
                            prepareCache[key] = preparer.parseSQL(sql, sqlParams);
                        return prepareCache[key];
                    }
        
                    var preparer = null; // Delay preparer creation until schema settles down.

                    var genMinIdLast = null;

                    var memoryDb = {
                        getInfo : function() { 
                            return { name     : 'memory', 
                                     type     : 'memory', 
                                     persists : false }; 
                        },
                        getIdent : function() { return envId; },
                        getVersion : function()  { return version || 0; },
                        setVersion : function(v) { 
                            version = v; 
                            preparer = null; 
                        },
                        ensureVersion : function() {}, // NOTE: Always succeeds since memoryDb is not shared.
                        getSyncedAt : function()  { return syncedAt; },
                        setSyncedAt : function(t) { syncedAt = t; },
                        flushCaches : function() {
                            prepareCache = {};
                            preparer = null;
                        },
                        getSchema : function() {
                            return dbSchema;
                        },
                        changesFor : function(tableName) { 
                            var key = "changes @@ " + tableName;
                            if (db[key] == null) // We store changes into the db hash so that changes are
                                db[key] = {};    // auto-serialized to json along with any normal db records.
                            return db[key];
                        },
                        clearChangesFor : function(tableName /* variable ids */) {
                            var changes = memoryDb.changesFor(tableName);
                            if (changes != null) {
                                for (var i = 1; i < arguments.length; i++) {
                                    if (arguments[i] != null &&
                                        changes[arguments[i]] != null)
                                        delete changes[arguments[i]];
                                }
                            }
                        },
                        transact : function(fn) {
                            // TODO: Handle nested memoryDb transactions, if necessary.
                            //
                            var copyDb       = junctionUtil.toJsonStringArray(db);
                            var copyDbSchema = junctionUtil.toJsonStringArray(dbSchema);
                            var copyVersion  = version;
                            try {
                                fn();
                            } catch (e) {
                                // Need to rollback the changes_Xxxx tables.
                                //
                                db       = safeEval('(' + copyDb.join('') + ')');
                                dbSchema = safeEval('(' + copyDbSchema.join('') + ')');
                                version  = copyVersion;
                                prepareCache = {};
                                preparer     = null;
                                throw e;
                            }
                        },
                        execute : function(sql, sqlParams) { 
                            console.debug('SQL: ' + sql + '; ' + (sqlParams || ''));

                            var stmt = prepare(sql, junctionUtil.prepSQLParams(sqlParams));

                            return stmt.filter(db); // See TrimQuery API.
                        },
                        findById : function(tableName, id) {
                            var records = db[tableName];
                            if (records != null) {
                                var index = junctionUtil.findRecordIndex(records, id);
                                if (index >= 0)
                                    return junctionUtil.copyRecord(records[index], {});
                            }
                            return null;
                        },
                        save : function(tableName, obj) {
                            var isNewRec = obj.isNewRecord();
                            if (isNewRec) {
                                obj.id = memoryDb.genMinId();
                                obj.id_start    = obj.id;
                                obj.id_start_db = memoryDb.getIdent();
                            }

                            memoryDb.saveRecord(tableName, obj);

                            recordChanged(tableName, obj.id, 's'); // The 's' is for save.
                            return true;
                        },
                        saveRecord : function(tableName, rec) {
                            var records = db[tableName];
                            if (records == null)
                                records = db[tableName] = [];
                            var index = junctionUtil.findRecordIndex(records, rec.id);
                            if (index >= 0)
                                junctionUtil.copyRecord(rec, records[index]);
                            else
                                records.push(junctionUtil.copyRecord(rec, {}));
                            return true;
                        },
                        destroy : function(tableName, id) {
                            memoryDb.destroyRecord(tableName, id);
                            recordChanged(tableName, obj.id, 'd'); // The 'd' is for delete/destroy.
                        },
                        destroyRecord : function(tableName, id) {
                            var records = db[tableName];
                            var index = junctionUtil.findRecordIndex(records, id);
                            if (index >= 0)
                                records.splice(index, 1);
                        },
                        genMinId : function() {
                            if (genMinIdLast == null) {
                                genMinIdLast = 0;

                                var dbIdent = memoryDb.getIdent();

                                for (var tableName in dbSchema) {
                                    var records = db[tableName];
                                    if (records != null) {
                                        for (var i = 0; i < records.length; i++) 
                                            if (records[i].id_start_db == dbIdent)
                                                genMinIdLast = Math.min(records[i].id_start, genMinIdLast);
                                    }
                                    var changes = memoryDb.changesFor(tableName);
                                    for (var id in changes) {
                                        genMinIdLast = Math.min(id, genMinIdLast);                                        
                                    }
                                }
                            }
                            genMinIdLast = genMinIdLast - 1;
                            return genMinIdLast;
                        },
                        getDataAsMap : function() {
                            return db; // Keyed by table name. 
                        },
                        getDDL : function() {
                            return {
                                // Takes additional, variable arguments of columns, like...
                                //   createTable('Product', column('name', 'string'), column('price', 'float'));
                                //
                                createTable : function(name) {
                                    if (dbSchema[name] != null || 
                                        db[name] != null)
                                        throw('could not create table, it already exists: ' + name);
                                    dbSchema[name] = {};
                                    db[name]       = [];
                                    for (var i = 1; i < arguments.length; i++) {
                                        var column = arguments[i];
                                        dbSchema[name][column[0]] = {
                                            type: column[1]
                                        }
                                    }
                                },
                                dropTable : function(name) {
                                    delete dbSchema[name];
                                    delete db[name];
                                    delete db["changes @@ " + name];
                                },
                                renameTable : function(oldName, newName) {
                                    if (dbSchema[oldName] == null || 
                                        db[oldName] == null)
                                        throw('could not rename a missing table ' + oldName);
                                    dbSchema[newName] = dbSchema[oldName];
                                    db[newName]       = db[oldName];
                                    db["changes @@ " + newName] = db["changes @@ " + oldName];
                                },
                                addColumn : function(tableName, columnName, type) {
                                    if (dbSchema[tableName] == null || 
                                        db[tableName] == null)
                                        throw('could not add column to missing table ' + tableName);
                                    if (dbSchema[tableName][columnName] != null)
                                        throw('could not add an already existing column ' + columnName + ' to table ' + tableName);
                                    dbSchema[tableName][columnName] = {
                                        type: type
                                    }                                    
                                },
                                renameColumn : function(tableName, columnName, newColumnName) {
                                    // TODO: Matches gearsDB renameColumn.
                                    //
                                    throw new Error("renameColumn unimplemented");

                                    if (dbSchema[tableName] == null || 
                                        db[tableName] == null)
                                        throw('could not rename a column on a missing table ' + tableName);
                                    if (dbSchema[tableName][columnName] == null)
                                        throw('could not rename a missing column ' + columnName + ' on table ' + tableName);
                                    if (dbSchema[tableName][newColumnName] != null)
                                        throw('could not rename a column to an already existing column ' + newColumnName + ' on table ' + tableName);
                                    dbSchema[tableName][newColumnName] = dbSchema[tableName][columnName];
                                    delete dbSchema[tableName][columnName];
                                    for (var records = db[tableName],
                                             i = 0; i < records.length; i++) {
                                        var record = records[i];
                                        if (record != null) {
                                            record[newColumnName] = record[columnName];
                                            delete record[columnName];
                                        }
                                    }
                                },
                                removeColumn : function(tableName, columnName) {
                                    if (dbSchema[tableName] == null || 
                                        db[tableName] == null)
                                        throw('could not remove a column from a nonexistent table ' + tableName);
                                    if (dbSchema[tableName][columnName] == null)
                                        throw('could not remove a nonexistent column ' + columnName + ' on table ' + tableName);
                                    delete dbSchema[tableName][columnName];
                                    for (var records = db[tableName],
                                             i = 0; i < records.length; i++) {
                                        var record = records[i];
                                        if (record != null) 
                                            delete record[columnName];
                                    }
                                },
                                // Add a new index with the name of the column, or indexName (if specified) 
                                // on the column(s). Specify an optional indexType (e.g. UNIQUE).
                                addIndex : function(tableName, columnNames, indexType, indexName) {
                                },
                                // Remove the index specified by indexName.
                                removeIndex : function(tableName, indexName) {
                                }
                            }
                        }
                    };
                    return memoryDb;
                }
            };

            return env;
        }) ());

        /* 
        Section: TrimPath.junctionClient
          Be aware that the TrimPath.junctionClient object and its methods 
          are only available in client-side, DOM event-handler style of code.  
          That is, you may only invoke TrimPath.junctionClient methods only
          in response to a DOM event handler or in a <script> block.

          For example, even though your application's web-MVC code
          might be downloaded to be executed within a web-browser, your
          web-MVC code is still classified as 'server-side' code.  Thus,
          'server-side' code is not allowed to access the TrimPath.junctionClient
          object.  Similarly, 'server-side' code is not allowed to access
          the document, window, or alert() DOM objects and API.
        */    
        var junctionClient = {
            /* 
            Function: get
              Sends a GET request through the Junction system.

              If the application (web-MVC code) is executing on the
              client-side, hosted within the web browser, then the
              TrimPath.junctionClient.get() method call is handled by 
              the client-side Junction system.  The client-side Junction
              system will execute an action method on a Controller
              within the web browser.  The response HTML string
              is used by the client-side Junction system to replace
              the current page.

              On the other hand, if the application (web-MVC code) is executing 
              on the server-side, within a remote web-application-server, 
              the TrimPath.junctionClient.get() method will simply 
              returns a boolean value of true.  When used as the
              value of an <A> link onclick event handler, this signals
              to the web browser to process the link click as normal.
              So, the web browser will send a genuine HTTP GET request
              message to a remote server.  The Junction system running
              on the remote server will execute an action method on 
              a Controller, and reply with a response HTML message.
              The web browser will replace the entire current 
              page with that response HTML. 

              The example below shows the usual pattern for using
              TrimPath.junctionClient.get() in an <A> link onclick
              attribute.  The linkToLocal() method helps to generate
              such <A> links.

            Example:
            > <a href="?controllerName=invoice&actionName=list"
            >    onclick="return TrimPath.junctionClient.get('invoice', 'list');">
            >    List All Invoices</a>
            >
            > // The above could have been generated by calling...
            > <%= linkToLocal('List All Invoices', 'invoice', 'list') %>

            Parameters:
            - controllerName - A string name of a Controller in the application.
            - actionName - A string name of an action method of the Controller.
            - objId - An optional value that helps the action method focus its operation.
                      Or, may be null.
            - req - An optional hash/map object that holds more key/value request parameters.
            
            Returns:
            - true, if the application is not executable on the client-side.
            - false, if the application is executing on the client-side.
                     When used in an <A> link onclick event handler,
                     the false return value prevents the web browser
                     from processing the click event as normal, so the
                     web browser will not fire off a true HTTP request.
            */
            get : function(controllerName, actionName, objId, req) {
                junctionClient.getAsync(controllerName, actionName, objId, req, {
                    onComplete : function(result) {
                        if (result != null &&
                            result != false &&
                            result.length > 0) {
                            TrimPath.junction.env.sendResult(result);

                            hashUpdate(controllerName, actionName, objId);
                        }
                    }
                });
                return false; // Useful as event handler callback.
            },

            /* 
            Function: getAsync
              Sends an asynchronous GET request to the client-side Junction system.
              Unlike with TrimPath.junctionClient.get(), the getAsync() method
              does not alter the current page.  Instead, it calls a
              given callback parameter function with the response.

            Parameters:
            - controllerName - A string name of a Controller in the application.
            - actionName - A string name of an action method of the Controller.
            - objId - An optional value that helps the action method focus its operation.
                      Or, may be null.
            - req - A optional hash/map object that holds more key/value request parameters.
            - callbacks - An optional hash/map object.  

            Callbacks:
            - onComplete - A function of one argument, the result of the
                           controller/action request.
            
            Returns:
            - true, if the application is not executable on the client-side.
            - false, if the application is executing on the client-side.
                     When used in an DOM event handler,
                     the false return value prevents the web browser
                     from processing the event as normal, so the
                     web browser will not fire off a true HTTP request.
            */
            getAsync : function(controllerName, actionName, objId, req, callbacks) {
                // Async-style API.
                //
                // TODO: Might need an eventually here to really be async.
                //
                var result = TrimPath.junction.processRequest("get", controllerName, actionName, objId, req);
                if (callbacks != null &&
                    callbacks.onComplete != null)
                    callbacks.onComplete(result);

                return false;
            },

            /* 
            Function: post
              Sends a POST request through the Junction system.

              Similar to the TrimPath.junctionClient.get() method,
              except the HTTP method will be a 'post'.

              Developers should usually favor the more useful
              TrimPath.junctionClient.postForm() method instead of
              this lower-level post() method.

            Parameters:
            - controllerName - A string name of a Controller in the application.
            - actionName - A string name of an action method of the Controller.
            - objId - An optional value that helps the action method focus its operation.
                      Or, may be null.
            - req - An optional hash/map object that holds more key/value request parameters.
            
            Returns:
            - true, if the application is not executable on the client-side.
            - false, if the application is executing on the client-side.
                     When used in an DOM event handler,
                     the false return value prevents the web browser
                     from processing the event as normal, so the
                     web browser will not fire off a true HTTP request.
            */            
            post : function(controllerName, actionName, objId, req) {
                junctionClient.postAsync(controllerName, actionName, objId, req, {
                    onComplete : TrimPath.junction.env.sendResult 
                });
                return false; // Useful as event handler callback.
            },

            /* 
            Function: postAsync
              Sends a POST request through the Junction system.

              Similar to the TrimPath.junctionClient.getAsync() method,
              except the HTTP method will be a 'post'.

            Parameters:
            - controllerName - A string name of a Controller in the application.
            - actionName - A string name of an action method of the Controller.
            - objId - An optional value that helps the action method focus its operation.
                      Or, may be null.
            - req - An optional hash/map object that holds more key/value request parameters.
            - callbacks - An optional hash/map object.  

            Callbacks:
            - onComplete - A function of one argument, the result of the
                           controller/action request.
            
            Returns:
            - true, if the application is not executable on the client-side.
            - false, if the application is executing on the client-side.
                     When used in an DOM event handler,
                     the false return value prevents the web browser
                     from processing the event as normal, so the
                     web browser will not fire off a true HTTP request.
            */            
            postAsync : function(controllerName, actionName, objId, req, callbacks) { 
                // Async-style API.
                //
                // TODO: Might need an eventually here to really be async.
                //
                var result = TrimPath.junction.processRequest("post", controllerName, actionName, objId, req);
                if (callbacks != null &&
                    callbacks.onComplete != null)
                    callbacks.onComplete(result);

                // Force a syncUp, assuming the post request made a change to the local db.
                //
                TrimPath.junction.env.syncUp(false);

                return false;
            },

            /* 
            Function: postForm
              Sends a POST request through the Junction system.

              Similar to the TrimPath.junctionClient.get() method,
              except the HTTP method will be a 'post'.

              If the application (web-MVC code) is executing on the
              client-side, hosted within the web browser, then the
              TrimPath.junctionClient.postForm() method call is handled by 
              the client-side Junction system.  The client-side Junction
              system will execute an action method on a Controller
              within the web browser.  The response HTML string
              is used by the client-side Junction system to replace
              the current page.

              On the other hand, if the application (web-MVC code) is executing 
              on the server-side, within a remote web-application-server, 
              the TrimPath.junctionClient.post() method will simply 
              returns a boolean value of true.  When used as the
              value of an <input type="submit"> onclick event handler, this 
              signals to the web browser to process the submit button click 
              as normal.  So, the web browser will send a genuine form 
              HTTP POST request message to a remote server.  The Junction 
              system running on the remote server will execute an 
              action method on a Controller, and reply with a response 
              HTML message.   The web browser will replace the entire current 
              page with that response HTML. 

              The example below shows the usual pattern for using
              TrimPath.junctionClient.postForm() in an 
              <input type="submit"> onclick attribute.  
              The startFormTagLocal() and submitButtonLocal() 
              helper methods are useful to help to generate such HTML.

              The following example shows a common pattern of usage...

            Example:
            > <form action="?controllerName=order&action=create" 
            >       method="post"
            >       onsubmit="return TrimPath.junctionClient.postForm(document.getElementById('myForm'), 'order', 'create');"
            >       id="myForm">
            >   <!-- ... other <input> controls ... -->
            >   <input type="submit"
            >          id="go" 
            >          name="go" 
            >          value="Create Order"
            >          onclick="return TrimPath.junctionClient.postForm(document.getElementById(...), 'order', 'create');"/>
            > </form>
            >
            > // The above HTML could have been generated by calls to the helper functions...
            >
            > <%= start_form_tag_local('order', 'create', null, { id: 'myForm' }) %>
            >   <!-- ... other <input> controls ... -->
            >   <%= submit_button_local('go', 'Create Order') %>
            > <%= end_form_tag %>

            Parameters:
            - formEl - A <FORM> DOM element.
            - controllerName - A string name of a Controller in the application.
            - actionName - A string name of an action method of the Controller.
            - objId - An optional value that helps the action method focus its operation.
                      Or, may be null.
            - req - An optional hash/map object that holds more key/value request parameters.
            
            Returns:
            - true, if the application is not executable on the client-side.
            - false, if the application is executing on the client-side.
                     When used in an DOM event handler,
                     the false return value prevents the web browser
                     from processing the event as normal, so the
                     web browser will not fire off a true HTTP request.
            */            
            postForm : function(formEl, controllerName, actionName, objId, req, submitButtonName) {
                req = junctionClient.formToReq(formEl, submitButtonName, req);
                if (req != null)
                    return junctionClient.post(controllerName, actionName, objId, req);
                return false;
            },

            /*
            Function: formToReq
              Fills a req hash/map object with key/values from <input>
              controls in a <form>.

            Parameters:
            - formEl - A <FORM> DOM eleemnt.
            - submitButtonName - An optional string name of the <input type="submit"> button
                                 that fired off the request.
            - req - An optional hash/map to fill and return.

            Returns:
              The req hash/map object, or a new hash/map object if req is null.
              The returned hash/map will contain keys/values set from
              the <input> control elements of the formEl.
            */
            formToReq : function(formEl, submitButtonName, req) {
                if (formEl != null) {
                    req = req || {};
                    for (var i = 0; i < formEl.elements.length; i++) {
                        var element = formEl.elements[i];
                        if (element.type == "submit") {
                            if (element.name == submitButtonName)
                                junctionUtil.setMapTreeValue(req, element.name, element.value);
                        } else if (element.type == "radio") {
                            if (element.checked)
                                junctionUtil.setMapTreeValue(req, element.name, element.value);
                        } else {
                            var value = (element.type == "checkbox" ? element.checked : element.value);
                            junctionUtil.setMapTreeValue(req, element.name, value);
                        }
                    }
                    return req;
                }
                return null;
            }
        }
    }
}) (function(evalExpr) { return eval(evalExpr); }); // The safeEval works in global scope.

// Expose some functions to global namespace for convenience...
//
var modelFor          = TrimPath.junction.modelInit;
var model_for         = TrimPath.junction.modelInit;
var modelInit         = TrimPath.junction.modelInit;
var model_init        = TrimPath.junction.modelInit;
var scaffold          = TrimPath.junction.scaffold;
var beforeFilter      = TrimPath.junction.beforeFilter;
var before_filter     = TrimPath.junction.beforeFilter;
var dbExecute         = TrimPath.junction.dbExecute;
var toSQLDateString   = TrimPath.junctionUtil.toSQLDateString;
var toLocalDateString = TrimPath.junctionUtil.toLocalDateString;

// From make, to rake, to jsake, useful in Firebug and in cmd-line Rhino jsconsole...
//
var jsake = {
    dbMigrate : function(version) {
        TrimPath.junction.dbMigrate(
            TrimPath.junction.env.db, 
            TrimPath.junctionDbMigrate,
            version);
    }
}

// Firebug fake API...
//
if (typeof(console) == 'undefined') // NOTE: The console on Safari already exists.
    console = {};
if (typeof(console.debug) == 'undefined') 
    console.debug = function() {};
