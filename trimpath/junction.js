/*
Namespace: TrimPath.junction

Source: 
  trimpath/junction.js

Release:
  1.1.22

Copyright:
  copyright (c) 2005 - 2008 Steve Yen, TrimPath.

License:
  dual licensed GNU General Public License 2.0 and 
                Apache Public License 2.0
*/
if (typeof(TrimPath) == 'undefined')
    TrimPath = {};

(function(safeEval) {
    var junctionUtil = TrimPath.junctionUtil;

    TrimPath.junctionCreate = function(env) {
        var modelInfos   = {};   // Keyed by model name, like 'InvoiceLine'.
        var lastFormArgs = null; // For startFormTag() and the other form tag helpers.

        var getFunc_cache = {};
        var getFunc = function(funcName) {
            try { return safeEval(funcName); } catch (e) {};
            return null;

            // No actual caching, because it prevents in-browser app development.
            // if (getFunc_cache[funcName] == null)
            //     getFunc_cache[funcName] = safeEval(funcName);
            // return getFunc_cache[funcName];
        }

        var findParams = function(params) {
            if (typeof(params) == 'string')
                return { conditions : [ params ] };
            if (params instanceof Array)
                return { conditions : params };
            params = params || {};
            params.conditions = findArray(params.conditions);
            return params;
        }

        var findArray = function(a) { // The a might be a params.conditions.
            if (a == null)
                return [];
            if (a instanceof Array)
                return a;
            return [ a ];
        }

        var findSql = function(params, modelInfo) {
            var sql = [ "SELECT ",
                        (params.from || modelInfo.tableName), ".* FROM ",
                        (params.from || modelInfo.tableName), 
                        conditionsPrep(params.conditions[0]) ];

            if (params.order != null)
                sql.push(' ORDER BY ' + params.order);

            if (params.limit != null) {
                sql.push(' LIMIT ');
                sql.push(params.offset || '0');
                sql.push(', ');
                sql.push(params.limit);
            }

            return sql.join('');
        }

        var conditionsPrep = function(conditions) {
            if (conditions == null)
                return "";
            if (conditions.slice(0, 9) == "ORDER BY ")
                return " " + conditions;
            return " WHERE " + conditions;
        }

        var junction = junctionUtil.addCamelCaseAliases({

            /*
            Obj: env
              The env object provides a runtime-environment-specific 
              collection of functions and information that the 
              Junction system requires to work.

              Application developers can access the TrimPath.junction.env
              object to check for system/runtime level information.

            Examples:
              var isClientSide = TrimPath.junction.env.type == 'client';
              var dbSchema = TrimPath.junction.env.db.getSchema();
            */
            env : env,

            /*
            Function: syncUp ()
              Requests an asynchronous synchronization of the
              local database with the server database.  This is
              a no-op if invoked in a server runtime environment.

              If too many syncUp()'s are requested in a short 
              time period, the system might ignore the requests. 
            */
            syncUp : function() { return env.syncUp(true); },

            /*
            Function: isOnline ()
              Returns whether a client-side Junction environment
              is online (has connectivity to a server).  A server-side
              Junction environment always returns true for this
              function.  

              The returned value should be treated as a hint,
              as network connectivity events are fundamentally
              non-synchronous.

            Returns:
              A boolean true if the client-side system can 
              contact the server, or true if the system is
              running on the server environment.
            */
            isOnline  : function() { return env.isOnline(); },

            /*
            Function: dbExecute (sql, optParams)
              Executes a SQL query against the local application database.
              In a client-side web browser environment, the local 
              database might be either a Google Gears RDBMS (sqlite)
              or an in-memory simple RDBMS (TrimQuery).
              In the server side, the RDBMS is server-environment 
              and configuration dependent.

              To achieve highest compatibility to running in all 
              environments, the SQL passed into dbExecute() should 
              be the subset of SQL SELECT query syntax that TrimQuery 
              supports, as TrimQuery supports the fewest features.

            Examples:
            > var rs = junction.dbExecute('SELECT Task.* FROM Task WHERE Task.due_at = ?'
            >   [ juntionUtil.toSQLDateString(new Date()) ]);
            >
            > var rs = junction.dbExecute('SELECT Person.* FROM Person WHERE Person.name = ?'
            >   [ 'Alfred' ]);
            >
            > var rs = junction.dbExecute('SELECT Person.* FROM Person WHERE Person.name IS NOT NULL');
            >
            > for (var i = 0; i < rs.length; i++)
            >   alert(rs[i].name);

            Paramseters:
              sql - A SQL SELECT query string, with optional 
                    positional ? placeholders
              optParams - An optional array of values, with one value
                          that will be substituted for each placeholder
                          character in the sql string.

            Returns:
              An array of records; possibly an empty array [].  
              Each record object is a map of where keys are column names
              and values are strings or numbers.
            */
            dbExecute : function(sql, optParams) { return env.db.execute(sql, optParams); },

            ///////////////////////////////////////////////

            /*
            Function: scaffold (controllerFunc, modelName)
              Provides some simple Controller action methods for a given Model
              for increased developer productivity.

              The scaffold() method adds some rudimentary 
              action methods (index, show, update, newInstance, create, destroy)
              to a given Controller.  This is useful for when
              starting or prototyping a new application.  The scaffold()
              method is often less used as an application's codebase matures, 
              as application code usually becomes increasingly customized 
              with added application-specific security, error checking and 
              use-case workflow logic which scaffold() does not supply.

            Examples:
            > EmployeeController = function() {}
            > scaffold(EmployeeController, 'Employee');
            >
            > OrderLineController = function() {}
            > scaffold(OrderLineController, 'OrderLine');
            >
            > OrderLineController.prototype.show = function(req, res) {
            >   ... override the show() action method provided by scaffold()...
            > }

            Parameters:
              controllerFunc - A Controller function object.
              modelName - A string of the Model name.  For example, 'Employee', or 'OrderLine'.

            Returns:
              void.
            */
            scaffold : function(controllerFunc, modelName) { // The modelName is like 'InvoiceLine'.
                var controllerName = junctionUtil.lowerFirst(modelName);
                var templatePrefix = '/app/views/' + controllerName + '/';

                controllerFunc.prototype.index = function(req, res) {
                    var modelInfo = modelInfos[modelName];
                    var modelRecs = res[junctionUtil.lowerFirst(modelInfo.pluralName)] = modelInfo.func.findActive('all');

                    if (env.templateResolve(templatePrefix + 'index', res.getLocale()) == null) {
                        var h = [ '<h2>', modelName, ' List</h2>\n<ul>\n' ];
                        for (var i = 0; i < modelRecs.length; i++) {
                            h.push('<li>');
                            h.push(res.linkToLocal(modelRecs[i].id, controllerName, 'show', modelRecs[i].id));
                            h.push('</li>\n');
                        }
                        h.push('</ul>');
                        return res.renderText(h.join(''));
                    }
                }

                var simpleInstancePage = function(title, actionName, req, res, modelRec, footer) {
                    if (modelRec != null &&
                        env.templateResolve(templatePrefix + actionName, res.getLocale()) == null) {
                        var cols = env.db.getSchema()[modelName];
                        if (cols != null) {
                            title = title || [ modelName, ' ', res.linkToLocal(modelRec.id, controllerName, 'show', modelRec.id) ].join('');
                            var h = [ '<h2>', title, '</h2>\n',
                                      '<h3>', res.linkToLocal('Back to ' + modelName + ' list', controllerName, 'index'), '</h3>\n' ];
                            for (var col in cols) {
                                h.push('<p><label>');
                                h.push(col);
                                h.push('</label>: ');
                                if (actionName == 'show')
                                    h.push(junctionUtil.escape(modelRec[col]));
                                else
                                    h.push(res.textField(controllerName, col));
                                h.push('</p>');
                            }
                            if (actionName != 'show') {
                                h.push('<p>');
                                h.push(res.submitButton('go', 'OK'));
                                h.push('&nbsp;');
                                h.push(res.linkToLocal('Cancel', controllerName, 'index'));
                                h.push('</p>');
                            }
                            h.push(footer || '');
                            res.renderText(h.join(''));
                            return true;
                        }
                    }
                    return false;
                }

                controllerFunc.prototype.show = controllerFunc.prototype.edit = function(req, res) {
                    var modelInfo = modelInfos[modelName];
                    var modelRec  = res[junctionUtil.lowerFirst(modelInfo.name)] = modelInfo.func.findActive(req['objId']);
                    if (modelRec != null)
                        simpleInstancePage(null, req.actionName, req, res, modelRec);
                }
                controllerFunc.prototype.update = function(req, res) {
                    var modelInfo = modelInfos[modelName];
                    var key = junctionUtil.lowerFirst(modelInfo.name);
                    res[key] = modelInfo.func.findActive(req['objId']);
                    if (res[key].updateAttributes(req[key])) {
                        res.flash['notice'] = 'The ' + modelName + ' is updated.';
                        res.redirectToAction('show', res[key].id);
                    } else {
                        if (simpleInstancePage(null, 'edit', req, res, res[key]) == false)
                            res.renderAction('edit');
                    }
                }
                controllerFunc.prototype.newInstance = function(req, res) {
                    var modelInfo = modelInfos[modelName];
                    var modelInst = res[junctionUtil.lowerFirst(modelInfo.name)] = modelInfo.func.newInstance();
                    simpleInstancePage('Create a new ' + modelName, 
                                       'newInstance', req, res, modelInst);
                }
                controllerFunc.prototype.create = function(req, res) {
                    var modelInfo = modelInfos[modelName];
                    var key = junctionUtil.lowerFirst(modelInfo.name);
                    res[key] = modelInfo.func.newInstance(req[key]);
                    if (res[key].save()) {
                        res.flash['notice'] = 'The ' + modelName + ' is created.';
                        res.redirectToAction('show', res[key].id);
                    } else {
                        if (simpleInstancePage('Create a new ' + modelName, 
                                               'newInstance', req, res, res[key]) == false)
                            res.renderAction('newInstance');
                    }
                }
                controllerFunc.prototype.destroy = function(req, res) {
                    var modelInfo = modelInfos[modelName];
                    var obj = modelInfo.func.findActive(req['objId']);
                    if (obj != null) {
                        obj.deactivate();
                        res.flash['notice'] = 'The ' + modelName + ' is deleted.';
                    } else
                        res.flash['notice'] = 'We could not delete an unknown ' + modelName + '.';
                    res.redirectToAction('index');
                }
            },

            ///////////////////////////////////////////////

            /*
            Function: beforeFilter (controllerFunc, filterFunc)
              Appends a filter function to the 'before' filter chain of a Controller.
              The filter function is invoked before the action method of the
              Controller is invoked.  If the filter function returns the
              false boolean value, then further processing is halted (further
              filters and the action method are not invoked).

            The filter callback function takes, 3 parameters:
              - controller - the current controller instance
              - req - the current request object
              - res - the current response object

            For example:
            > InvoiceController = function() {}
            > beforeFilter(InvoiceController, function(controller, req, res) {
            >   // Check that user has access.
            >   // Call req.setLocale().
            > }

            Parameters:
            - controllerFunc - The Controller class constructor/function.
            - filterFunc - A filter callback function with the signature described above.

            Returns:
            The controllerFunc function parameter, which is useful for chainability.
            */
            //
            before_filter : function(controllerFunc, filterFunc) {
                controllerFunc._filters        = (controllerFunc._filters        || {});
                controllerFunc._filters.before = (controllerFunc._filters.before || []);
                controllerFunc._filters.before.push(filterFunc);
                return controllerFunc;
            },

            ///////////////////////////////////////////////

            /*
            Function: modelFor (modelName, func)
              An alias for the modelInit function.
            Deprecated:
              Please use the modelInit function.
            */
            /*
            Function: modelInit (modelName, func)
              Tells the Junction system that a given function/constructor
              represents a Model object.  Junction decorates the given 
              function/constructor with class methods such as finders
              and creators.  These class method decorations provide the 
              object-relational access to CRUD (create-retrieve-update-delete) 
              operations to the RDBMS.  

              For example, after calling modelInit() on a function/constructor, 
              you should use the _Model.newInstance()_ class method to create
              new, database-aware instances of the Model class, instead of
              calling _new Model()_ directly.

              See the <Model> section for information on these 
              class method decorations.

              Junction follows the Active Record design pattern of
              object-relational mapping, where one database table is mapped
              to a single Model class.

            Example:
            > OrderLine = function() {}
            >
            > modelInit('OrderLine');
            > OrderLine.belongsTo('Order');
            > OrderLine.belongsTo('Product');
            >
            > // Alternatively, you might do...
            >
            > OrderLine = function() {}
            >
            > with (modelInit('OrderLine')) {
            >   belongsTo('Order');
            >   belongsTo('Product');
            > }
            >
            > modelInit('OrderLine').belongsTo('Order');

            Parameters:
              modelName : A string name of the Model function/constructor in JavaScript.

            Returns:
              The Model constructor/function decorated with <Model Metadata> methods.
            */
            //
            model_init : function(modelName, func) {
                var modelInfo = modelInfos[modelName];
                if (modelInfo == null || 
                    modelInfo.func != getFunc(modelName)) {
                    modelInfo = modelInfos[modelName] = {
                        name        : modelName,
                        funcName    : modelName,
                        func        : func || getFunc(modelName),
                        tableName   : modelName,
                        pluralName  : modelName + 's',
                        hasOne      : {},
                        hasMany     : {},
                        belongsTo   : {},
                        validations : { save : [], create : [], update : [] }
                    }

                    /*
                    Section: Model Documentation
                      Junction follows the 'Active Record' design pattern
                      for object-relational mapping.  Each Model in the
                      Junction world maps to a single database table.

                      A Model's class name and table name should follow
                      a CamelCaseCaptialization format.  For example,
                      Order, OrderLine, Invoice, InvoiceLine, AccountTransaction.
                    
                    Example:
                    > Order = function() {};
                    >
                    > modelInit('Order')) {
                    > Order.belongsTo('Customer');
                    > Order.hasMany('OrderLines');
                    >
                    > // Alternative syntax...
                    >
                    > Order = function() {};
                    >
                    > with (modelFor('Order')) {
                    >    belongsTo('Customer');
                    >    hasMany('OrderLines');
                    > }
                    
                    In the above example, the Order function was 
                    decorated with a Model class API, via the 
                    modelFor() call.  Application code can then make 
                    calls on the Order such as...
                    > var expensiveOrders = Order.findActive('all', 'amount > 200');
                    >
                    > var newOrder = Order.newInstance();
                    > newOrder.customer_id = currentCustomer.id;
                    > newOrder.amount = 100;
                    > newOrder.save();
                    */

                    /*
                    Class: Model
                      A Model class represents and manages a tables in
                      a database.  Model instances represent individual
                      records in the table.  Models follow the 'Active Record'
                      design pattern for object-relational mapping.
                    */

                    /*
                    Function: find ()
                      Queries the database for records of Model.
                      The Model.find() function can be called in several ways:

                      - models = Model.find('all', params);
                      - model  = Model.find('first', params);
                      - model  = Model.find(id, params);
                      - models = Model.find([ id1, id2, id3 ], params);

                    Optional params object:
                      The optional params object is a map object that may have
                      several key/values to specify the query better...

                      - conditions - either a string WHERE clause fragment
                           (without the actual WHERE keyword).  For example,
                           "Employee.salary > 100 AND Employee.started_at IS NOT NULL".
                           Or, the conditions value may be an Array.
                           The Array's first element is a WHERE clause
                           fragment string, and the remaining elements
                           are bind parameter values.  For example,
                           [ "Employee.salary > ? AND Employee.started_at > ?",
                             10000, aDateString ]       
                      - order - a string that is the body of an ORDER BY clause.
                           For example, "Person.lastname ASC, Person.firstname ASC".
                      - from - a string that optionally allows you to override
                           the table name that is queried.  For example,
                           "WikiPageVersion".
                      - limit - a value is the record total limit in an LIMIT clause.
                      - offset - a value for the offset part of a LIMIT clause.
                                 The offset is only used if the limit is specified.

                    Examples:
                    > Page = function() {};
                    >
                    > modelInit('Page');
                    >
                    > var pages = Page.find('all', { 
                    >     order: 'Page.title ASC',
                    >     conditions: 'active = 1' 
                    > });
                    >
                    > var pages = Page.find('all', { 
                    >     order: 'Page.count_hits DESC, Page.title ASC',
                    >     conditions: [ 'Page.active = ? AND Page.count_hits > ?', 
                    >                   1, 100 ]
                    > });
                    >
                    > var page = Page.find('first', { 
                    >     order: 'Page.title ASC',
                    >     conditions: [ 'Page.active = ? AND Page.title = ?', 
                    >                   1, 'My First Blog Post' ]
                    > });
                    >

                    Returns:
                      An array of Model instances, or a single Model instance,
                      depending on the arguments passed to Model.find().
                    */
                    modelInfo.func.find = function(id, params) {
                        if (typeof(id) == 'string') {
                            var cmd = id.toLowerCase();
                            if (cmd == 'all')
                                return modelInfo.func.findAll(params);
                            if (cmd == 'first')
                                return modelInfo.func.findFirst(params);
                        }

                        // TODO: Revisit for sql injection.
                        //
                        // The input is an id or an array of ids.
                        //
                        var ids;
                        if (id instanceof Array)
                            ids = id;
                        else
                            ids = [ id ];
                        
                        params = findParams(params);

                        var condLHS    = (params.from || modelInfo.tableName) + ".id = "
                        var conditions = [];
                        for (var i = 0; i < ids.length; i++)
                            conditions.push(condLHS + parseInt(ids[i], 10));
                        conditions = conditions.join(' OR ');

                        if (params.conditions[0] != null &&
                            params.conditions[0].length > 0)
                            params.conditions[0] = params.conditions[0] + ' AND (' + conditions + ')';
                        else
                            params.conditions[0] = conditions;

                        if (id instanceof Array)
                            return modelInfo.func.findAll(params);
                        else
                            return modelInfo.func.findFirst(params);
                    }

                    /*
                    Function: findActive (id, params)
                      Like find(), but ensures that 'active = 1'
                      is part of the query.

                      Queries the database for active records of Model.
                      That is, returns only those records whose active column 
                      has a value of 1.

                      The Model.findActive() function can be called in several ways,
                      similar to the Model.find() method:

                      - models = Model.findActive('all', params);
                      - model  = Model.findActive('first', params);
                      - model  = Model.findActive(id, params);
                      - models = Model.findActive([ id1, id2, id3 ], params);

                      The active column is automatically created by the
                      Junction system if you created the table using
                      the migration createStandardTable() method.

                    Parameters:
                      params - An optional params object as described in the Model.find() function.

                    Examples:
                    > Page = function() {};
                    >
                    > modelInit('Page');
                    >
                    > var pages = Page.findActive('all', { 
                    >     order: 'Page.title ASC'
                    > });
                    >
                    > var pages = Page.findActive('all', { 
                    >     order: 'Page.count_hits DESC, Page.title ASC',
                    >     conditions: [ 'Page.count_hits > ?', 100 ]
                    > });
                    >
                    > var page = Page.findActive('first', { 
                    >     order: 'Page.title ASC',
                    >     conditions: [ 'Page.title = ?', 'My First Blog Post' ]
                    > });
                    >

                    Returns:
                      An array of Model instances, or a single Model instance,
                      depending on the arguments passed to Model.findActive().
                    */
                    //
                    modelInfo.func.find_active = function(id, params) {
                        params = findParams(params);

                        var clause = (params.from || modelInfo.tableName) + '.active = 1'
                        if (params.conditions[0] != null &&
                            params.conditions[0].length > 0)
                            params.conditions[0] = params.conditions[0] + ' AND (' + clause + ')';
                        else
                            params.conditions[0] = clause;

                        return modelInfo.func.find(id, params);
                    }

                    /*
                    Function: findAll (params)
                      Equivalent to Model.find('all', params).

                    Example:
                    > var employees = Employee.findAll();
                    > var marketeers = Employee.findAll({ conditions: "Employee.dept = 'marketing'" });

                    Parameters:
                      params - An optional params object as described in the Model.find() function.
                    */
                    //
                    modelInfo.func.find_all = function(params) {
                        params = findParams(params);
                        return modelInfo.func.findBySql([ findSql(params, modelInfo) ].concat(params.conditions.slice(1)));
                    }

                    /*
                    Function: findFirst (params)
                      Equivalent to Model.find('first', params)

                    Example:
                    > var currentInvoice = Invoice.findFirst({ conditions: ["Invoice.customer_id = ?", 123] });

                    Parameters:
                      params - An optional params object as described in the Model.find() function.
                    */
                    //
                    modelInfo.func.find_first = function(params) {
                        params = findParams(params);
                        var record = junction.dbExecute(findSql(params, modelInfo), 
                                                        params.conditions.slice(1))[0];
                        if (record != null)
                            return modelInfo.func.newInstance(record);
                        return null;
                    }

                    /*
                    Function: findBySql (sql)
                      Queries the database for Model instances 
                      using a full SQL query string.

                      The sql query should include a 'Model.*'
                      column selector in the SELECT columns clause.

                    Examples:
                    > var products = Product.findBySql(
                    >    'SELECT Product.* FROM Product WHERE Product.active = 1');
                    > var products = Product.findBySql(
                    >    'SELECT Product.* FROM Product ORDER BY Product.price DESC');
                    > var products = Product.findBySql(
                    >    [ 'SELECT Product.* FROM Product WHERE Product.name = ? AND Product.active = ?'
                    >      'jello', 1 ]);

                    Parameters:
                      sql - either a string SQL query, such as
                            "SELECT Product.* FROM Product WHERE Product.price > 10".
                            Or, an Array to allow for bind parameters.
                            [ "SELECT Product.* FROM Product WHERE Product.price > ?",
                              100000 ]

                    Returns:
                      An Array of Model instances, or an empty Array [].                    
                    */
                    //
                    modelInfo.func.find_by_sql = function(sql) {
                        sql = findArray(sql);
                        var records = junction.dbExecute(sql[0], sql.slice(1));
                        var result = [];
                        for (var i = 0; i < records.length; i++)
                            result.push(modelInfo.func.newInstance(records[i]));
                        return result;
                    }

                    /*
                    Function: countActive (params)
                      Does a SELECT COUNT(*) query for active records.

                    Example:
                    > var numTasks = Task.countActive();
                    
                    Returns:
                      An integer.
                    */
                    //
                    modelInfo.func.count_active = function(params) {
                        params = findParams(params);

                        var clause = (params.from || modelInfo.tableName) + '.active = 1'
                        if (params.conditions[0] != null &&
                            params.conditions[0].length > 0)
                            params.conditions[0] = params.conditions[0] + ' AND (' + clause + ')';
                        else
                            params.conditions[0] = clause;

                        var sql = [ "SELECT COUNT(",
                                    (params.from || modelInfo.tableName), ".active) AS c FROM ",
                                    (params.from || modelInfo.tableName), 
                                    conditionsPrep(params.conditions[0]) ];

                        sql.push(' GROUP BY ' + (params.from || modelInfo.tableName) + '.active');

                        if (params.having != null)
                            sql.push(' HAVING ' + params.having);
                        if (params.order != null)
                            sql.push(' ORDER BY ' + params.order);
                        if (params.limit != null) {
                            sql.push(' LIMIT ');
                            sql.push(params.offset || '0');
                            sql.push(', ');
                            sql.push(params.limit);
                        }
            
                        var result = junction.dbExecute(sql.join(''),
                                                        params.conditions.slice(1));
                        if (result != null) {
                            if (result.length == 1)
                                return result[0].c;
                            if (result.length > 1)
                                return result;
                        }

                        return 0;
                    }

                    /*
                    Function: newInstance (attrs)
                      Creates a new, unsaved instance of a Model.

                    If they are part of the table schema, the created_at, updated_at, 
                    version, and active columns will be automatically 
                    initialized correctly for the returned Model instance.  
                    The version and active values will be initialized to the number 1.

                    The id of the returned Model instance will be null or 0,
                    signifying that the record has not been persisted
                    to the local RDBMS yet.  See: the isNewRecord() method.

                    Examples:
                    > var product = Product.newInstance();
                    > product.name = 'cereal';
                    > product.save();
                    >
                    > var product = Product.newInstance({ name: 'cereal' });
                    > product.save();
                    >

                    Note that save() might assign a negative id number when
                    saving a new model instance, if the runtime environment
                    is the client-side browser.  Positive id numbers are
                    assigned when running on the server-side, or when the
                    server is synchronizing records created originally
                    on the client-side.                   

                    Parameters:
                      attrs - An optional map object of columnName/value pairs
                              used to initialize the unsaved Model instance.

                    Returns:
                      A newly created, but unsaved Model instance.
                    */
                    //
                    modelInfo.func.new_instance = 
                      modelInfo.func.build = function(attrs) {
                        var newObj = junctionUtil.copyRecord(attrs, new (modelInfo.func)());
                        if (newObj != null) {
                            newObj.setConventionalAttributes(true);
                            if (newObj.active == null) {
                                var tableSchema = env.db.getSchema()[modelInfo.tableName];
                                if (tableSchema != null &&
                                    tableSchema['active'] != null)
                                    newObj.active = 1;
                            }
                        }

                        return newObj;
                    }

                    /*
                    Function: new_instance (attrs)
                      An alias for Model.newInstance(attrs)
                    */
                    /*
                    Function: build (attrs)
                      An alias for Model.newInstance(attrs).  Provides compatibility with Jester.
                    */

                    /*
                    Function: isNewRecord ()
                      Returns true if the record is a new, unsaved record.

                    Returns:
                      A boolean, by seeing if the id field of the model instance is non-null and != 0.
                    */
                    //
                    modelInfo.func.prototype.is_new_record = 
                      modelInfo.func.prototype.is_new_instance = function() {
                        return this.id == null || this.id == 0;
                    }

                    /*
                    Function: isNewInstance ()
                      An alias for the isNewRecord() method.
                    */
                    /*
                    Function: is_new_instance ()
                      An alias for the isNewRecord() method.
                    */
                    /*
                    Function: is_new_record ()
                      An alias for the isNewRecord() method.
                    */

                    /*
                    Function: deactivate ()
                      Sets the active column of the model instance to 0.
                      The deactivate() method also save()'s the model instance
                      to the local RDBMS (to either the client-side local RDBMS
                      cache, or to the server-side RDBMS, depending on your 
                      runtime environment).

                      Application developers should use deactivate() instead 
                      of destroy() to allow for synchronization.  
                      To the simple synchronization system of Junction, 
                      a deactivate() just looks like an regular record update,
                      and is propagated from client-to-server and vice-versa
                      correctly.

                      Also, the application should use findActive() instead
                      of find(), because findActive() usefully checks the active 
                      column.

                      Using deactivate() instead of destroy() also allows
                      for a simple implementation of undo'ing an 
                      apparent 'delete'.

                      At a later date, after deactivation information has
                      synchronized and propagated to all server RDBMS and
                      client RDBMS's, the application can do a purge of the
                      deactivated records by using the destroy() method.
                      Purges that actually destroy() records might also
                      be executed in response to a user UI command.

                      The active column is automatically created by the
                      Junction system if you created the table using
                      the migration createStandardTable() method.

                    Examples:
                    > var p = Product.findActive(42); // p is non-null.
                    > p.deactivate();
                    > p = Product.findActive(42); // p is null.

                    Returns:
                      A boolean true if the model instance was updated and saved
                      to the local RDBMS.  A false return value usually means
                      the model instance did not pass validation checks.
                    */
                    modelInfo.func.prototype.deactivate = function() {
                        junctionUtil.callIfExists(this, "beforeDeactivate");
                        return this.updateAttributes({ active: 0 });
                    }

                    /*
                    Function: destroy ()
                      Deletes the model record from the local RDBMS.
                      That is, it is equivalent to the pseudo-SQL of 
                      'DELETE FROM ModelTable WHERE ModelTable.id = {this.id}'

                      You should design your applicaton to use the
                      deactivate() method instead of this destroy() method,
                      as deactivate() works for record synchronization.

                      Although destroy() information is propagated by the Junction
                      simple synchronizaton system from the client-side local RDBMS
                      to the server RDBMS, the reverse propagation from server-side
                      RDBMS to all the client-side RDBMS's does not work,
                      because the server-side RDBMS does not track changes
                      and the actual record has been deleted from the table.
                      In contrast, deactivate() information (seeting active to 0)
                      is propagated correctly in both directions, 
                      and to all clients.

                      One useful design is to code the application to use deactivate()
                      most of the time, such as in response to user commands.
                      Then, every once in awhile, destroy() can be used
                      to finally purge from the RDBMS's the really old,
                      deactivated records, after a reasonable amount of
                      time has passed for the deactivation info to be
                      propagated to all client-side local RDBMS instances.

                    Examples:
                    > Product.find(42, { 
                    >     conditions: [ 'Product.active = 0 AND Product.updated_at < ?',
                    >                   threeMonthsAgoSQLDateString ]
                    > }).destroy();

                    Returns:
                      Void.

                    Note:
                      The method name 'destroy()' is used instead of 'delete()'
                      because 'delete' is a JavaScript reserved keyword.
                    */
                    modelInfo.func.prototype.destroy = function() {
                        junctionUtil.callIfExists(this, "beforeDestroy");
                        return env.db.destroy(modelInfo.tableName, this.id);
                    }

                    /*
                    Function: save ()
                      Saves a new or updated Model instance to the RDBMS.

                      For a new record, a new id is generated and assigned
                      to the record.  Any conventional table columns, such
                      as updated_at and version, if they exist, will be
                      modified by save() before the actual saving into the
                      local RDBMS.

                    Example:
                      > var p = Product.newInstance({ name: 'iPhone' });
                      > p.isNewRecord(); // ... will be true.
                      > p.id             // ... will be null or 0.
                      > p.save();
                      > p.isNewRecord(); // ... will be false.
                      > p.id             // ... will be an integer > 0.
                      >
                      > var t = p.updated_at;
                      >
                      > p.price = 100;
                      > p.save();
                      > p.updated_at != t

                      The RDBMS implementation behind save() will often 
                      use an 'INSERT OR REPLACE' statement or equivalent 
                      'upsert' kind of operation to execute the save() method.

                    Returns:
                      A boolean true if the save() was successful.
                      A false return value usually means that validations 
                      failed.  See the isValid() method.
                    */
                    modelInfo.func.prototype.save = function() {
                        var suffix = this.isNewRecord() ? "Create" : "Update"; // Need to capture this before state changes.

                        if (this.isValid() == false)
                            return false;

                        this.setConventionalAttributes();

                        junctionUtil.callIfExists(this, "beforeSave");
                        junctionUtil.callIfExists(this, "before" + suffix);

                        if (env.db.save(modelInfo.tableName, this) == false)
                            return false;

                        junctionUtil.callIfExists(this, "after" + suffix);
                        junctionUtil.callIfExists(this, "afterSave");

                        return true;
                    }

                    /*
                    Function: isValid ()
                      Runs the validations on the model instance.
                      The modelInstance.errors() object will hold 
                      validation error information.

                      This validation methods that are run against 
                      the model instance, in the following order...

                      - this.beforeValidation()
                      - this.beforeValidationOnCreate/OnUpdate()
                      - declarative save validations
                      - declarative create|update validations
                      - this.validate()
                      - this.validateOnCreate/OnUpdate()
                      - this.afterValidation()
                      - this.afterValidationOnCreate/OnUpdate()

                      The correct xxxValidationOnCreate / xxxValidationOnUpdate method is
                      invoked depending if the model instance is a new record,
                      as determined by calling this.isNewRecord().

                      This method clear()'s the this.error()'s before running
                      the validations.

                    Example of defining validation callback methods:
                    > Invoice = function() {}
                    > modelInit('Invoice');
                    >
                    > Invoice.prototype.beforeValidation = function() {
                    >   // calls this.errors().add() if validation error...
                    > }
                    > Invoice.prototype.validate = function() {
                    >   // calls this.errors().add() if validation error...
                    > }
                    > Invoice.prototype.validateOnCreate = function() {
                    >   // calls this.errors().add() if validation error...
                    > }

                    Returns:
                      A boolean true if there are no validation errors, 
                      and false otherwise.
                    */
                    //
                    modelInfo.func.prototype.is_valid = 
                      modelInfo.func.prototype.valid = function() {
                        this.errors().clear();

                        var suffix = this.isNewRecord() ? "OnCreate" : "OnUpdate";

                        junctionUtil.callIfExists(this, "beforeValidation");
                        junctionUtil.callIfExists(this, "beforeValidation" + suffix);

                        this.runValidations("save");
                        this.runValidations(this.isNewRecord() ? "create" : "update");

                        junctionUtil.callIfExists(this, "validate");
                        junctionUtil.callIfExists(this, "validate" + suffix);

                        junctionUtil.callIfExists(this, "afterValidation");
                        junctionUtil.callIfExists(this, "afterValidation" + suffix);

                        return this.errors().isEmpty();
                    }

                    modelInfo.func.prototype.run_validations = function(type) {
                        var funcs = modelInfo.validations[type];
                        for (var i = 0; i < funcs.length; i++)
                            funcs[i](this);
                    }

                    /*
                    Function: valid ()
                      An alias for the isValid() method.
                    */
                    /*
                    Function: is_valid ()
                      An alias for the isValid() method.
                    */

                    /*
                    Function: errors ()
                      Returns the ModelErrors object that holds validation
                      error information.

                      After running validations, the modelInstance.errors()
                      object will contain information about each validation
                      error.

                    Example:
                    > var p = Product.findActive(42);
                    > p.errors().isEmpty() == true;
                    > p.price = -20;
                    > p.errors().isEmpty() == true;
                    > p.validate() == false;
                    > p.errors().isEmpty() == false;
                    > p.errors().clear();
                    > p.errors().isEmpty() == true;
                    > p.save() == false;
                    > p.errors().isEmpty() == false;

                    Returns:
                      An instance of ModelErrors that's associated
                      with the Model instance.  Calling errors() multiple
                      times returns the same ModelErrors instance.
                    */
                    modelInfo.func.prototype.errors = function() {
                        if (this["@errors"] == null)
                            this["@errors"] = new ModelErrors();
                        return this["@errors"];
                    }

                    /*
                    Function: updateAttributes ()
                      Updates several attributes of the modelInstance and saves.
                      Uses the given map object parameter (attrs) to set
                      several column/value pairs at the same time, and
                      automatically calls save() on the modelInstance.

                    Example:
                    > var product = Product.findActive(42);
                    > product.updateAttributes({
                    >     price: 120.0,
                    >     sale_price: 20,
                    >     sale_ends_at: '2007-10-07 00:00:00Z'
                    > });

                    Parameters:
                      attrs - A map object whose keys are column names,
                              and values are are column values.

                    Returns:
                      A boolean value, the same as modelInstance.save().
                    */
                    //
                    modelInfo.func.prototype.update_attributes = function(attrs) {
                        var id = this.id;
                        junctionUtil.copyRecord(attrs, this);
                        this.id = id;
                        return this.save();
                    }

                    /*
                    Function: update_attributes ()
                      An alias for the updateAttributes() method.
                    */

                    /*
                    Function: setConventionalAttributes (...)
                      Sets the convention-over-configuration field attributes of 
                      the Model instance.  For example, this method will update
                      the created_at and updated_at fields appropriately, and increment
                      the version number field, if they are present.  It does not save
                      the Model instance, only changes the Model instance/object 
                      hash/map values.

                      setConventionalAttributes() is called by the save() 
                      and newInstance() implementations.
                    */                      
                    modelInfo.func.prototype.setConventionalAttributes = function(skipVersion) {
                        var tableSchema = env.db.getSchema()[modelInfo.tableName];
                        if (tableSchema != null) {
                            if (tableSchema['version'] != null) {
                                if (this.version == null)
                                    this.version = 0;
                                if (skipVersion != true) { // Treats null as false.
                                    var v = parseInt(this.version, 10);
                                    this.version = (isNaN(v) ? 0 : v) + 1;
                                }
                            }

                            var now = null;

                            if (tableSchema['created_at'] != null &&
                                this.created_at == null)
                                this.created_at = now = (now || junctionUtil.toSQLDateString(new Date()));

                            if ((tableSchema['updated_at'] != null) &&
                                (this.updated_at == null ||
                                 skipVersion != true))
                                this.updated_at = now = (now || junctionUtil.toSQLDateString(new Date()));
                        }
                    }

                    junctionUtil.addCamelCaseAliases(modelInfo.func);
                    junctionUtil.addCamelCaseAliases(modelInfo.func.prototype);

                    /* 
                    Function: onBeforeSync ()
                      An optional callback function that's called before
                      client-side synchronization.

                      Developers can provide a Model.onBeforeSync() callback function
                      for each Model constructor/function.  The Junction system will
                      invoke this optional Model.onBeforeSync() function during
                      attempted client-side synchronization.  

                    Example:
                    > Invoice = function() {}
                    > modelInit('Invoice');
                    >   ...
                    > }
                    > Invoice.onBeforeSync = function() {
                    >    if (TrimPath.junction.env.getInfo('userKey') == null ||
                    >         TrimPath.junction.env.getInfo('userKey').length <= 0)
                    >        return false; // No sync for anonymous users.
                    > }

                    Returns:
                      A boolean false value signals to Junction that
                      the table or model should not be synchronized.
                    */
                    // See junctionClient.syncUp/syncUpNow to how onBeforeSync is invoked.

                    /*
                    Section: Model Metadata
                      The metadata for a Model defines the object-relational
                      mapping between the JavaScript Model object and a database
                      table in the RDBMS.  For example, you can define name mappings,
                      column validations, and relationships between Models.

                      The metadata is accessed by calling the modelInit() method,
                      usually using its returned value as the scope target object
                      of a _with() {...}_ statement in JavaScript.
                    
                    Example:
                    > Employee = function() {}
                    >
                    > modelInit('Employee');
                    > Employee.belongsTo('Company');
                    > Employee.belongsTo('Manager');
                    */
                   modelInfo.metaAspects = junctionUtil.addCamelCaseAliases({
                        /*
                        Function: tableName (tableNameVal)
                          Tells junction the name of the table in the database that
                          maps to the Model.  By default, Junction assumes
                          the name of the Model to be the same as the table name,
                          unless overridden by calling the table_name method.

                        Example:
                        > modelInit('Blog');
                        > Blog.tableName('blog_entries');
                        >
                        > modelInit('Order');
                        > Order.tableName('orders');

                        Parameters:
                          tableNameVal - A string of the SQL table name.
                        */
                        //
                        table_name : function(tableNameVal)  { modelInfo.tableName  = tableNameVal; },

                        /*
                        Function: pluralName (pluralNameVal)
                          Tells junction the plural name of the Model.
                          By default, Junction assumes the plural name of
                          is just the model name concatenated with an 's'.

                        Example:
                        > modelInit('Person');
                        > Person.pluralName('People');

                        Parameters:
                          pluralNameVal - A string.
                        */
                        //
                        plural_name : function(pluralNameVal) { modelInfo.pluralName = pluralNameVal; },

                        /*
                        Function: hasMany (childPluralName, info)
                          Associates a Model (a 'parent') in a has-many relationship
                          with a 'child' Model.  The child Model should
                          have a foreign-key column that references the
                          parent Model's id column.

                          For example, if Company is the parent Model,
                          then a child Model of Employee should have a foreign-key
                          column such as company_id.

                          When you define a hasMany relationship, Junction
                          will automatically add a child getter function to the
                          parent Model prototype for easier navigation.  
                          The generated child getter function
                          will be named get{childPluralName}.  
                          For example, getEmployees.

                        Example:
                        > Company = function() {}
                        > Employee = function() {}
                        > DigitalGood = function() {}
                        >
                        > modelInit('Company');
                        > Company.hasMany('Employees');
                        > Company.hasMany('DigitalGoods');
                        >
                        > var company = Company.find(17);
                        >
                        > var employees = Company.getEmployees();
                        > // This is the same as...
                        > var employees = Employee.find('all', { conditions: 'Employee.company_id = 17' });
                        >
                        > var goods = Company.getDigitalGoods();
                        > // This is the same as...
                        > var goods = DigitalGoods.find('all', { conditions: 'DigitalGoods.company_id = 17' });
                        >
                        > // Results are cached unless a reload is forced...
                        > var employees1 = Company.getEmployees();
                        > var employees2 = Company.getEmployees();
                        > // employees1 == employees2
                        > var employees3 = Company.getEmployees(true); // Force a reload.
                        > // employees3 != employees2

                        Optional info:
                          The second parameter to hash_many() is an optional map object
                          where you can specificy more details about the relationship
                          and override default behavior.  The key/value options you
                          can define in the info map object are...

                          - modelName - a string of the singular name of the child Model.
                                        Defaults to the childPluralName parameter stripped
                                        of its 's' suffix character.  For example, OrderLines
                                        becomes a singular child Model name of OrderLine.  
                                        Use the modelName option when when pluralization or 
                                        singularization is not so simplistic or when
                                        you have adjectives on the relationship.
                                        For example...
                                        > hasMany('People', { modelName : 'Person' })
                                        > hasMany('OpenTasks', { modelName : 'Task' })
                                        > hasMany('ClosedTasks', { modelName : 'Task' })
                          - foreignKey - a string of the column name in the child table
                                         that serves as the foreign key to the parent table.
                                         For example...
                                         > hasMany('Subdirectories', { modelName : 'Directory',
                                         >                             foreignKey : 'parent_id' })
                          - conditions - a string fragment of a SQL WHERE clause that is
                                         AND'ed as part of the query to provide a tighter result set.
                                         For example...
                                         > hasMany('OpenTasks',   { modelName  : 'Task',
                                         >                          conditions : "Task.status = 'open'" })
                                         > hasMany('ClosedTasks', { modelName  : 'Task',
                                         >                          conditions : "Task.state = 'closed'' })
                          - active - a boolean true value if you want the generated
                                     child getter function to only return active
                                     child Model objects, whose active column == 1.
                          
                        Parameters:
                          childPluralName - A string of the child Model name, pluralized.
                          info - An optional options map object.

                        See also:
                        - hasManyActive() which works better for replicated database situations.
                        */
                        //
                        has_many : function(childPluralName, info) { // The childPluralName is like 'TodoItems'.
                            info            = info            || {};
                            info.modelName  = info.modelName  || childPluralName.slice(0, -1);
                            info.foreignKey = info.foreignKey || junctionUtil.lowerFirst(modelName) + "_id";
                            modelInfo.hasMany[childPluralName] = info;
                            modelInfo.func.prototype['get' + childPluralName] = function(forceReload) {
                                var cacheKey = '_cached_' + childPluralName;
                                if (forceReload == true ||
                                    this[cacheKey] == null) {
                                    var childModelInfo = modelInfos[info.modelName];
                                    var conditions = childModelInfo.tableName + "." + info.foreignKey + " = " + this.id;
                                    if (info.conditions)
                                        conditions += " AND " + info.conditions;
                                    var finder = info.finder || (info.active ? 'findActive' : 'find');
                                    this['_cached_' + childPluralName] = 
                                        childModelInfo.func[finder]('all', {
                                            conditions : conditions,
                                            order      : info.order
                                        });
                                }
                                return this[cacheKey];
                            }
                        },

                        /*
                        Function: hasManyActive (childPluralName, info)
                          Similar to hasMany(), but uses findActive() instead of find()
                          for the generated child getter function.  That is,
                          only child Models that have active == 1 
                          will be returned by the generated getter.

                          You'll often use hasManyActive() instead of hasMany()
                          to allow for correct replication of data between RDBMS's,
                          especially deactivated data.

                        Example:
                        > modelInit('Company');
                        > Company.hasManyActive('Employees');
                        > Company.hasManyActive('OnlineDocuments');

                        Parameters:
                          childPluralName - A string of the child Model name, pluralized.
                          info - An optional options map object.
                        */
                        //
                        has_many_active : function(childPluralName, info) {
                            info = info || {};
                            info.active = true;
                            modelInfo.metaAspects.hasMany(childPluralName, info);
                        },

                        /*
                        Function: belongsTo (parentName, info)
                          Associates a child Model with a parent Model.  The
                          child Model should have a foreign-key column that references the
                          parent Model's id column.

                          For example, if Employee is the child Model, then it
                          should have a foreign-key column such as company_id
                          to associate it with a parent Company Model.

                          When you define a belongs_to relationship on a child Model, Junction
                          will automatically add a parent getter function to the
                          child Model prototype for easier navigation.  
                          The generated parent getter function
                          will be named get{parentName}.  For example, getCompany.

                        Example:
                        > Company = function() {}
                        > Employee = function() {}
                        >
                        > modelInit('Employee');
                        > Employee.belongsTo('Company');
                        > Employee.belongsTo('Manager', { modelName:  'Employee', 
                        >                                 foreignKey: 'manager_id' });
                        >
                        > var emp = Employee.find(51);
                        >
                        > var company = emp.getCompany();
                        > // This is the same as...
                        > var company = Company.find('first', { conditions: [ 'Company.id = ?', emp.company_id ] });
                        >
                        > var mgr = emp.getManager();
                        > // This is the same as...
                        > var mgr = Employee.find('first', { conditions: 'Employee.id = ?', emp.manager_id });
                        >
                        > // Results are cached unless a reload is forced...
                        > var company1 = emp.getCompany();
                        > var company2 = emp.getCompany();
                        > var company3 = emp.getCompany(true);
                        > // company1 == company2
                        > // company1 != company3

                        Optional info:
                          The second parameter to belongsTo() is an optional map object
                          where you can specificy more details about the relationship
                          and override default behavior.  The key/value options you
                          can define in the info map object are...

                          - modelName - a string of the singular name of the parent Model.
                                        Defaults to the parentName parameter
                                        Use the modelName option when the parentName
                                        doesn't refer to a real Model, such as in the
                                        Employee/Manager example in the code above.
                          - foreignKey - a string of the column name in the child table
                                         that serves as the foreign key to the parent table.
                                         Defaults to the uncaptialized parentName parameter
                                         with a '_id' suffix.
                                         For example...
                                         > belongsTo('ParentDirectory', { modelName : 'Directory',
                                         >                                foreignKey : 'parent_id' })
                          - active - a boolean true value if you want the generated
                                     parent getter function to only return an active
                                     parent Model object, whose active column == 1.
                          
                        Parameters:
                          parentName - A string of the parent Model name.
                          info - An optional options map object.
                        */
                        //          
                        belongs_to : function(parentName, info) { // The parentName is like 'TodoList'.
                            info            = info            || {};
                            info.modelName  = info.modelName  || parentName;
                            info.foreignKey = info.foreignKey || junctionUtil.lowerFirst(parentName) + "_id";
                            modelInfo.belongsTo[parentName] = info;
                            modelInfo.func.prototype['get' + parentName] = function(forceReload) {
                                var cacheKey = '_cached_' + parentName;
                                if (forceReload == true ||
                                    this[cacheKey] == null) {
                                    var parentModelInfo = modelInfos[info.modelName];
                                    var conditions = parentModelInfo.tableName + ".id = " + this[info.foreignKey];
                                    var finder = info.finder || (info.active ? 'findActive' : 'find');
                                    this[cacheKey] = parentModelInfo.func[finder]('first', {
                                        conditions: conditions
                                    });
                                }
                                return this[cacheKey];
                            }
                        },

                        /*
                        Function: belongsToActive (parentName, info)
                          Similar to belongsTo(), but uses findActive() instead of find 
                          for the generated parent getter function.  That is,
                          only parent Models that have active == 1 
                          will be returned by the generated getter.

                          You'll often use belongsToActive() instead of belongsTo()
                          to allow for correct replication of data between RDBMS's,
                          especially deactivated data.

                        Example:
                        > modelInit('Employee');
                        > Employee.belongsToActive('Company');
                        > Employee.belongsToActive('Department');

                        Parameters:
                          parentName - A string of the parent Model name.
                          info - An optional options map object.
                        */
                        //
                        belongs_to_active : function(parentName, info) {
                            info = info || {};
                            info.active = true;
                            modelInfo.metaAspects.belongs_to(parentName, info);
                        },

                        /*
                        Function: validatesFormatOf (attrName, regexp, msg, on)
                          Adds a field/column validation rule based on a regular expression.

                        Example:
                        > modelInit('Employee');
                        > Employee.validatesFormatOf('login', /[A-Za-z0-9]+/);

                        Parameters:
                          attrName - A string of the he attribute or column name to validate.
                          regexp - A regular expression which needs to match the attribute or column 
                                   value in order to pass validation.
                          msg - An optional string error message clause.  Default to 'is invalid', so
                                that a final error message such as 'date of birth is invalid'
                                will be generated.
                          on - An optional string of 'save', 'create', or 'update'.  Defaults to 'save'.
                               Determines when the validation will be checked.
                        */
                        //
                        validates_format_of : function(attrName, regexp, msg, on) {
                            modelInfo.validations[on || 'save'].push(function(obj) { 
                                if (obj[attrName] != null &&
                                    String(obj[attrName]).match(regexp) == null)
                                    obj.errors().add(attrName, msg || "is invalid"); 
                            });
                        },

                        /*
                        Function: validatesInclusionOf (attrName, inArray, msg, on)
                          Adds a field/column validation rule based an array of allowed values.

                        Example:
                        > modelInit('Employee');
                        > Employee.validatesInclusionOf('gender', ['m', 'f']);

                        Parameters:
                          attrName - A string of the he attribute or column name to validate.
                          inArray - An Array.  The column value must be a member of the Array in
                                    order to pass validation.
                          msg - An optional string error message clause.  Default to 'is not included in the list', so
                                that a final error message such as 'gender is not included in the list'
                                will be generated.
                          on - An optional string of 'save', 'create', or 'update'.  Defaults to 'save'.
                               Determines when the validation will bechecked.
                        */
                        //
                        validates_inclusion_of : function(attrName, inArray, msg, on) {
                            modelInfo.validations[on || 'save'].push(function(obj) { 
                                var val = obj[attrName];
                                if (val == null)
                                    return;
                                for (var i = 0; i < inArray.length; i++)
                                    if (val == inArray[i])
                                        return;
                                obj.errors().add(attrName, msg || "is not included in the list"); 
                            });
                        },

                        /*
                        Function: validatesPresenceOf (attrName, msg, on)
                          Adds a field/column validation rule checking for non-null.

                        Example:
                        > modelInit('Employee');
                        > Employee.validatesPresenceOf('first_name');
                        > Employee.validatesPresenceOf('last_name');

                        Parameters:
                          attrName - A string of the he attribute or column name to validate.
                          msg - An optional string error message clause.  Default to "can't be empty", so
                                that a final error message such as 'last name can't be empty'
                                will be generated.
                          on - An optional string of 'save', 'create', or 'update'.  Defaults to 'save'.
                               Determines when the validation will be checked.
                        */
                        //
                        validates_presence_of : function(attrName, msg, on) {
                            modelInfo.validations[on || 'save'].push(function(obj) { 
                                if (obj[attrName] == null || obj[attrName] == "")
                                    obj.errors().add(attrName, msg || "can't be empty"); 
                            });
                        }
                    });

                    for (var k in modelInfo.metaAspects) {
                        if (typeof(modelInfo.metaAspects[k]) == 'function')
                            modelInfo.func[k] = modelInfo.func[k] || modelInfo.metaAspects[k];
                    }
                }

                return modelInfo.func;
            },

            ///////////////////////////////////////////////

            dbMigrate : function(db, stepMap, toVersion) { // A null toVersion means migrate to the last version.
                if (db != null &&
                    stepMap != null) {
                    var ddl      = db.getDDL();
                    var stepKeys = junctionUtil.getMapKeys(stepMap).sort();

                    /*
                    Section: Model Migrations
                      Data definition functions are available during
                      database Model migration up() or down() functions.
                    */

                    /*
                    Function: createTable (tableName, ...columns...)
                      Creates a table in the database.

                    Example:
                    > createTable('Invoice', column('amount', 'integer'),
                    >                        column('cust_id', 'integer'));
                    >
                    > createTable('Invoice', [ 'amount', 'integer' ],
                    >                        [ 'cust_id', 'integer' ]);

                    Parameters:
                    - tableName - A string name for the database table, usually capitalized (like 'Invoice').
                    - columnArray(s) - A variable number of columnArray parameters, 
                                       where each columnArray has a 
                                       column name string and a column type string.
                                       Examples of column type strings include 'integer', 'varchar(100)', 'datetime'.
                    */
                    /*
                    Function: dropTable (tableName)
                      Drops a table  the database.

                    Parameters:
                    - tableName - A string name of a database table.
                    */
                    /*
                    Function: renameTable (oldName, newName)
                      Renames a table in the database.

                    Parameters:
                    - oldName - A string name of a database table.
                    - newName - A string name of a database table.
                    */
                    /*
                    Function: addColumn (tableName, columnName, columnType)
                      Adds a column to a table in the database.

                    Parameters:
                    - tableName - A string name of a database table.
                    - columnName - A string name for a column, usually all lowercase 
                                   with underscore (_) word separators.  For example: 'parent_invoice_id'
                    - columnType - A string name for a column type.
                                   For example, 'integer', 'varchar(100)', 'datetime'.
                    */
                    /*
                    Function: addIndex (tableName, columnNames, indexType, indexName)
                      Adds an index to a table in the database.

                    Parameters:
                    - tableName - A string name of a database table.
                    - columnNames - Either an individual column name string or an array of column name strings.
                    - indexType - Either null, or the string 'UNIQUE'.
                    - indexName - A string name for the index.
                    */
                    /*
                    Function: removeIndex (tableName, indexName)
                      Removes an index from the database.

                    Parameters:
                    - tableName - A string name of a database table.
                    - indexName - A string name of the index to remove.
                    */

                    /*
                    Function: createStandardTable (tableName, ...columns...)
                      Creates a database table with some standard columns
                      that Junction needs to be able to synchronize the table.
                      You'll often use createStandardTable() for most of your tables.

                      The columns (and their types) that createStandardTable() adds 
                      to your table definition include...
                      - ['id',          'integer', 'primary key autoincrement'],
                      - ['created_at',  'datetime'],
                      - ['updated_at',  'datetime'],
                      - ['active',      'integer'],
                      - ['version',     'integer'],
                      - ['id_start',    'integer'],
                      - ['id_start_db', 'varchar(40)'],
                      - ['synced_at',   'datetime']
                    */
                    //
                    ddl.create_standard_table = 
                      ddl.add_standard_table = function(name) {
                        var args = [
                            name,
                            ['id',          'integer', 'primary key autoincrement'],
                            ['created_at',  'datetime'],
                            ['updated_at',  'datetime'],
                            ['active',      'integer'],
                            ['version',     'integer'],
                            ['id_start',    'integer'],
                            ['id_start_db', 'varchar(40)'],
                            ['synced_at',   'datetime']
                        ];
                        for (var i = 1; i < arguments.length; i++)
                            args.push(arguments[i]);
                        ddl.createTable.apply(null, args);
                    }

                    ddl.drop_standard_table   = ddl.drop_table;
                    ddl.remove_standard_table = ddl.drop_table;

                    /*
                    Function: column (name, type)
                      A syntatic sugar helper function that creates a column definition array.
                      Often used with createTable and createStandardTable.

                    For example:
                    > createStandardTable('Project'
                    >   column('name',     'varchar(100)'),
                    >   column('duration', 'integer')
                    > );
                    > // ... is the same as ...
                    > createStandardTable('Project'
                    >   [ 'name',     'varchar(100)' ],
                    >   [ 'duration', 'integer' ]
                    > );

                    Returns:
                       An Array of its parameters, which can be used as a column definition array
                       for the createTable and createStandardTable functions.
                    */
                    ddl.column = function() { // Some syntactic sugar.
                        return junctionUtil.toArray(arguments);
                    }

                    ddl = junctionUtil.addCamelCaseAliases(ddl);

                    var lastStepVer = null; // Track what we think our final version is.

                    var runStep = function(i, direction, checkStop, checkStep, verDelta) {
                        var stepKey = stepKeys[i];           // Ex: '0012_more_indexes.js'
                        var stepVal = stepMap[stepKey];      // Ex: { up: ..., down: ... }
                        if (stepKey != null &&
                            stepVal != null) {
                            stepVer = stepKey.split('/');
                            stepVer = stepVer[stepVer.length - 1];
                            stepVer = stepVer.split('_')[0];
                            stepVer = stepVer.replace(/^0+(.+?)$/, '$1'); // Strip leading 0's.
                            stepVer = junctionUtil.safeParseInt(stepVer); // Ex: 12

                            if (checkStop(stepVer))
                                return false;

                            lastStepVer = stepVer + verDelta;

                            if (checkStep(stepVer)) {
                                if (direction == 'up')
                                    runStepDef(stepVal.def, 'create', 1);

                                if (stepVal[direction] != null) {
                                    var funcStr = 'var TrimPath_migrate_tmp = function(ddl, migrations) { with (ddl) {(' + 
                                                    String(stepVal[direction]) + 
                                                  '\n)(); }}; TrimPath_migrate_tmp';
                                    var func = safeEval(funcStr);
    
                                    // The up/down function should throw an Error if there's trouble.
                                    //
                                    func(ddl, stepMap);
                                }
                                
                                if (direction == 'down')
                                    runStepDef(stepVal.def, 'drop', -1);

                                setVersion(stepVer + verDelta);
                            }
                        }
                        return true;
                    }

                    var runStepDef = function(def, prefix, delta) {
                        if (def != null &&
                            prefix != null) {
                            for (var i = (delta > 0 ? 0 : def.length - 1); 
                                     i >= 0 && i < def.length; i = i + delta) {
                                var cmdArgs = def[i].concat([]);
                                var cmd     = prefix + '_' + cmdArgs.shift();
                                if (ddl[cmd] != null)
                                    ddl[cmd].apply(ddl, cmdArgs);
                            }
                        }
                    }

                    var ver = null;
                    var getVersion = function() {
                        ver = ver || db.getVersion(); // Cached to avoid hitting db so much.
                        return ver;
                    }
                    var setVersion = function(v) {
                        db.setVersion(v);
                        ver = v;
                    }

                    db.transact(function() {
                        console.debug('dbMigrate... ' + (toVersion || ''));

                        for (var i = 0; i < stepKeys.length; i++) {
                            if (runStep(i, 'up', 
                                    function(stepVer) { return toVersion != null && 
                                                               stepVer > toVersion; },
                                    function(stepVer) { return getVersion() < stepVer; },
                                    0) == false)
                                break;
                        }

                        if (toVersion != null) {
                            for (var k = stepKeys.length - 1; k >= 0; k--) {
                                if (runStep(k, 'down', 
                                        function(stepVer) { return toVersion == null ||
                                                                   stepVer <= toVersion; },
                                        function(stepVer) { return getVersion() >= stepVer; },
                                        -1) == false)
                                    break;
                            }
                        }

                        console.debug('dbMigrate... ' + (toVersion || '') + ' DONE');

                        if (lastStepVer != null)
                            db.setVersion(lastStepVer, true);

                        if (lastStepVer == 0)
                            db.setSyncedAt(null);
                    });
                }
            },

            ///////////////////////////////////////////////

            processRequest : function(methodOrig, controllerName, actionName, objIdOrig, req) {
                if (actionName.charAt(0) == '_')
                    throw new Error('disallowed actionName: ' + actionName);

                // Do a check to see whether the db version has changed out from
                // underneath of us, a possibility in shared db's (gearsDb).
                //
                env.db.ensureVersion();

                var method = (methodOrig || '').toLowerCase();

                var controllerFuncName = junctionUtil.upperFirst(controllerName) + "Controller";
                var controllerFunc = getFunc(controllerFuncName);
                if (controllerFunc == null ||
                    typeof(controllerFunc) != 'function')
                    return env.errorUnknownController(controllerName, controllerFuncName);

                var objId  = env.mapObjId(objIdOrig);
                var locale = null;

                if (req == null)
                    req = {};

                /*
                Class: req
                  The req (or request) object is a map object passed to the
                  Controller action method that holds the input parameters 
                  for the request.  A few special parameters setup by the 
                  Junction system are documented here (including method, 
                  controllerName, actionName, etc)...
                */

                /*
                Property: method
                  A string of either 'get' or 'post', indicating the 
                  HTTP method of the request.
                */
                req.method = method;

                /*
                Property: controllerName
                  A string of the controller name, such as 'forum'.  The Junction
                  system converts such a controllerName to a function/constructor
                  such as ForumController.
                */
                req.controllerName = controllerName;

                /*
                Property: actionName
                  A string of the action method name, such as 'newInstance', 'create', 'edit',
                  'show', 'index', etc.  The Junction system looks for a method
                  on the Controller with a name of actionName to invoke.  Junction
                  will not invoke any action method whose name starts with the
                  underscore ('_') character, assumign such methods are private
                  and not web request accessible.
                */
                req.actionName = actionName;

                /*
                Property: objId
                  An optional string id that, by convention, refers to a target 
                  Model record to perform operations on.  For example,
                  "?controllerName=forum&actionName=show&objId=224"
                  is usually interpreted as invoke the show method on the ForumController,
                  targeting the Forum record with id of 234.
                */
                req.objId = objId;

                /*
                Property: session
                  A map object of session variables.  Note that you cannot 
                  have a normal request parameter whose name is 'session'.
                */
                req.session = env.getSession();

                var resRendered = null;
                var resRedirect = null;

                /*
                Class: res
                  The res or response/result object passed to the
                  Controller action method provides methods to control
                  output rendering.  It is also usable as a map object,
                  allowing the Controller action method to share data
                  with the View template for rendering.

                Example:
                > InvoiceController.prototype.show = function(req, res) {
                >   res.invoice = Invoice.findActive('first', req.objId);
                >   res.products = Product.findAcitve('all');
                >
                >   // Both res['invoice'] and res['products'] will be
                >   // available to the template as just invoice and products
                > }

                Rendering:
                  By default, if your Controller action method does not
                  invoke a render() kind of method, the Junction system
                  will automatically invoke render() for you after
                  your action method finishes.
                */
                var res = junctionUtil.addCamelCaseAliases({
                    // Ex: urlForArgsPrep('orders', 'show', 123, { withTax : 1 });
                    // Ex: urlForArgsPrep({ controllerName : 'orders', // optional, defaults to current request's controllerName.
                    //                      actionName     : 'show',   // optional, defaults to current request's actionName.
                    //                      objId          : 123,      // optional, defaults to current request's objId.
                    //                      withTax : 1 });
                    //
                    urlForArgsPrep : function(controllerNameIn, actionNameIn, objIdIn, args) {
                        return junctionUtil.urlForArgsPrep(controllerNameIn, actionNameIn, objIdIn, args, req);
                    },

                    /*
                    Function: render (...)
                      Render a template.

                    Example:
                    > ForumController.prototype.show = function(req, res) [
                    >   res.forum = Forum.findActive('first', req.objId);
                    >   res.render('forum/show'); // This is the same as calling res.render()
                    >                             // without any parameters.  Also, if you didn't make
                    >                             // any res.render() call, Junction would automatically
                    >                             // implicitly call res.render() anyways.
                    > }

                    Parameters:
                    - templateName - An optional string name of a template,
                                     in the format of '{controllerName}/{actionName}'.
                                     Defaults to the current controllerName/actionName.
                                     The template rendered will be found under
                                     '/app/views/{controllerName}/{actionName}.(jst|est)'

                    Returns:
                      A string of the rendered/processed template text.
                    */
                    render : function(templateName) {
                        if (templateName != null &&
                            typeof(templateName) == 'object') {
                            if (templateName.action != null)
                                return res.renderAction(templateName.action);
                            if (templateName.template != null)
                                return res.render(templateName.template);
                            if (templateName.nothing == true) {
                                resRendered = false;
                                return false;
                            }
                            if (templateName.text != null)
                                return res.renderText(template.text);
                            templateName = null;
                        }

                        if (templateName == null)
                            templateName = controllerName + '/' + actionName;
                        return res.renderTemplate("/app/views/" + templateName);
                    },

                    /*
                    Function: renderAction (actionName)
                      Render a template belonging to the current Controller.

                      The renderAction() method is similar to the render() method, except that
                      it assumes the controllerName is the current controllerName
                      in the request being processed.

                    Parameters:
                    - actionName - The actionName used to construct the template path..

                    Returns:
                      A string of the rendered/processed template text.
                    */
                    //
                    render_action : function(actionName) {
                        return res.render(controllerName + '/' + actionName);
                    },

                    /*
                    Function: renderTemplate (templatePath)
                      Render a template given a full template path.

                    Parameters:
                    - templatePath - A string template path, such as '/app/views/blog/show'.
                                     The template path suffix should not be specified,
                                     as Junction will search for the template using all
                                     the template suffixes it understands, like
                                     '.jst' and '.est'.

                    Returns:
                      A string of the rendered/processed template text.
                    */
                    //
                    render_template : function(templatePath) {
                        return res.renderText(env.templateRender(templatePath, res, locale));
                    },

                    /*
                    Function: renderText (text)
                      Sets a string to be the result returned to the client.

                    Example:
                    > res.renderText('<html><body>Hello, ' + new Date() + '</body></html>');

                    Parameters:
                    - text - A string, usually HTML or XML or JSON.

                    Returns:
                      The text string.
                    */
                    //
                    render_text : function(text) {
                        resRendered = text;
                        return text;
                    },

                    /*
                    Function: redirectTo (...)
                      Sends a HTTP redirect response to the client.  The client,
                      in turn, will make another request to another controller/action.

                    Multiple call signatures:
                      The redirectTo method supports two call signatures...
                      - redirectTo(controllerName, actionName, objId (optional), args (optional))
                      - redirectTo(args)

                    Example:
                    > var invoice = Invoice.newInstance(req);
                    > if (invoice.save())
                    >     return res.redirectTo('invoice', 'show', invoice.id);
                    > // ?controllerName=invoice&actionName=show&objId=invoice.id
                    >
                    > res.redirectTo('invoice', 'list');
                    > // ?controllerName=invoice&actionName=list

                    Example:
                    > res.redirectTo('wiki', 'search', null, {
                    >   query : 'washington',
                    >   page : 1,
                    >   results_per_page : 50 });
                    > // ?controllerName=wiki&action=search&query=space shuttle&page=1&results_per_page=50

                    Example:
                    > res.redirectTo({ controllerName : 'wiki',
                    >                  actionName : 'search',
                    >                  query : 'washington',
                    >                  page : 1,
                    >                  results_per_page : 50 });
                    > // ?controllerName=wiki&action=search&query=space shuttle&page=1&results_per_page=50

                    Parameters:
                    - controllerName - A string for the name of the Controller to redirect to.
                    - actionName - A string for the action method name to redirect to.
                    - objId - An optional string for the objId to redirect to.
                    - args - An optional map object containing key/value parameters
                             for the redirect request.  A special 'url' key/value
                             in the args map overrides everything, sending the redirect
                             to just the given url.

                    Returns:
                      void
                    */
                    //
                    redirect_to : function(controllerName, actionName, objId, args) {
                        if (typeof(controllerName) == 'object') // Called with 2nd signature.
                            return res.redirectToArgs(res.urlForArgsPrep(controllerName));

                        res.redirectToArgs(res.urlForArgsPrep(controllerName, actionName, objId, args));
                    },

                    /*
                    Function: redirectToArgs (args)
                      Sends a HTTP redirect response to the client.

                    Example:
                    > res.redirectToArgs({ url: 'http://rubyonrails.com' })
                    >
                    > res.redirectToArgs({ controllerName : 'invoice',
                    >                      actionName : 'show',
                    >                      objId : 117,
                    >                      levelOfDetail : 'full' });

                    Parameters:
                    - args - A map object containing key/value parameters
                             for the redirect request.  A special 'url' key/value
                             in the args map overrides everything, sending the redirect
                             to just the given url.

                    Returns:
                      void
                    */
                    //
                    redirect_to_args : function(args) {
                        resRedirect = args;
                    },

                    /*
                    Function: redirectToAction (actionName, objId, args)
                      Sends a HTTP redirect response to the client,
                      targeting an action on the current controller.

                    Example:
                    > if (contact.save()
                    >     res.redirectToAction('show', contact.id);
                    > else
                    >     res.redirectToAction('edit', contact.id);

                    Parameters:
                    - actionName - A string action method name.
                    - objId - An optional target id for the action to focus on.
                    - args - A map object containing key/value parameters
                             for the redirect request.  A special 'url' key/value
                             in the args map overrides everything, sending the redirect
                             to just the given url.

                    Returns:
                      void
                    */
                    //
                    redirect_to_action : function(actionName, objId, args) {
                        res.redirectTo(controllerName, actionName, objId, args);
                    },

                    /*
                    Property: req
                      The req object is available in the res object for 
                      convenient access to req properties from templates.

                    Example:
                      <%= req['controllerName'] %>
                      <%= req['actionName'] %>
                      <%= req['invoiceTotal'] %>
                    */
                    req : req,

                    /*
                    Property: session
                      The req.session object is available in the res object for 
                      convenient access to session properties from templates.

                    Example:
                      <% session.sessionStartTime = session.sessionStartTime || (new Date().toString()) %>
                      <%= session.sessionStartTime %>
                    */
                    session : req.session,

                    /*
                    Property: flash
                      The transient flash hash/map object is available in the res object for 
                      convenient access to flash data from templates.  Any
                      scalar data of simple types (e.g. Strings) stored 
                      in the res.flash object are available right after
                      a res.redirect() call in the redirected controller.

                    Example:
                    > BlogPostController.prototype.create = function(req, res) {
                    >   var post = BlogPost.new(req['blogPost']);
                    >   if (post.save()) {
                    >      res.flash.msg = "Your Blog Post is created.";
                    >      // The flash.msg is kept for the next request.  The next
                    >      // request, due to the redirectToAction(), will be for the show 
                    >      // action method in the BlogPostController, which can then display 
                    >      // the flash.msg to the user.
                    >      res.redirectToAction('show', post.id);
                    >   }
                    */
                    flash : req.session.flash || {},

                    /*
                    Property: layoutName
                      Allows the controller to defined the layout
                      used in rendering the response.

                    Example:
                    > // The default layoutName for the ForumController will be 'main'.
                    > ForumController.layoutName = 'main';
                    >
                    > ForumController.prototype.index = function(req, res) {
                    >     res.forums = Forum.findActive('all');
                    >     res.layoutName = 'small_header_layout'; // Overrides the default layoutName of 'main'
                    > }                                           // just for the index action method.
                    */
                    layoutName : controllerFunc.layoutName || 'default',

                    /*
                    Function: setLocale (localeStr)
                      Sets the locale string for the current response.
    
                      View template rendering will automatically use the locale string as
                      preferred template path suffix, such as app/views/{templatePath}{.localeStr}{.jst|est}
                      if you use res.setLocale().  For example, if you call res.setLocale('en'),
                      the template renderer will first look for an 
                      app/views/invoice/show.en.est template View file.  If that file
                      does not exist, the template renderer will look for an
                      app/views/invoice/show.est template View file.       
    
                    Parameters:
                    - localeStr - A string locale.
                    */
                    setLocale : function(localeStr) { 
                        locale = localeStr;
                        env.setLocale(localeStr);
                    },
    
                    /*
                    Function: getLocale ()
                      Returns the locale string for the current response.
    
                    Returns:
                      A string locale.
                    */
                    getLocale : function() { 
                        return locale;
                    },

                    /*
                    Function: t (str, defaultResult)
                      Translate a static string based on the current response locale.
        
                    Parameters:
                    - str - A string to translate.
                    - defaultResult - An optional string result value.
        
                    Returns:
                    A string, either translated.
                    Or, returns the defaultResult if no translation is available.
                    If defaultResult is not provided, returns the original str parameter.
        
                    See:
                      setLocale() and getLocale()
                    */
                    t : function(str, defaultResult) {
                        if (locale != null) {
                            var s = res.translateWithMap(str, controllerFunc.translations, locale);
                            if (s != null)
                                return s;
                            if (typeof(TRANSLATIONS) != 'undefined')
                                s = res.translateWithMap(str, TRANSLATIONS, locale);
                            if (s != null)
                                return s;
                        }
                        return defaultResult || str;
                    },
        
                    translateWithMap : function(str, map, localeIn) {
                        if (map != null) {
                            var localeMap = map[localeIn || locale];
                            if (localeMap != null) {
                                var s = localeMap[str];
                                if (s != null)
                                    return s;
                            }
                        }
                        return null;
                    },
        
                    /*
                    Function: tChoices (arr)
                      Translate an array of choice strings that is usually
                      passed to the res.select() function.
        
                    Example:
                    > <%= select('customer', 'gender', tChoices(['male', 'female'])) %> <br/>
                    > <%= select('customer', 'gender', tChoices([['Guy', 'male'], ['Gal', 'female']])) %> <br/>
        
                    Parameters:
                    - arr - An array of strings or array of arrays, as passed to the res.select() function.
        
                    Returns:
                    A copied, translated arr.
        
                    See:
                      select() and setLocale() and getLocale()
                    */
                    //
                    t_choices : function(arr) {
                        var result = [];
                        for (var i = 0; i < arr.length; i++) {
                            var choiceSrc = arr[i];
                            if (choiceSrc instanceof Array) {
                                var choiceDst = [ res.t(choiceSrc[0]) ];
                                for (var j = 1; j < choiceSrc.length; j++)
                                    choiceDst.push(choiceSrc[j]);
                                result.push(choiceDst);
                            } else
                                result.push(res.t(choiceSrc));
                        }
                        return result;
                    },
        
                    /* 
                    Function: localDateString (date, withTime)
                      Similar to TrimPath.junctionUtil.toLocalDateString(),
                      formats a Date as either 'YYYY/MM/DD' or 'YYYY/MM/DD hh:mm:ss'.
                      The Date information is returned in local timezone.  
                      The returned string is also parsable by the JavaScript Data
                      object constructor.
            
                    Example:
                    > Invoice Creation: <%= localDateString(invoice.created_at) %>
            
                    Parameters:
                      date - A Date object or a String that's parsed with TrimPath.junctionUtil.parseDateString().
                             If null, the function returns the empty string ("").
                      withTime - A boolean, true to add hh:mm:ss to the return value.
            
                    Returns:
                      A string, suitable for display or sorting.  
                      Or, the empty string ("") if there's a date parsing error.
                    */
                    //
                    local_date_string : function(date, withTime) {
                        if (date == null)
                            return "";
                        return junctionUtil.toLocalDateString(date, withTime);
                    },

                    /* 
                    Function: utcDateString (date, withTime)
                      Similar to TrimPath.junctionUtil.toUTCDateString(),
                      formats a Date as either 'YYYY/MM/DD' or 'YYYY/MM/DD hh:mm:ss'.
                      The Date information is returned in UTC timezone.  
                      The returned string is also parsable by the JavaScript Data
                      object constructor.
            
                    Example:
                    > Invoice Creation: <%= utcDateString(invoice.created_at) %>
            
                    Parameters:
                      date - A Date object or a String that's parsed with TrimPath.junctionUtil.parseDateString().
                             If null, the function returns the empty string ("").
                      withTime - A boolean, true to add hh:mm:ss to the return value.
            
                    Returns:
                      A string, suitable for display or sorting.  
                      Or, the empty string ("") if there's a date parsing error.
                    */
                    //
                    utc_date_string : function(date, withTime) {
                        if (date == null)
                            return "";
                        return junctionUtil.toUTCDateString(date, withTime);
                    }
                });

                res.res = res;

                res = TrimPath.junctionHelpers(res);

                // TODO: Possible issue if seal String one day.
                //
                var tProtoPrevious = String.prototype.t;
                String.prototype.t = function() { return res.t(this); };

                try {
                    var controller = new (controllerFunc)();
                    if (controller != null) {
                        var runAction = true;

                        var filters = controllerFunc._filters;
                        if (filters != null &&
                            filters.before != null) {
                            for (var i = 0; i < filters.before.length && runAction == true; i++) {
                                var filter = filters.before[i];
                                if (filter != null &&
                                    typeof(filter) == 'function' &&
                                    filter(controller, req, res) == false)
                                    runAction = false;
                            }                            
                        }

                        if (runAction == true) {
                            if (controller[actionName]) {
                                controller[actionName](req, res);
                            } else {
                                if (controllerFunc.allowDirectViewInvoke != true)
                                    throw new Error('unknown action ' + actionName + ' for controller ' + controllerName);
                            }
                        }
                    }

                    if (resRedirect != null) {
                        req.session.flash = res.flash;

                        if (method == "post") {
                            // Following REST/DRY conventions, we assume that a 'post'
                            // might change the local db data, while 'get' requests do not.  
                            // So, we only synchronize to update the server only during
                            // a post and redirect.
                            //
                            env.syncUp();
                        }

                        String.prototype.t = tProtoPrevious;

                        return env.redirect(resRedirect, method);
                    }

                    if (resRendered == null)
                        res.renderAction(actionName);
                } catch (e) {
                    resRendered = "<pre>[ERROR: controller processing: " + 
                        (controllerName) + ", " + 
                        (actionName) + ", " + 
                        (objId || '') + ":\n " + 
                        junctionUtil.exceptionDetails(e) + "]</pre>";
                }

                if (resRendered != null &&
                    resRendered != false &&
                    resRendered.length > 0)
                    resRendered = env.layoutRender(req, res, resRendered);

                req.session.flash = null;

                String.prototype.t = tProtoPrevious;

                return resRendered;
            }
        });

        junction.model_for = junction.model_init;

        return junction;
    }

    //////////////////////////////////////////////////////

    /*
    Class: ModelErrors
      A ModelErrors object manages the validation error messages for a Model instance.

      Every instance of a Model has an associated ModelErrors instance,
      which you can retrieve by calling modelInstance.errors().

      Any error messages that were generated during validation of the
      modelInstance are stored into the modelInstance.errors() object.
      These validaton error messages are useful for display 
      to the user.  

      In other words, any validation error messages that 
      were generated during modelInstance.save() or during 
      modelInstance.is_valid() will be accessible from 
      the ModelErrors object that's returned by modelInstance.errors().

    Example:
    > var product = Product.findActive(42); // Returns an instance of the Product Model.
    > product.price = -100;
    > product.is_valid();            // product.is_valid() returns false due to incorrect price.
    > var errors = product.errors(); // The errors object is an instance of the ModelErrors class and
    >                                // stores the error messages generated during execution of is_valid().
    */
    var ModelErrors = function() {
        this.clear();
    }

    /*
    Function: add
      Adds an error message that's associated with a named property or field.

    Example:
    > Product.prototype.validate = function() {
    >     // We implement the validate() method by checking the Product.price...
    >     if (this.price < 0)
    >         this.errors().add('price', 'cannot have negative price values');
    > }

    Parameters:
      attrName - A string name of the property or field of the Model 
                 that has an error.
      msg - An optional string error message that should be readable
            or sensible in a concatenated sentence of (attrname + spaceChar + msg).  
            For example, if attrName is 'price', then 
            'cannot be less than zero' makes a sensible msg, 
            since the concatenated string value would be 
            'price cannot be less than zero'.
            The msg defaults to the string 'is invalid'.

    Returns:
      void
    */
    ModelErrors.prototype.add = function(attrName, msg) {
        if (this.attrErrors[attrName] == null)
            this.attrErrors[attrName] = [];
        this.attrErrors[attrName].push(msg || "is invalid");
        this.attrErrorsCount++;
    }

    /*
    Function: addToBase
      An alias for the add_to_base() method.
    */
    /*
    Function: add_to_base
      Adds an error message assocated with the entire modelInstance.

      Unlike the add() method, the add_to_base() method associates
      a validation error message with the entire Model instance.
      This is appropriate when the validation error covers more
      than one Model property or field.  Also, this is useful
      for when there are validation errors that cover more than 
      one Model, such as in parent-child relationships (e.g.,
      when an Order must have at least one OrderLine).

    Example:
    > Employee.prototype.validate = function() {
    >     if (this.start_date > this.end_date)
    >         this.errors().add_to_base('start and end dates are invalid');
    > }

    Parameters:
      msg - An error message string that will be associated
            with the entire Model instance, rather than to a particular
            property or field of the Model instance.

    Returns:
      void
    */
    ModelErrors.prototype.add_to_base = function(msg) { this.add(":base", msg); }

    /*
    Function: on
      Returns the error messages associated with a particular
      property or field of a model instance.  That is, 
      modelInstance.errors().on(attrName) returns all the
      error messages that were stored by earlier calls to
      modelInstance.errors().add(attrName, errorMessage);

    Example:
    > for (var errs = product.errors().on('price') || [],
    >          i = 0; i < errs.length; i++)
    >     displayToUser('price', errs[i]);

    Parameters:
      attrName - A string name of a property or field.

    Returns:
      An Array of error message strings, or null.
    */
    ModelErrors.prototype.on = function(attrName) { return this.attrErrors[attrName]; }

    /*
    Function: onBase
      An alias for the on_base() method.
    */
    /*
    Function: on_base
      Returns the error messages that were associated 
      with the entire model instance.  That is, the 
      modelInstance.errors().on_base() method
      returns all the error messages that were stored by
      earlier calls to modelInstance.errors().add_to_base(errorMessage);

    Example:
    > for (var errs = employee.errors().on_base() || [],
    >          i = 0; i < errs.length; i++)
    >     displayToUser(errs[i]);

    Returns:
      An Array of error message strings, or null.
    */
    ModelErrors.prototype.on_base = function() { return this.on(":base"); }

    /*
    Function: clear
      Removes all the error messages held by this ModelErrors instance.

    Example:
    > product.errors().clear();
    > // After calling clear(), the errors() will be empty...
    > product.errors().count();            // == 0
    > product.errors().isEmpty();          // == true
    > product.errors().isInvalid('price'); // == false
    > product.errors().on('price');        // == null
    > product.errors().onBase();           // == null

    Returns:
      void
    */
    ModelErrors.prototype.clear = function() {
        this.attrErrorsCount = 0;
        this.attrErrors = {};
    }

    /*
    Function: isInvalid
      An alias for the is_invalid() method.
    */
    /*
    Function: is_invalid
      Returns whether there are error messages associated with 
      a particular property or field of a model instance.

    Example:
    > if (product.errors().is_invalid('price'))
    >     displayToUser(product.errors().fullMessagesOn('price'));

    Parameters:
      attrName - A string name of a property or field.

    Returns:
      A boolean.
    */
    ModelErrors.prototype.is_invalid = function(attrName) { return this.on(attrName) != null; }

    /*
    Function: count
      Returns the number of error messages stored in the ModelErrors instance.
      The error messages (and hence the count) can be cleared 
      by calling the clear() method.

    Example:
    > if (product.errors().count() > 0) 
    >     displayToUser(product.errors().fullMessages().join('<hr/>'));

    Returns:
      An integer.
    */
    ModelErrors.prototype.count = function() { return this.attrErrorsCount; }

    /*
    Function: isEmpty
      An alias for the is_empty() method.
    */
    /*
    Function: is_empty
      Returns whether there are any error messages stored
      in the ModelErrors instance.  That is, returns true
      if count() == 0.

    Example:
    > if (!product.errors().is_empty())
    >     displayToUser(product.errors().fullMessages().join('<hr/>'));

    Returns:
      A boolean.
    */
    ModelErrors.prototype.is_empty = function() { return this.count() == 0; }

    /*
    Function: invalidAttributes
      An alias for the invalid_attributes() method.
    */
    /*
    Function: invalid_attributes
      Returns the names of properties/fields that have validation errors.

    Example:
    > for (var columnNamesWithErrors = product.errors().invalid_attributes(),
    >          i = 0; i < columnNamesWithErrors.length; i++)
    >   displayToUser(product.errors().fullMessagesOn(columnNamesWithErrors[i]);

    Returns:
      An Array of property/field/column names.    
    */
    ModelErrors.prototype.invalid_attributes = function() {
        var result = [];
        for (var attrName in this.attrErrors) {
             var errs = this.attrErrors[attrName];
             if (errs != null &&
                 errs instanceof Array)
                 result.push(attrName);
        }
        return result;
    }

    /*
    Function: fullMessagesOn
      An alias for the full_messages_on() method.
    */
    /*
    Function: full_messages_on
      Returns an Array of error message strings associated with
      a given attrName.  The returned strings are concatenated,
      like (attrName + spaceChar + msg).

    Parameters:
      attrName - A string name of a property or field.

    Example:
    > var priceErrors = product.errors().full_messages_on('price'); 

    Returns:
      An Array of error message strings.
    */
    ModelErrors.prototype.full_messages_on = function(attrName) { 
        var msgs = this.on(attrName);
        if (msgs == null ||
            attrName == ":base")
            return msgs;
        var results = [];
        for (var i = 0; i < msgs.length; i++)
            results.push(attrName + " " + msgs[i]);
        return results;
    }

    /*
    Function: fullMessages
      An alias for the full_messages() method.
    */
    /*
    Function: full_messages
      Returns an Array of all error message strings.
      All error message strings that were added using add() or add_to_base()
      will be returned by full_messages().

    Example:
    > var validationErrors = product.errors().full_messages(); 
    > displayToUser('<p>' + validationErrors.join('</p><p>') + '</p>');

    Returns:
      An Array of error message strings.
    */
    ModelErrors.prototype.full_messages = function() { 
        var results = [];
        for (var i = 0, attrs = this.invalidAttributes(); i < attrs.length; i++)
            results = results.concat(this.fullMessagesOn(attrs[i]) || []);
        return results;
    }

    junctionUtil.addCamelCaseAliases(ModelErrors.prototype);

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
