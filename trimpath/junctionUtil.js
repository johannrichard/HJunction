/*
Namespace: TrimPath.junctionUtil
  Utility functions that can run either client-side or server-side.

Source:
  trimpath/junctionUtil.js

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
    var MANY_ZEROS = "000000000000000000";

    var copyRecordRE_id  = /_id$/;
    var copyRecordRE_at  = /_at$/;
    var isValidSQLNameRE = /^\w+$/;

    var junctionUtil = TrimPath.junctionUtil = {
        /*
        Function: safeEval
          A safer alternative to normal eval() that protects the caller's scope.
          Calling normal JavaScript eval() allows the evaluated string
          to access and pollute the scope of the caller.  
          Use safeEval() instead of eval() so that the evaluated
          string input cannot touch the calling function's scope.

        Example:
        > function() {
        >   var x = 123;
        >   safeEval('x = 256');
        >   // x is still 123 right nere
        > }

        Note:
        To get results back from safeEval(), you sometimes need
        to wrap the string with parenthesis.  For example...
        > var val = safeEval('(' + someJsonString + ')');

        To evaluate the creation of a new function, 
        you may have to assign the function to temporary variable and
        return the variable value.  This seems required for Internet Explorer,
        and the technique works for all other browsers, too.
        For example...
        > var funcStr = 'var a_temp_name = function() { ' + funcBody + ' }; ' +
        >               'a_temp_name';
        > var func = safeEval(funcStr);

        _TODO_: 
        Need try out new Function( funcBody ) and see if that works with safeEval().

        Parameters:
          str - The string of JavaScript to be evaluated.

        Returns:
          The same as whatever normal eval() would return.
        */
        safeEval : safeEval,

        /*
        Function: safeParseInt
          A wrapper around parseInt() that returns a defaultValue
          if the input string cannot be parsed.  Often used to
          parse user input.

        Example:
        > var maxResults = TrimPath.junctionUtil.safeParseInt(req['maxResults'], 50);

        Parameters:
          str - The string to parse.
          defaultValue - Optional.  
                         The default value for defaultValue is to 0.

        Returns:
          An integer or defaultValue.  Never returns NaN.
        */
        safeParseInt : function(str, defaultValue) {
            var result = parseInt(str, 10);
            if (isNaN(result) == true)
                return defaultValue || 0;
            return result;
        },

        /*
        Function: safeParseFloat
          A wrapper around parseFloat() that returns a defaultValue
          if the input string cannot be parsed.  Often used to
          parse user input.

        Example:
        > var price = TrimPath.junctionUtil.safeParseFloat(req['price'], 10.0);

        Parameters:
          str - The string to parse.
          defaultValue - Optional.  
                         The default value for defaultValue is to 0.0.

        Returns:
          A number or defaultValue.  Never returns NaN.
        */
        safeParseFloat : function(str, defaultValue) {
            var result = parseFloat(str);
            if (isNaN(result) == true)
                return defaultValue || 0.0;
            return result;
        },

        /*
        Function: upperFirst
          Capitalizes the first character in a string. 
          Uses String.toUpperCase() on the first character.

          Using String.toUpperCase() directly, in contrast, performs uppercase conversion
          on all letters in a string.

        Example:
        > junctionUtil.upperFirst('hello world') ==> 'Hello world'
        > 'hello world'.toUpperCase() ==> 'HELLO WORLD'

        Parameters:
          str - The string to capitalize.

        Returns:
          A string whose first letter is capitalized.
        */
        upperFirst : function(str) {
            return str.charAt(0).toUpperCase() + str.substring(1);
        },

        /*
        Function: lowerFirst
          Uncapitalizes the first character in a string. 
          Uses String.toLowerCase() on the first character.
          
          Using String.toLowerCase() directly, in contrast, performs lowercase conversion
          on all letters in a string.

        Parameters:
          str - The string to uncapitalize.

        Returns:
          A string whose first letter is uncapitalized.
        */
        lowerFirst : function(str) {
            return str.charAt(0).toLowerCase() + str.substring(1);
        },

        /*
        Function: encodeAngles
          Converts < and > characters to HTML entities (&lt; and &gt;).
          The reverse of TrimPath.junctionUtil.decodeAngles().

        Parameters:
          str - A string to convert.

        Returns:
          A string that safely represents < and > in HTML.
        */
        encodeAngles : function(str) {
            return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        },

        /*
        Function: decodeAngles
          Converts HTML entities (&lt; and &gt;) to < and >.
          The reverse of TrimPath.junctionUtil.encodeAngles().

        Parameters:
          str - A string to convert.

        Returns:
          A string with HTML angle characters replaced by < and >.
        */
        decodeAngles : function(str) {
            return str.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        },

        /*
        Function: encodeQuotes
          Backslashes single quotes (' becomes \') and converts
          double quotes (") to the &quot; HTML entity.  
          You can use TrimPath.junctionUtil.encodeQuotes() to help 
          dynamically construct inline JavaScript DHTML event handlers.

        Parameters:
          str - A string to convert.

        Returns:
          A converted string.
        */
        encodeQuotes : function(str) { 
            return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        },

        /* Function: escape
          Converts &, <, >, " characters into HTML entity markup.
          Used to prevent JavaScript injection attacks when displaying data input from the user.

        Parameters:
        - s - A string to convert.

        Returns:
          An entitized string.
        */
        escape : function(s) { 
            return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, '&quot;'); 
        },

        /*
        Function: leftZeroPad
          Adds leading zero's (0's) as a prefix to a number or string.
          This function is most often used to provide prettier formatted
          output to display to end-users.

        - leftZeroPad(1, 3)    ==> 001
        - leftZeroPad(12, 3)   ==> 012
        - leftZeroPad(1234, 3) ==> 1234

        Parameters:
          val - A number or string to prefix with 0's.
          minLength - The minimum left of the resulting string.

        Returns:
          A string whose length >= minLength.
        */
        leftZeroPad : function(val, minLength) {
            if (typeof(val) != "string")
                val = String(val);
            if (val.length >= minLength)
                return val;
            return (MANY_ZEROS.substring(0, minLength - val.length)) + val;
        },

        /*
        Function: toLocalDateString
          Formats a Date as either 'YYYY/MM/DD' or 'YYYY/MM/DD hh:mm:ss'.
          The Date information is returned in local timezone.  
          The returned string is also parsable by the JavaScript Data
          object constructor.

        Example:
        > var dateStr = junctionUtil.toLocalDateString(aDateObj);
        > var date = new Date(dateStr); 
        > // Note: date.getTime() might not equal aDateObj().getTime()
        > // because of the loss of subsecond/millisecond time information.        

        Parameters:
          date - A Date object or a String that's parsed with parseDateString().
                 If null, toLocalDateString() will output the current date/time.
          withTime - A boolean, true to add hh:mm:ss to the return value.

        Returns:
          A string, suitable for display or sorting.  
          Or, the empty string ("") if there's a date parsing error.
        */
        toLocalDateString : function(date, withTime) {
            if (typeof(date) == "string") {
                date = junctionUtil.parseDateString(date);
                if (date == null)
                    return "";
            }
            date = date || new Date();
            var leftZP = junctionUtil.leftZeroPad;
            var result = [ leftZP(date.getFullYear(), 4), '/', 
                           leftZP(date.getMonth() + 1, 2), '/',
                           leftZP(date.getDate(), 2) ];
            if (withTime == true) {
                result.push(' ');
                result.push(leftZP(date.getHours(), 2));
                result.push(':'); 
                result.push(leftZP(date.getMinutes(), 2));
                result.push(':');
                result.push(leftZP(date.getSeconds(), 2));
            }
            return result.join('');
        },

        /*
        Function: toUTCDateString
          Formats a Date as either 'YYYY/MM/DD' or 'YYYY/MM/DD hh:mm:ss'.
          The Date information is returned in UTC timezone.  
          The returned string is also parsable by the JavaScript Data
          object constructor.

        Example:
        > var dateStr = junctionUtil.toUTCDateString(aDateObj);
        > var date = new Date(dateStr); 
        > // Note: date.getTime() might not equal aDateObj().getTime()
        > // because of the loss of subsecond/millisecond time information
        > // and timezone differences.

        Parameters:
          date - A Date object or a String that's parsed with parseDateString().
                 If null, toUTCDateString() will output the current date/time.
          withTime - A boolean, true to add hh:mm:ss to the return value.

        Returns:
          A string, suitable for display or sorting.  
          Or, the empty string ("") if there's a date parsing error.
        */
        toUTCDateString : function(date, withTime) {
            if (typeof(date) == "string") {
                date = junctionUtil.parseDateString(date);
                if (date == null)
                    return "";
            }
            date = date || new Date();
            var leftZP = junctionUtil.leftZeroPad;
            var result = [ leftZP(date.getUTCFullYear(), 4), '/', 
                           leftZP(date.getUTCMonth() + 1, 2), '/',
                           leftZP(date.getUTCDate(), 2) ];
            if (withTime == true) {
                result.push(' ');
                result.push(leftZP(date.getUTCHours(), 2));
                result.push(':'); 
                result.push(leftZP(date.getUTCMinutes(), 2));
                result.push(':');
                result.push(leftZP(date.getUTCSeconds(), 2));
            }
            return result.join('');
        },

        /*
        Function: toSQLDateString
          Formats a Date as a database-friendly ISO-8601
          'YYYY-MM-DD hh:mm:ssZ' string, such as '2004-10-24 01:02:35Z'.  
          This format is amenable to string based sorting and comparison.
          The Date information is returned in UTC timezone.
          The UTC conversion is based on the philosophy that all dates 
          stored in the database should be in the same timezone for 
          easy comparability.  In this, we favor UTC (or Z) timezone.

        Notes:
          The output of this function is not directly parsable by
          using the JavaScript Date object constructor.  For
          example, the following will not work well...

          > var aSQLDateString = junctionUtil.toSQLDateString(aDateObject);
          > var date2 = new Date(aSQLDateString);
          > // Unfortunately, date2.getTime() == NaN

          Instead, use TrimPath.junctionUtil.parseDateString(),
          which can parse both SQL formatted and local formatted 
          date/time strings.  For example...

          > var date3 = junctionUtil.parseDateString(aSQLDateString);

          Note that date3.getTime() might not equal aDateObject.getTime(),
          due to the loss of subsecond (millisecond) information.

          The developer may wish to use toLocalDateString() to 
          format the database-friendly date/time string into
          the user's local timezone for display.  For example...

          > var aLocalDateString = junctionUtil.toLocalDateString(aSQLDateString);

        Parameters:
          date - A Date object.  If null, the current date/time is used.

        Returns:
          A string, suitable for display or sorting.
        */
        toSQLDateString : function(date) {
            var pad = junctionUtil.leftZeroPad;
            date = date || new Date();
            return [
                pad(date.getUTCFullYear(), 4),  '-', 
                pad(date.getUTCMonth() + 1, 2), '-',
                pad(date.getUTCDate(), 2),      ' ', 
                pad(date.getUTCHours(), 2),     ':',
                pad(date.getUTCMinutes(), 2),   ':',
                pad(date.getUTCSeconds(), 2),   'Z'
            ].join('');
        },

        /*
        Function: parseDateString
          Parses a string into a Date object, especially useful
          for handling the ISO-8601 date/time format generated 
          by toSQLDateString().

          In contrast, a direct "new Date(str)" attempt at parsing 
          would fail for a ISO-8601 style of date/time format.

        Parameters:
          s - A string to parse.  If s is null, the function returns null.
          optionalIgnoreTime - Optional, defaults to false.
          
        Example:
        > var d = TrimPath.junctionUtil.parseDateString('2007-01-31');
        > var d = TrimPath.junctionUtil.parseDateString('2007-01-31 15:54:50Z');
        > var d = TrimPath.junctionUtil.parseDateString('2007-01-31 15:54:50Z', false); // Equals previous line.
        > var d = TrimPath.junctionUtil.parseDateString('2007-01-31 15:54:50Z', true);

        Returns:
          A Date object or null if parsing failed.
        */
        parseDateString : function(s) { // Parses JS dates and SQL dates, which
            if (s != null &&            // came from toLocal/SQLDateString().
                s.length > 0) {         // For example, date format could be YYYY-MM-DD HH:MM:SSZ
                s = s.split(' ');
                
                var ymd = [];
                if (s[0].indexOf('-') >= 0)
                    ymd = s[0].split('-');
                else if (s[0].indexOf('\/') >= 0)
                    ymd = s[0].split('/');
                    
                var hms = [];
                var hasTime = s[1] != null && s[1].length > 0;
                if (hasTime) {
                    hms = s[1].split(':');
                    if (hms[2])
                        hms[2] = hms[2].replace(/Z/, '');
                    else {
                        var localDate = new Date();
                        var localTime = localDate.toTimeString();
                            localTime = localTime.split(' ');
                        hms[2] = localTime[0];
                   }
                }

                if (!hasTime || s[1] == '00:00:00Z') {
                    var lt = new Date();
                    var d_obj = new Date(ymd[0], (ymd[1] -1), ymd[2], lt.getHours(), lt.getMinutes(), lt.getSeconds());
                } 
                else {
                    var d_obj = new Date(Date.UTC(ymd[0], (ymd[1] -1), ymd[2], hms[0], hms[1], hms[2]));
                }                  

                if (d_obj != null && isNaN(d_obj.getTime()) == false)
                    return d_obj;
            }
            return null;
        },

        prepSQLParams : function(sqlParams) {
            if (sqlParams != null) {
                for (var i = 0; i < sqlParams.length; i++) {
                    if (sqlParams[i] instanceof Date)
                        sqlParams[i] = junctionUtil.toSQLDateString(sqlParams[i]);
                }
            }
            return sqlParams;
        },
        isValidSQLName : function(name) {
            return (name.match(isValidSQLNameRE) != null);
        },
        ensureValidSQLName : function(name) {
            if (junctionUtil.isValidSQLName(name) == false)
                throw new Error('invalid SQL name: ' + name);
        },

        /*
        Function: getMapKeys
          Returns all the keys of an object or map.

        Example:
        > var someObj = { a: 1, b: 2, c: 3 };
        > var keys = TrimPath.junctionUtil.getMapKeys(someObj);
        > // keys == ['a', 'b', 'c'];

        Parameters:
          map - The object or map.

        Returns:
          An array of strings.
        */
        getMapKeys : function(map, optTestProperty) {
            var result = [];
            for (var k in map) 
                if ((map[k] != null) && 
                    (optTestProperty == null ||
                     map[k][optTestProperty] != null))
                    result.push(k);
            return result;
        },

        /*
        Function: setMapTreeValue
          Given a hierarchical map of maps (a tree of map objects),
          sets a leaf value in the tree given a path that looks like
          'key1[key2][key3]'.

        Example:
        > var map = { };
        > TrimPath.junctionUtil.setMapTreeValue(map, 'x', 123);
        > // map looks like { x: 123 }
        > TrimPath.junctionUtil.setMapTreeValue(map, 'a[b]', 100);
        > // map looks like { x: 123, a: { b: 100 } }
        > TrimPath.junctionUtil.setMapTreeValue(map, 'a[c]', 200);
        > // map looks like { x: 123, a: { b: 100, c: 200 } }
        > TrimPath.junctionUtil.setMapTreeValue(map, 'q[r][s]', 300);
        > // map looks like 
        > //   { x: 123, 
        > //     a: { b: 100, c: 200 },
        > //     q: { r: { s: 300 } } }

        Parameters:
          mapTree - The root map in a tree of maps.
          path - A string that looks like "key[key]*", such as
                 "shoppingCart[item_0][productId]" or
                 "blogPost[title]"
          value - Any value

        Returns:
          mapTree
        */
        setMapTreeValue : function(mapTree, path, value) { // Example path is 'order[customer][name]'.
            if (path != null) {
                var keys = path.replace(/\]/g, '').split('[');
                for (var k = 0; k < keys.length; k++) {
                    var key = keys[k];
                    if (k < keys.length - 1) {
                        if (mapTree[key] == null)
                            mapTree[key] = {};
                        mapTree = mapTree[key];                                
                    } else {
                        mapTree[key] = value;
                    }
                }
            }
            return mapTree;
        },

        copyRecord : function(src, dst) { // The dst is always a record-like object.
            for (var k in src) {
                if (typeof(src[k]) != 'function' &&
                    junctionUtil.isValidSQLName(k)) {
                    dst[k] = src[k];

                    // By convention, fields with "_id" suffix are integers.
                    if (k.match(copyRecordRE_id) != null &&
                        dst[k] != null)
                        dst[k] = junctionUtil.nanToNull(parseInt(dst[k], 10));

                    // By convention, fields with "_at" suffix are dates.
                    if (k.match(copyRecordRE_at) != null &&
                        src[k] != null) {
                        if (typeof(src[k]) == "string") {
                            var d = junctionUtil.parseDateString(src[k]);
                            if (d != null)
                                dst[k] = junctionUtil.toSQLDateString(d);
                            else
                                dst[k] = null;
                        } else if (src[k] instanceof Date)
                            dst[k] = junctionUtil.toSQLDateString(src[k]);
                    }
                }
            }
            return dst;
        },

        nanToNull : function(val) {
            return isNaN(val) ? null : val;
        },
        findRecordIndex : function(records, id) { // Returns the index of the record with the given id.
            if (records != null) {
                for (var i = 0; i < records.length; i++) {
                    if (records[i].id == id) 
                        return i;
                }
            }
            return -1;
        },
        callIfExists : function(obj, methodName, defaultResult) {
            if (obj[methodName] == null)
                return defaultResult;
            return obj[methodName]();
        },
        toArray : function(obj, length, filterFunc) {
            length = length || obj.length;
            var result = [];
            for (var i = 0; i < length; i++)
                if (filterFunc == null || filterFunc(obj[i]))
                    result.push(obj[i]);
            return result;
        },
        pushAttributes : function(array, attrs) {
            for (var k in attrs) {
                if (typeof(attrs[k]) != "function") {
                    array.push(' ');
                    array.push(k);
                    array.push('="');
                    array.push(attrs[k]);
                    array.push('"');
                }
            }
            return array;
        },

        /*
        Function: trim
          Removes leading and trailing whitespace from a string.

        Example:
        > var s = TrimPath.junctionUtil.trim(req['searchFirstName']);

        Parameters:
          str - A string, non-null.

        Returns:
          A string.
        */
        trim : function(str) {
            return str.replace(/^\s*(.*?)\s*$/, '$1'); // Trim whitespace.
        },

        /*
        Function: exceptionDetails
          Extracts useful debugging information out of an exception Error object.
          Often used in a the catch block of a try-catch construct, to display
          useful debugging information to the developer or user.

        Parameters:
          e - An Error object.

        Returns:
          A string containing information about the Error exception.
        */
        exceptionDetails : function(e) {
            return (e.toString()) + ";\n " +
                   (e.message) + ";\n " + 
                   (e.name) + ";\n " + 
                   (e.stack       || 'no stack trace') + ";\n " +
                   (e.description || 'no further description') + ";\n " +
                   (e.fileName    || 'no file name') + ";\n " +
                   (e.lineNumber  || 'no line number');
        },

        /*
        Function: toUrlParams
          Constructs a HTTP url query string from a map object.
          The key/value pairs of a map object are emitted 
          in HTTP url query string k1=v1&k2=v2&k3=v3 format.

          Only non-function values in the map are emitted.
          For example, for { x:123, factorial:function() {...} },
          the output would be 'x=123'.

          If a value of a key/value entry is an array, its key 
          is repeated for every entry in the value array.
          For example { items : [ 'book', 'car' ] } would become
          'items=book&items=car'.

        Parameters:
          map - A object treated as a map of key/value pairs.
          exceptMap - An optional map of key/boolean pairs.  
                      Any keys listed in the exceptMap are not emitted.
                      For example: toUrlParams( { name: 'Joe', password: 'foo' },
                      { password : true } ) will return just 'name=Joe'.

        Returns:
          A string usable as a as a url query string for HTTP requests.
        */
        toUrlParams : function(map, exceptMap) {
            // Construct a url query string from a map.
            //
            // TODO: Need to handle nested maps better?
            //
            var result = [];
            for (var k in map) {
                var val = map[k];
                if (typeof(val) != 'function' &&
                    (exceptMap == null || 
                     exceptMap[k] != true)) {
                    // TODO: Need URL encoding?
                    //
                    if (val instanceof Array) {
                        for (var i = 0; i < val.length; i++) {
                            result.push('&');
                            result.push(k);
                            result.push('=');
                            result.push(val[i]);
                        }
                    } else {
                        result.push('&');
                        result.push(k);
                        result.push('=');
                        result.push(val);
                    }
                }                             
            }
            result.shift(); // Get rid of first '&' char.
            return result.join('');
        },

        // Ex: urlForArgsPrep('orders', 'show', 123, { withTax : 1 });
        // Ex: urlForArgsPrep({ controllerName : 'orders', // optional, defaults to current defaultVals's controllerName.
        //                      actionName     : 'show',   // optional, defaults to current defaultVals's actionName.
        //                      objId          : 123,      // optional, defaults to current defaultVals's objId.
        //                      withTax : 1 });
        //
        urlForArgsPrep : function(controllerNameIn, actionNameIn, objIdIn, args, defaultVals) {
            if (typeof(controllerNameIn) == 'object') { // Called with 2nd signature.
                args = controllerNameIn;
                if (args.controllerName == null &&
                    args.controller != null) {
                    args.controllerName = args.controller;
                    delete args.controller;
                }
                if (args.actionName == null &&
                    args.action != null) {
                    args.actionName = args.action;
                    delete args.action;
                }
                if (args.objId == null &&
                    args.id != null) {
                    args.objId = args.id;
                    delete args.id;
                }
                return junctionUtil.urlForArgsPrep(args.controllerName, args.actionName, args.objId, args);
            }

            defaultVals = defaultVals || {};

            args = args || {};
            args.controllerName = controllerNameIn || defaultVals.controllerName;
            args.actionName     = actionNameIn     || defaultVals.actionName;

            // Only set args.objId when explicitly given, and don't 
            // inherit from the defaultVals, so that we don't get
            // strange requests like for /orders/index/123.
            //
            if (objIdIn != null)
                args.objId = objIdIn;

            return args;
        },

        addCamelCaseAliases : function(obj) {
            // Make obj.foo_bar_baz() api also available as obj.fooBarBaz().
            //
            for (var k in obj) {
                if (typeof(obj[k]) == 'function') {
                    var kParts = k.split('_');
                    if (kParts.length > 1) {
                        for (var i = 1; i < kParts.length; i++)
                            kParts[i] = junctionUtil.upperFirst(kParts[i]);
                        var alias = kParts.join('');
                        if (obj[alias] == null)
                            obj[alias] = obj[k];
                    }
                }
            }
            return obj;
        },

        /*
        Function: syncAllowedForTable
          Returns whether a database table is a possible
          candidate for synchronization between client-side and 
          server-side databases.  This function does not check
          the database contents, but just looks at database
          schema naming conventions.  By convention, tables that have a
          suffix of 'Local' are not synchronized (like 'PreferenceLocal').  
          Also the table must also have certain tracking columns
          that are required by Junction's synchronization protocol.
          These tracking columns are automatically added to the table
          if you created the table using the migration createStandrdTable() 
          function.

        Parameters:
          tableName - A string table name.  
                      For example, 'Product', 'Category', or 'PreferenceLocal'.
          schema - A db schema hash/map object, such as from 
                   calling TrimPath.junction.env.db.getSchema().

        Returns:
          A boolean true if the table with name of tableName 
          a candidate for synchronization.
        */
        syncAllowedForTable : function(tableName, schema) {
            return (tableName != null &&
                    tableName.search(/Local$/) < 0 &&
                    schema != null &&
                    schema[tableName].id != null &&
                    schema[tableName].created_at != null &&
                    schema[tableName].updated_at != null &&
                    schema[tableName].active != null &&
                    schema[tableName].version != null &&
                    schema[tableName].id_start != null &&
                    schema[tableName].id_start_db != null &&
                    schema[tableName].synced_at != null);
        },

        createDbObj : function(conn, info, trackChanges, readOnly) { // Wraps the conn with higher-level methods.
            var dbIdent  = null;
            var dbSchema = null;
            var txDepth  = 0;

            // Track what we think our current version should be,
            // in case another browser window/tab might migrates
            // it out from underneath of us.
            //
            var version = null;                  

            var readMeta = function(tableName, field, sort) {
                conn.execute('CREATE TABLE IF NOT EXISTS ' + tableName + ' (' + field + ' varchar(100), updated_at DATETIME)');
                var r = conn.executeToRecords('SELECT * FROM ' + tableName + 
                                              ' ORDER BY ' + field + ' ' + sort)[0];
                if (r != null)
                    return r[field];
                return null;
            }

            var readIdent = function() {
                return readMeta('meta_ident', 'ident', 'DESC');
            }
            var readVersion = function() {
                return readMeta('meta_version', 'version', 'DESC');
            }
            var readLastId = function() {
                return readMeta('meta_last_id', 'last_id', 'ASC');
            }
            var readSyncedAt = function() {
                return readMeta('meta_synced_at', 'synced_at', 'ASC');
            }

            var dbObj = {
                getInfo : function() { return info; },
                getIdent : function() { 
                    if (dbIdent == null) {
                        dbIdent = readIdent();
                        if (dbIdent == null ||
                            dbIdent.length <= 0) {
                            dbIdent = (new Date().getTime() - new Date('2007/06/10').getTime()) +
                                      '-' + Math.floor(Math.random() * 100000);
                            conn.execute("INSERT INTO meta_ident (ident, updated_at) VALUES (?, ?)", 
                                         [ dbIdent, junctionUtil.toSQLDateString(new Date()) ]);
                        }
                    }
                    return dbIdent; 
                },
                getVersion : function()  { 
                    return readVersion() || 0;
                },
                setVersion : function(v, cacheOnly) { 
                    if (cacheOnly == true) { // Only set our cache/snapshot of what we think the 
                        version = v;         // version is, without touching the real persisted info.
                        return;              // See db.ensureVersion() which uses this cache/snapshot.
                    }

                    dbObj.transact(function() {
                        conn.execute("DELETE FROM meta_version");
                        conn.execute("INSERT INTO meta_version (version, updated_at) VALUES (?, ?)", 
                                     [ v, junctionUtil.toSQLDateString(new Date()) ]);

                        version  = v;
                        dbSchema = null;
                    });
                },
                ensureVersion : function() {
                    if (readOnly == true)
                        return;

                    var v = readVersion();
                    if ((v || 0) != (version || 0))
                        throw new Error("meta_version mismatch; expected: " + version + 
                                        " got: " + v);
                    return v;
                },
                getSyncedAt : function() { 
                    return readSyncedAt();
                },
                setSyncedAt : function(v) {
                    if (readOnly == true)
                        return;

                    dbObj.transact(function() {
                        conn.execute("DELETE FROM meta_synced_at");
                        if (v != null)
                            conn.execute("INSERT INTO meta_synced_at (synced_at, updated_at) VALUES (?, ?)", 
                                         [ v, junctionUtil.toSQLDateString(new Date()) ]);
                    });
                },
                flushCaches : function() {
                    dbSchema = null;
                },
                getSchema : function(force) {
                    if (force == true ||
                        dbSchema == null) {
                        dbSchema = {};

                        var sm = conn.executeToRecords("SELECT * FROM sqlite_master WHERE type = 'table'");
                        for (var i = 0; i < sm.length; i++) {
                            if (sm[i].type == 'table' &&
                                sm[i].name.search(/^(sqlite|meta|changes)_/i) < 0) {
                                dbSchema[sm[i].name] = {};

                                var cols = sm[i].sql.match(/\((.+)\)/)[1].split(',');

                                // Ex cols: ['col1 integer', ' col2 text', ' col3 text']
                                //
                                for (var j = 0; j < cols.length; j++) {
                                    var full = junctionUtil.trim(cols[j]);
                                    var col  = full.split(' ');
                                    dbSchema[sm[i].name][col[0]] = {
                                        type : col[1],
                                        full : full
                                    }                                    
                                }
                            }
                        }
                    }

                    return dbSchema;
                },
                changesFor : function(tableName) { 
                    var rm = {};
                    if (trackChanges == true) {
                        for (var rs = conn.executeToRecords('SELECT * FROM changes_' + tableName),
                                 i = 0; i < rs.length; i++)
                            rm[rs[i].id] = rs[i].op;
                    }
                    return rm;
                },
                clearChangesFor : function(tableName, id) {
                    if (readOnly == true)
                        return;

                    if (trackChanges == true) {
                        var sql = 'DELETE FROM changes_' + tableName + ' WHERE id=?';
                        var arr = [ id ];
                        for (var i = 2; i < arguments.length; i++) {
                            if (arguments[i] != null) {
                                sql = sql + ' OR id=?';
                                arr.push(arguments[i]);
                            }
                        }
                        conn.execute(sql, arr);
                    }
                },
                transact : function(fn) {
                    if (txDepth <= 0)
                        conn.execute('begin');
                    txDepth = txDepth + 1;
                    try {
                        fn();

                        if (readOnly == true) {
                            conn.execute('rollback');
                        }
                    } catch (e) {
                        if (txDepth > 0)
                            conn.execute('rollback');
                        txDepth = 0;
                        throw e;
                    }
                    txDepth = Math.max(0, txDepth - 1);
                    if (txDepth <= 0)
                        conn.execute('commit');
                },
                execute : function(sql, sqlParams) { 
                    return conn.executeToRecords(sql, sqlParams);
                },
                findById : function(tableName, id) {
                    return conn.executeToRecords("SELECT * FROM " + tableName + " WHERE id=?", [ id ])[0];
                },
                save : function(tableName, obj) {
                    if (readOnly == true)
                        throw new Error('cannot save, db is readOnly');

                    var isNewRec = obj.isNewRecord();
                    if (isNewRec) {
                        obj.id = dbObj.genMinId();
                        obj.id_start    = obj.id;
                        obj.id_start_db = dbObj.getIdent();
                    }

                    dbObj.saveRecord(tableName, obj);

                    conn.recordChanged(tableName, obj.id, 's'); // The 's' is for save.
                    return true;
                },
                saveRecord : function(tableName, rec, colInfos) {
                    if (readOnly == true)
                        throw new Error('cannot saveRecord, db is readOnly');

                    var colInfos = colInfos || dbObj.getSchema()[tableName];
                    var colNames = [];
                    var colQVals = [];
                    var colVals  = [];

                    for (var colName in colInfos) {
                        colNames.push(colName);
                        colQVals.push('?');
                        if (rec[colName] == null)
                            colVals.push(null);
                        else
                            colVals.push(rec[colName]);
                    }

                    var sql = 'INSERT OR REPLACE INTO ' + tableName + 
                              ' (' + colNames.join(',') + 
                              ' ) VALUES ( ' + colQVals.join(',') + ')';
                              
                    conn.execute(sql, colVals);
                },
                destroy : function(tableName, id) {
                    if (readOnly == true)
                        throw new Error('cannot destroy, db is readOnly');

                    dbObj.destroyRecord(tableName, id);
                    conn.recordChanged(tableName, id, 'd'); // The 'd' is for delete/destory.
                },
                destroyRecord : function(tableName, id) {
                    if (readOnly == true)
                        throw new Error('cannot destroyRecord, db is readOnly');

                    conn.execute("DELETE FROM " + tableName + " WHERE id = ?", [ id ]);
                },
                genMinId : function() { // Grows monotonically negative.
                    if (readOnly == true)
                        throw new Error('cannot genMinId, db is readOnly');

                    var id = null;
                    dbObj.transact(function() {
                        id = parseInt(readLastId() || 0, 10) - 1;
                        conn.execute("DELETE FROM meta_last_id");
                        conn.execute("INSERT INTO meta_last_id (last_id, updated_at) VALUES (?, ?)", 
                                     [ id, junctionUtil.toSQLDateString(new Date()) ]);
                    });
                    return id;
                },
                getDataAsMap : function() {
                    var map = {};
                    var schema = dbObj.getSchema();
                    for (var tableName in schema) {
                        map[tableName] = conn.executeToRecords('SELECT * FROM ' + tableName);
                        if (trackChanges == true)
                            map['changes @@ ' + tableName] = conn.executeToRecords('SELECT * FROM changes_' + tableName);
                    }                                
                    return map; // Keyed by table name. 
                },
                getDDL : function() {
                    if (readOnly == true)
                        throw new Error('cannot getDDL, db is readOnly');

                    // TODO: SQL-injection, especially on table names.
                    //
                    var tableDDL = {
                        // Takes additional, variable arguments of columns, like...
                        //   createTable('Product', column('name', 'string'), column('price', 'float'));
                        //
                        createTable : function(name) {
                            var cols = [];
                            for (var i = 1; i < arguments.length; i++)
                                cols.push(arguments[i].join(' '));
                            conn.execute('CREATE TABLE ' + name + ' (' + cols.join(', ') + ')');
                        },
                        dropTable : function(name) {
                            conn.execute('DROP TABLE ' + name);
                        },
                        renameTable : function(oldName, newName) {
                            conn.execute('ALTER TABLE ' + oldName + ' RENAME TO ' + newName);
                        }
                    }

                    var ddl = {
                        // Takes additional, variable arguments of columns, like...
                        //   createTable('Product', column('name', 'string'), column('price', 'float'));
                        //
                        create_table : function(name) {
                            tableDDL.createTable.apply(null, arguments);
                            if (trackChanges == true)
                                tableDDL.createTable('changes_' + name, 
                                    ['id', 'integer', 'primary key not null'],
                                    ['op', 'text']);
                        },
                        drop_table : function(name) {
                            tableDDL.dropTable(name);
                            if (trackChanges == true)
                                tableDDL.dropTable('changes_' + name);
                        },
                        rename_table : function(oldName, newName) {
                            tableDDL.renameTable(oldName, newName);
                            if (trackChanges == true)
                                tableDDL.renameTable('changes_' + oldName, 
                                                     'changes_' + newName);
                        },
                        create_column : function(tableName, columnName, type) {
                            conn.execute('ALTER TABLE ' + tableName + ' ADD COLUMN ' + columnName + ' ' + type);
                        },
                        rename_column : function(tableName, columnName, newColumnName) {
                            throw new Error("renameColumn unimplemented");
                        },
                        drop_column : function(tableName, columnName) {
                            // Hack via http://www.sqlite.org/faq.html
                            // TODO: Indexes get messed up here.
                            //
                            dbObj.transact(function() {
                                var bkName   = 'bk_' + tableName;
                                var colNames = [];
                                var colDefs  = [];
                                var colMap   = dbObj.getSchema(true)[tableName];
                                if (colMap != null) {
                                    for (var colName in colMap) {
                                        colNames.push(colName);
                                        colDefs.push(colMap[colName].full);
                                    }
                                    colNames = colNames.join(', ');
                                    colDefs  = colDefs.join(', ');

                                    // TODO: Can we just use a table rename here?
                                    //
                                    conn.execute("CREATE TABLE " + bkName + " (" + colDefs + ")");
                                    conn.execute("INSERT INTO " + bkName + " SELECT " + colNames + " FROM " + tableName);
                                    conn.execute("DROP TABLE " + tableName);
                                    conn.execute("CREATE TABLE " + tableName + " (" + colDefs + ")");
                                    conn.execute("INSERT INTO " + tableName + " SELECT " + colNames + " FROM " + bkName);
                                    conn.execute("DROP TABLE " + bkName);
                                }
                            });
                        },
                        // Add a new index with the name of the column, or indexName (if specified) 
                        // on the column(s). Specify an optional indexType (e.g. UNIQUE).
                        create_index : function(tableName, columnNames, indexType, indexName) {
                            if ((columnNames instanceof Array) == false)
                                columnNames = [ columnNames ];

                            conn.execute('CREATE ' + (indexType || '') + 
                                         ' INDEX ' + indexName + 
                                         ' ON ' + tableName + ' (' + columnNames.join(',') + ')');
                        },
                        // Remove the index specified by indexName.
                        drop_index : function(tableName, indexName) {
                            conn.execute('DROP INDEX ' + indexName);
                        }
                    };

                    ddl.add_table     = ddl.create_table;
                    ddl.add_column    = ddl.create_column;
                    ddl.add_index     = ddl.create_index;
                    ddl.remove_table  = ddl.drop_table;
                    ddl.remove_column = ddl.drop_column;
                    ddl.remove_index  = ddl.drop_index;

                    return junctionUtil.addCamelCaseAliases(ddl);
                }
            };
            return dbObj;
        }
    };
    
    junctionUtil.parseSQLDateString = junctionUtil.parseDateString;
    
}) (function(evalExpr) { return eval(evalExpr); }); // The safeEval works in global scope.

/*
Copyright (c) 2002 JSON.org

Permission is hereby granted, free of charge, to any person obtaining a copy 
of this software and associated documentation files (the "Software"), to deal 
in the Software without restriction, including without limitation the rights 
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
copies of the Software, and to permit persons to whom the Software is 
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

The Software shall be used for Good, not Evil.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

TrimPath.junctionUtil.toJsonString = function(arg, prefix) { // Put into TrimPath namespace to avoid version conflicts.
    return TrimPath.junctionUtil.toJsonStringArray(arg, [], prefix).join('');
}

TrimPath.junctionUtil.toJsonStringArray = function(arg, out, prefix) {
    out = out || new Array();
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
                    TrimPath.junctionUtil.toJsonStringArray(arg[i], out, prefix != null ? prefix + "  " : null);
                }
                out.push(']');
                return out;
            } else if (typeof arg.toString != 'undefined') {
                out.push('{');
                var first = true;
                var nextPrefix = prefix != null ? prefix + "    " : null;
                for (var i in arg) {
                    var curr = out.length; // Record position to allow undo when arg[i] is undefined.
                    if (first) {
                        if (prefix != null)
                            out.push(' ');
                    } else {
                        out.push(',\n');
                        if (prefix != null)
                            out.push(prefix);
                    }
                    TrimPath.junctionUtil.toJsonStringArray(i, out, nextPrefix);
                    if (prefix == null)
                        out.push(':');
                    else
                        out.push(': ');
                    TrimPath.junctionUtil.toJsonStringArray(arg[i], out, nextPrefix);
                    if (out[out.length - 1] == u)
                        out.splice(curr, out.length - curr);
                    else
                        first = false;
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

///////////////////////////////////////////////

/*
Section: ajax
*/

/*
Function: ajax
  An alias for TrimPath.ajax() function.
*/
/*
Function: TrimPath.ajax
  Tries to service an Ajax call locally before sending a true, remote Ajax request.

  This function tries to process an 'ajax' call with the in-browser, client-side 
  Junction app server, if it's available.  Otherwise, this function will default
  to sending a true, remote XMLHttpRequest to a remote server.

Parameters:
- url - A string of the URL to request.
- method - A string of 'get' or 'post'.
- req - A hash of request key/value parameters.
- callback - A success callback function, that takes a string parameter.
*/
//
TrimPath.ajax = function(url, method, req, callback) {
    // Try servicing the request locally with the client-side 
    // Junction 'app-server', if available.
    //
    if (TrimPath.junctionClient[method.toLowerCase() + 'Async'](
            req.controllerName,
            req.actionName, 
            req.objId, 
            req, 
            { onComplete : callback }) == true) {
        // Client-side unavailable, so need to go to the 
        // remote server with a real Ajax call.  
        //
        TrimPath.ajaxRemote(url, method, req, callback);
    }
}

TrimPath.ajaxRemote = function(url, method, req, callback) {
    // Here, we wrap around jQuery, but if we liked 
    // Prototype, Dojo, Ext, or other libraries we'd just make 
    // the change or addition here.
    //
    // TODO: Make this more easily pluggable for other libraries, one day.
    //
    if (typeof($) != 'undefined' &&
        typeof($.ajax) == 'function')
        $.ajax({ type : method.toUpperCase(),
                 url  : url,
                 data : req,
                 success : callback });
}

////////////////////////////////////////

if (TrimPath.junctionClient == null) { // No-op implementation useful for onclick/onsubmit event handlers
    TrimPath.junctionClient = {        // that will let the browser do its normal processing.
        get        : function() { return true; },
        getAsync   : function() { return true; },
        post       : function() { return true; },
        postAsync  : function() { return true; },
        postForm   : function() { return true; },
        formToReq  : function() {}
    }
}
